import { httpClient, HttpRequestOptions, defaultRequestOptions } from './http';

/** 后端统一响应格式 */
interface ApiResult<T = unknown> {
  code: number;
  msg: string;
  data?: T;
}

const API_BASE = '/api';

/**
 * K 线数据点 - 用于发送给后端 AI 分析
 */
export interface KlineDataPoint {
  date: string; // 日期格式 yyyy-MM-dd
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number; // 成交量
  amount: number; // 成交额
}

/**
 * 技术点位 - 后端 AI 分析返回
 */
export interface TechnicalPoint {
  type: 'support' | 'resistance' | 'stop_loss' | 'take_profit';
  price: string | number;
  strength: number; // 1-5 的强度评级
  description: string;
}

/**
 * 关键点位 - 前端转换后的格式（用于图表覆盖层）
 */
export interface KeyLevel {
  type: 'support' | 'resistance' | 'stopLoss' | 'takeProfit';
  price: string | number;
  label: string;
  confidence?: number; // 置信度 0-1
  reason?: string; // AI 给出的理由
}

/**
 * AI 分析请求参数 - 匹配后端 KlineAnalysisRequest
 */
export interface AIAnalysisRequest {
  stockCode: string; // 股票代码，如 "03900.HK"
  klineData: KlineDataPoint[]; // K 线数据
  period: 'minute' | 'daily' | 'weekly' | 'monthly'; // 周期
  forceRefresh?: boolean; // 是否强制刷新（不使用缓存）
  provider?: string; // LLM 供应商：doubao/openai/qwen 等
  model?: string; // 模型名称
}

/**
 * AI 分析响应结果 - 匹配后端 KlineAnalysisVo
 */
export interface AIAnalysisResponse {
  stockCode: string;
  currentPrice: string;
  trend: 'uptrend' | 'downtrend' | 'sideways'; // 趋势判断
  trendDescription: string; // 趋势说明
  technicalPoints: TechnicalPoint[]; // 技术点位列表
  recommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell'; // 综合建议
  recommendationReason: string; // 建议说明
  riskLevel: 'low' | 'medium' | 'high'; // 风险等级
  targetPriceRange: string; // 目标价格区间
  analysisNote: string; // 分析说明
}

/**
 * LLM 供应商信息 - 匹配后端 LLMProviderInfoVo
 */
export interface LLMProviderInfo {
  name: string; // 供应商名称：doubao/openai/qwen 等
  model: string; // 默认模型
  models: string[]; // 支持的模型列表
  available: boolean; // 是否可用
  baseUrl: string; // API 地址
}

/**
 * 持仓项 - 匹配后端 PositionItemDto
 */
export interface PositionItem {
  stockCode: string; // 股票代码，如 "0700.HK"
  buyPrice: number; // 买入价格
  quantity: number; // 持仓数量（股）
  buyDate?: string; // 买入日期，格式 YYYY-MM-DD
}

/**
 * 持仓分析请求 - 匹配后端 PositionAnalysisRequestDto
 */
export interface PositionAnalysisRequest {
  positions: PositionItem[]; // 持仓列表
  analysisDepth?: 'quick' | 'standard' | 'deep'; // 分析深度，默认 "standard"
  provider?: string; // LLM 供应商：doubao/openai 等
  model?: string; // 模型名称
}

/**
 * 投资组合摘要 - 匹配后端 PortfolioSummary
 */
export interface PortfolioSummary {
  overallScore: number; // 综合评分 (0-100)
  overallRating: string; // 综合评级：优秀/良好/一般/较差/极差
  riskLevel: string; // 风险等级：低/中/高
  diversification: string; // 分散程度：分散/一般/集中
  investmentStyle: string; // 投资风格：价值/成长/均衡/投机型
}

/**
 * 持仓评分 - 匹配后端 PositionScore
 */
export interface PositionScore {
  stockCode: string; // 股票代码
  score: number; // 评分 (0-100)
  grade: string; // 等级：A/B/C/D/E
  holdingQuality: string; // 持仓质量：优质/良好/一般/较差/劣质
  profitProspect: string; // 盈利前景：看涨/震荡/看跌
  riskWarning: string; // 风险提示
}

/**
 * 持仓建议 - 匹配后端 PositionRecommendation
 */
export interface PositionRecommendation {
  stockCode: string; // 股票代码
  action: string; // 建议操作：持有/加仓/减仓/清仓
  reason: string; // 建议理由
  targetPriceRange: string; // 目标价格区间
  stopLossPrice: number; // 建议止损价
  confidence: string; // 置信度：high/medium/low
}

/**
 * 整体建议 - 匹配后端 OverallRecommendation
 */
