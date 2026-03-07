import React, { useState, useEffect } from 'react';
import { stockApi, HkStockNews, HkStockCompanyInfoSina, HkStockFinancialIndicatorsSina, HkStockFinancialIndicatorEm, HkStockCompanyNotice } from '../services/stockApi';

// 类型定义
type ImpactType = 'positive' | 'negative' | 'neutral';

interface NewsItem {
  title: string;
  summary: string;
  source: string;
  time: string;
  impact: ImpactType;
  tag: string;
}

interface StockInfoPanelProps {
  isOpen: boolean;
  onClose: () => void;
  stockCode: string;
  stockName: string;
}

const StockInfoPanel: React.FC<StockInfoPanelProps> = ({ isOpen, onClose, stockCode, stockName }) => {
  const [activeTab, setActiveTab] = useState<'news' | 'financial' | 'company' | 'report'>('news');

  // 数据状态
  const [newsList, setNewsList] = useState<HkStockNews[]>([]);
  const [companyInfo, setCompanyInfo] = useState<HkStockCompanyInfoSina | null>(null);
  const [financialData, setFinancialData] = useState<HkStockFinancialIndicatorsSina | null>(null);
  const [financialDataEm, setFinancialDataEm] = useState<HkStockFinancialIndicatorEm | null>(null);
  const [noticeList, setNoticeList] = useState<HkStockCompanyNotice[]>([]);

  // 加载状态
  const [newsLoading, setNewsLoading] = useState(false);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [financialLoading, setFinancialLoading] = useState(false);
  const [financialEmLoading, setFinancialEmLoading] = useState(false);
  const [noticeLoading, setNoticeLoading] = useState(false);

  // 错误状态
  const [newsError, setNewsError] = useState<string | null>(null);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [financialError, setFinancialError] = useState<string | null>(null);
  const [financialEmError, setFinancialEmError] = useState<string | null>(null);
  const [noticeError, setNoticeError] = useState<string | null>(null);

  // 获取新闻数据
  useEffect(() => {
    if (isOpen && activeTab === 'news' && stockCode) {
      fetchNews();
    }
  }, [isOpen, activeTab, stockCode]);

  // 获取公司数据
  useEffect(() => {
    if (isOpen && activeTab === 'company' && stockCode) {
      fetchCompanyInfo();
    }
  }, [isOpen, activeTab, stockCode]);

  // 获取财务数据
  useEffect(() => {
    if (isOpen && activeTab === 'financial' && stockCode) {
      fetchFinancialData();
      fetchFinancialDataEm();
    }
  }, [isOpen, activeTab, stockCode]);

  // 获取公告数据
  useEffect(() => {
    if (isOpen && activeTab === 'report' && stockCode) {
      fetchNotices();
    }
  }, [isOpen, activeTab, stockCode]);

  const fetchNotices = async () => {
    setNoticeLoading(true);
    setNoticeError(null);
    try {
      const data = await stockApi.getCompanyNotices(stockCode, 1);
      setNoticeList(data);
    } catch (err) {
      setNoticeError(err instanceof Error ? err.message : '获取公司公告失败');
    } finally {
      setNoticeLoading(false);
    }
  };

  const fetchNews = async () => {
    setNewsLoading(true);
    setNewsError(null);
    try {
      const data = await stockApi.getStockNews(stockCode);
      setNewsList(data);
    } catch (err) {
      setNewsError(err instanceof Error ? err.message : '获取新闻失败');
    } finally {
      setNewsLoading(false);
    }
  };

  const fetchCompanyInfo = async () => {
    setCompanyLoading(true);
    setCompanyError(null);
    try {
      const data = await stockApi.getCompanyInfoSina(stockCode);
      setCompanyInfo(data);
    } catch (err) {
      setCompanyError(err instanceof Error ? err.message : '获取公司信息失败');
    } finally {
      setCompanyLoading(false);
    }
  };

  const fetchFinancialData = async () => {
    setFinancialLoading(true);
    setFinancialError(null);
    try {
      const data = await stockApi.getFinancialIndicatorsSina(stockCode);
      setFinancialData(data);
    } catch (err) {
      setFinancialError(err instanceof Error ? err.message : '获取财务数据失败');
    } finally {
      setFinancialLoading(false);
    }
  };

  const fetchFinancialDataEm = async () => {
    setFinancialEmLoading(true);
    setFinancialEmError(null);
    try {
      const data = await stockApi.getFinancialIndicatorEm(stockCode);
      setFinancialDataEm(data);
    } catch (err) {
      setFinancialEmError(err instanceof Error ? err.message : '获取增强财务数据失败');
    } finally {
      setFinancialEmLoading(false);
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
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <i className="fas fa-chart-pie text-white text-xl"></i>
              </div>
              <div>
                <h3 className="text-xl font-black text-white">信息聚合中心</h3>
                <p className="text-amber-100 text-sm font-medium mt-0.5">
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

          {/* 标签页 */}
          <div className="flex space-x-2 mt-6 overflow-x-auto pb-1 scrollbar-hide">
            {[
              { key: 'news' as const, label: '相关新闻', icon: 'fa-newspaper' },
              { key: 'financial' as const, label: '财务指标', icon: 'fa-file-invoice-dollar' },
              { key: 'company' as const, label: '公司资料', icon: 'fa-building' },
              { key: 'report' as const, label: '公告研报', icon: 'fa-chart-line' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                }}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-white text-amber-600 shadow-lg'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <i className={`fas ${tab.icon} mr-2`}></i>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 内容区域 - 可滚动 */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
          {activeTab === 'news' && <NewsContent stockName={stockName} stockCode={stockCode} newsList={newsList} loading={newsLoading} error={newsError} onRetry={fetchNews} />}
          {activeTab === 'financial' && (
            <FinancialContent
              financialData={financialData}
              financialDataEm={financialDataEm}
              loading={financialLoading}
              emLoading={financialEmLoading}
              error={financialError}
              emError={financialEmError}
              onRetry={fetchFinancialData}
              onRetryEm={fetchFinancialDataEm}
            />
          )}
          {activeTab === 'company' && <CompanyContent companyInfo={companyInfo} loading={companyLoading} error={companyError} onRetry={fetchCompanyInfo} />}
          {activeTab === 'report' && <ReportContent stockName={stockName} stockCode={stockCode} noticeList={noticeList} loading={noticeLoading} error={noticeError} onRetry={fetchNotices} />}
        </div>
      </div>
    </>
  );
};

/* ==================== 新闻内容 ==================== */
interface NewsContentProps {
  stockName: string;
  stockCode: string;
  newsList: HkStockNews[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

const NewsContent: React.FC<NewsContentProps> = ({ stockName, stockCode, newsList, loading, error, onRetry }) => {
  // 将后端新闻数据转换为前端展示格式
  const convertToNewsItem = (news: HkStockNews): NewsItem => {
    // 根据数据源判断标签
    const getSourceTag = (datasource: string): string => {
      const sourceMap: Record<string, string> = {
        '新浪': '新浪财经',
        '腾讯': '腾讯财经',
        '网易': '网易财经',
        '财联社': '财联社',
        '彭博': '彭博社',
        '路透': '路透社',
      };
      return sourceMap[datasource] || datasource || '综合';
    };

    // 简单的情感分析（可根据标题关键词判断）
    const getImpact = (title: string): ImpactType => {
      const positiveWords = ['增长', '超预期', '买入', '上调', '回购', '合作', '盈利', '利好', '突破', '新高'];
      const negativeWords = ['下跌', '亏损', '下调', '减持', '风险', '利空', '下滑', '衰退', '警告', '处罚'];

      if (positiveWords.some(word => title.includes(word))) return 'positive';
      if (negativeWords.some(word => title.includes(word))) return 'negative';
      return 'neutral';
    };

    // 格式化时间
    const formatTime = (publishTime: string): string => {
      if (!publishTime) return '';
      const pubDate = new Date(publishTime);
      const now = new Date();
      const diffMs = now.getTime() - pubDate.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffHours < 1) return '刚刚';
      if (diffHours < 24) return `${diffHours}小时前`;
      if (diffDays < 7) return `${diffDays}天前`;
      return pubDate.toLocaleDateString('zh-CN');
    };

    return {
      title: news.title,
      summary: news.title, // 新闻摘要暂时使用标题
      source: getSourceTag(news.datasource),
      time: formatTime(news.publishTime),
      impact: getImpact(news.title),
      tag: '资讯'
    };
  };

  const displayNews = newsList.map(convertToNewsItem);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-amber-500 mb-4"></i>
          <p className="text-slate-500 text-sm">正在加载最新资讯...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <i className="fas fa-exclamation-circle text-4xl text-rose-500 mb-4"></i>
          <p className="text-slate-500 text-sm mb-4">{error}</p>
          <button
            onClick={onRetry}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-black transition-colors"
          >
            <i className="fas fa-redo mr-2"></i>
            重新加载
          </button>
        </div>
      </div>
    );
  }

  if (displayNews.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <i className="fas fa-newspaper text-4xl text-slate-300 mb-4"></i>
          <p className="text-slate-400 text-sm">暂无相关资讯</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-black text-slate-900">
          <i className="fas fa-bolt text-amber-500 mr-2"></i>
          最新资讯
        </h4>
        <span className="text-xs text-slate-400 font-medium">数据来源：新浪财经</span>
      </div>

      {displayNews.map((news, idx) => (
        <a
          key={idx}
          href={newsList[idx].url}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-all group cursor-pointer block"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-grow">
              <div className="flex items-center space-x-2 mb-2 flex-wrap">
                <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${
                  news.impact === 'positive' ? 'bg-emerald-100 text-emerald-700' :
                  news.impact === 'negative' ? 'bg-rose-100 text-rose-700' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {news.tag}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">{news.source}</span>
                <span className="text-[10px] text-slate-300">·</span>
                <span className="text-[10px] text-slate-400">{news.time}</span>
              </div>
              <h5 className="text-sm font-black text-slate-900 mb-2 group-hover:text-amber-600 transition-colors">
                {news.title}
              </h5>
              <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                {news.summary}
              </p>
            </div>
            <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
              news.impact === 'positive' ? 'bg-emerald-500' :
              news.impact === 'negative' ? 'bg-rose-500' :
              'bg-slate-300'
            }`}></div>
          </div>
        </a>
      ))}

      <div className="text-center pt-4">
        <a
          href={`https://finance.sina.com.hk/stock/search/${stockCode}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-8 py-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-amber-700 text-xs font-black transition-colors"
        >
          查看更多资讯 <i className="fas fa-arrow-right ml-2"></i>
        </a>
      </div>
    </div>
  );
};

/* ==================== 财务指标 ==================== */
interface FinancialContentProps {
  financialData: HkStockFinancialIndicatorsSina | null;
  financialDataEm: HkStockFinancialIndicatorEm | null;
  loading: boolean;
  emLoading: boolean;
  error: string | null;
  emError: string | null;
  onRetry: () => void;
  onRetryEm: () => void;
}

// 健康等级类型
type HealthLevelType = 'excellent' | 'good' | 'fair' | 'poor';

// 健康等级维度
interface HealthLevel {
  dimension: string;
  score: number;
  level: HealthLevelType;
  metrics: string[];
}

// 根据分数获取健康等级
const getHealthLevel = (score: number): HealthLevelType => {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
};

// 获取健康等级对应的样式
const getHealthLevelStyles = (level: HealthLevelType) => {
  switch (level) {
    case 'excellent':
      return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', circle: 'stroke-emerald-500' };
    case 'good':
      return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500', circle: 'stroke-blue-500' };
    case 'fair':
      return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500', circle: 'stroke-amber-500' };
    case 'poor':
      return { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500', circle: 'stroke-rose-500' };
  }
};

// 获取健康等级对应的文字
const getHealthLevelText = (level: HealthLevelType): string => {
  switch (level) {
    case 'excellent': return '优秀';
    case 'good': return '良好';
    case 'fair': return '一般';
    case 'poor': return '较差';
  }
};

const FinancialContent: React.FC<FinancialContentProps> = ({
  financialData,
  financialDataEm,
  loading,
  emLoading,
  error,
  emError,
  onRetry,
  onRetryEm
}) => {
  // 格式化大数字
  const formatMillion = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-';
    if (value >= 10000) {
      return `${(value / 10000).toFixed(2)}万亿`;
    }
    if (value >= 100) {
      return `${(value / 100).toFixed(2)}亿`;
    }
    return `${value.toFixed(2)}百万`;
  };

  // 格式化百分比
  const formatPercent = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-';
    return `${value.toFixed(2)}%`;
  };

  // 判断涨跌
  const getTrend = (value: number): boolean => value >= 0;

  // ==================== 财务健康度计算 ====================

  // 计算财务健康度评分（0-100）
  const calculateFinancialHealthScore = (): { score: number; levels: HealthLevel[] } => {
    const levels: HealthLevel[] = [];
    let totalScore = 0;
    let maxScore = 0;

    // 1. 偿债能力（权重 30%）
    const solvencyScore = calculateSolvencyScore();
    if (solvencyScore.hasValue) {
      totalScore += solvencyScore.score * 0.3;
      maxScore += 30;
      levels.push({
        dimension: '偿债能力',
        score: solvencyScore.score,
        level: getHealthLevel(solvencyScore.score),
        metrics: solvencyScore.metrics
      });
    }

    // 2. 盈利能力（权重 25%）
    const profitabilityScore = calculateProfitabilityScore();
    if (profitabilityScore.hasValue) {
      totalScore += profitabilityScore.score * 0.25;
      maxScore += 25;
      levels.push({
        dimension: '盈利能力',
        score: profitabilityScore.score,
        level: getHealthLevel(profitabilityScore.score),
        metrics: profitabilityScore.metrics
      });
    }

    // 3. 现金流健康（权重 25%）
    const cashFlowScore = calculateCashFlowScore();
    if (cashFlowScore.hasValue) {
      totalScore += cashFlowScore.score * 0.25;
      maxScore += 25;
      levels.push({
        dimension: '现金流',
        score: cashFlowScore.score,
        level: getHealthLevel(cashFlowScore.score),
        metrics: cashFlowScore.metrics
      });
    }

    // 4. 营运效率（权重 20%）
    const efficiencyScore = calculateEfficiencyScore();
    if (efficiencyScore.hasValue) {
      totalScore += efficiencyScore.score * 0.2;
      maxScore += 20;
      levels.push({
        dimension: '营运效率',
        score: efficiencyScore.score,
        level: getHealthLevel(efficiencyScore.score),
        metrics: efficiencyScore.metrics
      });
    }

    // 标准化为 0-100 分
    const normalizedScore = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    return {
      score: Math.round(normalizedScore),
      levels
    };
  };

  // 偿债能力评分（基于流动比率、资产负债率、现金比率）
  const calculateSolvencyScore = (): { score: number; hasValue: boolean; metrics: string[] } => {
    const metrics: string[] = [];
    let score = 0;
    let count = 0;

    const hasSinaData = financialData?.financialHealth;
    const hasEmData = financialDataEm?.balanceSheet;

    // 流动比率 = 流动资产 / 流动负债
    let currentRatio = financialData?.financialHealth?.currentRatio;
    if (!currentRatio && hasEmData) {
      const currentAssets = financialDataEm!.balanceSheet!.totalCurrentAssets;
      const currentLiabilities = financialDataEm!.balanceSheet!.totalCurrentLiabilities;
      if (currentAssets && currentLiabilities && currentLiabilities > 0) {
        currentRatio = (currentAssets / currentLiabilities) * 100; // 转为百分比
      }
    }
    if (currentRatio !== null && currentRatio !== undefined) {
      // 流动比率 150% 以上为优秀，100% 为及格
      if (currentRatio >= 150) score += 40;
      else if (currentRatio >= 100) score += 25;
      else if (currentRatio >= 50) score += 10;
      metrics.push(`流动比率：${formatPercent(currentRatio)}`);
      count++;
    }

    // 资产负债率 = 总负债 / 总资产
    let debtRatio = financialData?.financialHealth?.debtRatio;
    if (!debtRatio && hasEmData) {
      const totalLiabilities = financialDataEm!.balanceSheet!.totalLiabilities;
      const totalAssets = financialDataEm!.balanceSheet!.totalAssets;
      if (totalLiabilities && totalAssets && totalAssets > 0) {
        debtRatio = (totalLiabilities / totalAssets) * 100;
      }
    }
    if (debtRatio !== null && debtRatio !== undefined) {
      // 负债率越低越好，50% 以下为健康
      if (debtRatio <= 40) score += 35;
      else if (debtRatio <= 60) score += 25;
      else if (debtRatio <= 70) score += 15;
      else score += 5;
      metrics.push(`资产负债率：${formatPercent(debtRatio)}`);
      count++;
    }

    // 现金比率 = 货币资金 / 流动负债
    if (hasEmData) {
      const cash = financialDataEm!.balanceSheet!.cashAndEquivalents;
      const currentLiabilities = financialDataEm!.balanceSheet!.totalCurrentLiabilities;
      if (cash && currentLiabilities && currentLiabilities > 0) {
        const cashRatio = (cash / currentLiabilities) * 100;
        if (cashRatio >= 100) score += 25;
        else if (cashRatio >= 50) score += 18;
        else if (cashRatio >= 20) score += 10;
        metrics.push(`现金比率：${formatPercent(cashRatio)}`);
        count++;
      }
    }

    return {
      score: count > 0 ? Math.round(score / Math.max(count, 1)) : 0,
      hasValue: count > 0,
      metrics
    };
  };

  // 盈利能力评分（基于毛利率、净利率、ROE）
  const calculateProfitabilityScore = (): { score: number; hasValue: boolean; metrics: string[] } => {
    const metrics: string[] = [];
    let score = 0;
    let count = 0;

    const profitability = financialData?.profitability;
    const coreIndicators = financialDataEm?.coreIndicators;
    const historicalData = financialDataEm?.historicalData;

    // 毛利率
    let grossMargin = profitability?.grossProfitMargin;
    if (grossMargin !== null && grossMargin !== undefined) {
      if (grossMargin >= 40) score += 35;
      else if (grossMargin >= 20) score += 25;
      else if (grossMargin >= 10) score += 15;
      else score += 5;
      metrics.push(`毛利率：${formatPercent(grossMargin)}`);
      count++;
    }

    // 净利率
    let netMargin = profitability?.netProfitMargin;
    if (!netMargin && historicalData && historicalData.length > 0) {
      netMargin = historicalData[0].netMargin;
    }
    if (netMargin !== null && netMargin !== undefined) {
      if (netMargin >= 20) score += 35;
      else if (netMargin >= 10) score += 25;
      else if (netMargin >= 5) score += 15;
      else score += 5;
      metrics.push(`净利率：${formatPercent(netMargin)}`);
      count++;
    }

    // ROE（净资产收益率）
    let roe = coreIndicators ? (coreIndicators.epsBasic && (coreIndicators.netAssetsPerShare && coreIndicators.netAssetsPerShare > 0)
      ? (coreIndicators.epsBasic / coreIndicators.netAssetsPerShare) * 100 : null) : null;
    if (!roe && historicalData && historicalData.length > 0) {
      roe = historicalData[0].roe;
    }
    if (roe !== null && roe !== undefined) {
      if (roe >= 15) score += 30;
      else if (roe >= 8) score += 20;
      else if (roe >= 3) score += 10;
      else if (roe > 0) score += 5;
      metrics.push(`ROE: ${formatPercent(roe)}`);
      count++;
    }

    return {
      score: count > 0 ? Math.round(score / Math.max(count, 1)) : 0,
      hasValue: count > 0,
      metrics
    };
  };

  // 现金流健康评分（基于经营现金流、现金流覆盖率）
  const calculateCashFlowScore = (): { score: number; hasValue: boolean; metrics: string[] } => {
    const metrics: string[] = [];
    let score = 0;
    let count = 0;

    const cashFlow = financialDataEm?.cashFlow;
    const health = financialData?.financialHealth;

    // 经营现金流净额
    let operatingCashFlow = cashFlow?.netCashFromOperatingActivities;
    if (operatingCashFlow !== null && operatingCashFlow !== undefined) {
      if (operatingCashFlow > 0) {
        score += 50;
        metrics.push(`经营现金流净额：${formatMillion(operatingCashFlow)}`);
      } else {
        metrics.push(`经营现金流净额：${formatMillion(operatingCashFlow)} (净流出)`);
      }
      count++;
    }

    // 现金流与净利润比率（经营现金流 / 净利润，衡量盈利质量）
    const netProfit = financialData?.profitability?.netProfit;
    if (operatingCashFlow && netProfit && netProfit > 0) {
      const cashToProfitRatio = (operatingCashFlow / netProfit) * 100;
      if (cashToProfitRatio >= 100) score += 30;
      else if (cashToProfitRatio >= 80) score += 20;
      else if (cashToProfitRatio >= 50) score += 10;
      metrics.push(`现金流/净利润：${formatPercent(cashToProfitRatio)}`);
      count++;
    }

    // 现金充裕度
    if (cashFlow?.endingCashBalance) {
      const endingCash = cashFlow.endingCashBalance;
      if (endingCash > 0) {
        if (endingCash >= 10000) score += 20; // 现金储备充裕
        else if (endingCash >= 1000) score += 15;
        else score += 8;
        metrics.push(`期末现金余额：${formatMillion(endingCash)}`);
        count++;
      }
    }

    return {
      score: count > 0 ? Math.round(score / Math.max(count, 1)) : 0,
      hasValue: count > 0,
      metrics
    };
  };

  // 营运效率评分（基于应收账款周转率、存货周转率）
  const calculateEfficiencyScore = (): { score: number; hasValue: boolean; metrics: string[] } => {
    const metrics: string[] = [];
    let score = 0;
    let count = 0;

    const operatingCap = financialDataEm?.operatingCapability;

    // 应收账款周转率
    const arTurnover = operatingCap?.accountsReceivableTurnover;
    if (arTurnover !== null && arTurnover !== undefined && arTurnover > 0) {
      if (arTurnover >= 10) score += 35;
      else if (arTurnover >= 6) score += 25;
      else if (arTurnover >= 3) score += 15;
      else score += 5;
      metrics.push(`应收账款周转率：${arTurnover.toFixed(2)}次`);
      count++;
    }

    // 存货周转率
    const inventoryTurnover = operatingCap?.inventoryTurnover;
    if (inventoryTurnover !== null && inventoryTurnover !== undefined && inventoryTurnover > 0) {
      if (inventoryTurnover >= 8) score += 35;
      else if (inventoryTurnover >= 5) score += 25;
      else if (inventoryTurnover >= 2) score += 15;
      else score += 5;
      metrics.push(`存货周转率：${inventoryTurnover.toFixed(2)}次`);
      count++;
    }

    // 总资产周转率
    const totalAssetsTurnover = operatingCap?.totalAssetsTurnover;
    if (totalAssetsTurnover !== null && totalAssetsTurnover !== undefined && totalAssetsTurnover > 0) {
      if (totalAssetsTurnover >= 1.5) score += 30;
      else if (totalAssetsTurnover >= 1) score += 20;
      else if (totalAssetsTurnover >= 0.5) score += 10;
      else score += 5;
      metrics.push(`总资产周转率：${totalAssetsTurnover.toFixed(2)}次`);
      count++;
    }

    return {
      score: count > 0 ? Math.round(score / Math.max(count, 1)) : 0,
      hasValue: count > 0,
      metrics
    };
  };

  const healthScore = calculateFinancialHealthScore();
  const overallLevel = getHealthLevel(healthScore.score);
  const overallStyles = getHealthLevelStyles(overallLevel);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-amber-500 mb-4"></i>
          <p className="text-slate-500 text-sm">正在加载财务数据...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <i className="fas fa-exclamation-circle text-4xl text-rose-500 mb-4"></i>
          <p className="text-slate-500 text-sm mb-4">{error}</p>
          <button
            onClick={onRetry}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-black transition-colors"
          >
            <i className="fas fa-redo mr-2"></i>
            重新加载
          </button>
        </div>
      </div>
    );
  }

  // 检查是否有可用的财务数据（优先使用新浪财经，备选使用增强财务指标）
  const hasSinaData = financialData && financialData.profitability;
  const hasEmData = financialDataEm && financialDataEm.coreIndicators;

  if (!hasSinaData && !hasEmData) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <i className="fas fa-chart-bar text-4xl text-slate-300 mb-4"></i>
          <p className="text-slate-400 text-sm">暂无财务数据</p>
        </div>
      </div>
    );
  }

  // 使用新浪财经数据或增强财务指标数据
  const latestPeriod = hasSinaData ? financialData!.latestPeriod : (financialDataEm?.latestPeriod || null);

  // 对于新浪财经，如果 profitability 缺少 netProfit 或 netProfitMargin，尝试从历史数据计算
  let profitability = hasSinaData ? financialData!.profitability : null;
  if (profitability && financialData?.historicalData && financialData.historicalData.length > 0) {
    const latestHistorical = financialData.historicalData[0];
    // 如果没有 netProfit，从历史数据获取
    if (!profitability.netProfit && latestHistorical?.netProfit) {
      profitability = { ...profitability, netProfit: latestHistorical.netProfit };
    }
    // 如果没有 netProfitMargin，从历史数据计算（净利率 = 净利润 / 营收 * 100）
    if (!profitability.netProfitMargin && latestHistorical?.netProfit && latestHistorical?.revenue) {
      const calculatedMargin = (latestHistorical.netProfit / latestHistorical.revenue) * 100;
      profitability = { ...profitability, netProfitMargin: calculatedMargin };
    }
  }

  const financialHealth = hasSinaData ? financialData!.financialHealth : null;
  const historicalData = hasSinaData ? financialData!.historicalData : (financialDataEm?.historicalData || []);

  return (
    <div className="space-y-6">
      {/* 报告期信息 */}
      {latestPeriod && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-black text-amber-800">
                <i className="fas fa-calendar-alt mr-2"></i>
                最新报告期
              </h4>
              <p className="text-xs text-amber-600 mt-1">{latestPeriod.endDate}</p>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 bg-amber-200 text-amber-800 rounded-lg text-xs font-black">
                {latestPeriod.reportType}
              </span>
              <p className="text-[10px] text-amber-600 mt-1">公告日期：{latestPeriod.announcementDate}</p>
            </div>
          </div>
        </div>
      )}

      {/* 核心指标 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h4 className="text-base font-black text-slate-900">
            <i className="fas fa-chart-bar text-amber-500 mr-2"></i>
            核心指标
          </h4>
          <span className="text-[10px] text-slate-400">最新报告期</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 font-medium">营业收入</span>
              <span className="text-[10px] text-slate-400">百万元</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-slate-900">{formatMillion(profitability.revenue)}</span>
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 font-medium">净利润</span>
              <span className="text-[10px] text-slate-400">百万元</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-slate-900">{formatMillion(profitability.netProfit)}</span>
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 font-medium">毛利率</span>
              <span className="text-[10px] text-slate-400">盈利水平</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-slate-900">{formatPercent(profitability.grossProfitMargin)}</span>
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 font-medium">净利率</span>
              <span className="text-[10px] text-slate-400">获利能力</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-slate-900">{formatPercent(profitability.netProfitMargin)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 盈利能力 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h4 className="text-base font-black text-slate-900">
            <i className="fas fa-coins text-amber-500 mr-2"></i>
            盈利能力
          </h4>
          <span className="text-[10px] text-slate-400">同比变化</span>
        </div>
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium">营业收入</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-black text-slate-900">{formatMillion(profitability.revenue)}</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium">净利润</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-black text-slate-900">{formatMillion(profitability.netProfit)}</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium">经营盈利</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-black text-slate-900">{formatMillion(profitability.operatingProfit)}</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-600 font-medium">每股盈利</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-black text-slate-900">{profitability.epsBasic ? `${profitability.epsBasic.toFixed(2)}仙` : '-'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 财务健康 - 重新设计 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h4 className="text-base font-black text-slate-900">
            <i className="fas fa-heartbeat text-amber-500 mr-2"></i>
            财务健康度
          </h4>
          <span className={`px-3 py-1 rounded-full text-xs font-black ${
            overallStyles.bg + ' ' + overallStyles.text
          }`}>
            {getHealthLevelText(overallLevel)}
          </span>
        </div>

        {healthScore.levels.length > 0 ? (
          <div className="space-y-4">
            {/* 综合评分 */}
            <div className={`rounded-2xl p-6 ${overallStyles.bg} border-2 ${overallStyles.border}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium mb-1">综合健康评分</p>
                  <div className="flex items-baseline space-x-2">
                    <span className={`text-4xl font-black ${overallStyles.text}`}>{healthScore.score}</span>
                    <span className="text-sm text-slate-400 font-medium">/ 100 分</span>
                  </div>
                </div>
                <div className="relative">
                  <svg className="w-24 h-24 transform -rotate-90">
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-slate-200"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${(healthScore.score / 100) * 251.2} 251.2`}
                      className={overallStyles.circle}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-lg font-black ${overallStyles.text}`}>{healthScore.score}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 各维度详情 */}
            <div className="grid grid-cols-2 gap-3">
              {healthScore.levels.map((level, idx) => {
                const styles = getHealthLevelStyles(level.level);
                return (
                  <div
                    key={idx}
                    className={`rounded-xl p-4 ${styles.bg} border ${styles.border} transition-all hover:shadow-md`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-slate-700">{level.dimension}</span>
                      <span className={`text-xs font-black ${styles.text}`}>
                        {getHealthLevelText(level.level)}
                      </span>
                    </div>
                    <div className="flex items-baseline space-x-2 mb-2">
                      <span className={`text-2xl font-black ${styles.text}`}>{level.score}</span>
                      <span className="text-[10px] text-slate-400">分</span>
                    </div>
                    {/* 进度条 */}
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full ${styles.dot} transition-all duration-500`}
                        style={{ width: `${level.score}%` }}
                      ></div>
                    </div>
                    {/* 关键指标 */}
                    <div className="space-y-1">
                      {level.metrics.slice(0, 2).map((metric, mIdx) => (
                        <p key={mIdx} className="text-[10px] text-slate-500 truncate">
                          {metric}
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 评分说明 */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-[10px] text-slate-400 leading-relaxed">
                <i className="fas fa-circle-info mr-1"></i>
                评分基于偿债能力 (30%)、盈利能力 (25%)、现金流 (25%)、营运效率 (20%) 四个维度综合计算
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <i className="fas fa-circle-info text-4xl text-amber-400 mb-3"></i>
            <p className="text-slate-500 text-sm">
              暂无足够的财务数据计算健康度<br/>
              <span className="text-[11px] text-slate-400">需要资产负债表、利润表或现金流量表数据</span>
            </p>
          </div>
        )}
      </div>

      {/* 历史数据 */}
      {historicalData && historicalData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h4 className="text-base font-black text-slate-900 mb-4">
            <i className="fas fa-history text-amber-500 mr-2"></i>
            历史财务数据
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 text-slate-500 font-medium">报告期</th>
                  <th className="text-right py-2 text-slate-500 font-medium">营收 (百万)</th>
                  <th className="text-right py-2 text-slate-500 font-medium">净利润 (百万)</th>
                  <th className="text-right py-2 text-slate-500 font-medium">EPS (仙)</th>
                </tr>
              </thead>
              <tbody>
                {historicalData.slice(0, 4).map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 text-slate-700 font-medium">{item.endDate}</td>
                    <td className="py-3 text-right text-slate-900 font-black">{item.revenue?.toFixed(2) || '-'}</td>
                    <td className="py-3 text-right text-slate-900 font-black">{item.netProfit?.toFixed(2) || '-'}</td>
                    <td className="py-3 text-right text-slate-900 font-black">{item.epsBasic?.toFixed(2) || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 增强财务指标 - 资产负债表 */}
      {financialDataEm?.balanceSheet && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h4 className="text-base font-black text-slate-900 mb-5">
            <i className="fas fa-scale-balanced text-amber-500 mr-2"></i>
            资产负债表
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">总资产</span>
                <span className="text-[10px] text-slate-400">百万元</span>
              </div>
              <div className="text-xl font-black text-slate-900">{formatMillion(financialDataEm.balanceSheet.totalAssets)}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">总负债</span>
                <span className="text-[10px] text-slate-400">百万元</span>
              </div>
              <div className="text-xl font-black text-slate-900">{formatMillion(financialDataEm.balanceSheet.totalLiabilities)}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">股东权益</span>
                <span className="text-[10px] text-slate-400">百万元</span>
              </div>
              <div className="text-xl font-black text-slate-900">{formatMillion(financialDataEm.balanceSheet.totalEquity)}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">货币资金</span>
                <span className="text-[10px] text-slate-400">百万元</span>
              </div>
              <div className="text-xl font-black text-slate-900">{formatMillion(financialDataEm.balanceSheet.cashAndEquivalents)}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">应收账款</span>
                <span className="text-[10px] text-slate-400">百万元</span>
              </div>
              <div className="text-xl font-black text-slate-900">{formatMillion(financialDataEm.balanceSheet.accountsReceivable)}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">存货</span>
                <span className="text-[10px] text-slate-400">百万元</span>
              </div>
              <div className="text-xl font-black text-slate-900">{formatMillion(financialDataEm.balanceSheet.inventory)}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">固定资产</span>
                <span className="text-[10px] text-slate-400">百万元</span>
              </div>
              <div className="text-xl font-black text-slate-900">{formatMillion(financialDataEm.balanceSheet.fixedAssets)}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">短期借款</span>
                <span className="text-[10px] text-slate-400">百万元</span>
              </div>
              <div className="text-xl font-black text-slate-900">{formatMillion(financialDataEm.balanceSheet.shortTermDebt)}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">长期借款</span>
                <span className="text-[10px] text-slate-400">百万元</span>
              </div>
              <div className="text-xl font-black text-slate-900">{formatMillion(financialDataEm.balanceSheet.longTermDebt)}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">商誉</span>
                <span className="text-[10px] text-slate-400">百万元</span>
              </div>
              <div className="text-xl font-black text-slate-900">{formatMillion(financialDataEm.balanceSheet.goodwill)}</div>
            </div>
          </div>
        </div>
      )}

      {/* 增强财务指标 - 现金流量表 */}
      {financialDataEm?.cashFlow && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h4 className="text-base font-black text-slate-900 mb-5">
            <i className="fas fa-hand-holding-dollar text-amber-500 mr-2"></i>
            现金流量表
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-emerald-600 font-medium">经营现金流净额</span>
                <span className="text-[10px] text-emerald-400">百万元</span>
              </div>
              <div className="text-xl font-black text-emerald-700">{formatMillion(financialDataEm.cashFlow.netCashFromOperatingActivities)}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">投资现金流净额</span>
                <span className="text-[10px] text-slate-400">百万元</span>
              </div>
              <div className={`text-xl font-black ${
                financialDataEm.cashFlow.netCashFromInvestingActivities < 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}>{formatMillion(financialDataEm.cashFlow.netCashFromInvestingActivities)}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">筹资现金流净额</span>
                <span className="text-[10px] text-slate-400">百万元</span>
              </div>
              <div className={`text-xl font-black ${
                financialDataEm.cashFlow.netCashFromFinancingActivities < 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}>{formatMillion(financialDataEm.cashFlow.netCashFromFinancingActivities)}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">期末现金余额</span>
                <span className="text-[10px] text-slate-400">百万元</span>
              </div>
              <div className="text-xl font-black text-slate-900">{formatMillion(financialDataEm.cashFlow.endingCashBalance)}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">销售商品收到现金</span>
                <span className="text-[10px] text-slate-400">百万元</span>
              </div>
              <div className="text-xl font-black text-slate-900">{formatMillion(financialDataEm.cashFlow.cashFromSales)}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">购建资产支付现金</span>
                <span className="text-[10px] text-slate-400">百万元</span>
              </div>
              <div className="text-xl font-black text-slate-900">{formatMillion(financialDataEm.cashFlow.cashPaidForFixedAssets)}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">取得借款收到现金</span>
                <span className="text-[10px] text-slate-400">百万元</span>
              </div>
              <div className="text-xl font-black text-slate-900">{formatMillion(financialDataEm.cashFlow.cashFromBorrowings)}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">分配股利支付现金</span>
                <span className="text-[10px] text-slate-400">百万元</span>
              </div>
              <div className="text-xl font-black text-slate-900">{formatMillion(financialDataEm.cashFlow.cashPaidForDividends)}</div>
            </div>
          </div>
        </div>
      )}

      {/* 增强财务指标 - 营运能力指标 */}
      {financialDataEm?.operatingCapability && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h4 className="text-base font-black text-slate-900 mb-5">
            <i className="fas fa-gears text-amber-500 mr-2"></i>
            营运能力指标
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">应收账款周转率</span>
                <span className="text-[10px] text-slate-400">次</span>
              </div>
              <div className="text-xl font-black text-slate-900">
                {financialDataEm.operatingCapability.accountsReceivableTurnover?.toFixed(2) || '-'}
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">应收账款周转天数</span>
                <span className="text-[10px] text-slate-400">天</span>
              </div>
              <div className="text-xl font-black text-slate-900">
                {financialDataEm.operatingCapability.accountsReceivableTurnoverDays?.toFixed(1) || '-'}
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">存货周转率</span>
                <span className="text-[10px] text-slate-400">次</span>
              </div>
              <div className="text-xl font-black text-slate-900">
                {financialDataEm.operatingCapability.inventoryTurnover?.toFixed(2) || '-'}
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">存货周转天数</span>
                <span className="text-[10px] text-slate-400">天</span>
              </div>
              <div className="text-xl font-black text-slate-900">
                {financialDataEm.operatingCapability.inventoryTurnoverDays?.toFixed(1) || '-'}
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">流动资产周转率</span>
                <span className="text-[10px] text-slate-400">次</span>
              </div>
              <div className="text-xl font-black text-slate-900">
                {financialDataEm.operatingCapability.currentAssetsTurnover?.toFixed(2) || '-'}
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">总资产周转率</span>
                <span className="text-[10px] text-slate-400">次</span>
              </div>
              <div className="text-xl font-black text-slate-900">
                {financialDataEm.operatingCapability.totalAssetsTurnover?.toFixed(2) || '-'}
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">固定资产周转率</span>
                <span className="text-[10px] text-slate-400">次</span>
              </div>
              <div className="text-xl font-black text-slate-900">
                {financialDataEm.operatingCapability.fixedAssetsTurnover?.toFixed(2) || '-'}
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">应付账款周转率</span>
                <span className="text-[10px] text-slate-400">次</span>
              </div>
              <div className="text-xl font-black text-slate-900">
                {financialDataEm.operatingCapability.accountsPayableTurnover?.toFixed(2) || '-'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 增强财务指标 - 核心指标 */}
      {financialDataEm?.coreIndicators && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h4 className="text-base font-black text-slate-900 mb-5">
            <i className="fas fa-star text-amber-500 mr-2"></i>
            核心指标
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">基本每股收益</span>
                <span className="text-[10px] text-slate-400">元</span>
              </div>
              <div className="text-xl font-black text-slate-900">
                {financialDataEm.coreIndicators.epsBasic?.toFixed(2) || '-'}
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">稀释每股收益</span>
                <span className="text-[10px] text-slate-400">元</span>
              </div>
              <div className="text-xl font-black text-slate-900">
                {financialDataEm.coreIndicators.epsDiluted?.toFixed(2) || '-'}
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">每股净资产</span>
                <span className="text-[10px] text-slate-400">元</span>
              </div>
              <div className="text-xl font-black text-slate-900">
                {financialDataEm.coreIndicators.netAssetsPerShare?.toFixed(2) || '-'}
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">每股经营现金流</span>
                <span className="text-[10px] text-slate-400">元</span>
              </div>
              <div className="text-xl font-black text-slate-900">
                {financialDataEm.coreIndicators.operatingCashFlowPerShare?.toFixed(2) || '-'}
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">股息率 TTM</span>
                <span className="text-[10px] text-slate-400">%</span>
              </div>
              <div className="text-xl font-black text-slate-900">
                {formatPercent(financialDataEm.coreIndicators.dividendYieldTtm)}
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">派息比率</span>
                <span className="text-[10px] text-slate-400">%</span>
              </div>
              <div className="text-xl font-black text-slate-900">
                {formatPercent(financialDataEm.coreIndicators.payoutRatio)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 增强财务指标 - 历史数据 */}
      {financialDataEm?.historicalData && financialDataEm.historicalData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h4 className="text-base font-black text-slate-900 mb-4">
            <i className="fas fa-chart-line text-amber-500 mr-2"></i>
            历史财务数据 (增强)
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 text-slate-500 font-medium">报告期</th>
                  <th className="text-right py-2 text-slate-500 font-medium">营收</th>
                  <th className="text-right py-2 text-slate-500 font-medium">净利润</th>
                  <th className="text-right py-2 text-slate-500 font-medium">经营现金流</th>
                  <th className="text-right py-2 text-slate-500 font-medium">ROE</th>
                  <th className="text-right py-2 text-slate-500 font-medium">毛利率</th>
                </tr>
              </thead>
              <tbody>
                {financialDataEm.historicalData.slice(0, 4).map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 text-slate-700 font-medium">{item.endDate}</td>
                    <td className="py-3 text-right text-slate-900 font-black">{item.revenue?.toFixed(2) || '-'}</td>
                    <td className="py-3 text-right text-slate-900 font-black">{item.netProfit?.toFixed(2) || '-'}</td>
                    <td className="py-3 text-right text-slate-900 font-black">{item.operatingCashFlow?.toFixed(2) || '-'}</td>
                    <td className="py-3 text-right text-slate-900 font-black">{formatPercent(item.roe)}</td>
                    <td className="py-3 text-right text-slate-900 font-black">{formatPercent(item.grossMargin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

/* ==================== 公司资料 ==================== */
interface CompanyContentProps {
  companyInfo: HkStockCompanyInfoSina | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

const CompanyContent: React.FC<CompanyContentProps> = ({ companyInfo, loading, error, onRetry }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-amber-500 mb-4"></i>
          <p className="text-slate-500 text-sm">正在加载公司资料...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <i className="fas fa-exclamation-circle text-4xl text-rose-500 mb-4"></i>
          <p className="text-slate-500 text-sm mb-4">{error}</p>
          <button
            onClick={onRetry}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-black transition-colors"
          >
            <i className="fas fa-redo mr-2"></i>
            重新加载
          </button>
        </div>
      </div>
    );
  }

  if (!companyInfo) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <i className="fas fa-building text-4xl text-slate-300 mb-4"></i>
          <p className="text-slate-400 text-sm">暂无公司资料</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 基本信息 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h4 className="text-base font-black text-slate-900 mb-5">
          <i className="fas fa-building text-amber-500 mr-2"></i>
          基本信息
        </h4>
        <div className="grid grid-cols-2 gap-4">
          {companyInfo.companyNameCn && (
            <div className="bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <i className="fas fa-font text-amber-500 text-xs"></i>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-black uppercase">公司名称</p>
                  <p className="text-xs font-black text-slate-900">{companyInfo.companyNameCn}</p>
                </div>
              </div>
            </div>
          )}
          {companyInfo.companyNameEn && (
            <div className="bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <i className="fas fa-globe text-amber-500 text-xs"></i>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-black uppercase">English Name</p>
                  <p className="text-xs font-black text-slate-900">{companyInfo.companyNameEn}</p>
                </div>
              </div>
            </div>
          )}
          {companyInfo.industry && (
            <div className="bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <i className="fas fa-industry text-amber-500 text-xs"></i>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-black uppercase">所属行业</p>
                  <p className="text-xs font-black text-slate-900">{companyInfo.industry}</p>
                </div>
              </div>
            </div>
          )}
          {companyInfo.totalShares && (
            <div className="bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <i className="fas fa-chart-pie text-amber-500 text-xs"></i>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-black uppercase">总股本</p>
                  <p className="text-xs font-black text-slate-900">{companyInfo.totalShares}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 管理层 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h4 className="text-base font-black text-slate-900 mb-5">
          <i className="fas fa-user-tie text-amber-500 mr-2"></i>
          管理层
        </h4>
        <div className="grid grid-cols-2 gap-4">
          {companyInfo.chairman && (
            <div className="bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <i className="fas fa-crown text-amber-500 text-xs"></i>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-black uppercase">主席</p>
                  <p className="text-xs font-black text-slate-900">{companyInfo.chairman}</p>
                </div>
              </div>
            </div>
          )}
          {companyInfo.companySecretary && (
            <div className="bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <i className="fas fa-user text-amber-500 text-xs"></i>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-black uppercase">公司秘书</p>
                  <p className="text-xs font-black text-slate-900">{companyInfo.companySecretary}</p>
                </div>
              </div>
            </div>
          )}
          {companyInfo.directors && (
            <div className="bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors col-span-2">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <i className="fas fa-users text-amber-500 text-xs"></i>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-black uppercase">董事</p>
                  <p className="text-xs font-black text-slate-900">{companyInfo.directors}</p>
                </div>
              </div>
            </div>
          )}
          {companyInfo.majorShareholders && (
            <div className="bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors col-span-2">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <i className="fas fa-hand-holding-usd text-amber-500 text-xs"></i>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-black uppercase">主要持股人</p>
                  <p className="text-xs font-black text-slate-900">{companyInfo.majorShareholders}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 联系方式 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h4 className="text-base font-black text-slate-900 mb-5">
          <i className="fas fa-address-card text-amber-500 mr-2"></i>
          联系方式
        </h4>
        <div className="space-y-3">
          {companyInfo.headquarters && (
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <i className="fas fa-map-marker-alt text-amber-500 text-xs"></i>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">公司总部</p>
                  <p className="text-xs font-black text-slate-900 truncate max-w-[250px]">{companyInfo.headquarters}</p>
                </div>
              </div>
            </div>
          )}
          {companyInfo.registeredOffice && (
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <i className="fas fa-file-contract text-amber-500 text-xs"></i>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">注册办事处</p>
                  <p className="text-xs font-black text-slate-900 truncate max-w-[250px]">{companyInfo.registeredOffice}</p>
                </div>
              </div>
            </div>
          )}
          {companyInfo.website && (
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <i className="fas fa-globe text-amber-500 text-xs"></i>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">公司网址</p>
                  <a href={companyInfo.website} target="_blank" rel="noopener noreferrer" className="text-xs font-black text-amber-600 hover:underline">
                    {companyInfo.website}
                  </a>
                </div>
              </div>
            </div>
          )}
          {companyInfo.email && (
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <i className="fas fa-envelope text-amber-500 text-xs"></i>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">电子邮箱</p>
                  <a href={`mailto:${companyInfo.email}`} className="text-xs font-black text-amber-600 hover:underline">
                    {companyInfo.email}
                  </a>
                </div>
              </div>
            </div>
          )}
          {companyInfo.phone && (
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <i className="fas fa-phone text-amber-500 text-xs"></i>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">联系电话</p>
                  <a href={`tel:${companyInfo.phone}`} className="text-xs font-black text-amber-600 hover:underline">
                    {companyInfo.phone}
                  </a>
                </div>
              </div>
            </div>
          )}
          {companyInfo.fax && (
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <i className="fas fa-fax text-amber-500 text-xs"></i>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium">传真号码</p>
                  <p className="text-xs font-black text-slate-900">{companyInfo.fax}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 专业机构 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h4 className="text-base font-black text-slate-900 mb-5">
          <i className="fas fa-briefcase text-amber-500 mr-2"></i>
          专业机构
        </h4>
        <div className="grid grid-cols-2 gap-4">
          {companyInfo.auditor && (
            <div className="bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <i className="fas fa-file-invoice text-amber-500 text-xs"></i>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-black uppercase">核数师</p>
                  <p className="text-xs font-black text-slate-900">{companyInfo.auditor}</p>
                </div>
              </div>
            </div>
          )}
          {companyInfo.shareRegistrar && (
            <div className="bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <i className="fas fa-exchange-alt text-amber-500 text-xs"></i>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-black uppercase">股份过户登记处</p>
                  <p className="text-xs font-black text-slate-900">{companyInfo.shareRegistrar}</p>
                </div>
              </div>
            </div>
          )}
          {companyInfo.legalAdvisor && (
            <div className="bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <i className="fas fa-balance-scale text-amber-500 text-xs"></i>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-black uppercase">法律顾问</p>
                  <p className="text-xs font-black text-slate-900">{companyInfo.legalAdvisor}</p>
                </div>
              </div>
            </div>
          )}
          {companyInfo.mainBank && (
            <div className="bg-slate-50 rounded-xl p-4 hover:bg-slate-100 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <i className="fas fa-university text-amber-500 text-xs"></i>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-black uppercase">主要往来银行</p>
                  <p className="text-xs font-black text-slate-900">{companyInfo.mainBank}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 公司业务 */}
      {companyInfo.businessDescription && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h4 className="text-base font-black text-slate-900 mb-4">
            <i className="fas fa-info-circle text-amber-500 mr-2"></i>
            公司业务
          </h4>
          <p className="text-sm text-slate-600 leading-relaxed">
            {companyInfo.businessDescription}
          </p>
        </div>
      )}
    </div>
  );
};

/* ==================== 公司公告/研报 */
interface ReportContentProps {
  stockName: string;
  stockCode: string;
  noticeList: HkStockCompanyNotice[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

const ReportContent: React.FC<ReportContentProps> = ({ stockName, stockCode, noticeList, loading, error, onRetry }) => {
  // 格式化时间
  const formatTime = (publishTime: string): string => {
    if (!publishTime) return '';
    const pubDate = new Date(publishTime);
    const now = new Date();
    const diffMs = now.getTime() - pubDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return '刚刚';
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return pubDate.toLocaleDateString('zh-CN');
  };

  // 根据公告标题判断类型
  const getNoticeType = (title: string): string => {
    if (title.includes('业绩') || title.includes('财报') || title.includes('业绩公告')) return '业绩公告';
    if (title.includes('通告') || title.includes('通函')) return '通函';
    if (title.includes('董事会')) return '董事会通告';
    if (title.includes('配售') || title.includes('发行')) return '融资公告';
    if (title.includes('回购')) return '股份回购';
    if (title.includes('董事') || title.includes('高管')) return '人事变动';
    return '其他公告';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-amber-500 mb-4"></i>
          <p className="text-slate-500 text-sm">正在加载公司公告...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <i className="fas fa-exclamation-circle text-4xl text-rose-500 mb-4"></i>
          <p className="text-slate-500 text-sm mb-4">{error}</p>
          <button
            onClick={onRetry}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-black transition-colors"
          >
            <i className="fas fa-redo mr-2"></i>
            重新加载
          </button>
        </div>
      </div>
    );
  }

  if (noticeList.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <i className="fas fa-file-alt text-4xl text-slate-300 mb-4"></i>
          <p className="text-slate-400 text-sm">暂无公司公告</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-black text-slate-900">
          <i className="fas fa-file-alt text-amber-500 mr-2"></i>
          最新公告
        </h4>
        <span className="text-xs text-slate-400 font-medium">数据来源：新浪财经</span>
      </div>

      {/* 公告列表 */}
      <div className="space-y-3">
        {noticeList.map((notice, idx) => (
          <a
            key={idx}
            href={notice.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-all cursor-pointer group block"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-grow">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-black">
                    {getNoticeType(notice.title)}
                  </span>
                  <span className="text-[10px] text-slate-400">{formatTime(notice.publishTime)}</span>
                </div>
                <h5 className="text-xs font-black text-slate-900 group-hover:text-amber-600 transition-colors">
                  {notice.title}
                </h5>
              </div>
              <i className="fas fa-external-link-alt text-[10px] text-slate-300 group-hover:text-amber-500 transition-colors"></i>
            </div>
          </a>
        ))}
      </div>

      <div className="text-center pt-4">
        <button
          onClick={onRetry}
          className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black transition-colors"
        >
          <i className="fas fa-redo mr-2"></i>
          加载更多
        </button>
      </div>
    </div>
  );
};

export default StockInfoPanel;
