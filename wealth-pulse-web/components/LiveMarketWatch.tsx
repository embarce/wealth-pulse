
import React, { useState, useEffect } from 'react';
import { StockPrice } from '../types';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { stockApi, HotStock } from '../services/stockApi';

interface LiveMarketWatchProps {
  onTrade: (s: StockPrice) => void;
  onViewDetail?: (s: StockPrice) => void;
}

const LiveMarketWatch: React.FC<LiveMarketWatchProps> = ({ onTrade, onViewDetail }) => {
  const [stocks, setStocks] = useState<StockPrice[]>([]);
  const [progress, setProgress] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 将 HotStock 转换为 StockPrice 格式
  const convertToStockPrice = (hotStock: HotStock): StockPrice => {
    // 生成模拟的历史数据用于迷你走势图
    const history = Array.from({ length: 20 }, (_, i) => {
      const randomVariation = (Math.random() - 0.5) * (hotStock.changeRate / 10);
      return {
        time: `${i}m`,
        price: hotStock.lastPrice + randomVariation
      };
    });

    return {
      symbol: hotStock.stockCode,
      name: hotStock.companyNameCn || hotStock.companyName,
      price: hotStock.lastPrice,
      change: hotStock.changeNumber,
      changePercent: hotStock.changeRate,
      high: hotStock.highPrice,
      low: hotStock.lowPrice,
      open: hotStock.openPrice || hotStock.lastPrice,
      volume: hotStock.volume || 0,
      history,
      marketCap: hotStock.marketCap
    };
  };

  // 获取热门股票数据
  const fetchHotStocks = async () => {
    try {
      setError(null);
      const hotStocks = await stockApi.getHotStocks(6); // 获取 6 只热门股票
      const stockPrices = hotStocks.map(convertToStockPrice);
      setStocks(stockPrices);
    } catch (err) {
      console.error('获取热门股票失败:', err);
      setError('获取热门股票失败');
      // 设置空数组以避免崩溃
      setStocks([]);
    }
  };

  // 初始化加载数据
  useEffect(() => {
    fetchHotStocks();
  }, []);

  // 60秒自动刷新逻辑
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setIsRefreshing(true);
          // 触发真实的数据刷新
          fetchHotStocks().finally(() => {
            setTimeout(() => setIsRefreshing(false), 2000); // 模拟网络延迟感
          });
          return 0;
        }
        return prev + (100 / 60);
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 添加手动刷新按钮功能
  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchHotStocks().finally(() => {
      setTimeout(() => setIsRefreshing(false), 2000);
      setProgress(0); // 重置进度条
    });
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100/80 shadow-xl shadow-slate-200/40 h-full flex flex-col relative overflow-hidden">

      {/* 顶部状态栏 */}
      <div className="px-6 pb-4 pt-6 shrink-0">
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <h4 className="font-black text-slate-900 tracking-tight text-lg italic">行情监控</h4>
            <div className="flex items-center mt-1.5 space-x-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className={`absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 ${!isRefreshing && 'animate-ping'}`}></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <p className="text-[8px] text-slate-400 font-semibold uppercase tracking-wider">
                {isRefreshing ? '正在同步...' : `${Math.round(60 - (progress * 0.6))}s 后更新`}
              </p>
            </div>
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="w-9 h-9 bg-gradient-to-br from-slate-50 to-slate-100 hover:from-indigo-50 hover:to-indigo-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-500 transition-all border border-slate-200 hover:border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className={`fas fa-sync-alt text-[10px] ${isRefreshing ? 'animate-spin' : ''}`}></i>
          </button>
        </div>

        {/* 极细进度条 */}
        <div className="h-0.5 bg-slate-100 w-full rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${isRefreshing ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 animate-pulse' : 'bg-gradient-to-r from-indigo-400 to-indigo-500'}`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* 股票列表区 */}
      <div className="flex-grow overflow-y-auto px-5 custom-scrollbar space-y-2 pb-4">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-10">
            <i className="fas fa-exclamation-circle text-4xl text-rose-400 mb-4"></i>
            <p className="text-sm font-black text-slate-600">{error}</p>
            <button
              onClick={handleManualRefresh}
              className="mt-4 px-6 py-2 bg-indigo-500 text-white text-xs font-black rounded-xl hover:bg-indigo-600 transition-all"
            >
              重试
            </button>
          </div>
        ) : stocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-10">
            <i className="fas fa-spinner fa-spin text-4xl text-indigo-400 mb-4"></i>
            <p className="text-sm font-black text-slate-600">加载中...</p>
          </div>
        ) : (
          <>
          {stocks.map(s => (
          <div
            key={s.symbol}
            onClick={() => onViewDetail?.(s)}
            className="group relative bg-gradient-to-br from-slate-50 to-white hover:from-white hover:to-indigo-50/30 p-4 rounded-[1.5rem] border border-slate-100/50 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 cursor-pointer overflow-hidden"
          >
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-xl flex items-center justify-center font-black text-[9px] shadow-lg border border-white/10">
                  {s.name.slice(0, 2)}
                </div>
                <div className="flex flex-col">
                  <p className="text-[12px] font-black text-slate-900 leading-tight">{s.symbol}</p>
                  <p className="text-[8px] text-slate-400 font-medium mt-0.5 tracking-tight">{s.name.split(' ')[0]}</p>
                </div>
              </div>

              {/* 迷你走势 */}
              <div className="absolute left-1/2 -translate-x-1/2 w-20 h-8 opacity-15 group-hover:opacity-30 transition-opacity">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={s.history.slice(-8)}>
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke={s.change >= 0 ? '#ef4444' : '#10b981'}
                      strokeWidth={1.5}
                      fill="none"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-col items-end">
                <div className="flex items-baseline">
                  <span className="text-[9px] font-bold text-slate-400 mr-0.5">$</span>
                  <p className={`text-[15px] font-black tracking-tight tabular-nums ${s.change >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {s.price.toFixed(2)}
                  </p>
                </div>
                <div className={`text-[8px] font-bold px-2 py-0.5 rounded-lg inline-flex items-center mt-1 ${s.change >= 0 ? 'bg-rose-50/80 text-rose-600' : 'bg-emerald-50/80 text-emerald-600'}`}>
                  <i className={`fas ${s.change >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'} text-[7px] mr-1`}></i>
                  {s.changePercent >= 0 ? '+' : ''}{s.changePercent.toFixed(2)}%
                </div>
              </div>
            </div>

            {/* 悬浮显示的快捷交易按钮 */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-indigo-700/0 group-hover:from-indigo-600/95 group-hover:to-indigo-700/95 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 rounded-[1.5rem] z-20">
               <button
                onClick={(e) => { e.stopPropagation(); onTrade(s); }}
                className="text-white text-[10px] font-bold uppercase tracking-wider flex items-center px-5 py-2.5 bg-white/10 rounded-xl backdrop-blur-sm hover:bg-white/20 transition-all border border-white/20"
               >
                 <i className="fas fa-shopping-cart mr-2 text-[11px]"></i>
                 快速买入
               </button>
            </div>
          </div>
        ))}
        </>
        )}
      </div>

      {/* 底部信息汇总 */}
      <div className="p-6 pt-4 border-t border-slate-100/50 bg-gradient-to-br from-slate-50/50 to-white/50 shrink-0">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <p className="text-[7px] text-slate-400 font-semibold uppercase tracking-widest mb-1.5">监控标的</p>
            <div className="flex items-baseline justify-center">
              <p className="text-lg font-black text-slate-800">{stocks.length}</p>
              <span className="text-[9px] text-slate-400 ml-1">只</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-[7px] text-slate-400 font-semibold uppercase tracking-widest mb-1.5">综合涨跌</p>
            <div className="flex items-baseline justify-center">
              <p className={`text-lg font-black ${stocks.length > 0 ? ((stocks.reduce((acc, s) => acc + s.changePercent, 0) / stocks.length) >= 0 ? 'text-rose-500' : 'text-emerald-500') : 'text-slate-400'}`}>
                {stocks.length > 0 ? `${(stocks.reduce((acc, s) => acc + s.changePercent, 0) / stocks.length).toFixed(2)}` : '0.00'}
              </p>
              <span className="text-[9px] text-slate-400 ml-1">%</span>
            </div>
          </div>
        </div>

        {/* 提示信息 */}
        <div className="flex items-start justify-center space-x-2 opacity-60">
          <i className="fas fa-sync-alt text-[8px] mt-0.5 text-indigo-500"></i>
          <p className="text-[7px] font-medium text-slate-400 leading-relaxed tracking-wide">
            热门股票每分钟自动同步 · 仅供策略参考
          </p>
        </div>
      </div>
    </div>
  );
};

export default LiveMarketWatch;
