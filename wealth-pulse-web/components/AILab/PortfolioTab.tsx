import React, { useState } from 'react';
import { Transaction, PositionItem, PositionAnalysisResult, TransactionType } from '../../types';
import { aiAnalysisApi } from '../../services/aiAnalysis';
import { Language } from '../../i18n';
import { AppConfig } from '../../types';

interface PortfolioTabProps {
  transactions: Transaction[];
  config?: AppConfig | null;
  lang: Language;
}

const PortfolioTab: React.FC<PortfolioTabProps> = ({ transactions, config, lang }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<PositionAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 从交易记录中计算持仓
  const calculateHoldings = (): PositionItem[] => {
    const hMap: Record<string, { qty: number; totalCost: number; firstBuyDate?: string }> = {};

    transactions.forEach(t => {
      if (!hMap[t.symbol]) hMap[t.symbol] = { qty: 0, totalCost: 0 };

      if (t.type === TransactionType.BUY) {
        if (!hMap[t.symbol].firstBuyDate) {
          hMap[t.symbol].firstBuyDate = t.date;
        }
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
      .map(([symbol, data]) => ({
        stockCode: symbol,
        buyPrice: data.totalCost / (data.qty || 1),
        quantity: data.qty,
        buyDate: data.firstBuyDate,
      }));
  };

  const runAnalysis = async () => {
    if (!config?.llmProvider || !config?.llmModel) {
      setError(lang === 'zh'
        ? '请先在设置中配置 LLM 供应商和模型'
        : 'Please configure LLM provider and model in Settings first');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const positions = calculateHoldings();

      if (positions.length === 0) {
        setError(lang === 'zh' ? '当前没有持仓记录' : 'No holdings found');
        setIsAnalyzing(false);
        return;
      }

      const analysisResult = await aiAnalysisApi.analyzePosition({
        positions,
        analysisDepth: 'standard',
        provider: config.llmProvider,
        model: config.llmModel,
      });

      setResult(analysisResult);
    } catch (e: any) {
      console.error('持仓分析失败:', e);
      setError(e?.message || (lang === 'zh' ? '持仓分析失败，请重试' : 'Position analysis failed, please try again'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 获取评分颜色
  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-blue-500';
    if (score >= 40) return 'text-amber-500';
    return 'text-rose-500';
  };

  // 获取操作建议样式
  const getActionStyle = (action: string): string => {
    const actionMap: Record<string, string> = {
      '加仓': 'bg-emerald-100 text-emerald-700',
      '持有': 'bg-blue-100 text-blue-700',
      '减仓': 'bg-amber-100 text-amber-700',
      '清仓': 'bg-rose-100 text-rose-700',
      'strong_buy': 'bg-emerald-100 text-emerald-700',
      'buy': 'bg-blue-100 text-blue-700',
      'hold': 'bg-amber-100 text-amber-700',
      'sell': 'bg-rose-100 text-rose-700',
      'strong_sell': 'bg-rose-100 text-rose-700',
    };
    return actionMap[action] || 'bg-slate-100 text-slate-700';
  };

  // 获取风险等级颜色
  const getRiskColor = (level: string): string => {
    const riskMap: Record<string, string> = {
      '低': 'text-emerald-500 bg-emerald-50',
      '中': 'text-amber-500 bg-amber-50',
      '高': 'text-rose-500 bg-rose-50',
      'low': 'text-emerald-500 bg-emerald-50',
      'medium': 'text-amber-500 bg-amber-50',
      'high': 'text-rose-500 bg-rose-50',
    };
    return riskMap[level] || 'text-slate-500 bg-slate-50';
  };

  const holdings = calculateHoldings();
  const hasHoldings = holdings.length > 0;
  const hasConfig = config?.llmProvider && config?.llmModel;

  return (
    <div className="space-y-6">
      {/* 头部操作区 */}
      <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-sm flex flex-col items-center text-center">
        <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mb-8 border border-indigo-100">
          <i className={`fas fa-layer-group text-4xl ${isAnalyzing ? 'animate-spin' : ''}`}></i>
        </div>
        <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-4">
          {lang === 'zh' ? '持仓组合智能分析' : 'Portfolio Analysis'}
        </h3>
        <p className="text-slate-400 text-sm max-w-lg mb-10">
          {lang === 'zh'
            ? `基于LLM大模型，对您的${holdings.length}只持仓进行全方位智能分析，给出评分、建议和风险预警`
            : `AI-powered analysis of your ${holdings.length} holdings using LLM, with scores, recommendations and risk warnings`}
        </p>

        {!hasConfig && (
          <div className="mb-6 p-4 bg-amber-50 rounded-2xl border border-amber-100">
            <p className="text-sm font-bold text-amber-700">
              {lang === 'zh' ? '请先在设置中配置 LLM 供应商和模型' : 'Please configure LLM provider and model in Settings first'}
            </p>
          </div>
        )}

        {!hasHoldings && (
          <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-sm font-bold text-slate-600">
              {lang === 'zh' ? '暂无持仓记录，请先添加交易记录' : 'No holdings found, please add transactions first'}
            </p>
          </div>
        )}

        <button
          onClick={runAnalysis}
          disabled={isAnalyzing || !hasConfig || !hasHoldings}
          className="bg-indigo-600 text-white px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl min-w-[200px] hover:scale-105 transition-all disabled:bg-slate-300 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isAnalyzing ? (
            <>
              <i className="fas fa-circle-notch animate-spin mr-2"></i>
              {lang === 'zh' ? '分析中...' : 'Analyzing...'}
            </>
          ) : (
            <>
              <i className="fas fa-microchip mr-2"></i>
              {lang === 'zh' ? '启动智能分析' : 'Run Analysis'}
            </>
          )}
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-rose-50 border border-rose-100 rounded-3xl p-6 text-center">
          <i className="fas fa-exclamation-circle text-rose-500 text-2xl mb-3"></i>
          <p className="text-rose-700 font-bold">{error}</p>
        </div>
      )}

      {/* 加载状态 */}
      {isAnalyzing && (
        <div className="space-y-6">
          <div className="h-40 bg-slate-50 animate-pulse rounded-[3rem] border border-slate-100"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-slate-50 animate-pulse rounded-[2rem] border border-slate-100"></div>
            ))}
          </div>
        </div>
      )}

      {/* 分析结果 */}
      {result && !isAnalyzing && (
        <div className="space-y-6 animate-in zoom-in-95">
          {/* 投资组合摘要 */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div className="flex items-center space-x-4 mb-8">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-100">
                <i className="fas fa-chart-pie text-xl"></i>
              </div>
              <div>
                <h4 className="font-black text-slate-800 tracking-tight text-lg">
                  {lang === 'zh' ? '投资组合摘要' : 'Portfolio Summary'}
                </h4>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                  {result.portfolioSummary.overallRating}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {/* 综合评分 */}
              <div className="text-center p-4 bg-slate-50 rounded-2xl">
                <p className="text-[9px] text-slate-400 font-black uppercase mb-2 tracking-widest">
                  {lang === 'zh' ? '综合评分' : 'Overall Score'}
                </p>
                <p className={`text-3xl font-black ${getScoreColor(result.portfolioSummary.overallScore)}`}>
                  {result.portfolioSummary.overallScore}
                </p>
              </div>

              {/* 风险等级 */}
              <div className={`text-center p-4 rounded-2xl ${getRiskColor(result.portfolioSummary.riskLevel)}`}>
                <p className="text-[9px] font-black uppercase mb-2 tracking-widest opacity-70">
                  {lang === 'zh' ? '风险等级' : 'Risk Level'}
                </p>
                <p className="text-2xl font-black">{result.portfolioSummary.riskLevel}</p>
              </div>

              {/* 分散程度 */}
              <div className="text-center p-4 bg-slate-50 rounded-2xl">
                <p className="text-[9px] text-slate-400 font-black uppercase mb-2 tracking-widest">
                  {lang === 'zh' ? '分散程度' : 'Diversification'}
                </p>
                <p className="text-xl font-black text-slate-700">{result.portfolioSummary.diversification}</p>
              </div>

              {/* 投资风格 */}
              <div className="text-center p-4 bg-slate-50 rounded-2xl">
                <p className="text-[9px] text-slate-400 font-black uppercase mb-2 tracking-widest">
                  {lang === 'zh' ? '投资风格' : 'Investment Style'}
                </p>
                <p className="text-xl font-black text-slate-700">{result.portfolioSummary.investmentStyle}</p>
              </div>

              {/* 综合评级 */}
              <div className="text-center p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl">
                <p className="text-[9px] text-indigo-400 font-black uppercase mb-2 tracking-widest">
                  {lang === 'zh' ? '综合评级' : 'Overall Rating'}
                </p>
                <p className="text-2xl font-black text-indigo-700">{result.portfolioSummary.overallRating}</p>
              </div>
            </div>
          </div>

          {/* 持仓评分列表 */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div className="flex items-center space-x-4 mb-8">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-100">
                <i className="fas fa-star text-xl"></i>
              </div>
              <div>
                <h4 className="font-black text-slate-800 tracking-tight text-lg">
                  {lang === 'zh' ? '持仓评分' : 'Position Scores'}
                </h4>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                  {result.positionScores.length} {lang === 'zh' ? '只持仓' : 'holdings'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.positionScores.map((score, index) => (
                <div key={index} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-emerald-200 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-black text-slate-800 text-lg">{score.stockCode}</span>
                    <span className="text-[9px] font-bold uppercase text-slate-400">{score.grade}级</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <p className={`text-3xl font-black ${getScoreColor(score.score)}`}>
                      {score.score}
                    </p>
                    <div className="text-right">
                      <p className="text-[9px] text-slate-400 font-black uppercase">{lang === 'zh' ? '持仓质量' : 'Quality'}</p>
                      <p className="text-sm font-bold text-slate-700">{score.holdingQuality}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{lang === 'zh' ? '前景' : 'Prospect'}:</span>
                      <span className="font-bold text-slate-600">{score.profitProspect}</span>
                    </div>
                  </div>
                  {score.riskWarning && (
                    <div className="mt-2 p-2 bg-rose-50 rounded-lg">
                      <p className="text-[9px] text-rose-600 font-medium line-clamp-2">
                        <i className="fas fa-triangle-exclamation mr-1"></i>
                        {score.riskWarning}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 持仓建议 */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <div className="flex items-center space-x-4 mb-8">
              <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 border border-amber-100">
                <i className="fas fa-lightbulb text-xl"></i>
              </div>
              <div>
                <h4 className="font-black text-slate-800 tracking-tight text-lg">
                  {lang === 'zh' ? '持仓建议' : 'Position Recommendations'}
                </h4>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                  {result.positionRecommendations.length} {lang === 'zh' ? '条建议' : 'recommendations'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.positionRecommendations.map((rec, index) => (
                <div key={index} className="p-5 border-2 rounded-2xl transition-all hover:shadow-md" style={{ borderColor: rec.action === '加仓' || rec.action === 'strong_buy' ? '#10b981' : rec.action === '持有' || rec.action === 'hold' ? '#3b82f6' : rec.action === '减仓' ? '#f59e0b' : '#f43f5e' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-black text-slate-800 text-lg">{rec.stockCode}</span>
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${getActionStyle(rec.action)}`}>
                      {rec.action}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-3 leading-relaxed">{rec.reason}</p>
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <p className="text-slate-400">{lang === 'zh' ? '目标价' : 'Target'}</p>
                      <p className="font-bold text-slate-700">{rec.targetPriceRange}</p>
                    </div>
                    {rec.stopLossPrice && (
                      <div>
                        <p className="text-slate-400">{lang === 'zh' ? '止损价' : 'Stop Loss'}</p>
                        <p className="font-bold text-rose-600">{rec.stopLossPrice.toFixed(2)}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-slate-400">{lang === 'zh' ? '置信度' : 'Confidence'}</p>
                      <p className={`font-bold ${rec.confidence === 'high' ? 'text-emerald-600' : rec.confidence === 'medium' ? 'text-amber-600' : 'text-rose-600'}`}>
                        {rec.confidence}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 整体建议 */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-900 p-8 rounded-[2.5rem] text-white shadow-xl">
            <div className="flex items-center space-x-4 mb-8">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-white backdrop-blur-sm border border-white/20">
                <i className="fas fa-compass text-xl"></i>
              </div>
              <div>
                <h4 className="font-black text-white tracking-tight text-lg">
                  {lang === 'zh' ? '整体投资策略' : 'Overall Strategy'}
                </h4>
                <p className="text-xs text-indigo-300 font-bold uppercase tracking-widest">
                  {result.overallRecommendation.strategy}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h5 className="text-[9px] font-black uppercase text-indigo-300 mb-4 tracking-widest">
                  {lang === 'zh' ? '核心要点' : 'Key Points'}
                </h5>
                <ul className="space-y-2">
                  {result.overallRecommendation.keyPoints.map((point, index) => (
                    <li key={index} className="flex items-start space-x-2 text-sm">
                      <i className="fas fa-circle-check text-emerald-400 mt-0.5"></i>
                      <span className="text-slate-200">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h5 className="text-[9px] font-black uppercase text-indigo-300 mb-4 tracking-widest">
                  {lang === 'zh' ? '建议操作' : 'Suggested Actions'}
                </h5>
                <ul className="space-y-2">
                  {result.overallRecommendation.suggestedActions.map((action, index) => (
                    <li key={index} className="flex items-start space-x-2 text-sm">
                      <i className="fas fa-arrow-right text-amber-400 mt-0.5"></i>
                      <span className="text-slate-200">{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {result.overallRecommendation.riskSummary && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <h5 className="text-[9px] font-black uppercase text-rose-300 mb-2 tracking-widest">
                  {lang === 'zh' ? '整体风险' : 'Overall Risk'}
                </h5>
                <p className="text-sm text-slate-300 leading-relaxed">{result.overallRecommendation.riskSummary}</p>
              </div>
            )}
          </div>

          {/* 市场展望 */}
          {result.marketOutlook && (
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="flex items-center space-x-4 mb-8">
                <div className="w-12 h-12 bg-sky-50 rounded-xl flex items-center justify-center text-sky-600 border border-sky-100">
                  <i className="fas fa-globe text-xl"></i>
                </div>
                <div>
                  <h4 className="font-black text-slate-800 tracking-tight text-lg">
                    {lang === 'zh' ? '市场展望' : 'Market Outlook'}
                  </h4>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                    {result.marketOutlook.trend} · {result.marketOutlook.confidence} {lang === 'zh' ? '置信度' : 'confidence'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4 mb-6">
                <div className={`px-6 py-3 rounded-2xl font-black text-lg ${
                  result.marketOutlook.trend === '看涨' || result.marketOutlook.trend === 'uptrend'
                    ? 'bg-emerald-100 text-emerald-700'
                    : result.marketOutlook.trend === '看跌' || result.marketOutlook.trend === 'downtrend'
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  <i className={`fas ${
                    result.marketOutlook.trend === '看涨' || result.marketOutlook.trend === 'uptrend'
                      ? 'fa-chart-line'
                      : result.marketOutlook.trend === '看跌' || result.marketOutlook.trend === 'downtrend'
                      ? 'fa-chart-line-down'
                      : 'fa-minus'
                  } mr-2`}></i>
                  {result.marketOutlook.trend}
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    {[1, 2, 3].map(i => (
                      <div
                        key={i}
                        className={`w-2 h-8 rounded-full ${
                          i <= (result.marketOutlook.confidence === 'high' ? 3 : result.marketOutlook.confidence === 'medium' ? 2 : 1)
                            ? 'bg-indigo-500'
                            : 'bg-slate-200'
                        }`}
                      ></div>
                    ))}
                  </div>
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    {result.marketOutlook.confidence}
                  </span>
                </div>
              </div>

              {result.marketOutlook.keyFactors.length > 0 && (
                <div>
                  <h5 className="text-[9px] font-black uppercase text-slate-400 mb-3 tracking-widest">
                    {lang === 'zh' ? '关键因素' : 'Key Factors'}
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {result.marketOutlook.keyFactors.map((factor, index) => (
                      <span key={index} className="px-4 py-2 bg-slate-100 rounded-full text-sm font-bold text-slate-600">
                        {factor}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PortfolioTab;
