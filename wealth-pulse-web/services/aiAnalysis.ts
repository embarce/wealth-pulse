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
