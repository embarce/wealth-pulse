
import React, { useMemo, useState } from 'react';
import { Holding, StockPrice } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Sector } from 'recharts';
import ShareModal from '../components/ShareModal';

interface HoldingsProps {
  holdings: Holding[];
  stocks: StockPrice[];
  onBuy: (symbol: string) => void;
  onSell: (symbol: string, quantity?: number) => void;
  onClear: (symbol: string) => void;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        className="drop-shadow-xl"
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 4}
        outerRadius={innerRadius - 2}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
};

const Holdings: React.FC<HoldingsProps> = ({ holdings, stocks, onBuy, onSell, onClear }) => {
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const totalMarketValue = useMemo(() => 
    holdings.reduce((acc, h) => acc + (h.quantity * (stocks.find(s => s.symbol === h.symbol)?.price || 0)), 0),
  [holdings, stocks]);

  const totalProfit = useMemo(() => 
    holdings.reduce((acc, h) => {
      const currentPrice = stocks.find(s => s.symbol === h.symbol)?.price || 0;
      return acc + (currentPrice - h.avgPrice) * h.quantity;
    }, 0),
  [holdings, stocks]);

  const allocationData = useMemo(() => 
    holdings.map(h => ({
      name: h.symbol,
      value: h.quantity * (stocks.find(s => s.symbol === h.symbol)?.price || 0)
    })).sort((a, b) => b.value - a.value),
  [holdings, stocks]);

  const shareData = {
    type: 'portfolio' as const,
    mainValue: `¥${totalMarketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
    subLabel: '持仓组合总市值',
    subValue: `${totalProfit >= 0 ? '+' : ''}¥${totalProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })} (收益率 ${(totalProfit / (totalMarketValue - totalProfit || 1) * 100).toFixed(2)}%)`,
    items: allocationData.slice(0, 3).map(d => ({
      label: d.name,
      value: `¥${d.value.toLocaleString()}`,
      color: 'text-indigo-400'
    }))
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* 顶部指标卡片组 - 优化后的充实设计 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* 卡片 1: 总市值 */}
        <div className="relative bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden group">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-all duration-700"></div>
          <div className="relative z-10">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2 flex items-center">
              <span className="w-1 h-3 bg-indigo-500 rounded-full mr-2"></span> 持仓总市值
            </p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic">¥{totalMarketValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
            <div className="mt-8 flex items-center space-x-3">
              <div className="flex -space-x-2">
                {holdings.slice(0, 3).map((h, i) => (
                  <div key={h.symbol} className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-black text-white shadow-sm`} style={{ backgroundColor: COLORS[i % COLORS.length] }}>
                    {h.symbol[0]}
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-indigo-500 font-black uppercase tracking-tighter">组合权重 100%</p>
            </div>
          </div>
          <svg className="absolute bottom-0 left-0 w-full h-12 opacity-[0.03] pointer-events-none" viewBox="0 0 400 100" preserveAspectRatio="none">
             <path d="M0,80 Q100,20 200,80 T400,20 L400,100 L0,100 Z" fill="currentColor" className="text-indigo-600" />
          </svg>
        </div>

        {/* 卡片 2: 浮动盈亏 */}
        <div className="relative bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden group">
          <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full blur-3xl transition-all duration-700 ${totalProfit >= 0 ? 'bg-emerald-500/5 group-hover:bg-emerald-500/10' : 'bg-rose-500/5 group-hover:bg-rose-500/10'}`}></div>
          <div className="relative z-10">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2 flex items-center">
              <span className={`w-1 h-3 rounded-full mr-2 ${totalProfit >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></span> 浮动盈亏总额
            </p>
            <h3 className={`text-3xl font-black tracking-tighter italic ${totalProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {totalProfit >= 0 ? '+' : ''}¥{totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
            <p className="mt-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              收益率 <span className={totalProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}>{(totalProfit / (totalMarketValue - totalProfit || 1) * 100).toFixed(2)}%</span>
            </p>
          </div>
          <svg className="absolute bottom-0 left-0 w-full h-12 opacity-[0.03] pointer-events-none" viewBox="0 0 400 100" preserveAspectRatio="none">
             <path d="M0,50 Q100,80 200,50 T400,80 L400,100 L0,100 Z" fill="currentColor" className={totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'} />
          </svg>
        </div>

        {/* 卡片 3: 最大标的 */}
        <div className="relative bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden group">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-all duration-700"></div>
          <div className="relative z-10">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2 flex items-center">
              <span className="w-1 h-3 bg-amber-500 rounded-full mr-2"></span> 持仓最大标的
            </p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic">{(allocationData[0]?.value / totalMarketValue * 100 || 0).toFixed(1)}%</h3>
            <p className="mt-8 text-[10px] font-black text-amber-500 uppercase tracking-widest">
              核心仓位: {allocationData[0]?.name || '--'}
            </p>
          </div>
          <div className="absolute -bottom-4 -right-4 text-slate-50 text-6xl font-black italic select-none group-hover:text-amber-500/10 transition-all duration-700">ALPHA</div>
        </div>

        {/* 卡片 4: 资产分布图 */}
        <div className="bg-white p-6 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col h-full overflow-hidden relative">
          <div className="flex-grow flex flex-col justify-center relative scale-90 origin-center">
            <div className="h-44 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={68}
                    paddingAngle={6}
                    dataKey="value"
                    stroke="none"
                    onMouseEnter={(_, i) => setActiveIndex(i)}
                    onMouseLeave={() => setActiveIndex(-1)}
                    {...({
                      activeIndex: activeIndex === -1 ? undefined : activeIndex,
                      activeShape: renderActiveShape
                    } as any)}
                  >
                    {allocationData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="outline-none" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Ratio</p>
                <p className="text-xs font-black text-slate-400">资产配置</p>
              </div>
            </div>
            <div className="mt-2 flex justify-center flex-wrap gap-x-3 gap-y-1">
               {allocationData.slice(0, 3).map((d, i) => (
                 <div key={d.name} className="flex items-center space-x-1">
                   <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                   <span className="text-[9px] font-black text-slate-500">{d.name}</span>
                   <span className="text-[9px] text-slate-300">¥{d.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>

      {/* 持仓明细列表 */}
      <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-10 py-10 border-b border-slate-50 flex justify-between items-center">
          <div>
            <h4 className="font-black text-slate-800 tracking-tight text-xl italic flex items-center">
              <i className="fas fa-list-check text-indigo-500 mr-3 text-sm"></i>
              Position Portfolio
            </h4>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">实时活跃账户持仓审计明细</p>
          </div>
          <button 
            onClick={() => setIsShareOpen(true)}
            className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-slate-950/10 flex items-center"
          >
            <i className="fas fa-share-nodes mr-2"></i> 分享组合战报
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/40 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-10 py-8">证券标的</th>
                <th className="px-10 py-8">持有详情</th>
                <th className="px-10 py-8 text-center">持仓市值</th>
                <th className="px-10 py-8 text-center">当前行情/日内空间</th>
                <th className="px-10 py-8">浮动盈亏</th>
                <th className="px-10 py-8 text-right">管理</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {holdings.map((h, idx) => {
                const stock = stocks.find(s => s.symbol === h.symbol);
                const currentPrice = stock?.price || 0;
                const marketValue = h.quantity * currentPrice;
                const profit = marketValue - (h.avgPrice * h.quantity);
                const profitRate = ((currentPrice - h.avgPrice) / (h.avgPrice || 1)) * 100;
                
                const high = stock?.high || currentPrice;
                const low = stock?.low || currentPrice;
                const rangePos = ((currentPrice - low) / (high - low || 1)) * 100;

                return (
                  <tr key={h.symbol} className="hover:bg-slate-50/30 transition-all group">
                    <td className="px-10 py-8">
                      <div className="flex items-center space-x-5">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs border border-white shadow-lg text-white`} style={{ backgroundColor: COLORS[idx % COLORS.length] }}>
                          {h.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-base font-black text-slate-800 tracking-tight">{stock?.name || h.symbol}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{h.symbol}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <p className="text-sm font-black text-slate-700">{h.quantity.toLocaleString()} <span className="text-[10px] text-slate-400 font-bold uppercase ml-1">Shares</span></p>
                      <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase italic">Avg Cost: ¥{h.avgPrice.toFixed(2)}</p>
                    </td>
                    <td className="px-10 py-8 text-center">
                      <p className="text-sm font-black text-slate-800">¥{marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      <div className="w-16 h-1 bg-slate-100 rounded-full mx-auto mt-3 overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(marketValue / totalMarketValue * 100)}%` }}></div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                       <div className="flex flex-col items-center space-y-3">
                          <p className="text-sm font-black text-slate-800 tracking-tighter">¥{currentPrice.toFixed(2)}</p>
                          <div className="w-32 h-1 bg-slate-100 rounded-full relative">
                             <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-indigo-600 rounded-full shadow-lg border-2 border-white" style={{ left: `${rangePos}%` }}></div>
                             <div className="flex justify-between w-full absolute -bottom-4 text-[8px] font-bold text-slate-300 uppercase tracking-widest">
                                <span>L: {low.toFixed(1)}</span>
                                <span>H: {high.toFixed(1)}</span>
                             </div>
                          </div>
                       </div>
                    </td>
                    <td className="px-10 py-8">
                      <p className={`text-sm font-black ${profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {profit >= 0 ? '+' : ''}¥{profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                      <div className={`text-[10px] font-black inline-flex items-center px-2 py-0.5 rounded-md mt-1 ${profit >= 0 ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                        {profitRate.toFixed(2)}%
                      </div>
                    </td>
                    <td className="px-10 py-8 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {/* 买入按钮 */}
                        <button
                              onClick={() => onBuy(h.symbol)}
                              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all flex items-center space-x-1.5"
                          >
                            <i className="fas fa-plus text-xs"></i>
                            <span>买入</span>
                          </button>

                        {/* 卖出按钮 */}
                        <button
                          onClick={() => onSell(h.symbol, h.quantity)}
                          className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all flex items-center space-x-1.5"
                        >
                          <i className="fas fa-minus text-xs"></i>
                          <span>卖出</span>
                        </button>

                        {/* 清仓按钮 */}
                        <button
                          onClick={() => onClear(h.symbol)}
                          className="w-10 h-10 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all flex items-center justify-center"
                          title="清仓"
                        >
                          <i className="fas fa-trash-can text-sm"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ShareModal 
        isOpen={isShareOpen} 
        onClose={() => setIsShareOpen(false)} 
        title="组合战报" 
        data={shareData} 
      />
    </div>
  );
};

export default Holdings;