export interface OverallRecommendation {
  strategy: string; // 策略：积极持有/稳健持有/逢高减仓/择机调仓
  keyPoints: string[]; // 要点列表
  riskSummary: string; // 整体风险描述
  suggestedActions: string[]; // 建议操作列表
}

/**
 * 市场展望 - 匹配后端 MarketOutlook
 */
export interface MarketOutlook {
  trend: string; // 趋势：看涨/震荡/看跌
  confidence: string; // 置信度：high/medium/low
  keyFactors: string[]; // 关键因素列表
}

/**
 * 持仓分析结果 - 匹配后端 PositionAnalysisVo
 */
export interface PositionAnalysisResult {
  portfolioSummary: PortfolioSummary; // 投资组合摘要
  positionScores: PositionScore[]; // 持仓评分列表
  positionRecommendations: PositionRecommendation[]; // 持仓建议列表
  overallRecommendation: OverallRecommendation; // 整体建议
  marketOutlook: MarketOutlook; // 市场展望
}

/**
 * 新闻摘要统计 - 匹配后端 HkStockMarketAnalysisVo.NewsSummary
 */
export interface NewsSummary {
  importantNewsCount: number; // 要闻数量
  rankNewsCount: number; // 大行研报数量
  companyNewsCount: number; // 公司新闻数量
  totalCount: number; // 总新闻数量
}

/**
 * 指数表现 - 匹配后端 HkStockMarketAnalysisVo.IndexPerformance
 */
export interface IndexPerformance {
  indexName: string | null; // 指数名称
  indexCode: string | null; // 指数代码
  latestPrice: number | null; // 最新价
  changeRate: number | null; // 涨跌幅
  turnover: number | null; // 成交额
  quoteTime: string | null; // 报价时间
}

/**
 * 外部情绪 - 匹配后端 HkStockMarketAnalysisVo.ExternalSentiment
 */
export interface ExternalSentiment {
  indexName: string | null; // 指数名称
  latestPrice: number | null; // 最新价
  changeRate: number | null; // 涨跌幅
  note: string | null; // 备注说明
}

/**
 * 货币流动性 - 匹配后端 HkStockMarketAnalysisVo.CurrencyLiquidity
 */
export interface CurrencyLiquidity {
  symbol: string; // 货币代码
  name: string; // 货币名称
  lastPrice: number | null; // 最新价
  change: number | null; // 涨跌额
  changeRate: number | null; // 涨跌幅
  open: number | null; // 开盘价
  preClose: number | null; // 前收盘价
  high: number | null; // 当日最高价
  low: number | null; // 当日最低价
  note: string | null; // 备注说明
}

/**
 * 市场宽度 - 匹配后端 HkStockMarketAnalysisVo.MarketBreadth
 */
export interface MarketBreadth {
  advancingStocks: number | null; // 上涨家数
  decliningStocks: number | null; // 下跌家数
  unchangedStocks: number | null; // 平盘家数
  totalStocks: number | null; // 总股票数
  advanceDeclineRatio: number | null; // 上涨/下跌比率
}

/**
 * 市场快照 - 匹配后端 HkStockMarketAnalysisVo.MarketSnapshot
 */
export interface MarketSnapshot {
  indexPerformance: IndexPerformance | null; // 指数表现
  externalSentiment: ExternalSentiment | null; // 外部情绪
  currencyLiquidity: Record<string, CurrencyLiquidity> | null; // 货币流动性
  marketBreadth: MarketBreadth | null; // 市场宽度
}

/**
 * LLM Token 使用情况 - 匹配后端 HkStockMarketAnalysisVo.LlmInfo.TokenUsage
 */
export interface TokenUsage {
  promptTokens: number | null; // 输入 token 数
  completionTokens: number | null; // 输出 token 数
  totalTokens: number | null; // 总 token 数
}

/**
 * LLM 调用信息 - 匹配后端 HkStockMarketAnalysisVo.LlmInfo
 */
export interface LlmInfo {
  provider: string; // LLM 供应商
  model: string; // 使用的模型
  tokenUsage: TokenUsage | null; // Token 使用情况
}

/**
 * 港股市场分析结果 - 匹配后端 HkStockMarketAnalysisVo（完整版）
 */
export interface HkStockMarketAnalysis {
  investmentReport: string; // Markdown 格式的投资建议报告（已处理换行符）
  rawReport: string; // 原始 Markdown 报告（保留完整格式，用于前端展示）
  marketSnapshot: MarketSnapshot | null; // 市场快照数据
  compressedNews: string; // LLM 压缩后的新闻摘要
  newsSummary: NewsSummary; // 新闻摘要统计信息
  llmInfo: LlmInfo | null; // LLM 调用信息
}

