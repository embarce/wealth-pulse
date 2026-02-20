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
};
