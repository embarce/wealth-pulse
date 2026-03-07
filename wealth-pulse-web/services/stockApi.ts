import { httpClient } from './http';
import { defaultRequestOptions } from './http';

/** 后端统一响应格式 */
interface ApiResult<T = unknown> {
  code: number;
  msg: string;
  data?: T;
}

/** 股票实时行情数据 */
export interface StockMarketData {
  stockCode: string;
  companyName: string;
  companyNameCn: string;
  lastPrice: number;
  changeNumber: number;
  changeRate: number;
  openPrice: number;
  preClose: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  turnover: number;
  week52High: number;
  week52Low: number;
  marketCap: number;
  peRatio: number;
  pbRatio: number;
  quoteTime: string;
  marketDate: string;
  currency: string;
}

/** 股票基本信息 */
export interface StockInfo {
  stockCode: string;
  companyName: string;
  companyNameCn: string;
  companyNameEn: string;
  stockType: string;
  listingDate: string;
  marketCap: string;
  circulatingMarketCap: number;
  circulatingMarketCapDisplay: string;
  outstandingShares: number;
  circulatingShares: number;
  sector: string;
  industry: string;
  website: string;
  description: string;
  logo: string;
  lotSize?: number; // 交易单位（每手股数），如100、200、500等
}

/** 热门股票 */
export interface HotStock {
  stockCode: string;
  companyName: string;
  companyNameCn: string;
  lastPrice: number;
  changeNumber: number;
  changeRate: number;
  openPrice: number;
  preClose: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  turnover: number;
  quoteTime: string;
  marketDate: string;
  currency: string;
  marketCap: string;
}

/** 分钟级历史数据点（分时图）- 后端实际返回格式 */
export interface MinuteDataPoint {
  tradeTime: string;      // 交易时间
  stockCode: string;      // 股票代码
  period: string;         // 周期
  openPrice: number;      // 开盘价
  closePrice: number;     // 收盘价
  highPrice: number;      // 最高价
  lowPrice: number;       // 最低价
  volume: number;         // 成交量
  turnover: number;       // 成交额
  latestPrice: number;    // 最新价
}

/** 增强历史数据点（K线图） - 对应后端 HkStockEnhancedHistoryVo */
export interface EnhancedDataPoint {
  stockCode: string;      // 股票代码
  period: string;         // 周期类型: daily/weekly/monthly
  tradeDate: string;      // 交易日期
  openPrice: number;      // 开盘价(港元)
  closePrice: number;     // 收盘价(港元)
  highPrice: number;      // 最高价(港元)
  lowPrice: number;       // 最低价(港元)
  volume: number;         // 成交量(股)
  turnover: number;       // 成交额(港元)
  amplitude: number;      // 振幅(%)
  changeRate: number;     // 涨跌幅(%)
  changeNumber: number;   // 涨跌额(港元)
}

export interface FeeCalculationRequest {
  instruction: 'BUY' | 'SELL';
  amount: number;
  currency?: string;
}

export interface FeeCalculationResponse {
  instruction: string;
  amount: number;
  platformFee: number;
  sfcLevy: number;
  exchangeTradingFee: number;
  settlementFee: number;
  frcLevy: number;
  stampDuty: number;
  totalFee: number;
  netAmount: number;
  feeBreakdown: string;
}

/** 公司资料 */
export interface CompanyProfile {
  stockCode: string;
  companyName: string;
  companyNameEn: string;
  registrationPlace: string;
  establishmentDate: string;
  industry: string;
  chairman: string;
  companySecretary: string;
  employeeCount: number;
  officeAddress: string;
  website: string;
  email: string;
  yearEndDate: string;
  phone: string;
  auditor: string;
  fax: string;
  companyIntroduction: string;
}

/** 财务指标 */
export interface FinancialIndicator {
  stockCode: string;
  basicEps: string;
  netAssetsPerShare: string;
  legalCapital: string;
  lotSize: string;
  dividendPerShareTtm: string;
  payoutRatio: string;
  issuedCapital: string;
  issuedCapitalHShares: number;
  operatingCashFlowPerShare: string;
  dividendYieldTtm: string;
  totalMarketCapHkd: string;
  hkMarketCapHkd: string;
  totalOperatingRevenue: string;
  operatingRevenueGrowthYoy: string;
  netProfitMargin: string;
  netProfit: string;
  netProfitGrowthYoy: string;
  roe: string;
  peRatio: string;
  pbRatio: string;
  roa: string;
}

