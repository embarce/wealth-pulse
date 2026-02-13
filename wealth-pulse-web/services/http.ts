// 统一 HTTP 请求工具，用于自动附加 JWT Token，并在登录失效时跳转登录页

export interface HttpRequestOptions extends RequestInit {
  // 是否在 401/403 时自动处理未授权（清理本地状态并跳转登录）
  autoHandleAuthError?: boolean;
}

// 默认请求选项（自动处理认证错误）
export const defaultRequestOptions: HttpRequestOptions = {
  autoHandleAuthError: true,
};

class HttpClient {
  private tokenKey = 'pulse_token';
  private authFlagKey = 'pulse_auth';

  /** 从本地获取当前 JWT Token */
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  /** 设置 / 更新 JWT Token，一般在登录成功后调用 */
  setToken(token: string | null) {
    if (token) {
      localStorage.setItem(this.tokenKey, token);
      localStorage.setItem(this.authFlagKey, 'true');
    } else {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.authFlagKey);
    }
  }

  /** 清理本地登录状态并跳转登录页 */
  private handleUnauthorized() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.authFlagKey);
    // 简单处理：刷新页面，依靠 App 中的登录判断自动回到登录页
    window.location.reload();
  }

  /** 核心请求函数，method + url */
  async request<T = any>(
    method: string,
    url: string,
    options: HttpRequestOptions = {}
  ): Promise<T> {
    const { headers, body, autoHandleAuthError = true, ...rest } = options;
    const token = this.getToken();

    const finalHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      ...(headers || {}),
    };

    if (token) {
      (finalHeaders as any).Authorization = `Bearer ${token}`;
    }

    const resp = await fetch(url, {
      method,
      headers: finalHeaders,
      body: body && typeof body !== 'string' ? JSON.stringify(body) : (body as any),
      ...rest,
    });

    if (autoHandleAuthError && (resp.status === 401 || resp.status === 403)) {
      this.handleUnauthorized();
      // 抛出错误，防止调用方继续误用数据
      throw new Error('Unauthorized');
    }

    // 根据你后端的返回格式，这里可以扩展错误处理逻辑
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(text || `Request failed with status ${resp.status}`);
    }

    // 默认尝试解析 JSON
    try {
      return (await resp.json()) as T;
    } catch {
      // 如果不是 JSON，就返回原始文本
      return (await resp.text()) as unknown as T;
    }
  }

  get<T = any>(url: string, options?: HttpRequestOptions) {
    return this.request<T>('GET', url, options);
  }

  post<T = any>(url: string, body?: any, options?: HttpRequestOptions) {
    return this.request<T>('POST', url, { ...(options || {}), body });
  }

  put<T = any>(url: string, body?: any, options?: HttpRequestOptions) {
    return this.request<T>('PUT', url, { ...(options || {}), body });
  }

  patch<T = any>(url: string, body?: any, options?: HttpRequestOptions) {
    return this.request<T>('PATCH', url, { ...(options || {}), body });
  }

  delete<T = any>(url: string, options?: HttpRequestOptions) {
    return this.request<T>('DELETE', url, options);
  }
}

export const httpClient = new HttpClient();

