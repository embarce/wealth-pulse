
import React, { useState, useMemo, useContext, useEffect, useRef } from 'react';
import type { KLineData } from 'klinecharts';
import { StockPrice, ChartInterpretation } from '../../types';
import { interpretChart } from '../../services/gemini';
import { stockApi, HotStock, EnhancedDataPoint } from '../../services/stockApi';
import StockChart from '../StockChart';
import StockChartWithOverlay from '../StockChartWithOverlay';
import { aiAnalysisApi, KeyLevel, AIAnalysisRequest, convertToKeyLevels } from '../../services/aiAnalysis';
import { I18nContext } from '../../App';

interface InterpretationTabProps {
  stocks: StockPrice[];
}

// 将热门股票转换为 StockPrice 格式
const convertToStockPrice = (hotStock: HotStock): StockPrice => {
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
    history: [],
    marketCap: hotStock.marketCap
  };
};

const InterpretationTab: React.FC<InterpretationTabProps> = ({ stocks }) => {
  const { t, lang } = useContext(I18nContext);

  // 状态管理
  const [selectedStock, setSelectedStock] = useState<StockPrice | null>(null);
  const [hotStocks, setHotStocks] = useState<StockPrice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [interpretation, setInterpretation] = useState<ChartInterpretation | null>(null);
  const [isLoadingHotStocks, setIsLoadingHotStocks] = useState(false);
  const [chartType, setChartType] = useState<'minute' | 'day'>('day');
  const [keyLevels, setKeyLevels] = useState<KeyLevel[]>([]);
  const [showAIOverlay, setShowAIOverlay] = useState(true);

  // 保存当前图表数据
  const [currentKlineData, setCurrentKlineData] = useState<KLineData[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<'minute' | 'daily' | 'weekly' | 'monthly'>('daily');

  // AI 分析结果字段
  const [aiTrend, setAiTrend] = useState<string>('');
  const [aiTrendDescription, setAiTrendDescription] = useState<string>('');
  const [aiRecommendation, setAiRecommendation] = useState<string>('');
  const [aiRecommendationReason, setAiRecommendationReason] = useState<string>('');
  const [aiRiskLevel, setAiRiskLevel] = useState<string>('');
  const [aiTargetPriceRange, setAiTargetPriceRange] = useState<string>('');

  // 用于取消请求的 AbortController
  const abortControllerRef = useRef<AbortController | null>(null);

  // 初始化加载热门股票
  useEffect(() => {
    const fetchHotStocks = async () => {
      setIsLoadingHotStocks(true);
      try {
        const data = await stockApi.getHotStocks(10);
        const stockPrices = data.map(convertToStockPrice);
        setHotStocks(stockPrices);
      } catch (err) {
        console.error('获取热门股票失败:', err);
      } finally {
        setIsLoadingHotStocks(false);
      }
    };

    fetchHotStocks();
  }, []);

  // 搜索逻辑
  const searchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      return hotStocks.length > 0 ? hotStocks.slice(0, 6) : stocks.slice(0, 4);
    }
    return stocks.filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)).slice(0, 5);
  }, [searchQuery, stocks, hotStocks]);

  // 分析逻辑
  const handleAnalyze = async () => {
    if (!selectedStock) return;

    if (currentKlineData.length === 0) {
      alert('请等待图表数据加载完成后再进行分析');
      return;
    }

    setIsAnalyzing(true);
    setKeyLevels([]);

    abortControllerRef.current = new AbortController();

    try {
      // 将 KLineData 转换为后端需要的格式
      const klineDataForAI = currentKlineData.map((item) => {
        const date = new Date(item.timestamp);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        const amount = item.volume && item.close ? item.volume * item.close : 0;

        return {
          date: dateStr,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume || 0,
          amount: amount,
        };
      });

      // 从 localStorage 获取用户配置的 LLM provider 和 model
      const configStr = localStorage.getItem('pulse_app_config');
      const appConfig = configStr ? JSON.parse(configStr) : null;
      const llmProvider = appConfig?.llmProvider || undefined;
      const llmModel = appConfig?.llmModel || undefined;

      // 构建请求参数
      const analysisRequest: AIAnalysisRequest = {
        stockCode: selectedStock.symbol,
        period: chartType === 'minute' ? 'minute' : currentPeriod,
        klineData: klineDataForAI,
        forceRefresh: false,
        provider: llmProvider,
        model: llmModel,
      };

      // 调用 AI 分析
      const aiResponse = await aiAnalysisApi.analyzeKline(analysisRequest, {
        signal: abortControllerRef.current.signal,
      });

      // 转换点位格式
      const convertedKeyLevels: KeyLevel[] = convertToKeyLevels(aiResponse.technicalPoints);

      // 更新关键点位
      setKeyLevels(convertedKeyLevels);

      // 更新 AI 分析结果字段
      setAiTrend(aiResponse.trend);
      setAiTrendDescription(aiResponse.trendDescription);
      setAiRecommendation(aiResponse.recommendation);
      setAiRecommendationReason(aiResponse.recommendationReason);
      setAiRiskLevel(aiResponse.riskLevel);
      setAiTargetPriceRange(aiResponse.targetPriceRange);

      // 更新解读结果
      setInterpretation({
        patterns: [],
        support: convertedKeyLevels.find((k) => k.type === 'support')?.price,
        resistance: convertedKeyLevels.find((k) => k.type === 'resistance')?.price,
        takeProfit: convertedKeyLevels.find((k) => k.type === 'takeProfit')?.price,
        stopLoss: convertedKeyLevels.find((k) => k.type === 'stopLoss')?.price,
        advice: aiResponse.recommendationReason || aiResponse.trendDescription,
      });
    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.log('AI 分析已取消');
        return;
      }

      console.error('AI 分析失败:', e);

      // Fallback
      try {
        const data = await interpretChart(selectedStock.symbol, selectedStock.history, lang);
        setInterpretation(data);
      } catch (e2) {
        setInterpretation({
          patterns: lang === 'zh' ? ["底部盘整", "量价背离"] : ["Bottom Consolidation", "Divergence"],
          support: selectedStock.price * 0.92,
          resistance: selectedStock.price * 1.08,
          takeProfit: selectedStock.price * 1.15,
          stopLoss: selectedStock.price * 0.88,
          advice: lang === 'zh' ? "当前处于筑底阶段，建议轻仓分批入场。" : "Bottoming out. Suggest light position entry."
        });
      }
    } finally {
      setIsAnalyzing(false);
      abortControllerRef.current = null;
    }
  };

  // 取消分析
  const handleCancelAnalyze = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsAnalyzing(false);
  };

  // 清空数据
  useEffect(() => {
    setCurrentKlineData([]);
    setKeyLevels([]);
    setInterpretation(null);
    setAiTrend('');
    setAiTrendDescription('');
    setAiRecommendation('');
    setAiRecommendationReason('');
    setAiRiskLevel('');
    setAiTargetPriceRange('');
  }, [chartType, selectedStock?.symbol]);

  // 获取趋势翻译
  const getTrendLabel = (trend: string): string => {
    const trendMap: Record<string, string> = {
      uptrend: t.kline_uptrend || '上涨趋势',
      downtrend: t.kline_downtrend || '下跌趋势',
      sideways: t.kline_sideways || '横盘整理',
    };
    return trendMap[trend] || trend;
  };

  // 获取推荐翻译
  const getRecommendationLabel = (rec: string): string => {
    const recMap: Record<string, string> = {
      strong_buy: t.kline_strong_buy || '强烈买入',
      buy: t.kline_buy || '买入',
      hold: t.kline_hold || '持有',
      sell: t.kline_sell || '卖出',
      strong_sell: t.kline_strong_sell || '强烈卖出',
    };
    return recMap[rec] || rec;
  };

  // 获取风险等级翻译
  const getRiskLevelLabel = (risk: string): string => {
    const riskMap: Record<string, string> = {
      low: t.kline_risk_low || '低风险',
      medium: t.kline_risk_medium || '中等风险',
      high: t.kline_risk_high || '高风险',
    };
    return riskMap[risk] || risk;
  };

  // 获取风险等级颜色
  const getRiskLevelColor = (risk: string): string => {
    const colorMap: Record<string, string> = {
      low: 'text-emerald-500 bg-emerald-50',
      medium: 'text-amber-500 bg-amber-50',
      high: 'text-rose-500 bg-rose-50',
    };
    return colorMap[risk] || 'text-slate-500 bg-slate-50';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* 交互控制台 */}
      <div className="bg-white p-4 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/20">
        <div className="flex flex-col lg:flex-row items-center gap-4">

          {/* 搜索/识别输入框 */}
          <div className="relative flex-grow w-full">
            <div className={`flex items-center bg-slate-50 border-2 rounded-2xl px-6 transition-all duration-300 ${
              isSearchFocused ? 'border-indigo-500 bg-white ring-4 ring-indigo-500/5' : 'border-slate-50'
            }`}>
              <i className="fas fa-magnifying-glass text-slate-300 mr-4"></i>
              <input
                type="text"
                placeholder="锁定证券代码进行 AI 深度研判..."
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-4 bg-transparent text-sm font-black text-slate-800 outline-none placeholder:text-slate-300"
              />
              {selectedStock && !searchQuery && (
                <div className="hidden sm:flex items-center bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ml-4 shrink-0 shadow-lg shadow-indigo-100">
                  Target: {selectedStock.symbol}
                </div>
              )}
            </div>

            {/* 下拉搜索结果 */}
            {isSearchFocused && (
              <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-3xl border border-slate-100 shadow-2xl z-[100] overflow-hidden">
                {!searchQuery.trim() && hotStocks.length > 0 && (
                  <div className="px-6 pt-4 pb-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">热门股票</p>
                  </div>
                )}
                <div className="p-2">
                  {isLoadingHotStocks ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map(s => (
                      <button
                        key={s.symbol}
                        onClick={() => { setSelectedStock(s); setSearchQuery(''); setIsSearchFocused(false); setInterpretation(null); }}
                        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-all"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center text-[10px] font-black">{s.symbol.slice(0, 2)}</div>
                          <div className="text-left">
                            <p className="text-sm font-black text-slate-900">{s.symbol}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">{s.name}</p>
                          </div>
                        </div>
                        <i className="fas fa-chevron-right text-slate-200 text-xs"></i>
                      </button>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                      <i className="fas fa-search text-2xl mb-2 opacity-30"></i>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-50">未找到匹配股票</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 生成按钮 / 取消按钮 */}
          <div className="flex items-center gap-3">
            {currentKlineData.length > 0 && !isAnalyzing && (
              <div className="hidden lg:flex items-center px-3 py-2 bg-slate-50 rounded-xl text-[10px] text-slate-500 font-medium">
                <i className="fas fa-database mr-2"></i>
                <span>已加载 {currentKlineData.length} 条{currentPeriod === 'minute' ? '分时' : currentPeriod === 'daily' ? '日 K' : '周/月 K'}数据</span>
              </div>
            )}

            {isAnalyzing ? (
              <button
                onClick={handleCancelAnalyze}
                className="bg-rose-600 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-rose-100 flex items-center justify-center min-w-[160px] hover:scale-[1.02] active:scale-95 transition-all"
              >
                <i className="fas fa-times mr-2"></i>
                取消分析
              </button>
            ) : (
              <button
                onClick={handleAnalyze}
                disabled={!selectedStock}
                className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-indigo-100 flex items-center justify-center min-w-[160px] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <i className="fas fa-atom mr-2"></i>
                生成 AI 研报
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 结果显示区 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
        {/* 左侧：图表终端 */}
        <div className="lg:col-span-3 space-y-6">
          {/* K 线图容器 */}
          <div className="bg-white p-6 rounded-[3.5rem] border border-slate-100 shadow-2xl relative overflow-hidden">
            {selectedStock ? (
              <>
                {/* 股票信息头部 */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-2xl flex items-center justify-center text-xl font-black shadow-lg">
                      {selectedStock.symbol.slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900">{selectedStock.name}</h3>
                      <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">{selectedStock.symbol}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black text-slate-900">¥{selectedStock.price.toFixed(2)}</p>
                    <div className={`flex items-center justify-end text-sm font-black ${selectedStock.change >= 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                      <span className="mr-2">{selectedStock.change >= 0 ? '+' : ''}{selectedStock.change.toFixed(2)}</span>
                      <span className={`px-3 py-1 rounded-lg ${selectedStock.change >= 0 ? 'bg-rose-50' : 'bg-emerald-50'}`}>
                        {selectedStock.changePercent >= 0 ? '↑' : '↓'} {Math.abs(selectedStock.changePercent).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* 图表类型切换和标题 */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">图表类型</span>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => setChartType('minute')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                          chartType === 'minute'
                            ? 'bg-indigo-600 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        分时图
                      </button>
                      <button
                        onClick={() => setChartType('day')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                          chartType === 'day'
                            ? 'bg-indigo-600 text-white shadow-lg'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        日 K 图
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-xs text-gray-400 font-medium">
                      {chartType === 'minute' ? '实时分时数据 · 精确到分钟' : '专业 K 线分析 · 支持多周期切换'}
                    </div>
                    {keyLevels.length > 0 && (
                      <button
                        onClick={() => setShowAIOverlay(!showAIOverlay)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all flex items-center space-x-2 ${
                          showAIOverlay
                            ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        <i className="fas fa-chart-line"></i>
                        <span>AI 点位</span>
                        {showAIOverlay && <i className="fas fa-check-circle ml-1"></i>}
                      </button>
                    )}
                  </div>
                </div>

                {/* K 线图表 */}
                {chartType === 'minute' ? (
                  <StockChart
                    stockCode={selectedStock.symbol}
                    height={500}
                    onDataLoad={(data, period) => {
                      setCurrentKlineData(data);
                      setCurrentPeriod(period);
                    }}
                  />
                ) : (
                  <StockChartWithOverlay
                    stockCode={selectedStock.symbol}
                    height={500}
                    keyLevels={keyLevels}
                    showOverlays={showAIOverlay && keyLevels.length > 0}
                    onDataLoad={(data, period) => {
                      setCurrentKlineData(data);
                      setCurrentPeriod(period);
                    }}
                  />
                )}
              </>
            ) : (
              <div className="h-[500px] flex flex-col items-center justify-center text-slate-400">
                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                  <i className="fas fa-chart-line text-4xl text-slate-300"></i>
                </div>
                <p className="text-sm font-black text-slate-900 mb-2">请从热门股票中选择或搜索股票代码</p>
                <p className="text-xs text-slate-400">支持分时图和日 K 线专业分析</p>
              </div>
            )}
          </div>

          {/* AI 分析结果摘要 */}
          {(aiTrend || aiRecommendation || aiRiskLevel) && (
            <div className="bg-gradient-to-r from-violet-50 to-indigo-50 p-6 rounded-[2.5rem] border border-violet-100 shadow-lg">
              <div className="flex items-center space-x-2 mb-4">
                <i className="fas fa-robot text-violet-600"></i>
                <h4 className="text-sm font-black text-slate-900">AI 分析摘要</h4>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {aiTrend && (
                  <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-violet-100">
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">趋势判断</p>
                    <p className="text-sm font-black text-slate-800">{getTrendLabel(aiTrend)}</p>
                    {aiTrendDescription && <p className="text-[10px] text-slate-500 mt-1">{aiTrendDescription}</p>}
                  </div>
                )}
                {aiRecommendation && (
                  <div className="bg-white/80 backdrop-blur rounded-xl p-4 border border-violet-100">
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">操作建议</p>
                    <p className="text-sm font-black text-indigo-600">{getRecommendationLabel(aiRecommendation)}</p>
                    {aiRecommendationReason && <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{aiRecommendationReason}</p>}
                  </div>
                )}
                {aiRiskLevel && (
                  <div className={`rounded-xl p-4 border ${getRiskLevelColor(aiRiskLevel)}`}>
                    <p className="text-[9px] opacity-70 font-black uppercase tracking-widest mb-1">风险等级</p>
                    <p className="text-sm font-black">{getRiskLevelLabel(aiRiskLevel)}</p>
                  </div>
                )}
              </div>
              {aiTargetPriceRange && (
                <div className="mt-4 bg-white/80 backdrop-blur rounded-xl p-4 border border-violet-100">
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">目标价格区间</p>
                  <p className="text-sm font-black text-slate-800">{aiTargetPriceRange}</p>
                </div>
              )}
            </div>
          )}

          {/* AI 点位说明卡片 */}
          {keyLevels.length > 0 && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-[2.5rem] border border-indigo-100 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-black text-slate-900 flex items-center space-x-2">
                  <i className="fas fa-robot text-indigo-600"></i>
                  <span>AI 识别的关键点位</span>
                </h4>
                <span className="text-xs text-slate-500 font-medium">基于 K 线数据智能分析</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {keyLevels.map((level) => {
                  const colors: Record<string, string> = {
                    support: 'border-emerald-300 bg-emerald-50',
                    resistance: 'border-rose-300 bg-rose-50',
                    stopLoss: 'border-amber-300 bg-amber-50',
                    takeProfit: 'border-indigo-300 bg-indigo-50',
                  };
                  const textColors: Record<string, string> = {
                    support: 'text-emerald-700',
                    resistance: 'text-rose-700',
                    stopLoss: 'text-amber-700',
                    takeProfit: 'text-indigo-700',
                  };
                  return (
                    <div key={level.label} className={`p-4 rounded-2xl border-2 ${colors[level.type]} transition-all hover:shadow-md`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-black uppercase tracking-wider ${textColors[level.type]}`}>{level.label}</span>
                        {level.confidence && (
                          <span className="text-[10px] text-slate-500 font-medium">{Math.round(level.confidence * 100)}%</span>
                        )}
                      </div>
                      <p className={`text-lg font-black ${textColors[level.type]}`}>¥{typeof level.price === 'number' ? level.price.toFixed(2) : level.price}</p>
                      {level.reason && (
                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{level.reason}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 指标卡片组 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: '关键支撑', val: interpretation?.support, icon: 'fa-anchor', color: 'text-emerald-500', bg: 'bg-emerald-50/50' },
              { label: '趋势压力', val: interpretation?.resistance, icon: 'fa-triangle-exclamation', color: 'text-amber-500', bg: 'bg-amber-50/50' },
              { label: '止盈目标', val: interpretation?.takeProfit, icon: 'fa-flag-checkered', color: 'text-indigo-500', bg: 'bg-indigo-50/50' },
              { label: '风控止损', val: interpretation?.stopLoss, icon: 'fa-shield-halved', color: 'text-rose-500', bg: 'bg-rose-50/50' },
            ].map(p => (
              <div key={p.label} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center group transition-all hover:bg-slate-50">
                <div className={`w-10 h-10 ${p.bg} ${p.color} rounded-xl flex items-center justify-center mb-3 shadow-inner`}>
                  <i className={`fas ${p.icon} text-xs`}></i>
                </div>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">{p.label}</p>
                {isAnalyzing ? (
                  <div className="h-6 w-16 bg-slate-50 animate-pulse rounded"></div>
                ) : (
                  <h4 className="text-xl font-black text-slate-800 tracking-tighter">{p.val ? (typeof p.val === 'number' ? `¥${p.val.toFixed(2)}` : `¥${p.val}`) : '--.--'}</h4>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 右侧：策略节点 */}
        <div className="bg-[#0c0e16] p-10 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-10">
            <h4 className="text-lg font-black italic flex items-center space-x-3">
              <span className={`w-2 h-2 ${isAnalyzing ? 'bg-indigo-400 animate-ping' : 'bg-indigo-500'} rounded-full`}></span>
              <span>AI 模型策略节点</span>
            </h4>
            <button className="text-slate-600 hover:text-white transition-colors"><i className="fas fa-arrow-up-right-from-square text-xs"></i></button>
          </div>

          <div className="flex-grow flex flex-col justify-center">
             {isAnalyzing ? (
               <div className="space-y-6">
                  <div className="h-3 w-3/4 bg-white/5 animate-pulse rounded"></div>
                  <div className="h-3 w-full bg-white/5 animate-pulse rounded"></div>
                  <div className="h-3 w-2/3 bg-white/5 animate-pulse rounded"></div>
                  <div className="pt-10 flex justify-center">
                     <i className="fas fa-brain animate-pulse text-white/10 text-4xl"></i>
                  </div>
               </div>
             ) : interpretation ? (
               <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="flex flex-wrap gap-2">
                    {interpretation.patterns.map(p => <span key={p} className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-[9px] font-black text-indigo-400 uppercase tracking-widest"># {p}</span>)}
                  </div>
                  <div className="relative">
                    <i className="fas fa-quote-left absolute -top-4 -left-2 text-white/5 text-4xl"></i>
                    <p className="text-base font-medium italic text-slate-200 border-l-4 border-indigo-600 pl-6 py-4 leading-relaxed">
                      "{interpretation.advice}"
                    </p>
                  </div>
               </div>
             ) : (
               <div className="text-center space-y-6 opacity-20 py-20">
                  <i className="fas fa-microchip text-5xl"></i>
                  <p className="text-[10px] font-black uppercase tracking-widest">等待引擎加载指令</p>
               </div>
             )}
          </div>

          <div className="mt-10 pt-10 border-t border-white/5">
            <p className="text-[9px] text-slate-500 font-bold leading-relaxed italic">
              AI 结论基于历史行情概率模型生成，不构成直接买卖邀约。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterpretationTab;
