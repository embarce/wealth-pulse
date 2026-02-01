
import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';
import { 
  Transaction, 
  TransactionType, 
  CapitalLog, 
  CapitalType, 
  StockPrice,
  AppConfig
} from './types';
import { INITIAL_STOCKS, generateMockHistory } from './constants';
import { apiService } from './services/backend';
import { getTradeScore, getMarketOutlook } from './services/gemini';
import { Language, translations } from './i18n';

// Components
import Modal from './components/Modal';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';

// Pages
import Dashboard from './pages/Dashboard';
import Holdings from './pages/Holdings';
import Records from './pages/Records';
import AILab from './pages/AILab';
import MarketSearch from './pages/MarketSearch';
import Settings from './pages/Settings';
import Help from './pages/Help';

// 创建国际化 Context
export const I18nContext = createContext<{
  lang: Language;
  t: typeof translations['zh'];
  setLang: (l: Language) => void;
}>({ lang: 'zh', t: translations.zh, setLang: () => {} });

const AppContent: React.FC = () => {
  const { lang, t } = useContext(I18nContext);
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('pulse_auth') === 'true');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'holdings' | 'records' | 'ai' | 'settings' | 'help' | 'market'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Data State
  const [isLoading, setIsLoading] = useState(true);
  const [stocks] = useState<StockPrice[]>(() => 
    INITIAL_STOCKS.map(s => ({ ...s, history: generateMockHistory(s.price) }))
  );
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [capitalLogs, setCapitalLogs] = useState<CapitalLog[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);

  // Modals State
  const [capitalModalOpen, setCapitalModalOpen] = useState(false);
  const [capitalMode, setCapitalMode] = useState<CapitalType>(CapitalType.DEPOSIT);
  const [customCapitalAmount, setCustomCapitalAmount] = useState<string>('');
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockPrice | null>(null);
  
  const [aiOutlook, setAiOutlook] = useState(t.loading);

  useEffect(() => {
    const init = async () => {
      const [txs, logs, cfg] = await Promise.all([
        apiService.getTransactions(),
        apiService.getCapitalLogs(),
        apiService.getConfig()
      ]);
      setTransactions(txs);
      setCapitalLogs(logs);
      setConfig(cfg);
      setIsLoading(false);
    };
    init();
  }, []);

  const holdings = useMemo(() => {
    const hMap: Record<string, { qty: number; totalCost: number }> = {};
    transactions.forEach(t => {
      if (!hMap[t.symbol]) hMap[t.symbol] = { qty: 0, totalCost: 0 };
      if (t.type === TransactionType.BUY) {
        hMap[t.symbol].qty += t.quantity;
        hMap[t.symbol].totalCost += t.total;
      } else {
        const avg = hMap[t.symbol].totalCost / (hMap[t.symbol].qty || 1);
        const sellQty = Math.min(t.quantity, hMap[t.symbol].qty);
        hMap[t.symbol].qty -= sellQty;
        hMap[t.symbol].totalCost -= avg * sellQty;
      }
    });
    return Object.entries(hMap)
      .filter(([_, d]) => d.qty > 0)
      .map(([s, d]) => ({ 
        symbol: s, 
        quantity: d.qty, 
        avgPrice: d.totalCost / (d.qty || 1) 
      }));
  }, [transactions]);

  useEffect(() => {
    if (isLoggedIn && holdings.length > 0) {
      getMarketOutlook(holdings.map(h => h.symbol), lang).then(setAiOutlook);
    } else {
      setAiOutlook(t.outlookPlaceholder);
    }
  }, [isLoggedIn, activeTab, transactions, lang, t.outlookPlaceholder]);

  const totalPrincipal = useMemo(() => 
    capitalLogs.reduce((acc, log) => log.type === CapitalType.DEPOSIT ? acc + log.amount : acc - log.amount, 0), 
  [capitalLogs]);
  
  const assets = useMemo(() => {
    const stockVal = holdings.reduce((acc, h) => acc + (h.quantity * (stocks.find(s => s.symbol === h.symbol)?.price || 0)), 0);
    const buyTotal = transactions.filter(t => t.type === TransactionType.BUY).reduce((acc, t) => acc + t.total, 0);
    const sellTotal = transactions.filter(t => t.type === TransactionType.SELL).reduce((acc, t) => acc + t.total, 0);
    const cash = totalPrincipal - buyTotal + sellTotal;
    const total = stockVal + cash;
    return { 
      stockVal, 
      cash, 
      total, 
      profit: total - totalPrincipal, 
      rate: totalPrincipal > 0 ? ((total - totalPrincipal) / totalPrincipal) * 100 : 0 
    };
  }, [holdings, stocks, transactions, totalPrincipal]);

  const handleCapitalAction = async (type: CapitalType, amount: number) => {
    if (amount <= 0) return;
    const newLog: CapitalLog = { id: Date.now().toString(), date: new Date().toISOString(), type, amount };
    await apiService.saveCapitalLog(newLog);
    setCapitalLogs(prev => [newLog, ...prev]);
    setCapitalModalOpen(false);
    setCustomCapitalAmount('');
  };

  const handleTradeAction = async (qty: number) => {
    if (!selectedStock) return;
    const total = selectedStock.price * qty;
    if (total > assets.cash) {
      alert(t.insufficient_cash);
      return;
    }

    const newTx: Transaction = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      symbol: selectedStock.symbol,
      type: TransactionType.BUY,
      price: selectedStock.price,
      quantity: qty,
      total: total
    };
    
    await apiService.saveTransaction(newTx);
    setTransactions(prev => [newTx, ...prev]);
    setTradeModalOpen(false);
    
    getTradeScore(newTx, `Price ${selectedStock.price}`, lang).then(async score => {
       const updatedTxs = transactions.map(tx => tx.id === newTx.id ? { ...tx, aiScore: score.score, aiAdvice: score.rationale } : tx);
       setTransactions(updatedTxs);
       await apiService.updateTransactions(updatedTxs);
    });
  };

  const handleSellAction = async (symbol: string) => {
    const holding = holdings.find(h => h.symbol === symbol);
    const stock = stocks.find(s => s.symbol === symbol);
    if (!holding || !stock) return;

    const newTx: Transaction = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      symbol: symbol,
      type: TransactionType.SELL,
      price: stock.price,
      quantity: holding.quantity,
      total: stock.price * holding.quantity
    };
    await apiService.saveTransaction(newTx);
    setTransactions(prev => [newTx, ...prev]);
  };

  // 支持 AILab 批量导入
  const handleAddTransactions = async (newTxs: Transaction[]) => {
    const updated = [...newTxs, ...transactions];
    setTransactions(updated);
    await apiService.updateTransactions(updated);
  };

  // 支持 AILab 更新单个交易（复盘）
  const handleUpdateTransaction = async (id: string, updates: Partial<Transaction>) => {
    const updated = transactions.map(tx => tx.id === id ? { ...tx, ...updates } : tx);
    setTransactions(updated);
    await apiService.updateTransactions(updated);
  };

  const handleLoginSuccess = () => {
    localStorage.setItem('pulse_auth', 'true');
    setIsLoggedIn(true);
  };

  if (!isLoggedIn) return <Login onLogin={handleLoginSuccess} />;

  if (isLoading || !config) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
       <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-xs font-black text-slate-400 uppercase tracking-widest">{t.loading}</p>
       </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f7fe] relative">
      {isSidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40" onClick={() => setIsSidebarOpen(false)} />
      )}

      <div className={`fixed inset-y-0 left-0 z-50 transform lg:relative lg:translate-x-0 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar activeTab={activeTab} setActiveTab={(tab) => { setActiveTab(tab); setIsSidebarOpen(false); }} totalAssets={assets.total} assetRate={assets.rate} />
      </div>

      <main className="flex-grow overflow-y-auto custom-scrollbar flex flex-col">
        <header className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-slate-100 sticky top-0 z-30">
          <button onClick={() => setIsSidebarOpen(true)} className="w-10 h-10 flex items-center justify-center text-slate-500 bg-slate-50 rounded-xl"><i className="fas fa-bars"></i></button>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white"><i className="fas fa-pulse text-sm"></i></div>
            <span className="font-black text-slate-900">Wealth Pulse</span>
          </div>
          <button onClick={() => { setCapitalMode(CapitalType.DEPOSIT); setCapitalModalOpen(true); }} className="w-10 h-10 flex items-center justify-center text-indigo-600 bg-indigo-50 rounded-xl"><i className="fas fa-wallet"></i></button>
        </header>

        <div className="p-4 sm:p-6 lg:p-12 max-w-7xl mx-auto w-full">
          <header className="hidden lg:flex justify-between items-center mb-12">
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">
              {activeTab === 'dashboard' && t.dashboard}
              {activeTab === 'market' && t.market}
              {activeTab === 'holdings' && t.holdings}
              {activeTab === 'records' && t.records}
              {activeTab === 'ai' && t.aiLab}
              {activeTab === 'settings' && t.settings}
              {activeTab === 'help' && t.help}
            </h2>
            <button onClick={() => { setCapitalMode(CapitalType.DEPOSIT); setCapitalModalOpen(true); }} className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black shadow-xl shadow-indigo-600/20 hover:scale-[1.02] transition-all flex items-center group">
              <i className="fas fa-wallet mr-3"></i> {t.assetDispatch}
            </button>
          </header>

          {activeTab === 'dashboard' && <Dashboard assets={assets} totalPrincipal={totalPrincipal} holdingsCount={holdings.length} stocks={stocks} holdings={holdings} onTrade={(s) => { setSelectedStock(s); setTradeModalOpen(true); }} onNavigateToAI={() => setActiveTab('ai')} aiOutlook={aiOutlook} />}
          {activeTab === 'market' && <MarketSearch stocks={stocks} onTrade={(s) => { setSelectedStock(s); setTradeModalOpen(true); }} />}
          {activeTab === 'holdings' && <Holdings holdings={holdings} stocks={stocks} onSell={handleSellAction} />}
          {activeTab === 'records' && <Records transactions={transactions} capitalLogs={capitalLogs} />}
          {activeTab === 'ai' && <AILab stocks={stocks} transactions={transactions} onAddTransactions={handleAddTransactions} onUpdateTransaction={handleUpdateTransaction} />}
          {activeTab === 'settings' && <Settings config={config} onUpdateConfig={(cfg) => { const newCfg = { ...config, ...cfg }; setConfig(newCfg); apiService.saveConfig(newCfg); }} />}
          {activeTab === 'help' && <Help />}
        </div>

        {/* 资产调度弹窗 */}
        <Modal isOpen={capitalModalOpen} onClose={() => setCapitalModalOpen(false)} title={t.assetDispatch}>
          <div className="space-y-6">
            <div className="flex bg-slate-100 p-1.5 rounded-2xl">
              <button 
                onClick={() => setCapitalMode(CapitalType.DEPOSIT)} 
                className={`flex-grow py-3 rounded-xl text-[10px] font-black uppercase transition-all ${capitalMode === CapitalType.DEPOSIT ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
              >
                {t.deposit}
              </button>
              <button 
                onClick={() => setCapitalMode(CapitalType.WITHDRAW)} 
                className={`flex-grow py-3 rounded-xl text-[10px] font-black uppercase transition-all ${capitalMode === CapitalType.WITHDRAW ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}
              >
                {t.withdraw}
              </button>
            </div>
            
            <div className="relative">
              <input 
                type="number" 
                value={customCapitalAmount} 
                onChange={(e) => setCustomCapitalAmount(e.target.value)} 
                placeholder="¥ 0.00" 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 text-center text-2xl font-black focus:outline-none focus:border-indigo-500 transition-all" 
              />
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 font-black">¥</div>
            </div>

            <button 
              onClick={() => handleCapitalAction(capitalMode, Number(customCapitalAmount))} 
              className={`w-full py-5 rounded-2xl font-black text-white shadow-xl transition-all hover:scale-[1.02] active:scale-95 ${capitalMode === CapitalType.DEPOSIT ? 'bg-indigo-600 shadow-indigo-200' : 'bg-rose-600 shadow-rose-200'}`}
            >
              {capitalMode === CapitalType.DEPOSIT ? t.deposit : t.withdraw} {t.confirm}
            </button>
          </div>
        </Modal>

        <Modal isOpen={tradeModalOpen} onClose={() => setTradeModalOpen(false)} title={`${t.generateReport}: ${selectedStock?.symbol}`}>
          <div className="space-y-6">
            <input type="number" defaultValue={100} id="buyQty" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-center text-xl font-black outline-none" />
            <button onClick={() => { const qty = Number((document.getElementById('buyQty') as HTMLInputElement).value); handleTradeAction(qty); }} className="w-full bg-slate-950 text-white py-6 rounded-3xl font-black uppercase tracking-widest">{t.execute}</button>
          </div>
        </Modal>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>(() => (localStorage.getItem('pulse_lang') as Language) || 'zh');
  const t = useMemo(() => translations[lang], [lang]);

  useEffect(() => {
    localStorage.setItem('pulse_lang', lang);
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, t, setLang }}>
      <AppContent />
    </I18nContext.Provider>
  );
};

export default App;
