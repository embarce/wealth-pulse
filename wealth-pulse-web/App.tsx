
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
import { getTradeScore, getMarketOutlook } from './services/gemini';
import { Language, translations } from './i18n';
import { httpClient } from './services/http';
import { stockApi, FeeCalculationResponse, StockInfo } from './services/stockApi';
import { tradeApi } from './services/tradeApi';
import { ToastProvider, useToast, ToastContainerWrapper } from './contexts/ToastContext';

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

  // Trade form state
  const [tradeQuantity, setTradeQuantity] = useState<number>(100);
  const [tradePrice, setTradePrice] = useState<number>(0);
  const [tradeFee, setTradeFee] = useState<FeeCalculationResponse | null>(null);
  const [tradeTime, setTradeTime] = useState<string>(new Date().toISOString().slice(0, 16));
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [isLoadingFee, setIsLoadingFee] = useState(false);
  const [isTradeExecuting, setIsTradeExecuting] = useState(false);
  const [tradeStockInfo, setTradeStockInfo] = useState<StockInfo | null>(null);

  // Sell form state
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [sellStock, setSellStock] = useState<StockPrice | null>(null);
  const [sellQuantity, setSellQuantity] = useState<number>(0);
  const [sellPrice, setSellPrice] = useState<number>(0);
  const [sellFee, setSellFee] = useState<FeeCalculationResponse | null>(null);
  const [isLoadingSellFee, setIsLoadingSellFee] = useState(false);
  const [sellStockInfo, setSellStockInfo] = useState<StockInfo | null>(null);

  // Toast state
  const [toasts, setToasts] = useState<any[]>([]);

  const [aiOutlook, setAiOutlook] = useState(t.loading);

  // 当打开交易模态框或选中股票变化时，获取实时价格和股票信息
  useEffect(() => {
    if (!tradeModalOpen || !selectedStock) {
      setTradePrice(0);
      setTradeFee(null);
      setTradeStockInfo(null);
      return;
    };

    const fetchStockData = async () => {
      setIsLoadingPrice(true);
      try {
        // 并行获取实时行情和股票信息
        const [marketData, stockInfo] = await Promise.all([
          stockApi.getMarketData(selectedStock.symbol),
          stockApi.getStockInfo(selectedStock.symbol).catch(() => null)
        ]);

        setTradePrice(Number(marketData.lastPrice));
        if (stockInfo) {
          setTradeStockInfo(stockInfo);
        }
      } catch (e) {
        console.error('获取股票数据失败', e);
        // 使用本地价格作为后备
        setTradePrice(selectedStock.price);
      } finally {
        setIsLoadingPrice(false);
      }
    };

    fetchStockData();
  }, [tradeModalOpen, selectedStock]);

  // 当打开卖出模态框或选中股票变化时，获取股票信息
  useEffect(() => {
    if (!sellModalOpen || !sellStock) {
      setSellStockInfo(null);
      return;
    };

    const fetchSellStockInfo = async () => {
      try {
        const stockInfo = await stockApi.getStockInfo(sellStock.symbol);
        setSellStockInfo(stockInfo);
      } catch (e) {
        console.error('获取卖出股票信息失败', e);
      }
    };

    fetchSellStockInfo();
  }, [sellModalOpen, sellStock]);

  // 当价格或数量变化时，计算手续费
  useEffect(() => {
    if (!tradePrice || !tradeQuantity || !tradeModalOpen) {
      setTradeFee(null);
      return;
    }

    const calculateFee = async () => {
      setIsLoadingFee(true);
      try {
        const amount = tradePrice * tradeQuantity;
        const feeResult = await stockApi.calculateFee({
          instruction: 'BUY',
          amount: amount,
          currency: 'HKD'
        });
        setTradeFee(feeResult);
      } catch (e) {
        console.error('计算手续费失败', e);
        setTradeFee(null);
      } finally {
        setIsLoadingFee(false);
      }
    };

    calculateFee();
  }, [tradePrice, tradeQuantity, tradeModalOpen]);

  // 当卖出数量或价格变化时，计算卖出手续费
  useEffect(() => {
    if (!sellPrice || !sellQuantity || !sellModalOpen) {
      setSellFee(null);
      return;
    }

    const calculateSellFee = async () => {
      setIsLoadingSellFee(true);
      try {
        const amount = sellPrice * sellQuantity;
        const feeResult = await stockApi.calculateFee({
          instruction: 'SELL',
          amount: amount,
          currency: 'HKD'
        });
        setSellFee(feeResult);
      } catch (e) {
        console.error('计算卖出手续费失败', e);
        setSellFee(null);
      } finally {
        setIsLoadingSellFee(false);
      }
    };

    calculateSellFee();
  }, [sellPrice, sellQuantity, sellModalOpen]);

  useEffect(() => {
    const init = async () => {
      try {
        // 只加载本地数据，不请求需要认证的 API
        const [txs, cfg] = await Promise.all([
          apiService.getTransactions(),
          apiService.getConfig(),
        ]);
        setTransactions(txs);
        setConfig(cfg);
        // capitalLogs 将在登录后通过 Records 组件按需加载
        setCapitalLogs([]);
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
        return;
      }
      try {
        // 并行获取用户信息、Dashboard数据和持仓数据
        const [userRes, dashboard, positions] = await Promise.all([
          httpClient.get('/api/user/getUser', { autoHandleAuthError: true }),
          userApi.getDashboard().catch(() => null),
          userApi.getPositionsDashboard().catch(() => null)
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
      } catch (e) {
        console.error('获取用户数据失败', e);
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

  useEffect(() => {
    if (isLoggedIn && holdings.length > 0) {
      getMarketOutlook(holdings.map(h => h.symbol), lang).then(setAiOutlook);
    } else {
      setAiOutlook(t.outlookPlaceholder);
    }
  }, [isLoggedIn, activeTab, transactions, lang, t.outlookPlaceholder]);

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

    // 否则使用本地计算
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
  }, [holdings, stocks, transactions, totalPrincipal, dashboardData]);

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

  const handleTradeAction = async () => {
    if (!selectedStock || !tradePrice) return;

    const total = tradePrice * tradeQuantity;
    const feeAmount = tradeFee?.totalFee || 0;
    const totalWithFee = total + feeAmount;

    if (totalWithFee > assets.cash) {
      toast.showError(t.insufficient_cash);
      return;
    }

    setIsTradeExecuting(true);
    try {
      // 调用后端买入接口
      await tradeApi.buyStock({
        stockCode: selectedStock.symbol,
        quantity: tradeQuantity,
        price: tradePrice,
        currency: 'HKD',
      });

      // 创建本地交易记录（用于前端展示）
      const newTx: Transaction = {
        id: Date.now().toString(),
        date: new Date(tradeTime).toISOString(),
        symbol: selectedStock.symbol,
        type: TransactionType.BUY,
        price: tradePrice,
        quantity: tradeQuantity,
        total: total,
        fee: feeAmount,
        tradeTime: tradeTime
      };

      await apiService.saveTransaction(newTx);
      setTransactions(prev => [newTx, ...prev]);
      setTradeModalOpen(false);

      // 重置表单
      setTradeQuantity(100);
      setTradeTime(new Date().toISOString().slice(0, 16));

      // 刷新Dashboard数据
      await refreshDashboardData();

      // 获取 AI 评分
      getTradeScore(newTx, `Price ${tradePrice}`, lang).then(async score => {
        const updatedTxs = transactions.map(tx => tx.id === newTx.id ? { ...tx, aiScore: score.score, aiAdvice: score.rationale } : tx);
        setTransactions(updatedTxs);
        await apiService.updateTransactions(updatedTxs);
      });
      toast.showSuccess('买入成功');
    } catch (e: any) {
      toast.showError(e?.message || '买入失败');
    } finally {
      setIsTradeExecuting(false);
    }
  };

  // 从持仓页面点击买入
  const handleBuyFromHoldings = (symbol: string) => {
    console.log('买入按钮点击，股票代码:', symbol);
    // 优先从 stocks 中查找
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
    console.log('当前 stocks 数量:', stocks.length);

    if (stock) {
      setSelectedStock(stock);
      setTradeModalOpen(true);
      console.log('交易弹窗已打开');
    } else {
      console.error('未找到股票:', symbol);
      // 如果还是找不到，创建最小可用的股票对象
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
    // 优先从 stocks 中查找
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

    if (!stock) {
      console.error('未找到股票:', symbol);
      // 如果还是找不到，创建最小可用的股票对象
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
      stock = minimalStock;
    }

    setSellStock(stock);
    setSellQuantity(quantity);
    setSellPrice(stock.price);
    setSellModalOpen(true);
    console.log('卖出弹窗已打开');
  };

  // 执行卖出
  const handleExecuteSell = async () => {
    if (!sellStock || !sellPrice) return;

    setIsTradeExecuting(true);
    try {
      // 调用后端卖出接口
      await tradeApi.sellStock({
        stockCode: sellStock.symbol,
        quantity: sellQuantity,
        price: sellPrice,
        currency: 'HKD',
      });

      // 创建本地交易记录
      const total = sellPrice * sellQuantity;
      const newTx: Transaction = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        symbol: sellStock.symbol,
        type: TransactionType.SELL,
        price: sellPrice,
        quantity: sellQuantity,
        total: total,
        fee: sellFee?.totalFee || 0,
      };

      await apiService.saveTransaction(newTx);
      setTransactions(prev => [newTx, ...prev]);
      setSellModalOpen(false);

      // 重置表单
      setSellStock(null);
      setSellQuantity(0);
      setSellPrice(0);
      setSellFee(null);

      // 刷新Dashboard数据
      await refreshDashboardData();

      toast.showSuccess('卖出成功');
    } catch (e: any) {
      toast.showError(e?.message || '卖出失败');
    } finally {
      setIsTradeExecuting(false);
    }
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

    setIsTradeExecuting(true);
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
      setIsTradeExecuting(false);
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
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={(tab) => { setActiveTab(tab); setIsSidebarOpen(false); }} 
          totalAssets={assets.total} 
          assetRate={assets.rate}
          user={user || undefined}
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

          {activeTab === 'dashboard' && <Dashboard assets={assets} totalPrincipal={totalPrincipal} holdingsCount={holdings.length} stocks={stocks} holdings={holdings} onTrade={(s) => { setSelectedStock(s); setTradeModalOpen(true); }} onNavigateToAI={() => setActiveTab('ai')} aiOutlook={aiOutlook} positionsDashboard={positionsDashboardData} isRefreshing={isRefreshingDashboard} lastRefreshTime={lastRefreshTime} refreshProgress={refreshProgress} onManualRefresh={refreshDashboardData} />}
          {activeTab === 'market' && <MarketSearch stocks={stocks} onTrade={(s) => { setSelectedStock(s); setTradeModalOpen(true); }} />}
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

        <Modal isOpen={tradeModalOpen} onClose={() => setTradeModalOpen(false)} title={`${t.buyStock} ${selectedStock?.symbol}`}>
          <div className="space-y-5">
            {/* 股票信息 */}
            {tradeStockInfo && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-800">{tradeStockInfo.companyNameCn || tradeStockInfo.companyName}</h4>
                  <span className="text-[10px] font-black bg-indigo-100 text-indigo-600 px-2 py-1 rounded-lg">
                    {tradeStockInfo.stockType}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="text-slate-600">行业: <span className="font-black text-slate-800">{tradeStockInfo.industry || '-'}</span></div>
                  <div className="text-slate-600">市值: <span className="font-black text-slate-800">{tradeStockInfo.marketCap || '-'}</span></div>
                </div>
              </div>
            )}

            {/* 实时价格 */}
            <div className="bg-indigo-50 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-indigo-600 uppercase tracking-wider">实时价格</span>
                {isLoadingPrice ? (
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span className="text-2xl font-black text-indigo-600">¥{tradePrice.toFixed(2)}</span>
                )}
              </div>
            </div>

            {/* 数量输入 */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                买入数量
              </label>
              <input
                type="number"
                value={tradeQuantity}
                onChange={(e) => setTradeQuantity(Number(e.target.value))}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-center text-xl font-black outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            {/* 交易金额 */}
            <div className="bg-slate-50 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-400 uppercase tracking-wider">交易金额</span>
                <span className="text-lg font-black text-slate-900">¥{(tradePrice * tradeQuantity).toFixed(2)}</span>
              </div>
            </div>

            {/* 手续费明细 */}
            {tradeFee && (
              <div className="bg-amber-50 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-600 uppercase tracking-wider">手续费明细</span>
                  <span className="text-sm font-black text-amber-600">¥{tradeFee.totalFee.toFixed(2)}</span>
                </div>
                <div className="space-y-1 text-[10px] text-amber-500/70">
                  <div className="flex justify-between">
                    <span>平台费</span>
                    <span>¥{tradeFee.platformFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>印花税</span>
                    <span>¥{tradeFee.stampDuty.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>证监会征费</span>
                    <span>¥{tradeFee.sfcLevy.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>交易所交易费</span>
                    <span>¥{tradeFee.exchangeTradingFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>结算费</span>
                    <span>¥{tradeFee.settlementFee.toFixed(2)}</span>
                  </div>
                  {tradeFee.frcLevy > 0 && (
                    <div className="flex justify-between">
                      <span>会财局征费</span>
                      <span>¥{tradeFee.frcLevy.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 金额汇总 */}
            <div className="bg-slate-900 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white/70 uppercase tracking-wider">交易金额</span>
                <span className="text-lg font-black text-white/90">¥{(tradePrice * tradeQuantity).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-400 uppercase tracking-wider">手续费</span>
                <span className="text-lg font-black text-amber-400">¥{(tradeFee?.totalFee || 0).toFixed(2)}</span>
              </div>
              <div className="border-t border-white/20 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-white uppercase tracking-wider">总金额</span>
                  <span className="text-2xl font-black text-white">
                    ¥{((tradePrice * tradeQuantity) + (tradeFee?.totalFee || 0)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* 买入时间 */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                买入时间
              </label>
              <input
                type="datetime-local"
                value={tradeTime}
                onChange={(e) => setTradeTime(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-black outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            {/* 执行按钮 */}
            <button
              onClick={handleTradeAction}
              disabled={!tradePrice || isLoadingFee || isTradeExecuting}
              className="w-full bg-slate-950 text-white py-6 rounded-3xl font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition-all"
            >
              {isTradeExecuting ? '执行中...' : (isLoadingFee ? '计算中...' : t.execute)}
            </button>
          </div>
        </Modal>

        {/* 卖出弹窗 */}
        <Modal isOpen={sellModalOpen} onClose={() => setSellModalOpen(false)} title={`${t.sellStock ? t.sellStock : '卖出'} ${sellStock?.symbol}`}>
          <div className="space-y-5">
            {/* 股票信息 */}
            {sellStockInfo && (
              <div className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-800">{sellStockInfo.companyNameCn || sellStockInfo.companyName}</h4>
                  <span className="text-[10px] font-black bg-rose-100 text-rose-600 px-2 py-1 rounded-lg">
                    {sellStockInfo.stockType}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="text-slate-600">行业: <span className="font-black text-slate-800">{sellStockInfo.industry || '-'}</span></div>
                  <div className="text-slate-600">市值: <span className="font-black text-slate-800">{sellStockInfo.marketCap || '-'}</span></div>
                </div>
              </div>
            )}

            {/* 实时价格 */}
            <div className="bg-rose-50 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-rose-600 uppercase tracking-wider">当前价格</span>
                <span className="text-2xl font-black text-rose-600">¥{sellPrice.toFixed(2)}</span>
              </div>
            </div>

            {/* 卖出数量 */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                卖出数量
              </label>
              <input
                type="number"
                value={sellQuantity}
                onChange={(e) => setSellQuantity(Number(e.target.value))}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 text-center text-xl font-black outline-none focus:border-rose-500 transition-all"
              />
              <p className="text-[10px] text-slate-400 font-bold mt-2 text-center">当前持仓: {sellQuantity} 股</p>
            </div>

            {/* 预计收入 */}
            <div className="bg-slate-50 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-400 uppercase tracking-wider">交易金额</span>
                <span className="text-lg font-black text-slate-900">¥{(sellPrice * sellQuantity).toFixed(2)}</span>
              </div>
            </div>

            {/* 手续费明细 */}
            {sellFee && (
              <div className="bg-amber-50 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-600 uppercase tracking-wider">手续费明细</span>
                  <span className="text-sm font-black text-amber-600">¥{sellFee.totalFee.toFixed(2)}</span>
                </div>
                <div className="space-y-1 text-[10px] text-amber-500/70">
                  <div className="flex justify-between">
                    <span>平台费</span>
                    <span>¥{sellFee.platformFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>印花税</span>
                    <span>¥{sellFee.stampDuty.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>证监会征费</span>
                    <span>¥{sellFee.sfcLevy.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>交易所交易费</span>
                    <span>¥{sellFee.exchangeTradingFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>结算费</span>
                    <span>¥{sellFee.settlementFee.toFixed(2)}</span>
                  </div>
                  {sellFee.frcLevy > 0 && (
                    <div className="flex justify-between">
                      <span>会财局征费</span>
                      <span>¥{sellFee.frcLevy.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 实际到账金额 */}
            <div className="bg-emerald-50 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-600 uppercase tracking-wider">预计到账</span>
                <span className="text-2xl font-black text-emerald-600">
                  ¥{((sellPrice * sellQuantity) - (sellFee?.totalFee || 0)).toFixed(2)}
                </span>
              </div>
            </div>

            {/* 执行卖出按钮 */}
            <button
              onClick={handleExecuteSell}
              disabled={!sellPrice || isTradeExecuting}
              className="w-full bg-rose-600 text-white py-6 rounded-3xl font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed hover:bg-rose-700 transition-all"
            >
              {isTradeExecuting ? '执行中...' : '确认卖出'}
            </button>
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

  // Override toast methods to manage local state
  const showToast = (message: string, type: any, duration?: number) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setToasts((prev: any[]) => [...prev, { id, type, message, duration }]);
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