/** 港股新闻（新浪财经） */
export interface HkStockNews {
  title: string;
  url: string;
  datasource: string;
  publishTime: string;
}

/** 港股公司公告（新浪财经） */
export interface HkStockCompanyNotice {
  title: string;
  url: string;
  datasource: string;
  publishTime: string;
}

/** 港股公司信息（新浪财经） */
export interface HkStockCompanyInfoSina {
  securityCode: string;
  companyNameCn: string;
  companyNameEn: string;
  businessDescription: string;
  industry: string;
  totalShares: string;
  chairman: string;
  majorShareholders: string;
  directors: string;
  companySecretary: string;
  registeredOffice: string;
  headquarters: string;
  shareRegistrar: string;
  auditor: string;
  mainBank: string;
  legalAdvisor: string;
  website: string;
  email: string;
  phone: string;
  fax: string;
  datasource: string;
}

/** 财务指标（新浪财经）- 最新报告期 */
export interface FinancialLatestPeriod {
  endDate: string;
  reportType: string;
  announcementDate: string;
}

/** 财务指标（新浪财经）- 盈利能力 */
export interface FinancialProfitability {
  revenue: number;
  netProfit: number;
  grossProfitMargin: number;
  netProfitMargin: number;
  epsBasic: number;
  operatingProfit: number;
}

/** 财务指标（新浪财经）- 财务健康 */
export interface FinancialHealth {
  currentRatio: number;
  debtRatio: number;
  operatingCashFlow: number;
  currentAssets: number;
  currentLiabilities: number;
  totalEquity: number;
}

/** 财务指标（新浪财经）- 历史数据 */
export interface FinancialHistoricalData {
  periodIndex: number;
  startDate: string;
  endDate: string;
  announcementDate: string;
  reportType: string;
  revenue: number;
  netProfit: number;
  epsBasic: number;
  epsDiluted: number;
}

/** 财务指标（新浪财经） */
export interface HkStockFinancialIndicatorsSina {
  stockCode: string;
  datasource: string;
  latestPeriod: FinancialLatestPeriod;
  profitability: FinancialProfitability;
  financialHealth: FinancialHealth;
  historicalData: FinancialHistoricalData[];
}

/** 增强财务指标 - 最新报告期 */
export interface EmLatestPeriod {
  endDate: string;
  reportType: string;
  announcementDate: string;
}

/** 增强财务指标 - 核心指标 */
export interface EmCoreIndicators {
  epsBasic: number;
  epsDiluted: number;
  netAssetsPerShare: number;
  operatingCashFlowPerShare: number;
  retainedEarningsPerShare: number;
  capitalReservePerShare: number;
  dividendYieldTtm: number;
  payoutRatio: number;
}

/** 增强财务指标 - 资产负债表 */
export interface EmBalanceSheet {
  totalAssets: number;
  totalCurrentAssets: number;
  cashAndEquivalents: number;
  accountsReceivable: number;
  inventory: number;
  totalNonCurrentAssets: number;
  fixedAssets: number;
  intangibleAssets: number;
  goodwill: number;
  totalLiabilities: number;
  totalCurrentLiabilities: number;
  shortTermDebt: number;
  accountsPayable: number;
  totalNonCurrentLiabilities: number;
  longTermDebt: number;
  totalEquity: number;
  equityAttributableToParent: number;
  retainedEarnings: number;
  capitalReserve: number;
}

/** 增强财务指标 - 现金流量表 */
export interface EmCashFlow {
  netCashFromOperatingActivities: number;
  cashFromSales: number;
  totalCashInflowFromOperating: number;
  totalCashOutflowFromOperating: number;
  netCashFromInvestingActivities: number;
  cashPaidForFixedAssets: number;
  cashPaidForInvestment: number;
  totalCashInflowFromInvesting: number;
  totalCashOutflowFromInvesting: number;
  netCashFromFinancingActivities: number;
  cashFromCapitalIncrease: number;
  cashFromBorrowings: number;
  cashPaidForDividends: number;
  totalCashInflowFromFinancing: number;
  totalCashOutflowFromFinancing: number;
  netIncreaseInCash: number;
  endingCashBalance: number;
}

