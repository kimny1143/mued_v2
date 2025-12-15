/**
 * MUEDnote API Client
 * Neon PostgreSQL APIとの通信
 */

import {
  Fragment,
  CreateFragmentRequest,
  UpdateFragmentRequest,
  FragmentListResponse,
  Session,
  CreateSessionRequest,
  SessionListResponse,
  ApiError,
} from './types';

// 環境変数から取得（開発時はデフォルト値を使用）
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const DEV_AUTH_TOKEN = process.env.EXPO_PUBLIC_DEV_TOKEN || 'dev_token_kimny';

class ApiClient {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor() {
    this.baseUrl = API_BASE_URL;
    // 開発時はdevトークンを使用
    if (__DEV__) {
      this.authToken = DEV_AUTH_TOKEN;
    }
  }

  /**
   * 認証トークンを設定
   */
  setAuthToken(token: string) {
    this.authToken = token;
  }

  /**
   * 認証トークンをクリア
   */
  clearAuthToken() {
    this.authToken = null;
  }

  /**
   * API Base URL を設定（テスト用）
   */
  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  /**
   * HTTPリクエストヘッダー生成
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * APIリクエスト共通処理
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(error.error || 'API request failed');
    }

    return response.json();
  }

  // ========================================
  // Fragment API
  // ========================================

  /**
   * Fragment一覧取得
   */
  async getFragments(params?: {
    projectId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<FragmentListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.projectId) searchParams.set('projectId', params.projectId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    const endpoint = `/api/muednote/fragments${query ? `?${query}` : ''}`;

    return this.request<FragmentListResponse>(endpoint);
  }

  /**
   * Fragment作成
   */
  async createFragment(data: CreateFragmentRequest): Promise<{ fragment: Fragment; message: string }> {
    return this.request('/api/muednote/fragments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Fragment更新
   */
  async updateFragment(data: UpdateFragmentRequest): Promise<{ fragment: Fragment; message: string }> {
    return this.request('/api/muednote/fragments', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * Fragment削除
   */
  async deleteFragment(id: string): Promise<{ message: string }> {
    return this.request(`/api/muednote/fragments?id=${id}`, {
      method: 'DELETE',
    });
  }

  // ========================================
  // Session API
  // ========================================

  /**
   * Session一覧取得
   */
  async getSessions(params?: {
    type?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<SessionListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set('type', params.type);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    const endpoint = `/api/muednote/sessions${query ? `?${query}` : ''}`;

    return this.request<SessionListResponse>(endpoint);
  }

  /**
   * Session作成
   */
  async createSession(data: CreateSessionRequest): Promise<{ session: Session; analysis: unknown }> {
    return this.request('/api/muednote/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ========================================
  // Batch Upload (ローカルログの一括送信)
  // ========================================

  /**
   * ローカルログをFragmentとして一括送信
   */
  async uploadLogs(logs: { content: string; timestamp?: string }[]): Promise<{
    created: number;
    failed: number;
    errors: string[];
  }> {
    const results = {
      created: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const log of logs) {
      try {
        await this.createFragment({ content: log.content });
        results.created++;
      } catch (error) {
        results.failed++;
        results.errors.push(
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    }

    return results;
  }
}

// シングルトンエクスポート
export const apiClient = new ApiClient();
