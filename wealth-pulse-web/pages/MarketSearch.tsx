
import React, { useState, useMemo } from 'react';
import { StockPrice } from '../types';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';

interface MarketSearchProps {
  stocks: StockPrice[];
  onTrade: (s: StockPrice) => void;
}

const MarketSearch: React.FC<MarketSearchProps> = ({ stocks, onTrade }) => {
  const [query, setQuery] = useState('');
  const [selectedStock, setSelectedStock] = useState<StockPrice | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  // 修复后的搜索逻辑：匹配代码或名称
  const searchResults = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];
    return stocks.filter(s => 
      s.symbol.toLowerCase().includes(trimmed) || 
      s.name.toLowerCase().includes(trimmed)
    ).slice(0, 5); // 限制展示前5个
  }, [query, stocks]);

  const handleSelect = (stock: StockPrice) => {
    setSelectedStock(stock);
    setQuery('');
    setIsFocused(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-32">
      
      {/* 搜索中枢：占据页面核心位置 */}
      <section className="relative z-50">
        <div className={`bg-white p-2 rounded-[2.5rem] border transition-all duration-500 shadow-2xl ${isFocused ? 'border-indigo-500 ring-4 ring-indigo-500/10' : 'border-slate-100 shadow-slate-200/50'}`}>
          <div className="relative flex items-center">
            <div className="w-16 h-16 flex items-center justify-center text-slate-400">
              <i className={`fas ${isFocused ? 'fa-terminal text-indigo-500' : 'fa-search'}`}></i>
            </div>
            <input 
              type="text" 
              placeholder="输入证券代码（如 AAPL）或公司名称（如 Apple）..." 
              value={query}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-grow bg-transparent py-6 pr-8 text-lg font-black text-slate-800 placeholder:text-slate-300 outline-none"
            />
          </div>

          {/* 实时搜索结果下拉框 */}
          {query.trim() && (
            <div className="absolute top-full left-0 right-0 mt-4 bg-white rounded-[2rem] border border-slate-100 shadow-2xl p-4 animate-in zoom-in-95 duration-200 z-50 overflow-hidden">
              {searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map(s => (
                    <button 
                      key={s.symbol}
                      onClick={() => handleSelect(s)}
                      className="w-full flex items-center justify-between p-5 hover:bg-slate-50 rounded-2xl transition-all group"
                    >
                      <div className="flex items-center space-x-5">
                        <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xs italic group-hover:scale-110 transition-transform">
                          {s.symbol.slice(0, 2)}
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-black text-slate-900 tracking-tight">{s.symbol}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{s.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900">¥{s.price.toFixed(2)}</p>
                        <p className={`text-[10px] font-black ${s.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {s.changePercent >= 0 ? '↑' : '↓'} {Math.abs(s.changePercent).toFixed(2)}%
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
                    <i className="fas fa-ghost text-2xl"></i>
                  </div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">未找到匹配的资产代码</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 动态显示区域 */}
      {selectedStock ? (
        <div className="space-y-10 animate-in fade-in slide-in-from-top-4 duration-700">
          
          {/* 主分析终端 */}
          <div className="bg-white p-10 lg:p-14 rounded-[3.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-8 relative z-10">
              <div className="flex items-center space-x-8">
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-[2.5rem] flex items-center justify-center text-3xl font-black shadow-2xl border-4 border-white">
                  {selectedStock.symbol.slice(0, 2)}
                </div>
                <div>
                  <div className="flex items-center space-x-4">
                    <h2 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter italic">{selectedStock.name}</h2>
                    <span className="bg-slate-900 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em]">{selectedStock.symbol}</span>
                  </div>
                  <div className="flex items-center space-x-4 mt-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Equity Terminal</span>
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>

              <div className="text-left md:text-right">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Live Execution Price</p>
                <h3 className="text-5xl lg:text-6xl font-black text-slate-900 tracking-tighter">¥{selectedStock.price.toFixed(2)}</h3>
                <div className={`flex items-center md:justify-end mt-4 text-sm font-black ${selectedStock.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                   <span className="mr-3">{selectedStock.change >= 0 ? '+' : ''}{selectedStock.change.toFixed(2)}</span>
                   <span className={`px-4 py-1.5 rounded-xl ${selectedStock.change >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                      {selectedStock.changePercent >= 0 ? '↑' : '↓'} {Math.abs(selectedStock.changePercent).toFixed(2)}%
                   </span>
                </div>
              </div>
            </div>

            {/* 专业级深色图表终端 */}
            <div className="h-[500px] w-full bg-[#0a0c12] rounded-[3rem] p-10 border border-slate-800 shadow-inner relative group">
              <div className="absolute top-8 left-10 z-10 flex space-x-3">
                 {['Depth', 'RSI', 'MACD', 'VOL'].map(tag => (
                   <span key={tag} className="text-[9px] font-black text-slate-500 border border-slate-800 px-3 py-1 rounded bg-slate-900/50">{tag}</span>
                 ))}
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={selectedStock.history}>
                  <defs>
                    <linearGradient id="searchGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" opacity={0.2} />
                  <XAxis dataKey="time" hide />
                  <YAxis orientation="right" domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#475569', fontWeight: 'bold'}} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111827', borderRadius: '16px', border: '1px solid #374151', color: '#fff', fontWeight: 'black' }}
                    cursor={{ stroke: '#6366f1', strokeWidth: 2 }}
                  />
                  <Area type="monotone" dataKey="price" stroke="#6366f1" strokeWidth={5} fill="url(#searchGrad)" animationDuration={1500} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="absolute bottom-6 right-10 text-[9px] font-black text-slate-700 uppercase tracking-[0.5em] italic pointer-events-none">
                Pulse AI Alpha Analysis Engine
              </div>
            </div>

            {/* 交易操作浮动手写条 */}
            <div className="mt-12 flex flex-col sm:flex-row items-stretch sm:items-center gap-6">
              <button 
                onClick={() => onTrade(selectedStock)}
                className="flex-grow bg-indigo-600 text-white py-6 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center group"
              >
                <i className="fas fa-plus-circle mr-3 group-hover:rotate-90 transition-transform"></i> 立即执行申购
              </button>
              <button className="px-10 py-6 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center">
                <i className="fas fa-star mr-3 text-amber-400"></i> 加入监控
              </button>
            </div>
          </div>

          {/* 指标卡片网格 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: '最高', val: selectedStock.high, icon: 'fa-arrow-trend-up', color: 'text-emerald-500' },
              { label: '最低', val: selectedStock.low, icon: 'fa-arrow-trend-down', color: 'text-rose-500' },
              { label: '开盘', val: selectedStock.price * 0.98, icon: 'fa-door-open', color: 'text-slate-400' },
              { label: '流通市值', val: '2.84 Trillion', icon: 'fa-landmark', color: 'text-indigo-400' }
            ].map(item => (
              <div key={item.label} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center text-center group hover:bg-slate-50 transition-all">
                <div className={`w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center mb-4 ${item.color} shadow-inner group-hover:scale-110 transition-transform`}>
                   <i className={`fas ${item.icon} text-xs`}></i>
                </div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">{item.label}</p>
                <h4 className="text-xl font-black text-slate-800">
                  {typeof item.val === 'number' ? `¥${item.val.toFixed(2)}` : item.val}
                </h4>
              </div>
            ))}
          </div>

        </div>
      ) : (
        /* 零状态引导 */
        <div className="py-40 flex flex-col items-center justify-center text-center animate-in fade-in duration-1000">
          <div className="w-32 h-32 bg-white rounded-[3.5rem] shadow-xl flex items-center justify-center text-slate-100 text-4xl mb-10 relative">
            <i className="fas fa-terminal"></i>
            <div className="absolute inset-0 border-4 border-indigo-500/10 rounded-[3.5rem] animate-pulse"></div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-[10px] text-white animate-bounce">
              <i className="fas fa-sparkles"></i>
            </div>
          </div>
          <h4 className="text-3xl font-black text-slate-900 tracking-tighter">终端已就绪，等待检索指令</h4>
          <p className="text-slate-400 text-base font-medium mt-4 max-w-sm leading-relaxed">
            输入资产代码解锁 <span className="text-indigo-600 font-bold">Gemini 3 实时行情诊断</span> 与专业的风险评估终端。
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {['NVDA', 'AAPL', 'TSLA', 'MSFT'].map(hot => (
              <button 
                key={hot}
                onClick={() => handleSelect(stocks.find(s => s.symbol === hot) || stocks[0])}
                className="px-6 py-2.5 bg-white border border-slate-100 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-indigo-500 hover:text-indigo-600 hover:shadow-xl transition-all"
              >
                快速浏览 {hot}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketSearch;
