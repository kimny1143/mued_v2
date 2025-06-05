import { supabaseBrowser } from '@/lib/supabase-browser';

// APIエラーの型定義
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public response?: Response
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// APIクライアントの設定
interface ApiClientConfig {
  maxRetries?: number;
  retryDelay?: number;
  baseUrl?: string;
}

class ApiClient {
  private maxRetries: number;
  private retryDelay: number;
  private baseUrl: string;

  constructor(config: ApiClientConfig = {}) {
    this.maxRetries = config.maxRetries ?? 2;
    this.retryDelay = config.retryDelay ?? 1000;
    this.baseUrl = config.baseUrl ?? '';
  }

  // 認証トークンを安全に取得
  private async getAuthToken(): Promise<string | null> {
    try {
      // セッションを強制更新して最新のトークンを取得
      const { data, error } = await supabaseBrowser.auth.getSession();
      
      if (error) {
        console.error('認証セッション取得エラー:', error);
        return null;
      }
      
      return data.session?.access_token ?? null;
    } catch (error) {
      console.error('認証トークン取得で予期しないエラー:', error);
      return null;
    }
  }

  // トークンをリフレッシュ
  private async refreshToken(): Promise<string | null> {
    try {
      console.log('🔄 認証トークンをリフレッシュ中...');
      const { data, error } = await supabaseBrowser.auth.refreshSession();
      
      if (error) {
        console.error('トークンリフレッシュエラー:', error);
        return null;
      }
      
      const newToken = data.session?.access_token;
      if (newToken) {
        console.log('✅ 認証トークンのリフレッシュ成功');
      }
      
      return newToken ?? null;
    } catch (error) {
      console.error('トークンリフレッシュで予期しないエラー:', error);
      return null;
    }
  }

  // HTTPリクエストの実行（再試行とエラーハンドリング付き）
  private async makeRequest(
    url: string,
    options: RequestInit = {},
    attempt: number = 1
  ): Promise<Response> {
    // 認証トークンを取得
    const token = await this.getAuthToken();
    
    // ヘッダーを設定
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'pragma': 'no-cache',
      'cache-control': 'no-cache, no-store, must-revalidate',
    };

    // 既存のヘッダーをマージ
    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    // 認証トークンがあれば追加
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // リクエストを実行
    const fullUrl = `${this.baseUrl}${url}`;
    console.log(`🌐 API Request (試行 ${attempt}): ${options.method || 'GET'} ${fullUrl}`);
    
    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers,
        credentials: 'include',
        cache: 'no-store', // キャッシュを完全に無効化
      });

      // 401エラーの場合はトークンリフレッシュを試行
      if (response.status === 401 && attempt === 1) {
        console.log('🔐 401エラー検出 - トークンリフレッシュを試行');
        
        const newToken = await this.refreshToken();
        if (newToken) {
          // 新しいトークンで再試行
          const retryHeaders = { ...headers, 'Authorization': `Bearer ${newToken}` };
          const retryResponse = await fetch(fullUrl, {
            ...options,
            headers: retryHeaders,
            credentials: 'include',
            cache: 'no-store',
          });
          
          if (retryResponse.ok) {
            console.log('✅ トークンリフレッシュ後の再試行成功');
            return retryResponse;
          }
        }
        
        // リフレッシュに失敗した場合はログインページにリダイレクト
        console.error('❌ 認証エラー - ログインページにリダイレクト');
        if (typeof window !== 'undefined') {
          window.location.href = '/login?reason=session_expired';
        }
        throw new ApiError(401, '認証が必要です。ログインしてください。');
      }

      // その他のエラー（500など）の場合は再試行
      if (!response.ok && attempt < this.maxRetries && response.status >= 500) {
        console.log(`🔄 サーバーエラー (${response.status}) - ${this.retryDelay}ms後に再試行 (${attempt + 1}/${this.maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.makeRequest(url, options, attempt + 1);
      }

      // レスポンスログ
      if (response.ok) {
        console.log(`✅ API Success: ${response.status} ${fullUrl}`);
      } else {
        console.error(`❌ API Error: ${response.status} ${fullUrl}`);
      }

      return response;
    } catch (error) {
      if (attempt < this.maxRetries && error instanceof TypeError) {
        // ネットワークエラーの場合は再試行
        console.log(`🔄 ネットワークエラー - ${this.retryDelay}ms後に再試行 (${attempt + 1}/${this.maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.makeRequest(url, options, attempt + 1);
      }
      
      throw error;
    }
  }

  // GETリクエスト
  async get(url: string, options: RequestInit = {}): Promise<unknown> {
    const response = await this.makeRequest(url, { ...options, method: 'GET' });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new ApiError(response.status, errorText, response);
    }
    
    return response.json();
  }

  // POSTリクエスト
  async post(url: string, data?: unknown, options: RequestInit = {}): Promise<unknown> {
    const response = await this.makeRequest(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new ApiError(response.status, errorText, response);
    }
    
    return response.json();
  }

  // PUTリクエスト
  async put(url: string, data?: unknown, options: RequestInit = {}): Promise<unknown> {
    const response = await this.makeRequest(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new ApiError(response.status, errorText, response);
    }
    
    return response.json();
  }

  // DELETEリクエスト
  async delete(url: string, options: RequestInit = {}): Promise<unknown> {
    const response = await this.makeRequest(url, { ...options, method: 'DELETE' });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new ApiError(response.status, errorText, response);
    }
    
    return response.json();
  }
}

// シングルトンインスタンス
export const apiClient = new ApiClient();

// 便利な関数エクスポート
export const api = {
  get: (url: string, options?: RequestInit) => apiClient.get(url, options),
  post: (url: string, data?: unknown, options?: RequestInit) => apiClient.post(url, data, options),
  put: (url: string, data?: unknown, options?: RequestInit) => apiClient.put(url, data, options),
  delete: (url: string, options?: RequestInit) => apiClient.delete(url, options),
};

export default apiClient; 