import { httpClient } from './http';
import { defaultRequestOptions } from './http';

export interface TradeRequest {
  stockCode: string;
  quantity: number;
  price: number;
  currency?: string;
  remark?: string;
  manualCommission?: number;
  manualTax?: number;
  manualTotalFee?: number;
}

export const tradeApi = {
  /**
   * 买入股票
   * @param request 交易请求
   */
  buyStock: async (request: TradeRequest): Promise<void> => {
    await httpClient.post(
      '/trade/buy',
      {
        stockCode: request.stockCode,
        quantity: Number(request.quantity),
        price: Number(request.price),
        currency: request.currency || 'HKD',
        ...request.remark && { remark: request.remark },
        ...request.manualCommission && { manualCommission: Number(request.manualCommission) },
        ...request.manualTax && { manualTax: Number(request.manualTax) },
        ...request.manualTotalFee && { manualTotalFee: Number(request.manualTotalFee) },
      },
      defaultRequestOptions
    );
  },

  /**
   * 卖出股票
   * @param request 交易请求
   */
  sellStock: async (request: TradeRequest): Promise<void> => {
    await httpClient.post(
      '/trade/sell',
      {
        stockCode: request.stockCode,
        quantity: Number(request.quantity),
        price: Number(request.price),
        currency: request.currency || 'HKD',
        ...request.remark && { remark: request.remark },
        ...request.manualCommission && { manualCommission: Number(request.manualCommission) },
        ...request.manualTax && { manualTax: Number(request.manualTax) },
        ...request.manualTotalFee && { manualTotalFee: Number(request.manualTotalFee) },
      },
      defaultRequestOptions
    );
  },

  /**
   * 获取购买力
   */
  getPurchasingPower: async (): Promise<number> => {
    const res: any = await httpClient.get(
      '/trade/purchasing-power',
      defaultRequestOptions
    );
    return Number(res.data) || 0;
  },
};