/** 增强财务指标 - 营运能力指标 */
export interface EmOperatingCapability {
  accountsReceivableTurnover: number;
  accountsReceivableTurnoverDays: number;
  inventoryTurnover: number;
  inventoryTurnoverDays: number;
  currentAssetsTurnover: number;
  totalAssetsTurnover: number;
  fixedAssetsTurnover: number;
  accountsPayableTurnover: number;
}

/** 增强财务指标 - 历史数据 */
export interface EmHistoricalData {
  periodIndex: number;
  startDate: string;
  endDate: string;
  announcementDate: string;
  reportType: string;
  revenue: number;
  netProfit: number;
  epsBasic: number;
  epsDiluted: number;
  operatingCashFlow: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  grossMargin: number;
  netMargin: number;
  roe: number;
  roa: number;
}

/** 增强财务指标（扩展指标） */
export interface HkStockFinancialIndicatorEm {
  stockCode: string;
  datasource: string;
  latestPeriod: EmLatestPeriod;
  coreIndicators: EmCoreIndicators;
  balanceSheet: EmBalanceSheet;
  cashFlow: EmCashFlow;
  operatingCapability: EmOperatingCapability;
  historicalData: EmHistoricalData[];
}

/** AI 股票分析结果 */
export interface StockAnalysisResult {
  stockCode: string;
  currentPrice: string;
  trend: string;
  trendDescription: string;
  technicalPoints: Array<{
    type: 'support' | 'resistance' | 'takeProfit' | 'stopLoss';
    price: number;
    description?: string;
  }>;
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

const API_BASE = '/api';

export const stockApi = {
  /**
   * 获取股票实时行情
   * GET /api/stock/market-data/{stockCode}
   */
  getMarketData: async (stockCode: string): Promise<StockMarketData> => {
    const res = await httpClient.get<ApiResult<StockMarketData>>(
      `${API_BASE}/stock/market-data/${stockCode}`,
      defaultRequestOptions
    );
    if (res?.code !== 200 || !res?.data) {
      throw new Error((res as any)?.msg || '获取股票行情失败');
    }
    return res.data;
  },

  /**
   * 获取股票基本信息
   * GET /api/stock/info/{stockCode}
   */
  getStockInfo: async (stockCode: string): Promise<StockInfo> => {
    const res = await httpClient.get<ApiResult<StockInfo>>(
      `${API_BASE}/stock/info/${stockCode}`,
      defaultRequestOptions
    );
    if (res?.code !== 200 || !res?.data) {
      throw new Error((res as any)?.msg || '获取股票信息失败');
    }
    return res.data;
  },

  /**
   * 计算交易手续费
   * POST /api/stock/calculate-fee
   * @param instruction 交易方向 BUY 或 SELL
   * @param amount 交易金额
   * @param currency 货币类型，默认 HKD
   * @returns 手续费计算结果
   */
  calculateFee: async (request: FeeCalculationRequest): Promise<FeeCalculationResponse> => {
    const res = await httpClient.post<ApiResult<FeeCalculationResponse>>(
      `${API_BASE}/stock/calculate-fee`,
      request,
      defaultRequestOptions
    );
    if (res?.code !== 200 || !res?.data) {
      throw new Error((res as any)?.msg || '计算手续费失败');
    }
    return res.data;
  },

  /**
   * 获取热门股票列表
   * GET /api/stock/hot?limit=10
   * @param limit 返回数量限制，默认10
   * @returns 热门股票列表
   */
  getHotStocks: async (limit: number = 10): Promise<HotStock[]> => {
    const res = await httpClient.get<ApiResult<HotStock[]>>(
      `${API_BASE}/stock/hot?limit=${limit}`,
      defaultRequestOptions
    );
    if (res?.code !== 200 || !res?.data) {
      throw new Error((res as any)?.msg || '获取热门股票失败');
    }
    return res.data;
  },

  /**
   * 搜索股票
   * GET /api/stock/search?key=00700
   * @param key 搜索关键词（股票代码或公司名称）
   * @returns 搜索结果列表
   */
  searchStocks: async (key: string): Promise<HotStock[]> => {
    if (!key || key.trim().length === 0) {
      return [];
    }
    const res = await httpClient.get<ApiResult<HotStock[]>>(
      `${API_BASE}/stock/search?key=${encodeURIComponent(key)}`,
      defaultRequestOptions
    );
    if (res?.code !== 200 || !res?.data) {
      throw new Error((res as any)?.msg || '搜索股票失败');
    }
    return res.data;
  },

  /**
   * 获取分钟级历史数据（分时图/K线图）
   * GET /api/stock/minute-history/{stockCode}
   * @param stockCode 股票代码
   * @param options 可选参数
   * @returns 分钟级历史数据数组
   */
  getMinuteHistory: async (
    stockCode: string,
    options?: {
      period?: number;      // 周期: 1/5/15/30/60 (分钟)
      adjust?: string;      // 复权类型: 空字符串=不复权, hfq=后复权
      startDate?: string;   // 开始日期时间，格式: yyyy-MM-dd HH:mm:ss
      endDate?: string;     // 结束日期时间，格式: yyyy-MM-dd HH:mm:ss
    }
  ): Promise<MinuteDataPoint[]> => {
    const params = new URLSearchParams();
    if (options?.period) params.append('period', options.period.toString());
    if (options?.adjust !== undefined) params.append('adjust', options.adjust);
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);

    const queryString = params.toString();
    const url = `${API_BASE}/stock/minute-history/${stockCode}${queryString ? `?${queryString}` : ''}`;

    const res = await httpClient.get<ApiResult<MinuteDataPoint[]>>(
      url,
      defaultRequestOptions
    );
    if (res?.code !== 200 || !res?.data) {
      throw new Error((res as any)?.msg || '获取分时数据失败');
    }
    return res.data;
  },

