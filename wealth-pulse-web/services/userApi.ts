/**
 * 用户相关 API
 * 对接后端 /api/user/* 接口
 */

import { httpClient, defaultRequestOptions } from './http';

/** 后端统一响应格式 */
interface ApiResult<T = unknown> {
  code: number;
  msg: string;
  data?: T;
}

const API_BASE = '/api';

/** Dashboard 资产数据 */
export interface DashboardData {
  totalAssets: number;              // 总资产
  cumulativeProfitLoss: number;     // 累计盈亏
  cumulativeProfitLossRate: number;  // 累计盈亏率
  availableCash: number;             // 可用现金
  purchasingPower: number;           // 购买力
  positionValue: number;             // 持仓市值
  totalPrincipal: number;            // 总本金
  todayProfitLoss: number;           // 今日盈亏
  todayProfitLossRate: number;       // 今日盈亏率
  yesterdayTotalAssets: number;      // 昨日总资产
  totalCashflow: number;             // 总资金流水
  totalBuyCount: number;             // 总买入次数
  totalSellCount: number;            // 总卖出次数
}

/** 单个持仓项（与 /api/user/positions/dashboard 返回结构对齐） */
export interface PositionItem {
  stockCode: string;            // 股票代码，例如 1299.HK
  stockName?: string;           // 股票名称（可选）
  shortName?: string;           // 简短名称（可选）
  companyName?: string;         // 英文公司名（可选）
  companyNameCn?: string;       // 中文公司名（可选）
  currency?: string;            // 币种，例如 HKD
  quantity: number;             // 持仓数量
  avgCost: number;              // 平均成本
  currentPrice: number;         // 当前价格
  openPrice?: number;           // 开盘价
  highPrice?: number;           // 最高价
  lowPrice?: number;            // 最低价
  preClosePrice?: number;       // 昨收价
  changeNumber?: number;        // 涨跌额
  changeRate?: number;          // 涨跌幅
  changePercent?: number;       // 涨跌幅（百分比）
  volume?: number;              // 成交量
  turnover?: number;            // 成交额
  marketValue: number;          // 市值
  costValue?: number;           // 成本金额（可选）
  profitLoss: number;           // 盈亏金额
  profitLossRate: number;       // 盈亏比例
  positionStatus?: 1 | 2 | 3;   // 持仓状态: 1-持有中 2-已清仓 3-部分平仓
  firstBuyDate?: string;        // 首次买入日期
  lastBuyDate?: string;         // 最近买入日期
}

/** 仓位总览数据 */
export interface PositionsDashboardData {
  totalPositionValue: number;       // 持仓总市值
  totalCost: number;               // 总成本
  totalProfitLoss: number;         // 总盈亏
  totalProfitLossRate: number;     // 总盈亏率
  positionCount: number;           // 持仓数量
  profitableCount: number;         // 盈利持仓数
  lossCount: number;              // 亏损持仓数
  positions: PositionItem[];       // 持仓列表
}

export const userApi = {
  /**
   * 获取用户 Dashboard 资产数据
   * GET /api/user/assets/dashboard
   */
  async getDashboard(): Promise<DashboardData> {
    const res = await httpClient.get<ApiResult<DashboardData>>(
      `${API_BASE}/user/assets/dashboard`,
      defaultRequestOptions
    );
    if (res?.code !== 200 || !res?.data) {
      throw new Error((res as any)?.msg || '获取Dashboard数据失败');
    }
    return res.data;
  },

  /**
   * 获取用户仓位总览
   * GET /api/user/positions/dashboard
   */
  async getPositionsDashboard(): Promise<PositionsDashboardData> {
    const res = await httpClient.get<ApiResult<PositionsDashboardData>>(
      `${API_BASE}/user/positions/dashboard`,
      defaultRequestOptions
    );
    if (res?.code !== 200 || !res?.data) {
      throw new Error((res as any)?.msg || '获取仓位数据失败');
    }
    return res.data;
  },
};
