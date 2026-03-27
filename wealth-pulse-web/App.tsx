
import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';
import {
  Transaction,
  TransactionType,
  CapitalLog,
  CapitalType,
  StockPrice,
  AppConfig
} from './types';
import { apiService } from './services/backend';
import { capitalApi } from './services/capitalApi';
import { userApi, DashboardData, PositionsDashboardData } from './services/userApi';
import { Language, translations } from './i18n';
import { httpClient } from './services/http';
import { stockApi } from './services/stockApi';
import { tradeApi } from './services/tradeApi';
import { ToastProvider, useToast, ToastContainerWrapper } from './contexts/ToastContext';
import { userConfigApi } from './services/userConfigApi';

// Components
import Modal from './components/Modal';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import TradeModal from './components/TradeModal';
import LLMProviderModal from './components/LLMProviderModal';

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

interface AppContentProps {
  toast?: any;
}

const AppContent: React.FC<AppContentProps> = ({ toast }) => {
  const { lang, t } = useContext(I18nContext);
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('pulse_auth') === 'true');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'holdings' | 'records' | 'ai' | 'settings' | 'help' | 'market'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Data State
  const [isLoading, setIsLoading] = useState(true);
  const [stocks, setStocks] = useState<StockPrice[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [capitalLogs, setCapitalLogs] = useState<CapitalLog[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [user, setUser] = useState<{ nickName: string; email: string; avatar?: string } | null>(null);
  const [capitalRefreshTrigger, setCapitalRefreshTrigger] = useState(0);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [positionsDashboardData, setPositionsDashboardData] = useState<PositionsDashboardData | null>(null);
  const [isRefreshingDashboard, setIsRefreshingDashboard] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [nextRefreshTime, setNextRefreshTime] = useState<Date | null>(null);

  // Modals State
  const [capitalModalOpen, setCapitalModalOpen] = useState(false);
  const [capitalMode, setCapitalMode] = useState<CapitalType>(CapitalType.DEPOSIT);
  const [customCapitalAmount, setCustomCapitalAmount] = useState<string>('');
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockPrice | null>(null);
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [sellStock, setSellStock] = useState<StockPrice | null>(null);
  const [sellMaxQuantity, setSellMaxQuantity] = useState<number>(0);
  const [isClearingPosition, setIsClearingPosition] = useState(false);
  const [llmModalOpen, setLlmModalOpen] = useState(false);

  // Toast state
  const [toasts, setToasts] = useState<any[]>([]);

  const [aiOutlook, setAiOutlook] = useState(t.outlookPlaceholder);

  useEffect(() => {
    const init = async () => {
      try {
        // 只加载本地数据，不请求需要认证的 API
        const txs = await apiService.getTransactions();
        setTransactions(txs);
        // capitalLogs 将在登录后通过 Records 组件按需加载
        setCapitalLogs([]);
        // 配置将在登录后通过 userConfigApi 加载
        setConfig(null);
      } catch (e) {
        console.error('初始化失败', e);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // 登录后拉取用户信息和资产摘要
  useEffect(() => {
    const fetchUserData = async () => {
      if (!isLoggedIn) {
        setDashboardData(null);
        setPositionsDashboardData(null);
        setConfig(null);
        return;
      }
      try {
        // 并行获取用户信息、Dashboard数据、持仓数据和交易记录
        const [userRes, dashboard, positions, tradeRecords, userConfig] = await Promise.all([
          httpClient.get('/api/user/getUser', { autoHandleAuthError: true }),
          userApi.getDashboard().catch(() => null),
          userApi.getPositionsDashboard().catch(() => null),
          tradeApi.getRecordPage({ pageNum: 1, pageSize: 1000 }).catch(() => null),
          userConfigApi.getConfig().catch(() => null)
        ]);

        // 处理用户信息
        if (userRes) {
          if (userRes?.code === 200 && userRes?.data) {
            console.log('用户信息:', userRes.data);
            setUser(userRes.data);
          }
        }

        // 处理Dashboard数据
        if (dashboard) {
          console.log('Dashboard数据:', dashboard);
          setDashboardData(dashboard);
        }

        // 处理持仓数据
        if (positions) {
          console.log('持仓数据:', positions);
          setPositionsDashboardData(positions);

          // 从后端持仓数据动态构建 stocks 数组
          const backendStocks = positions.positions.map(p => ({
            symbol: p.stockCode,
            name: p.shortName || p.companyName || p.stockCode,
            price: p.currentPrice,
            change: 0,
            changePercent: p.changePercent || 0,
            high: p.currentPrice,
            low: p.currentPrice,
            open: p.currentPrice,
            volume: 0,
            history: []
          }));
          setStocks(backendStocks);
          console.log('从后端构建 stocks 数组:', backendStocks);
        }

        // 处理交易记录：从后端同步到本地状态
        if (tradeRecords?.rows) {
          console.log('从后端获取交易记录:', tradeRecords.rows);
          const backendTransactions: Transaction[] = tradeRecords.rows.map(r => ({
            id: r.id,
            date: r.executionDatetime || r.executionDate,
            symbol: r.stockCode,
            type: r.instruction === 'BUY' ? TransactionType.BUY : TransactionType.SELL,
            price: r.price,
            quantity: r.quantity,
            total: r.totalAmount,
          }));
          setTransactions(backendTransactions);
          // 同步到 localStorage（用于 AILab 等离线功能）
          await apiService.updateTransactions(backendTransactions);
        } else {
          // 没有交易记录时清空
          setTransactions([]);
          await apiService.updateTransactions([]);
        }

        // 处理用户配置
        if (userConfig) {
          console.log('用户配置:', userConfig);
          setConfig(userConfig);
          localStorage.setItem('app_config', JSON.stringify(userConfig));
        } else {
          // 如果后端配置获取失败，使用默认配置
          console.log('未获取到用户配置，使用默认配置');
          const defaultConfig = {
            email: 'admin@pulse.ai',
            emailEnabled: false,
            feishuWebhook: '',
            feishuEnabled: false,
            notifyReviewComplete: true,
            notifyVisionReady: true,
            notifyMarketAlert: false,
            notifyPortfolioRisk: true
          };
          setConfig(defaultConfig);
          localStorage.setItem('app_config', JSON.stringify(defaultConfig));
        }
      } catch (e) {
        console.error('获取用户数据失败', e);
        // 发生错误时使用默认配置
        const errorDefaultConfig = {
          email: 'admin@pulse.ai',
          emailEnabled: false,
          feishuWebhook: '',
          feishuEnabled: false,
          notifyReviewComplete: true,
          notifyVisionReady: true,
          notifyMarketAlert: false,
          notifyPortfolioRisk: true
        };
        setConfig(errorDefaultConfig);
        localStorage.setItem('app_config', JSON.stringify(errorDefaultConfig));
      }
    };
    fetchUserData();
  }, [isLoggedIn]);

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

  const totalPrincipal = useMemo(() => {
    // 如果有后端Dashboard数据，优先使用
    if (dashboardData) {
      return dashboardData.totalPrincipal;
    }
    // 否则使用本地计算
    return capitalLogs.reduce((acc, log) => log.type === CapitalType.DEPOSIT ? acc + log.amount : acc - log.amount, 0);
  }, [capitalLogs, dashboardData]);

  const assets = useMemo(() => {
    // 如果有后端Dashboard数据，优先使用
    if (dashboardData) {
      return {
        stockVal: dashboardData.positionValue,
        cash: dashboardData.availableCash,
        total: dashboardData.totalAssets,
        profit: dashboardData.cumulativeProfitLoss,
        rate: dashboardData.cumulativeProfitLossRate
      };
    }
    // 默认值
    return {
      stockVal: 0,
      cash: 0,
      total: 0,
      profit: 0,
      rate: 0
    };
  }, [dashboardData]);

  // 刷新Dashboard数据
  const refreshDashboardData = async () => {
    if (!isLoggedIn) return;
    setIsRefreshingDashboard(true);
    try {
      // 并行刷新Dashboard数据和持仓数据
      const [dashboard, positions] = await Promise.all([
        userApi.getDashboard(),
        userApi.getPositionsDashboard().catch(() => null)
      ]);

      console.log('刷新Dashboard数据:', dashboard);
      setDashboardData(dashboard);

      if (positions) {
        console.log('刷新持仓数据:', positions);
        setPositionsDashboardData(positions);

        // 从后端持仓数据动态构建 stocks 数组
        const backendStocks = positions.positions.map(p => ({
          symbol: p.stockCode,
          name: p.shortName || p.companyName || p.stockCode,
          price: p.currentPrice,
          change: 0,
          changePercent: p.changePercent || 0,
          high: p.currentPrice,
          low: p.currentPrice,
          open: p.currentPrice,
          volume: 0,
          history: []
        }));
        setStocks(backendStocks);
        console.log('从后端更新 stocks 数组:', backendStocks);
      }

      const now = new Date();
      setLastRefreshTime(now);
      setNextRefreshTime(new Date(now.getTime() + 30000)); // 下次刷新时间：30秒后
    } catch (e) {
      console.error('刷新Dashboard数据失败', e);
    } finally {
      setIsRefreshingDashboard(false);
    }
  };

  // 定时刷新Dashboard数据（每30秒刷新一次）
  useEffect(() => {
    if (!isLoggedIn) return;

    // 初始化时立即刷新一次
    refreshDashboardData();

    // 设置定时刷新
    const interval = setInterval(() => {
      refreshDashboardData();
    }, 30000); // 30秒刷新一次

    return () => clearInterval(interval);
  }, [isLoggedIn]);

  // 计算倒计时进度百分比（用于进度条）
  const [tick, setTick] = useState(0);
  const refreshProgress = useMemo(() => {
    if (!lastRefreshTime || !nextRefreshTime) {
      return { progress: 0, remainingSeconds: 30 };
    }
    const now = Date.now();
    const total = 30000; // 30秒
    const elapsed = now - lastRefreshTime.getTime();
    const remaining = Math.max(0, nextRefreshTime.getTime() - now);
    const progress = Math.min(100, (elapsed / total) * 100);
    return {
      progress,
      remainingSeconds: Math.ceil(remaining / 1000)
    };
  }, [lastRefreshTime, nextRefreshTime, tick]);

  // 每秒更新一次进度条显示
  useEffect(() => {
    if (!isLoggedIn) return;
    const interval = setInterval(() => {
      setTick(tick => tick + 1);
    }, 100); // 每100ms更新一次，让倒计时更流畅
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  const handleCapitalAction = async (type: CapitalType, amount: number) => {
    if (amount <= 0) return;
    try {
      const body = { amount, currency: 'HKD' as const };
      if (type === CapitalType.DEPOSIT) {
        await capitalApi.deposit(body);
      } else {
        await capitalApi.withdraw(body);
      }
      const newLog: CapitalLog = { id: Date.now().toString(), date: new Date().toISOString(), type, amount };
      setCapitalLogs(prev => [newLog, ...prev]);
      setCapitalRefreshTrigger(Date.now());
      setCapitalModalOpen(false);
      setCustomCapitalAmount('');

      // 刷新Dashboard数据
      await refreshDashboardData();

      toast.showSuccess(type === CapitalType.DEPOSIT ? '入金成功' : '提现成功');
    } catch (e: any) {
      toast.showError(e?.message || (type === CapitalType.DEPOSIT ? '入金失败' : '提现失败'));
    }
  };

  // 交易成功后的处理
  const handleTradeSuccess = async (newTx: Transaction) => {
    await apiService.saveTransaction(newTx);
    setTransactions(prev => [newTx, ...prev]);

    // 刷新Dashboard数据
    await refreshDashboardData();
  };

  // 从持仓页面点击买入
  const handleBuyFromHoldings = (symbol: string) => {
    console.log('买入按钮点击，股票代码:', symbol);
    let stock = stocks.find(s => s.symbol === symbol);

    // 如果找不到，尝试从后端持仓数据中查找
    if (!stock && positionsDashboardData?.positions) {
      const position = positionsDashboardData.positions.find(p => p.stockCode === symbol);
      if (position) {
        stock = {
          symbol: position.stockCode,
          name: position.shortName || position.companyName || position.stockCode,
          price: position.currentPrice,
          change: 0,
          changePercent: position.changePercent || 0,
          high: position.currentPrice,
          low: position.currentPrice,
          open: position.currentPrice,
          volume: 0,
          history: []
        };
        console.log('从后端持仓数据找到股票:', stock);
      }
    }

    console.log('最终找到的股票:', stock);

    if (stock) {
      setSelectedStock(stock);
      setTradeModalOpen(true);
    } else {
      console.error('未找到股票:', symbol);
      const minimalStock: StockPrice = {
        symbol,
        name: symbol,
        price: 0,
        change: 0,
        changePercent: 0,
        high: 0,
        low: 0,
        open: 0,
        volume: 0,
        history: []
      };
      setSelectedStock(minimalStock);
      setTradeModalOpen(true);
    }
  };

  // 从持仓页面点击卖出
  const handleSellFromHoldings = async (symbol: string, quantity: number) => {
    console.log('卖出按钮点击，股票代码:', symbol, '数量:', quantity);
    let stock = stocks.find(s => s.symbol === symbol);

    // 如果找不到，尝试从后端持仓数据中查找
    if (!stock && positionsDashboardData?.positions) {
      const position = positionsDashboardData.positions.find(p => p.stockCode === symbol);
      if (position) {
        stock = {
          symbol: position.stockCode,
          name: position.shortName || position.companyName || position.stockCode,
          price: position.currentPrice,
          change: 0,
          changePercent: position.changePercent || 0,
          high: position.currentPrice,
          low: position.currentPrice,
          open: position.currentPrice,
          volume: 0,
          history: []
        };
        console.log('从后端持仓数据找到股票:', stock);
      }
    }

    if (!stock) {
      console.error('未找到股票:', symbol);
      stock = {
        symbol,
        name: symbol,
        price: 0,
        change: 0,
        changePercent: 0,
        high: 0,
        low: 0,
        open: 0,
        volume: 0,
        history: []
      };
    }

    setSellStock(stock);
    setSellMaxQuantity(quantity);
    setSellModalOpen(true);
  };

  // 清仓（卖出全部持仓）
  const handleClearPosition = async (symbol: string) => {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) return;

    // 优先使用本地 holdings 数量
    let quantity = holdings.find(h => h.symbol === symbol)?.quantity;

    // 如果本地没有持仓记录，则从后端 positionsDashboard 中兜底
    if (!quantity || quantity <= 0) {
      const backendPosition = positionsDashboardData?.positions?.find(p => p.stockCode === symbol);
      if (!backendPosition || backendPosition.quantity <= 0) {
        return;
      }
      quantity = backendPosition.quantity;
    }

    if (!confirm(`确定要清仓 ${symbol} 吗？将卖出全部 ${quantity} 股。`)) {
      return;
    }

    setIsClearingPosition(true);
    try {
      // 调用后端卖出接口
      await tradeApi.sellStock({
        stockCode: symbol,
        quantity,
        price: stock.price,
        currency: 'HKD',
      });

      // 创建本地交易记录
      const total = stock.price * quantity;
      const newTx: Transaction = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        symbol: symbol,
        type: TransactionType.SELL,
        price: stock.price,
        quantity,
        total: total,
      };

      await apiService.saveTransaction(newTx);
      setTransactions(prev => [newTx, ...prev]);

      // 刷新Dashboard数据
      await refreshDashboardData();

      toast.showSuccess(`清仓 ${symbol} 成功`);
    } catch (e: any) {
      toast.showError(e?.message || '清仓失败');
    } finally {
      setIsClearingPosition(false);
    }
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
    // 登录成功后清除本地的模拟数据，使用后端真实数据
    localStorage.removeItem('stock_transactions');
    localStorage.removeItem('stock_capital');
    localStorage.setItem('pulse_auth', 'true');
    setIsLoggedIn(true);
  };

  // 登出处理
  const handleLogout = async () => {
    try {
      // 调用后端登出 API
      await httpClient.post('/api/logout', {}, { autoHandleAuthError: false });
    } catch (e) {
      // 登出失败也继续执行本地清理
      console.error('登出 API 调用失败', e);
    } finally {
      // 清除本地 token 和认证状态
      httpClient.setToken('');
      localStorage.removeItem('pulse_token');
      localStorage.removeItem('pulse_auth');
      // 清除用户相关数据
      setUser(null);
      setDashboardData(null);
      setPositionsDashboardData(null);
      setTransactions([]);
      setCapitalLogs([]);
      // 更新登录状态
      setIsLoggedIn(false);
    }
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
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => { setActiveTab(tab); setIsSidebarOpen(false); }}
          totalAssets={assets.total || 0}
          assetRate={assets.rate || 0}
          user={user || undefined}
          config={config}
          onOpenLLMModal={() => setLlmModalOpen(true)}
          onLogout={handleLogout}
        />
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

          {activeTab === 'dashboard' && <Dashboard assets={assets} totalPrincipal={totalPrincipal} holdingsCount={holdings.length} stocks={stocks} holdings={holdings} onTrade={(s) => { setSelectedStock(s); setTradeModalOpen(true); }} positionsDashboard={positionsDashboardData} isRefreshing={isRefreshingDashboard} lastRefreshTime={lastRefreshTime} refreshProgress={refreshProgress} onManualRefresh={refreshDashboardData} />}
          {activeTab === 'market' && <MarketSearch onTrade={(s) => { setSelectedStock(s); setTradeModalOpen(true); }} />}
          {activeTab === 'holdings' && (
            <Holdings
              holdings={holdings}
              stocks={stocks}
              onBuy={handleBuyFromHoldings}
              onSell={handleSellFromHoldings}
              onClear={handleClearPosition}
              positionsDashboard={positionsDashboardData}
              isRefreshing={isRefreshingDashboard}
              refreshProgress={refreshProgress}
              onManualRefresh={refreshDashboardData}
            />
          )}
          {activeTab === 'records' && <Records transactions={transactions} capitalRefreshTrigger={capitalRefreshTrigger} />}
          {activeTab === 'ai' && <AILab stocks={stocks} transactions={transactions} config={config} toast={toast} onAddTransactions={handleAddTransactions} onUpdateTransaction={handleUpdateTransaction} />}
          {activeTab === 'settings' && <Settings config={config} onUpdateConfig={(cfg) => { const newCfg = { ...config, ...cfg }; setConfig(newCfg); localStorage.setItem('app_config', JSON.stringify(newCfg)); userConfigApi.saveConfig(newCfg).then(() => { toast.showSuccess(lang === 'zh' ? '设置已保存' : 'Settings saved'); }).catch((err) => { console.error('保存配置失败:', err); toast.showError(lang === 'zh' ? '保存失败' : 'Save failed'); }); }} toast={toast} />}
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

        <TradeModal
          isOpen={tradeModalOpen}
          onClose={() => setTradeModalOpen(false)}
          stock={selectedStock}
          mode="BUY"
          assets={assets}
          onSuccess={handleTradeSuccess}
          toast={toast}
          translations={{
            buyStock: t.buyStock,
            execute: t.execute,
            insufficient_cash: t.insufficient_cash,
          }}
        />

        <TradeModal
          isOpen={sellModalOpen}
          onClose={() => setSellModalOpen(false)}
          stock={sellStock}
          mode="SELL"
          maxQuantity={sellMaxQuantity}
          onSuccess={handleTradeSuccess}
          toast={toast}
          translations={{
            sellStock: t.sellStock,
          }}
        />

        {/* LLM 供应商配置弹窗 */}
        <LLMProviderModal
          isOpen={llmModalOpen}
          onClose={() => setLlmModalOpen(false)}
          config={config}
          onUpdateConfig={(cfg) => { const newCfg = { ...config, ...cfg }; setConfig(newCfg); localStorage.setItem('app_config', JSON.stringify(newCfg)); userConfigApi.saveConfig(newCfg).catch((err) => { console.error('保存配置失败:', err); }); }}
          lang={lang}
          toast={toast}
        />
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
    <ToastProvider>
      <I18nContext.Provider value={{ lang, t, setLang }}>
        <AppContentWrapper />
      </I18nContext.Provider>
    </ToastProvider>
  );
};

// Wrapper component to get toast state
const AppContentWrapper: React.FC = () => {
  const toast = useToast();
  const [toasts, setToasts] = useState<any[]>([]);

  // 默认显示时长（毫秒）
  const DEFAULT_DURATIONS = {
    success: 3000,  // 成功：3 秒
    error: 5000,    // 错误：5 秒（给用户更多时间阅读）
    warning: 4000,  // 警告：4 秒
    info: 3000,     // 信息：3 秒
  };

  // Override toast methods to manage local state
  const showToast = (message: string, type: any, duration?: number) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const finalDuration = duration ?? DEFAULT_DURATIONS[type] ?? 3000;
    setToasts((prev: any[]) => [...prev, { id, type, message, duration: finalDuration }]);

    // 设置定时器自动移除 toast
    setTimeout(() => {
      setToasts((prev: any[]) => prev.filter((t) => t.id !== id));
    }, finalDuration);
  };

  // Custom toast object for AppContent
  const customToast = {
    showSuccess: (message: string, duration?: number) => showToast(message, 'success', duration),
    showError: (message: string, duration?: number) => showToast(message, 'error', duration),
    showWarning: (message: string, duration?: number) => showToast(message, 'warning', duration),
    showInfo: (message: string, duration?: number) => showToast(message, 'info', duration),
    showToast: (message: string, type?: any, duration?: number) => showToast(message, type || 'info', duration),
  };

  return (
    <>
      <AppContent toast={customToast as any} />
      <ToastContainerWrapper
        toasts={toasts}
        onRemove={(id) => setToasts((prev: any[]) => prev.filter((t: any) => t.id !== id))}
      />
    </>
  );
};

export default App;
