import { httpClient, HttpRequestOptions, defaultRequestOptions } from './http';
import { AppConfig } from '../types';

/** 后端统一响应格式 */
interface ApiResult<T = unknown> {
  code: number;
  msg: string;
  data?: T;
}

const API_BASE = '/api';

/**
 * 用户配置 API 服务
 */
export const userConfigApi = {
  /**
   * 获取当前用户配置
   * GET /api/user/config
   */
  getConfig: async (options?: HttpRequestOptions): Promise<AppConfig> => {
    const res = await httpClient.get<ApiResult<AppConfig>>(
      `${API_BASE}/user/config`,
      { ...defaultRequestOptions, ...options }
    );

    if (res?.code !== 200 || !res?.data) {
      throw new Error((res as any)?.msg || '获取用户配置失败');
    }

    return res.data;
  },

  /**
   * 保存用户配置
   * POST /api/user/config
   */
  saveConfig: async (config: AppConfig, options?: HttpRequestOptions): Promise<void> => {
    const res = await httpClient.post<ApiResult<void>>(
      `${API_BASE}/user/config`,
      config,
      { ...defaultRequestOptions, ...options }
    );

    if (res?.code !== 200) {
      throw new Error((res as any)?.msg || '保存用户配置失败');
    }
  },
};
