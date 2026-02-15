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
  marketCap: number;
  marketCapDisplay: string;
  circulatingMarketCap: number;
  circulatingMarketCapDisplay: string;
  outstandingShares: number;
  circulatingShares: number;
  sector: string;
  industry: string;
  website: string;
  description: string;
  logo: string;
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
};
