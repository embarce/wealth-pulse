import { httpClient, HttpRequestOptions, defaultRequestOptions } from './http';

/** 后端统一响应格式 */
interface ApiResult<T = unknown> {
  code: number;
  msg: string;
  data?: T;
}

const API_BASE = '/api';

/**
 * K线数据点 - 用于发送给后端AI分析
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
 * 关键点位 - 后端AI分析返回
 */
export interface KeyLevel {
  type: 'support' | 'resistance' | 'stopLoss' | 'takeProfit';
  price: number;
  label: string;
  confidence?: number; // 置信度 0-1
  reason?: string; // AI 给出的理由
}

/**
 * AI分析请求参数
 */
export interface AIAnalysisRequest {
  stockCode: string; // 股票代码，如 "03900.HK"
  klineData: KlineDataPoint[]; // K线数据
  period: 'minute' | 'daily' | 'weekly' | 'monthly'; // 周期
  forceRefresh?: boolean; // 是否强制刷新（不使用缓存）
}

/**
 * AI分析响应结果 - 匹配后端实际返回格式
 */
export interface AIAnalysisResponse {
  stockCode: string;
  currentPrice: string;
  trend: 'bullish' | 'bearish' | 'sideways';
  trendDescription: string;
  technicalPoints: TechnicalPoint[];
}

/**
 * 技术点位 - 后端实际返回格式
 */
export interface TechnicalPoint {
  type: 'support' | 'resistance' | 'stop_loss' | 'take_profit';
  price: number;
  strength: number; // 1-5 的强度评级
  description: string;
}

/**
 * AI分析服务
 */
export const aiAnalysisApi = {
  /**
   * 发送K线数据进行AI分析
   * POST /api/ai/analyze-kline
   */
  analyzeKline: async (request: AIAnalysisRequest, options?: HttpRequestOptions): Promise<AIAnalysisResponse> => {
    const res = await httpClient.post<ApiResult<AIAnalysisResponse>>(
      `${API_BASE}/ai/analyze-kline`,
      request,
      { ...defaultRequestOptions, ...options }
    );

    if (res?.code !== 200 || !res?.data) {
      throw new Error((res as any)?.msg || 'AI分析失败');
    }

    return res.data;
  }
};
