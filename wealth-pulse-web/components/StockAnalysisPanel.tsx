import React, { useState, useEffect } from 'react';
import { stockApi } from '../services/stockApi';

// 类型定义 - 兼容后端返回的 snake_case 格式
interface TechnicalPoint {
  type: 'support' | 'resistance' | 'takeProfit' | 'take_profit' | 'stopLoss' | 'stop_loss';
  price: number | string;
  description?: string;
}

interface StockAnalysisResult {
  stockCode: string;
  currentPrice: string;
  trend: string;
  trendDescription: string;
  technicalPoints: TechnicalPoint[];
  recommendation: string;
  recommendationReason: string;
  riskLevel: string;
  riskDescription: string;
  targetPriceRange: string;
  fundamentalAnalysis: string;
  technicalAnalysis: string;
  newsImpact: string;
  rating: string;
  confidence: string;
}

interface StockAnalysisPanelProps {
  isOpen: boolean;
  onClose: () => void;
  stockCode: string;
  stockName: string;
}

// 趋势标签映射
const getTrendLabel = (trend: string): string => {
  const trendMap: Record<string, string> = {
    'uptrend': '上涨趋势',
    'downtrend': '下跌趋势',
    'sideways': '横盘整理',
    '震荡': '横盘整理',
    '上涨': '上涨趋势',
    '下跌': '下跌趋势',
  };
  return trendMap[trend] || trend;
};

// 趋势颜色映射
const getTrendColor = (trend: string): string => {
  if (trend.includes('uptrend') || trend.includes('上涨')) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  if (trend.includes('downtrend') || trend.includes('下跌')) return 'text-rose-600 bg-rose-50 border-rose-200';
  return 'text-amber-600 bg-amber-50 border-amber-200';
};

// 建议标签映射
const getRecommendationLabel = (recommendation: string): string => {
  const recMap: Record<string, string> = {
    'strong_buy': '强烈买入',
    'buy': '买入',
    'hold': '持有',
    'sell': '卖出',
    'strong_sell': '强烈卖出',
    '强烈推荐买入': '强烈买入',
    '推荐买入': '买入',
    '持有': '持有',
    '卖出': '卖出',
  };
  return recMap[recommendation] || recommendation;
};

// 建议颜色映射
const getRecommendationColor = (recommendation: string): string => {
  if (recommendation.includes('strong_buy') || recommendation.includes('强烈买入')) return 'bg-gradient-to-r from-emerald-500 to-emerald-600';
  if (recommendation.includes('buy') || recommendation.includes('买入')) return 'bg-gradient-to-r from-green-500 to-green-600';
  if (recommendation.includes('hold') || recommendation.includes('持有')) return 'bg-gradient-to-r from-amber-500 to-amber-600';
  if (recommendation.includes('sell') || recommendation.includes('卖出')) return 'bg-gradient-to-r from-rose-500 to-rose-600';
  return 'bg-gradient-to-r from-slate-500 to-slate-600';
};

// 风险等级映射
const getRiskLevel = (riskLevel: string): string => {
  const riskMap: Record<string, string> = {
    'low': '低风险',
    'medium': '中等风险',
    'high': '高风险',
    '低风险': '低风险',
    '中等风险': '中等风险',
    '高风险': '高风险',
  };
  return riskMap[riskLevel] || riskLevel;
};

const StockAnalysisPanel: React.FC<StockAnalysisPanelProps> = ({ isOpen, onClose, stockCode, stockName }) => {
  const [analysis, setAnalysis] = useState<StockAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && stockCode) {
      fetchAnalysis();
    }
  }, [isOpen, stockCode]);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      // 从 localStorage 获取用户配置的 LLM
      const configStr = localStorage.getItem('app_config');
      const appConfig = configStr ? JSON.parse(configStr) : null;
      const llmProvider = appConfig?.llmProvider;
      const llmModel = appConfig?.llmModel;

      const data = await stockApi.analyzeStock({
        stockCode,
        period: 'daily',
        days: 60,
        forceRefresh: false,
        provider: llmProvider,
        model: llmModel,
      });
      setAnalysis(data);
    } catch (err: any) {
      console.error('AI 分析失败:', err);
      setError(err.message || '分析失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={onClose}
      ></div>

      {/* 侧边抽屉 */}
      <div className="fixed right-0 top-0 h-full w-full md:w-[70%] lg:w-[60%] xl:w-[50%] bg-white shadow-2xl z-50 animate-in slide-in-from-right duration-300 overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <i className="fas fa-brain text-white text-xl"></i>
              </div>
              <div>
                <h3 className="text-xl font-black text-white">AI 智能分析</h3>
                <p className="text-indigo-100 text-sm font-medium mt-0.5">
                  {stockCode} - {stockName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors"
            >
              <i className="fas fa-times text-white text-lg"></i>
            </button>
          </div>
        </div>

        {/* 内容区域 - 可滚动 */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState error={error} onRetry={fetchAnalysis} />
          ) : analysis ? (
            <AnalysisContent analysis={analysis} />
          ) : null}
        </div>
      </div>
    </>
  );
};

