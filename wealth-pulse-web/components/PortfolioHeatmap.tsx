
import React from 'react';
import { Holding, StockPrice } from '../types';

interface PortfolioHeatmapProps {
  holdings: Holding[];
  stocks: StockPrice[];
}

const PortfolioHeatmap: React.FC<PortfolioHeatmapProps> = ({ holdings, stocks }) => {
  return (
    <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm h-full">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h4 className="font-black text-slate-900 tracking-tight text-lg">仓位盈亏雷达</h4>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Heatmap Analysis</p>
        </div>
        <div className="flex items-center space-x-2">
           <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
           <span className="text-[9px] font-black text-slate-400 uppercase">Profit</span>
           <div className="w-2 h-2 rounded-full bg-rose-500 ml-2"></div>
           <span className="text-[9px] font-black text-slate-400 uppercase">Loss</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {holdings.map(h => {
          const stock = stocks.find(s => s.symbol === h.symbol);
          const currentPrice = stock?.price || 0;
          const profitRate = ((currentPrice - h.avgPrice) / (h.avgPrice || 1)) * 100;
          
          // 根据盈亏率确定背景深度
          const intensity = Math.min(Math.abs(profitRate) * 10, 100);
          const bgColor = profitRate >= 0 
            ? `rgba(16, 185, 129, ${0.1 + (intensity/150)})` 
            : `rgba(244, 63, 94, ${0.1 + (intensity/150)})`;
          const textColor = profitRate >= 0 ? 'text-emerald-700' : 'text-rose-700';

          return (
            <div 
              key={h.symbol}
              style={{ backgroundColor: bgColor }}
              className={`p-4 rounded-2xl flex flex-col items-center justify-center border border-white/50 transition-transform hover:scale-105 cursor-default`}
            >
              <span className="text-[10px] font-black uppercase tracking-tighter text-slate-500">{h.symbol}</span>
              <span className={`text-sm font-black ${textColor}`}>{profitRate >= 0 ? '+' : ''}{profitRate.toFixed(1)}%</span>
            </div>
          );
        })}
        {holdings.length === 0 && (
          <div className="col-span-3 py-10 text-center text-slate-300 font-bold italic text-xs">
            等待数据注入...
          </div>
        )}
      </div>
    </div>
  );
};

export default PortfolioHeatmap;
