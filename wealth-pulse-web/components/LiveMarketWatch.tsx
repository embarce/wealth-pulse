
import React, { useState, useEffect } from 'react';
import { StockPrice } from '../types';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface LiveMarketWatchProps {
  stocks: StockPrice[];
  onTrade: (s: StockPrice) => void;
  onViewDetail?: (s: StockPrice) => void;
}

const LiveMarketWatch: React.FC<LiveMarketWatchProps> = ({ stocks, onTrade, onViewDetail }) => {
  const [progress, setProgress] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 60秒自动刷新逻辑
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setIsRefreshing(true);
          setTimeout(() => setIsRefreshing(false), 2000); // 模拟网络延迟感
          return 0;
        }
        return prev + (100 / 60);
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/30 h-full flex flex-col relative overflow-hidden">
      
      {/* 顶部状态栏 */}
      <div className="p-8 pb-4 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-black text-slate-900 tracking-tight text-xl italic">行情监控</h4>
            <div className="flex items-center mt-1 space-x-2">
              <span className="relative flex h-2 w-2">
                <span className={`absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 ${!isRefreshing && 'animate-ping'}`}></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                {isRefreshing ? '正在同步云端数据...' : `下次更新: ${Math.round(60 - (progress * 0.6))}秒后`}
              </p>
            </div>
          </div>
          <button className="w-10 h-10 bg-slate-50 hover:bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 transition-all border border-slate-100">
            <i className={`fas fa-rotate text-xs ${isRefreshing ? 'animate-spin' : ''}`}></i>
          </button>
        </div>

        {/* 极细进度条 */}
        <div className="h-1 bg-slate-50 w-full rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ease-linear ${isRefreshing ? 'bg-indigo-600 animate-pulse' : 'bg-indigo-400'}`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* 股票列表区 */}
      <div className="flex-grow overflow-y-auto px-8 custom-scrollbar space-y-3 pb-6">
        {stocks.map(s => (
          <div 
            key={s.symbol} 
            onClick={() => onViewDetail?.(s)}
            className="group relative bg-slate-50/50 hover:bg-white p-5 rounded-[2rem] border border-transparent hover:border-indigo-100 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 cursor-pointer overflow-hidden"
          >
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-[10px] shadow-lg border border-white/10 italic">
                  {s.symbol.slice(0, 2)}
                </div>
                <div>
                  <p className="text-[13px] font-black text-slate-900 leading-none">{s.symbol}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-tighter opacity-70">{s.name.split(' ')[0]}</p>
                </div>
              </div>

              {/* 迷你走势 */}
              <div className="absolute left-1/2 -translate-x-1/2 w-16 h-8 opacity-20 group-hover:opacity-40 transition-opacity">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={s.history.slice(-8)}>
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke={s.change >= 0 ? '#10b981' : '#f43f5e'} 
                      strokeWidth={2} 
                      fill="none" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="text-right">
                <p className={`text-[14px] font-black tracking-tighter ${isRefreshing ? (s.change >= 0 ? 'text-emerald-500' : 'text-rose-500') : 'text-slate-900'}`}>
                  ¥{s.price.toFixed(2)}
                </p>
                <div className={`text-[9px] font-black px-2 py-0.5 rounded-md inline-block mt-1 ${s.change >= 0 ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                  {s.changePercent >= 0 ? '+' : ''}{s.changePercent.toFixed(2)}%
                </div>
              </div>
            </div>

            {/* 悬浮显示的快捷交易按钮 */}
            <div className="absolute inset-0 bg-indigo-600/0 group-hover:bg-indigo-600/95 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 rounded-[2rem] z-20">
               <button 
                onClick={(e) => { e.stopPropagation(); onTrade(s); }}
                className="text-white text-[11px] font-black uppercase tracking-[0.2em] flex items-center"
               >
                 <i className="fas fa-plus-circle mr-2"></i> 快速买入
               </button>
            </div>
          </div>
        ))}
      </div>

      {/* 底部信息汇总 */}
      <div className="p-8 pt-4 border-t border-slate-50 bg-slate-50/30 shrink-0">
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="text-center">
            <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mb-1">监控标的</p>
            <p className="text-xs font-black text-slate-800">{stocks.length} 只</p>
          </div>
          <div className="text-center">
            <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mb-1">综合涨跌</p>
            <p className={`text-xs font-black ${(stocks.reduce((acc, s) => acc + s.changePercent, 0) / stocks.length) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {(stocks.reduce((acc, s) => acc + s.changePercent, 0) / stocks.length).toFixed(2)}%
            </p>
          </div>
        </div>

        {/* 提示信息 */}
        <div className="flex items-start space-x-2 opacity-50">
          <i className="fas fa-info-circle text-[10px] mt-0.5 text-indigo-500"></i>
          <p className="text-[8px] font-bold text-slate-400 leading-relaxed uppercase tracking-tight">
            数据每分钟自动从互联网同步。行情可能存在非实盘延迟，仅供策略分析参考。
          </p>
        </div>
      </div>
    </div>
  );
};

export default LiveMarketWatch;