  /**
   * 获取增强历史数据（K线图）
   * GET /api/stock/enhanced-history/{stockCode}
   * @param stockCode 股票代码
   * @param options 可选参数
   * @returns K线数据数组
   */
  getEnhancedHistory: async (
    stockCode: string,
    options?: {
      period?: string;      // 周期: daily/weekly/monthly
      adjust?: string;      // 复权类型: 空字符串=不复权, hfq=后复权
      startDate?: string;   // 开始日期时间，格式: yyyy-MM-dd
      endDate?: string;     // 结束日期时间，格式: yyyy-MM-dd
    }
  ): Promise<EnhancedDataPoint[]> => {
    const params = new URLSearchParams();
    if (options?.period) params.append('period', options.period);
    if (options?.adjust !== undefined) params.append('adjust', options.adjust);
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);

    const queryString = params.toString();
    const url = `${API_BASE}/stock/enhanced-history/${stockCode}${queryString ? `?${queryString}` : ''}`;

    const res = await httpClient.get<ApiResult<EnhancedDataPoint[]>>(
      url,
      defaultRequestOptions
    );
    if (res?.code !== 200 || !res?.data) {
      throw new Error((res as any)?.msg || '获取K线数据失败');
    }
    return res.data;
  },

  /**
   * 获取公司资料
   * GET /api/stock/company-profile/{stockCode}
   * @param stockCode 股票代码
   * @returns 公司资料
   */
  getCompanyProfile: async (stockCode: string): Promise<CompanyProfile> => {
    const res = await httpClient.get<ApiResult<CompanyProfile>>(
      `${API_BASE}/stock/company-profile/${stockCode}`,
      defaultRequestOptions
    );
    if (res?.code !== 200 || !res?.data) {
      throw new Error((res as any)?.msg || '获取公司资料失败');
    }
    return res.data;
  },

  /**
   * 获取财务指标
   * GET /api/stock/financial-indicator/{stockCode}
   * @param stockCode 股票代码
   * @returns 财务指标
   */
  getFinancialIndicator: async (stockCode: string): Promise<FinancialIndicator> => {
    const res = await httpClient.get<ApiResult<FinancialIndicator>>(
      `${API_BASE}/stock/financial-indicator/${stockCode}`,
      defaultRequestOptions
    );
    if (res?.code !== 200 || !res?.data) {
      throw new Error((res as any)?.msg || '获取财务指标失败');
    }
    return res.data;
  },

  /**
   * 获取港股新闻（新浪财经）
   * GET /api/stock/news/{stockCode}
   * @param stockCode 股票代码
   * @returns 新闻列表
   */
  getStockNews: async (stockCode: string): Promise<HkStockNews[]> => {
    const res = await httpClient.get<ApiResult<HkStockNews[]>>(
      `${API_BASE}/stock/news/${stockCode}`,
      defaultRequestOptions
    );
    if (res?.code !== 200 || !res?.data) {
      throw new Error((res as any)?.msg || '获取股票新闻失败');
    }
    return res.data;
  },

  /**
   * 获取港股公司信息（新浪财经）
   * GET /api/stock/company-info-sina/{stockCode}
   * @param stockCode 股票代码
   * @returns 公司信息
   */
  getCompanyInfoSina: async (stockCode: string): Promise<HkStockCompanyInfoSina> => {
    const res = await httpClient.get<ApiResult<HkStockCompanyInfoSina>>(
      `${API_BASE}/stock/company-info-sina/${stockCode}`,
      defaultRequestOptions
    );
    if (res?.code !== 200 || !res?.data) {
      throw new Error((res as any)?.msg || '获取公司信息失败');
    }
    return res.data;
  },

  /**
   * 获取港股财务指标（新浪财经）
   * GET /api/stock/financial-indicators-sina/{stockCode}
   * @param stockCode 股票代码
   * @returns 财务指标
   */
  getFinancialIndicatorsSina: async (stockCode: string): Promise<HkStockFinancialIndicatorsSina> => {
    const res = await httpClient.get<ApiResult<HkStockFinancialIndicatorsSina>>(
      `${API_BASE}/stock/financial-indicators-sina/${stockCode}`,
      defaultRequestOptions
    );
    if (res?.code !== 200 || !res?.data) {
      throw new Error((res as any)?.msg || '获取财务指标失败');
    }
    return res.data;
  },

  /**
   * 获取港股增强财务指标
   * GET /api/stock/financial-indicator-em/{stockCode}
   * @param stockCode 股票代码
   * @returns 增强财务指标（包含资产负债表、现金流量表、营运能力指标等）
   */
  getFinancialIndicatorEm: async (stockCode: string): Promise<HkStockFinancialIndicatorEm> => {
    const res = await httpClient.get<ApiResult<HkStockFinancialIndicatorEm>>(
      `${API_BASE}/stock/financial-indicator-em/${stockCode}`,
      defaultRequestOptions
    );
    if (res?.code !== 200 || !res?.data) {
      throw new Error((res as any)?.msg || '获取增强财务指标失败');
    }
    return res.data;
  },

  /**
   * 获取港股公司公告（新浪财经）
   * GET /api/stock/company-notices/{stockCode}
   * @param stockCode 股票代码
   * @param maxPages 最大爬取页数（1-10），默认 1
   * @returns 公告列表
   */
  getCompanyNotices: async (stockCode: string, maxPages: number = 1): Promise<HkStockCompanyNotice[]> => {
    const res = await httpClient.get<ApiResult<HkStockCompanyNotice[]>>(
      `${API_BASE}/stock/company-notices/${stockCode}?max_pages=${maxPages}`,
      defaultRequestOptions
    );
    if (res?.code !== 200 || !res?.data) {
      throw new Error((res as any)?.msg || '获取公司公告失败');
    }
    return res.data;
  },

  /**
   * AI 股票分析
   * POST /api/ai/analyze-stock
   * @param stockCode 股票代码
   * @param period 周期：daily/weekly/monthly，默认 daily
   * @param days 获取多少天的历史数据 (10-365)，默认 60
   * @param forceRefresh 是否强制刷新（跳过缓存），默认 false
   * @param provider LLM 供应商，如 doubao/openai
   * @param model 模型名称，如 gpt-4o-mini
   * @returns AI 分析结果
   */
  analyzeStock: async (params: {
    stockCode: string;
    period?: 'daily' | 'weekly' | 'monthly';
    days?: number;
    forceRefresh?: boolean;
    provider?: string;
    model?: string;
  }): Promise<StockAnalysisResult> => {
    const res = await httpClient.post<ApiResult<StockAnalysisResult>>(
      `${API_BASE}/ai/analyze-stock`,
      {
        stockCode: params.stockCode,
        period: params.period || 'daily',
        days: params.days || 60,
        forceRefresh: params.forceRefresh || false,
        provider: params.provider || null,
        model: params.model || null,
      },
      defaultRequestOptions
    );
    if (res?.code !== 200 || !res?.data) {
      throw new Error((res as any)?.msg || 'AI 股票分析失败');
    }
    return res.data;
  },
};
