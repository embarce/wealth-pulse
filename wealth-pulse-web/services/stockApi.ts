import { httpClient } from './http';
import { defaultRequestOptions } from './http';

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

export const stockApi = {
  /**
   * 获取股票实时行情
   * @param stockCode 股票代码，如 NVDA.US
   */
  getMarketData: async (stockCode: string): Promise<StockMarketData> => {
    const res: any = await httpClient.get(
      `/stock/market-data/${stockCode}`,
      defaultRequestOptions
    );
    return res.data;
  },

  /**
   * 计算交易手续费
   * @param request 手续费计算请求
   */
  calculateFee: async (request: FeeCalculationRequest): Promise<FeeCalculationResponse> => {
    const res: any = await httpClient.post(
      '/stock/calculate-fee',
      request,
      defaultRequestOptions
    );
    return res.data;
  },
};