/* ==================== 加载状态 ==================== */
const LoadingState: React.FC = () => (
  <div className="flex items-center justify-center py-20">
    <div className="text-center">
      <div className="relative inline-block">
        <div className="w-20 h-20 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <i className="fas fa-brain text-indigo-600 text-2xl animate-pulse"></i>
        </div>
      </div>
      <p className="text-slate-500 text-sm mt-6 font-medium">AI 正在分析中...</p>
      <p className="text-slate-400 text-xs mt-2">综合技术面、基本面、市场情绪多维度评估</p>
    </div>
  </div>
);

/* ==================== 错误状态 ==================== */
const ErrorState: React.FC<{ error: string; onRetry: () => void }> = ({ error, onRetry }) => (
  <div className="flex items-center justify-center py-20">
    <div className="text-center">
      <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <i className="fas fa-exclamation-circle text-rose-500 text-3xl"></i>
      </div>
      <p className="text-slate-500 text-sm mb-4">{error}</p>
      <button
        onClick={onRetry}
        className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-black transition-colors"
      >
        <i className="fas fa-redo mr-2"></i>
        重新分析
      </button>
    </div>
  </div>
);

/* ==================== 分析结果内容 ==================== */
const AnalysisContent: React.FC<{ analysis: StockAnalysisResult }> = ({ analysis }) => {
  const trendStyle = getTrendColor(analysis.trend);
  const recommendationStyle = getRecommendationColor(analysis.recommendation);

  return (
    <div className="space-y-6">
      {/* 综合评级卡片 */}
      <div className={`${recommendationStyle} rounded-3xl p-8 text-white shadow-2xl`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-indigo-100 text-xs font-black uppercase tracking-widest mb-2">综合评级</p>
            <h4 className="text-3xl font-black">{getRecommendationLabel(analysis.recommendation)}</h4>
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
            <i className="fas fa-star text-3xl"></i>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex-1 bg-white/20 rounded-full h-3 overflow-hidden">
            <div
              className="bg-white h-full rounded-full transition-all duration-500"
              style={{ width: getConfidenceWidth(analysis.confidence) }}
            ></div>
          </div>
          <span className="text-xs font-black whitespace-nowrap">
            置信度：{getConfidenceLabel(analysis.confidence)}
          </span>
        </div>
      </div>

      {/* 趋势判断 */}
      <div className={`rounded-2xl p-6 border-2 ${trendStyle}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${analysis.trend.includes('uptrend') || analysis.trend.includes('上涨') ? 'bg-emerald-100' : analysis.trend.includes('downtrend') || analysis.trend.includes('下跌') ? 'bg-rose-100' : 'bg-amber-100'}`}>
              <i className={`fas ${analysis.trend.includes('uptrend') || analysis.trend.includes('上涨') ? 'fa-arrow-trend-up text-emerald-600' : analysis.trend.includes('downtrend') || analysis.trend.includes('下跌') ? 'fa-arrow-trend-down text-rose-600' : 'fa-arrows-left-right text-amber-600'}`}></i>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-black uppercase">趋势判断</p>
              <p className="text-lg font-black text-slate-800">{getTrendLabel(analysis.trend)}</p>
            </div>
          </div>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">{analysis.trendDescription}</p>
      </div>

      {/* 目标价格区间 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
            <i className="fas fa-bullseye text-indigo-600"></i>
          </div>
          <h5 className="text-base font-black text-slate-900">目标价格区间</h5>
        </div>
        <p className="text-2xl font-black text-indigo-600">{analysis.targetPriceRange}</p>
      </div>

      {/* 技术点位 */}
      {analysis.technicalPoints && analysis.technicalPoints.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
              <i className="fas fa-chart-line text-purple-600"></i>
            </div>
            <h5 className="text-base font-black text-slate-900">关键点位</h5>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {analysis.technicalPoints.map((point, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border-2 ${getTechnicalPointStyle(point.type)}`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <i className={`fas ${getTechnicalPointIcon(point.type)} ${getTechnicalPointIconColor(point.type)}`}></i>
                  <span className="text-[10px] text-slate-400 font-black uppercase">{getTechnicalPointLabel(point.type)}</span>
                </div>
                <p className="text-lg font-black text-slate-900">{formatPrice(point.price)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 风险等级 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
            <i className="fas fa-triangle-exclamation text-amber-600"></i>
          </div>
          <h5 className="text-base font-black text-slate-900">风险评估</h5>
        </div>
        <div className="flex items-center space-x-3 mb-3">
          <span className={`px-4 py-2 rounded-xl text-sm font-black ${getRiskStyle(analysis.riskLevel)}`}>
            {getRiskLevel(analysis.riskLevel)}
          </span>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">{analysis.riskDescription}</p>
      </div>

      {/* 基本面分析 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
            <i className="fas fa-file-invoice text-emerald-600"></i>
          </div>
          <h5 className="text-base font-black text-slate-900">基本面分析</h5>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">{analysis.fundamentalAnalysis || '暂无基本面分析数据'}</p>
      </div>

      {/* 技术面分析 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <i className="fas fa-chart-area text-blue-600"></i>
          </div>
          <h5 className="text-base font-black text-slate-900">技术面分析</h5>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">{analysis.technicalAnalysis || '暂无技术面分析数据'}</p>
      </div>

      {/* 新闻影响 */}
      {analysis.newsImpact && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
              <i className="fas fa-newspaper text-rose-600"></i>
            </div>
            <h5 className="text-base font-black text-slate-900">新闻影响</h5>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{analysis.newsImpact}</p>
        </div>
      )}

      {/* 建议说明 */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-6">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
            <i className="fas fa-lightbulb text-indigo-600"></i>
          </div>
          <h5 className="text-base font-black text-indigo-900">操作建议</h5>
        </div>
        <p className="text-sm text-indigo-800 leading-relaxed">{analysis.recommendationReason}</p>
      </div>
    </div>
  );
};

// 辅助函数
const formatPrice = (price: number | string | undefined | null): string => {
  if (price === undefined || price === null) return '-';
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return isNaN(numPrice) ? '-' : numPrice.toFixed(2);
};

const getConfidenceWidth = (confidence: string): string => {
  const confidenceMap: Record<string, string> = {
    'high': '85%',
    'medium': '60%',
    'low': '35%',
    '高': '85%',
    '中': '60%',
    '低': '35%',
  };
  return confidenceMap[confidence] || '50%';
};

const getConfidenceLabel = (confidence: string): string => {
  const confidenceMap: Record<string, string> = {
    'high': '高',
    'medium': '中',
    'low': '低',
    '高': '高',
    '中': '中',
    '低': '低',
  };
  return confidenceMap[confidence] || confidence;
};

const getTechnicalPointStyle = (type: string): string => {
  // 兼容 snake_case 和 camelCase 格式
  const normalizedType = type.replace('_', '');
  const styleMap: Record<string, string> = {
    'support': 'bg-emerald-50 border-emerald-200',
    'resistance': 'bg-rose-50 border-rose-200',
    'takeprofit': 'bg-blue-50 border-blue-200',
    'stoploss': 'bg-amber-50 border-amber-200',
  };
  return styleMap[normalizedType] || 'bg-slate-50 border-slate-200';
};

const getTechnicalPointIcon = (type: string): string => {
  // 兼容 snake_case 和 camelCase 格式
  const normalizedType = type.replace('_', '');
  const iconMap: Record<string, string> = {
    'support': 'fa-circle-arrow-down',
    'resistance': 'fa-circle-arrow-up',
    'takeprofit': 'fa-coins',
    'stoploss': 'fa-shield-halved',
  };
  return iconMap[normalizedType] || 'fa-circle';
};

const getTechnicalPointIconColor = (type: string): string => {
  // 兼容 snake_case 和 camelCase 格式
  const normalizedType = type.replace('_', '');
  const colorMap: Record<string, string> = {
    'support': 'text-emerald-600',
    'resistance': 'text-rose-600',
    'takeprofit': 'text-blue-600',
    'stoploss': 'text-amber-600',
  };
  return colorMap[normalizedType] || 'text-slate-600';
};

const getTechnicalPointLabel = (type: string): string => {
  // 兼容 snake_case 和 camelCase 格式
  const normalizedType = type.replace('_', '');
  const labelMap: Record<string, string> = {
    'support': '支撑位',
    'resistance': '阻力位',
    'takeprofit': '止盈位',
    'stoploss': '止损位',
  };
  return labelMap[normalizedType] || type;
};

const getRiskStyle = (riskLevel: string): string => {
  if (riskLevel.includes('low') || riskLevel.includes('低')) return 'bg-emerald-100 text-emerald-700';
  if (riskLevel.includes('medium') || riskLevel.includes('中')) return 'bg-amber-100 text-amber-700';
  if (riskLevel.includes('high') || riskLevel.includes('高')) return 'bg-rose-100 text-rose-700';
  return 'bg-slate-100 text-slate-700';
};

export default StockAnalysisPanel;
