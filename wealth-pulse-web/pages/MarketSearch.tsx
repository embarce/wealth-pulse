
import React, { useState, useEffect } from 'react';
import { StockPrice } from '../types';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { stockApi, HotStock } from '../services/stockApi';

interface MarketSearchProps {
  onTrade: (s: StockPrice) => void;
}

const MarketSearch: React.FC<MarketSearchProps> = ({ onTrade }) => {
  const [query, setQuery] = useState('');
  const [selectedStock, setSelectedStock] = useState<StockPrice | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [hotStocks, setHotStocks] = useState<HotStock[]>([]);
  const [isLoadingHot, setIsLoadingHot] = useState(false);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false); // 控制AI分析面板显示

  // 搜索状态
  const [searchResults, setSearchResults] = useState<HotStock[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // 获取热门股票
  useEffect(() => {
    const fetchHotStocks = async () => {
      setIsLoadingHot(true);
      try {
        const data = await stockApi.getHotStocks(10);
        setHotStocks(data);
      } catch (e) {
        console.error('获取热门股票失败', e);
      } finally {
        setIsLoadingHot(false);
      }
    };

    fetchHotStocks();
  }, []);

  // 后端搜索（防抖）
  useEffect(() => {
    // 清除之前的定时器
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }

    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    // 设置新的防抖定时器（300ms）
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await stockApi.searchStocks(trimmed);
        setSearchResults(results.slice(0, 50)); // 限制展示前50个
      } catch (e) {
        console.error('搜索股票失败', e);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    setSearchDebounceTimer(timer);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [query]);

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
              placeholder="输入证券代码（如 1810.HKHK）或公司名称（如 小米集团）..."
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
              {isSearching ? (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">搜索中...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map(s => (
                    <button
                      key={s.stockCode}
                      onClick={() => {
                        const stockPrice: StockPrice = {
                          symbol: s.stockCode,
                          name: s.companyNameCn || s.companyName,
                          price: s.lastPrice ?? 0,
                          change: s.changeNumber ?? 0,
                          changePercent: s.changeRate ?? 0,
                          high: s.highPrice ?? s.lastPrice ?? 0,
                          low: s.lowPrice ?? s.lastPrice ?? 0,
                          open: s.openPrice ?? s.lastPrice ?? 0,
                          volume: s.volume ?? 0,
                          history: [],
                          marketCap: s.marketCap,
                        };
                        handleSelect(stockPrice);
                      }}
                      className="w-full flex items-center justify-between p-5 hover:bg-slate-50 rounded-2xl transition-all group"
                    >
                      <div className="flex items-center space-x-5">
                        <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xs italic group-hover:scale-110 transition-transform">
                          {s.stockCode.slice(0, 2)}
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-black text-slate-900 tracking-tight">{s.stockCode}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{s.companyNameCn || s.companyName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900">¥{(s.lastPrice ?? 0).toFixed(2)}</p>
                        <p className={`text-[10px] font-black ${s.changeRate >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {s.changeRate >= 0 ? '↑' : '↓'} {Math.abs(s.changeRate ?? 0).toFixed(2)}%
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

        {/* 热门股票 */}
        {!query.trim() && hotStocks.length > 0 && (
          <div className="mt-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl p-6 lg:p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">热门股票</h3>
              {isLoadingHot && (
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {hotStocks.map(stock => (
                <button
                  key={stock.stockCode}
                  onClick={() => {
                    const stockPrice: StockPrice = {
                      symbol: stock.stockCode,
                      name: stock.companyNameCn || stock.companyName,
                      price: stock.lastPrice ?? 0,
                      change: stock.changeNumber ?? 0,
                      changePercent: stock.changeRate ?? 0,
                      high: stock.highPrice ?? stock.lastPrice ?? 0,
                      low: stock.lowPrice ?? stock.lastPrice ?? 0,
                      open: stock.openPrice ?? stock.lastPrice ?? 0,
                      volume: stock.volume ?? 0,
                      history: [],
                      marketCap: stock.marketCap
                    };
                    // 点击热门股票查看详情，而不是直接交易
                    setSelectedStock(stockPrice);
                    setQuery('');
                  }}
                  className="bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 rounded-2xl p-5 transition-all group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-black text-slate-900 tracking-tight">{stock.companyNameCn || stock.companyName}</p>
                      <span className={`text-[10px] font-black ${stock.changeRate >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {stock.changeRate >= 0 ? '↑' : '↓'} {Math.abs(stock.changeRate ?? 0).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <p className="text-2xl font-black text-slate-900 tracking-tighter">¥{(stock.lastPrice ?? 0).toFixed(2)}</p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{stock.stockCode}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
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
              <button
                onClick={() => setShowAIAnalysis(!showAIAnalysis)}
                className={`px-10 py-6 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center shadow-xl ${
                  showAIAnalysis
                    ? 'bg-slate-800 text-white border-2 border-slate-600'
                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-purple-600/30'
                }`}
              >
                <i className={`fas ${showAIAnalysis ? 'fa-times' : 'fa-brain'} mr-3 ${showAIAnalysis ? 'text-slate-300' : 'text-amber-300'}`}></i>
                {showAIAnalysis ? '收起分析' : 'AI分析'}
              </button>
            </div>
          </div>

          {/* 指标卡片网格 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: '最高', val: selectedStock.high, icon: 'fa-arrow-trend-up', color: 'text-emerald-500' },
              { label: '最低', val: selectedStock.low, icon: 'fa-arrow-trend-down', color: 'text-rose-500' },
              { label: '开盘', val: selectedStock.price * 0.98, icon: 'fa-door-open', color: 'text-slate-400' },
              { label: '流通市值', val: selectedStock.marketCap || '--', icon: 'fa-landmark', color: 'text-indigo-400' }
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

          {/* AI 分析面板 - 预留功能 */}
          {showAIAnalysis && (
            <div className="mt-10 bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 rounded-[3rem] border-2 border-purple-200 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-700">
              {/* 头部 */}
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-10 py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                      <i className="fas fa-brain text-white text-2xl"></i>
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white">AI 智能分析</h3>
                      <p className="text-purple-100 text-sm font-medium mt-1">
                        {selectedStock.symbol} - {selectedStock.name}
                      </p>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center space-x-2">
                    <span className="px-4 py-2 bg-white/20 rounded-full text-white text-xs font-black">
                      Gemini 3 驱动
                    </span>
                    <span className="px-4 py-2 bg-white/20 rounded-full text-white text-xs font-black">
                      实时数据分析
                    </span>
                  </div>
                </div>
              </div>

              {/* 内容区域 - 预留 */}
              <div className="p-10">
                {/* 功能占位提示 */}
                <div className="text-center py-16">
                  <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <i className="fas fa-chart-line text-purple-400 text-4xl"></i>
                  </div>
                  <h4 className="text-xl font-black text-slate-800 mb-3">AI 分析功能开发中</h4>
                  <p className="text-slate-500 text-base max-w-md mx-auto leading-relaxed">
                    即将推出 K 线图形态识别、技术指标分析、AI 预测等功能。
                    <br />敬请期待！
                  </p>
                  <div className="mt-8 flex items-center justify-center space-x-4 text-sm text-slate-400">
                    <div className="flex items-center space-x-2">
                      <i className="fas fa-check-circle text-emerald-400"></i>
                      <span>K线解读</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <i className="fas fa-check-circle text-emerald-400"></i>
                      <span>趋势预测</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <i className="fas fa-check-circle text-emerald-400"></i>
                      <span>智能建议</span>
                    </div>
                  </div>
                </div>

                {/* 预留的图表区域 */}
                <div className="mt-8 border-2 border-dashed border-purple-300 rounded-2xl p-8 bg-white/50">
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <i className="fas fa-chart-area text-purple-300 text-5xl mb-4 opacity-50"></i>
                      <p className="text-purple-400 text-sm font-black">图表区域预留</p>
                      <p className="text-purple-300 text-xs mt-2">K线图 / 技术指标 / AI 分析结果</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
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
        </div>
      )}
    </div>
  );
};

export default MarketSearch;
