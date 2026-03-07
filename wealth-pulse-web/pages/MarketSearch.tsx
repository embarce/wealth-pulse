
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StockPrice } from '../types';
import { stockApi, HotStock } from '../services/stockApi';
import StockChart from '../components/StockChart';
import StockChartDay from '../components/StockChartDay';
import StockInfoPanel from '../components/StockInfoPanel';
import StockAnalysisPanel from '../components/StockAnalysisPanel';

interface MarketSearchProps {
  onTrade: (s: StockPrice) => void;
}

/**
 * 防抖搜索 Hook - 重新设计的防抖搜索逻辑
 * @param delay 防抖延迟（毫秒）
 * @returns 搜索结果、加载状态、执行搜索的函数
 */
function useDebounceSearch(delay: number = 300) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<HotStock[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * 执行搜索（防抖核心逻辑）
   * 每次调用都会取消之前的定时器，确保只在用户停止输入后才执行
   */
  const executeSearch = useCallback((searchQuery: string) => {
    // 1. 清除之前的定时器 - 这是防抖的关键
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    const trimmed = searchQuery.trim();

    // 2. 空查询直接清空结果
    if (!trimmed) {
      setSearchResults([]);
      setIsSearching(false);
      setError(null);
      return;
    }

    // 3. 设置加载状态
    setIsSearching(true);
    setError(null);

    // 4. 设置新的防抖定时器
    timerRef.current = setTimeout(async () => {
      try {
        const results = await stockApi.searchStocks(trimmed);
        setSearchResults(results.slice(0, 50));
        setError(null);
      } catch (e: any) {
        console.error('[useDebounceSearch] search error:', e);
        setError(e.message || '搜索失败');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, delay);
  }, [delay]);

  /**
   * 更新搜索关键词 - 直接触发防抖搜索
   * 使用 useCallback 确保引用稳定
   */
  const updateQuery = useCallback((newQuery: string) => {
    setQuery(newQuery);
    executeSearch(newQuery);
  }, [executeSearch]);

  /**
   * 清空搜索 - 同步清空所有状态
   */
  const clearSearch = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setQuery('');
    setSearchResults([]);
    setIsSearching(false);
    setError(null);
  }, []);

  /**
   * 组件卸载时清理定时器，防止内存泄漏
   */
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    query,
    searchResults,
    isSearching,
    error,
    updateQuery,
    clearSearch,
  };
}

const MarketSearch: React.FC<MarketSearchProps> = ({ onTrade }) => {
  const [selectedStock, setSelectedStock] = useState<StockPrice | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [hotStocks, setHotStocks] = useState<HotStock[]>([]);
  const [isLoadingHot, setIsLoadingHot] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false);
  const [chartType, setChartType] = useState<'minute' | 'day'>('minute');

  // 使用防抖搜索 Hook - 300ms 防抖
  const {
    query,
    searchResults,
    isSearching,
    updateQuery,
    clearSearch,
  } = useDebounceSearch(300);

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

  const handleSelect = (stock: StockPrice) => {
    setSelectedStock(stock);
    setIsFocused(false);
    // 清空搜索框和结果，收起下拉列表
    clearSearch();
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
              onChange={(e) => updateQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  clearSearch();
                }
              }}
              className="flex-grow bg-transparent py-6 pr-8 text-lg font-black text-slate-800 placeholder:text-slate-300 outline-none"
            />
            {/* 清空按钮 */}
            {query && (
              <button
                onClick={clearSearch}
                className="absolute right-4 w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all"
              >
                <i className="fas fa-times text-xs"></i>
              </button>
            )}
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
                        <p className={`text-[10px] font-black ${s.changeRate >= 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
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
                    clearSearch();
                  }}
                  className="bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 rounded-2xl p-5 transition-all group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-black text-slate-900 tracking-tight">{stock.companyNameCn || stock.companyName}</p>
                      <span className={`text-[10px] font-black ${stock.changeRate >= 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
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
                <div className={`flex items-center md:justify-end mt-4 text-sm font-black ${selectedStock.change >= 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                   <span className="mr-3">{selectedStock.change >= 0 ? '+' : ''}{selectedStock.change.toFixed(2)}</span>
                   <span className={`px-4 py-1.5 rounded-xl ${selectedStock.change >= 0 ? 'bg-rose-50' : 'bg-emerald-50'}`}>
                      {selectedStock.changePercent >= 0 ? '↑' : '↓'} {Math.abs(selectedStock.changePercent).toFixed(2)}%
                   </span>
                </div>
              </div>
            </div>

            {/* 专业级深色图表终端 */}
            <div className="h-[600px] w-full">
              {/* 图表类型切换按钮 */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">图表类型</span>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => setChartType('minute')}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                        chartType === 'minute'
                          ? 'bg-indigo-600 text-white shadow-lg'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      分时图
                    </button>
                    <button
                      onClick={() => setChartType('day')}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                        chartType === 'day'
                          ? 'bg-indigo-600 text-white shadow-lg'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      日 K 图
                    </button>
                  </div>
                </div>
                {chartType === 'minute' && (
                  <div className="text-xs text-gray-400 font-medium">
                    实时分时数据 · 精确到分钟
                  </div>
                )}
              </div>

              {/* 图表组件 */}
              {chartType === 'minute' ? (
                <StockChart stockCode={selectedStock.symbol} height={500}/>
              ) : (
                <StockChartDay stockCode={selectedStock.symbol} height={400}/>
              )}
            </div>

            {/* 交易操作浮动条 */}
            <div className="mt-12 flex flex-col sm:flex-row items-stretch sm:items-center gap-6">
              <button
                onClick={() => onTrade(selectedStock)}
                className="flex-grow bg-indigo-600 text-white py-6 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center group"
              >
                <i className="fas fa-plus-circle mr-3 group-hover:rotate-90 transition-transform"></i> 立即执行申购
              </button>
              <button
                onClick={() => setShowAnalysisPanel(true)}
                className="px-8 py-6 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center shadow-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-indigo-600/30"
              >
                <i className="fas fa-brain mr-3 text-white"></i>
                AI 分析
              </button>
              <button
                onClick={() => setShowInfoPanel(true)}
                className="px-8 py-6 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center shadow-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 shadow-orange-600/30"
              >
                <i className="fas fa-newspaper mr-3 text-white"></i>
                资讯财报
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

          {/* 信息聚合面板 - 作为侧边抽屉 */}
          {selectedStock && (
            <>
              <StockInfoPanel
                isOpen={showInfoPanel}
                onClose={() => setShowInfoPanel(false)}
                stockCode={selectedStock.symbol}
                stockName={selectedStock.name}
              />
              <StockAnalysisPanel
                isOpen={showAnalysisPanel}
                onClose={() => setShowAnalysisPanel(false)}
                stockCode={selectedStock.symbol}
                stockName={selectedStock.name}
              />
            </>
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