/**
 * 港股市场分析请求 - 匹配后端 HkStockMarketAnalysisRequest
 */
export interface HkStockMarketAnalysisRequest {
  provider?: string; // LLM 供应商
  model?: string; // 模型名称
}

/**
 * 贸易评分请求 - 匹配后端 TradeScoreRequest
 */
export interface TradeScoreRequest {
  stockCode: string; // 股票代码
  transactionDate: string; // 交易日期
  instruction: 'BUY' | 'SELL'; // 买卖方向
  price: number; // 成交价
  quantity: number; // 成交数量
  context?: string; // 上下文信息（可选）
  provider?: string; // LLM 供应商
  model?: string; // 模型名称
}

/**
 * 贸易评分响应 - 匹配后端 TradeScoreVo
 */
export interface TradeScoreResponse {
  score: number; // 评分 (0-100)
  rationale: string; // 评分理由
  level: 'excellent' | 'good' | 'fair' | 'poor'; // 评级
}

/**
 * 截图识别请求 - 匹配后端 BrokerScreenshotRequest
 */
export interface BrokerScreenshotRequest {
  imageBase64: string; // Base64 编码的图片数据（不含前缀）
  provider?: string; // LLM 供应商
  model?: string; // 模型名称
}

/**
 * 检测到的交易记录 - 匹配后端 DetectedTrade
 */
export interface DetectedTrade {
  stockCode: string; // 股票代码
  instruction: 'BUY' | 'SELL'; // 买卖方向
  price: number; // 成交价
  quantity: number; // 成交数量
  timestamp?: string; // 交易时间
  confidence: number; // 置信度 (0-1)
}

/**
 * 截图识别响应 - 匹配后端 BrokerScreenshotVo
 */
export interface BrokerScreenshotResponse {
  trades: DetectedTrade[]; // 检测到的交易列表
  note?: string; // 分析说明
}

/**
 * AI 新闻摘要 - 匹配后端 AINewsItem
 */
export interface AINewsItem {
  title: string;
  summary: string;
  impact: 'positive' | 'negative';
  source?: string;
  timestamp?: string;
}

/**
 * AI 热点 - 匹配后端 AIHotspot
 */
export interface AIHotspot {
  topic: string;
  description: string;
  heatLevel?: number;
}

/**
 * AI 分析服务
 */
