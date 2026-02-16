import { httpClient } from './http';
import { defaultRequestOptions } from './http';

/** 后端统一响应格式 */
interface ApiResult<T = unknown> {
  code: number;
  msg: string;
  data?: T;
}

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

/** 交易记录查询参数 */
export interface TradeRecordQuery {
  pageNum: number;
  pageSize: number;
  tradeType?: string;
  tradeStartTime?: string;
  tradeEndTime?: string;
  id?: string;
  name?: string;
}

/** 交易记录 */
export interface TradeRecord {
  id: string;
  stockCode: string;
  companyName: string;
  shortName: string;
  instruction: string;
  executionDate: string;
  executionTime: string;
  executionDatetime: string;
  price: number;
  quantity: number;
  totalAmount: number;
  totalAmountDisplay: string;
  currency: string;
  isSettled: boolean;
  commission: number;
  tax: number;
  feeTotal: number;
  createdAt: string;
  updatedAt: string;
}

/** 分页结果 */
export interface PageResult<T> {
  totalCount: number;
  pageSize: number;
  totalPage: number;
  currPage: number;
  rows: T[];
}

/** 交易统计数据 */
export interface TradeStatistics {
  totalTradeVol: number;      // 累计交易流水
  buyCount: number;            // 买入笔数
  sellCount: number;           // 卖出笔数
}

const API_BASE = '/api';

export const tradeApi = {
  /**
   * 买入股票
   * @param request 交易请求
   */
  buyStock: async (request: TradeRequest): Promise<void> => {
    await httpClient.post(
      `${API_BASE}/trade/buy`,
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
      `${API_BASE}/trade/sell`,
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
      `${API_BASE}/trade/purchasing-power`,
      defaultRequestOptions
    );
    return Number(res.data) || 0;
  },

  /**
   * 获取交易记录（分页）
   * GET /api/trade/record
   */
  getRecordPage: async (query: TradeRecordQuery): Promise<PageResult<TradeRecord>> => {
    const params = new URLSearchParams();
    params.append('pageNum', query.pageNum.toString());
    params.append('pageSize', query.pageSize.toString());
    if (query.tradeType) params.append('tradeType', query.tradeType);
    if (query.tradeStartTime) params.append('tradeStartTime', query.tradeStartTime);
    if (query.tradeEndTime) params.append('tradeEndTime', query.tradeEndTime);
    if (query.id) params.append('id', query.id);
    if (query.name) params.append('name', query.name);

    const res = await httpClient.get<ApiResult<PageResult<TradeRecord>>>(
      `${API_BASE}/trade/record?${params.toString()}`,
      defaultRequestOptions
    );
    if (res?.code !== 200 || !res?.data) {
      throw new Error((res as any)?.msg || '获取交易记录失败');
    }
    return res.data;
  },

  /**
   * 获取交易统计数据
   * GET /api/trade/statistics
   */
  getStatistics: async (): Promise<TradeStatistics> => {
    const res = await httpClient.get<ApiResult<TradeStatistics>>(
      `${API_BASE}/trade/statistics`,
      defaultRequestOptions
    );
    if (res?.code !== 200 || !res?.data) {
      throw new Error((res as any)?.msg || '获取交易统计失败');
    }
    return res.data;
  },
};
