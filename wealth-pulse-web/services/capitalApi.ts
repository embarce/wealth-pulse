/**
 * 本金相关 API
 * 对接后端 /api/capital/* 接口
 */

import { httpClient, defaultRequestOptions } from './http';

/** 本金操作请求 */
export interface CapitalOperationRequest {
  amount: number;
  currency?: string;
  remark?: string;
}

/** 本金流水 VO（后端返回） */
export interface CapitalFlowVo {
  id: string;
  operationType: string;
  operationLabel: string;
  amount: number;
  amountDisplay: string;
  currency?: string;
  operationDate: string;
  operationTime: string;
  createdAt: string;
}

/** 分页结果 */
export interface CapitalRecordPage {
  totalCount: number;
  pageSize: number;
  totalPage: number;
  currPage: number;
  rows: CapitalFlowVo[];
}

/** 分页查询参数 */
export interface CapitalRecordParams {
  pageNum?: number;
  pageSize?: number;
  tradeType?: string;
  tradeStartTime?: string;
  tradeEndTime?: string;
  name?: string;
  id?: string;
}

/** 后端统一响应格式 */
interface ApiResult<T = unknown> {
  code: number;
  msg: string;
  data?: T;
}

const API_BASE = '/api';

/** 用户资产摘要 */
export interface AssetSummary {
  totalPrincipal: number;  // 总本金
  totalAssets: number;      // 总资产
  cash: number;            // 可用现金
  stockValue: number;      // 持仓市值
  profit: number;          // 盈亏
  profitRate: number;      // 收益率
}

function buildRecordUrl(params: CapitalRecordParams): string {
  const search = new URLSearchParams();
  if (params.pageNum != null) search.set('pageNum', String(params.pageNum));
  if (params.pageSize != null) search.set('pageSize', String(params.pageSize));
  if (params.tradeType) search.set('tradeType', params.tradeType);
  if (params.tradeStartTime) search.set('tradeStartTime', params.tradeStartTime);
  if (params.tradeEndTime) search.set('tradeEndTime', params.tradeEndTime);
  if (params.name) search.set('name', params.name);
  if (params.id) search.set('id', params.id);
  const qs = search.toString();
  return `${API_BASE}/capital/record${qs ? `?${qs}` : ''}`;
}

export const capitalApi = {
  /** 入金 */
  async deposit(body: CapitalOperationRequest): Promise<void> {
    const res = await httpClient.post<ApiResult>(
      `${API_BASE}/capital/deposit`,
      body,
      defaultRequestOptions
    );
    if (res?.code !== 200) throw new Error((res as any)?.msg || '入金失败');
  },

  /** 提现 */
  async withdraw(body: CapitalOperationRequest): Promise<void> {
    const res = await httpClient.post<ApiResult>(
      `${API_BASE}/capital/withdraw`,
      body,
      defaultRequestOptions
    );
    if (res?.code !== 200) throw new Error((res as any)?.msg || '提现失败');
  },

  /** 本金记录分页查询 */
  async getRecordPage(params: CapitalRecordParams): Promise<CapitalRecordPage> {
    const url = buildRecordUrl({
      pageNum: params.pageNum ?? 1,
      pageSize: params.pageSize ?? 20,
      tradeType: params.tradeType || undefined,
      tradeStartTime: params.tradeStartTime || undefined,
      tradeEndTime: params.tradeEndTime || undefined,
      name: params.name || undefined,
      id: params.id || undefined,
    });
    const res = await httpClient.get<ApiResult<CapitalRecordPage>>(
      url,
      defaultRequestOptions
    );
    if (res?.code !== 200 || !res?.data) {
      throw new Error((res as any)?.msg || '获取本金记录失败');
    }
    return res.data;
  },

  /**
   * 获取用户资产摘要（Dashboard 大屏使用）
   * 返回总本金、总资产、现金、持仓市值等关键指标
   */
  async getAssetSummary(): Promise<AssetSummary> {
    const res = await httpClient.get<ApiResult<AssetSummary>>(
      `${API_BASE}/capital/asset-summary`,
      defaultRequestOptions
    );
    if (res?.code !== 200 || !res?.data) {
      throw new Error((res as any)?.msg || '获取资产摘要失败');
    }
    return res.data;
  },
};