export const aiAnalysisApi = {
  /**
   * 发送 K 线数据进行 AI 分析
   * POST /api/ai/analyze-kline
   */
  analyzeKline: async (request: AIAnalysisRequest, options?: HttpRequestOptions): Promise<AIAnalysisResponse> => {
    const res = await httpClient.post<ApiResult<AIAnalysisResponse>>(
      `${API_BASE}/ai/analyze-kline`,
      request,
      { ...defaultRequestOptions, ...options }
    );

    if (res?.code !== 200 || !res?.data) {
      throw new Error((res as any)?.msg || 'AI 分析失败');
    }

    return res.data;
  },

  /**
   * 获取 LLM 供应商列表
   * GET /api/ai/providers
   */
  listProviders: async (options?: HttpRequestOptions): Promise<LLMProviderInfo[]> => {
    const res = await httpClient.get<ApiResult<LLMProviderInfo[]>>(
      `${API_BASE}/ai/providers`,
      { ...defaultRequestOptions, ...options }
    );

    if (res?.code !== 200 || !res?.data) {
      throw new Error((res as any)?.msg || '获取供应商列表失败');
    }

    return res.data;
  },

  /**
   * 获取可用的 LLM 供应商（已配置 API Key 的）
   * GET /api/ai/available-providers
   */
  listAvailableProviders: async (options?: HttpRequestOptions): Promise<string[]> => {
    const res = await httpClient.get<ApiResult<string[]>>(
      `${API_BASE}/ai/available-providers`,
      { ...defaultRequestOptions, ...options }
    );

    if (res?.code !== 200 || !res?.data) {
      throw new Error((res as any)?.msg || '获取可用供应商失败');
    }

    return res.data;
  },

  /**
   * AI 分析持仓
   * POST /api/ai/analyze-position
   */
  analyzePosition: async (request: PositionAnalysisRequest, options?: HttpRequestOptions): Promise<PositionAnalysisResult> => {
    const res = await httpClient.post<ApiResult<PositionAnalysisResult>>(
      `${API_BASE}/ai/analyze-position`,
      request,
      { ...defaultRequestOptions, ...options }
    );

    if (res?.code !== 200 || !res?.data) {
      throw new Error((res as any)?.msg || '持仓分析失败');
    }

    return res.data;
  },

  /**
   * 获取港股市场分析结果（AI 分析日报）
   * GET /api/ai/hkstock-market-analysis
   */
  getHkStockMarketAnalysis: async (options?: HttpRequestOptions): Promise<HkStockMarketAnalysis> => {
    const res = await httpClient.get<ApiResult<HkStockMarketAnalysis>>(
      `${API_BASE}/ai/hkstock-market-analysis`,
      { ...defaultRequestOptions, ...options }
    );

    if (res?.code !== 200 || !res?.data) {
      throw new Error((res as any)?.msg || '获取港股市场分析失败');
    }

    return res.data;
  },

  /**
   * 实时分析港股市场（不使用缓存）
   * POST /api/ai/analyze-hkstock-market
   */
  analyzeHkStockMarketRealtime: async (request?: HkStockMarketAnalysisRequest, options?: HttpRequestOptions): Promise<HkStockMarketAnalysis> => {
    const res = await httpClient.post<ApiResult<HkStockMarketAnalysis>>(
      `${API_BASE}/ai/analyze-hkstock-market`,
      request || {},
      { ...defaultRequestOptions, ...options }
    );

    if (res?.code !== 200 || !res?.data) {
      throw new Error((res as any)?.msg || '实时港股市场分析失败');
    }

    return res.data;
  },

  /**
   * AI 分析贸易评分
   * POST /api/ai/analyze-trade
   */
  analyzeTrade: async (request: TradeScoreRequest, options?: HttpRequestOptions): Promise<TradeScoreResponse> => {
    const res = await httpClient.post<ApiResult<TradeScoreResponse>>(
      `${API_BASE}/ai/analyze-trade`,
      request,
      { ...defaultRequestOptions, ...options }
    );

    if (res?.code !== 200 || !res?.data) {
      throw new Error((res as any)?.msg || '贸易评分分析失败');
    }

    return res.data;
  },

  /**
   * AI 分析券商截图
   * POST /api/ai/analyze-broker-screenshot
   */
  analyzeBrokerScreenshot: async (request: BrokerScreenshotRequest, options?: HttpRequestOptions): Promise<BrokerScreenshotResponse> => {
    const res = await httpClient.post<ApiResult<BrokerScreenshotResponse>>(
      `${API_BASE}/ai/analyze-broker-screenshot`,
      request,
      { ...defaultRequestOptions, ...options }
    );

    if (res?.code !== 200 || !res?.data) {
      throw new Error((res as any)?.msg || '截图识别失败');
    }

    return res.data;
  },

  /**
   * 获取 AI 新闻摘要
   * GET /api/ai/news-summary
   */
  getNewsSummary: async (options?: HttpRequestOptions): Promise<AINewsItem[]> => {
    const res = await httpClient.get<ApiResult<AINewsItem[]>>(
      `${API_BASE}/ai/news-summary`,
      { ...defaultRequestOptions, ...options }
    );

    if (res?.code !== 200 || !res?.data) {
      throw new Error((res as any)?.msg || '获取 AI 新闻摘要失败');
    }

    return res.data;
  },

  /**
   * 获取 AI 热点
   * GET /api/ai/hotspots
   */
  getHotspots: async (options?: HttpRequestOptions): Promise<AIHotspot[]> => {
    const res = await httpClient.get<ApiResult<AIHotspot[]>>(
      `${API_BASE}/ai/hotspots`,
      { ...defaultRequestOptions, ...options }
    );

    if (res?.code !== 200 || !res?.data) {
      throw new Error((res as any)?.msg || '获取 AI 热点失败');
    }

    return res.data;
  },
};

/**
 * 将后端 technicalPoints 转换为前端 keyLevels 格式
 */
export const convertToKeyLevels = (technicalPoints: TechnicalPoint[]): KeyLevel[] => {
  return technicalPoints.map((tp) => ({
    type: tp.type === 'stop_loss' ? 'stopLoss' :
          tp.type === 'take_profit' ? 'takeProfit' :
          tp.type as 'support' | 'resistance',
    price: tp.price,
    label: tp.type === 'stop_loss' ? '风控止损' :
            tp.type === 'take_profit' ? '止盈目标' :
            tp.type === 'support' ? '关键支撑' : '趋势压力',
    confidence: tp.strength / 5, // 将 1-5 转换为 0-1
    reason: tp.description,
  }));
};

/**
 * 将前端 AIAnalysisRequest 转换为 KlineDataPoint 格式
 */
export const convertToKlineDataPoint = (klineData: any[], period: string): KlineDataPoint[] => {
  return klineData.map((item) => {
    const date = new Date(item.timestamp || item.date);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    // 计算成交额（如果没有，可以用成交量 * 收盘价估算）
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
};
