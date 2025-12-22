/**
 * MUEDnote Mobile API Client
 * v7 MVP: Simple session and log sync
 */

import {
  MobileSession,
  MobileLog,
  CreateMobileSessionRequest,
  MobileSessionListResponse,
  SaveLogsRequest,
  SaveLogsResponse,
  SessionLogsResponse,
  ApiError,
} from './types';

// React Native の __DEV__ グローバル変数
declare const __DEV__: boolean;

// 環境変数から取得（開発時は Mac の IP アドレスを使用）
// Note: localhost は iPhone からアクセスできないため、開発時は実際の IP を使用
const DEV_API_URL = 'http://192.168.0.4:3000'; // Mac の IP アドレス
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ||
  (typeof __DEV__ !== 'undefined' && __DEV__ ? DEV_API_URL : 'http://localhost:3000');
const DEV_AUTH_TOKEN = process.env.EXPO_PUBLIC_DEV_TOKEN || 'dev_token_kimny';

class ApiClient {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor() {
    this.baseUrl = API_BASE_URL;
    // 開発時はdevトークンを使用
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      this.authToken = DEV_AUTH_TOKEN;
    }
  }

  /**
   * 認証トークンを設定（Clerk認証後に呼び出す）
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
  // Mobile Session API
  // ========================================

  /**
   * セッション作成
   */
  async createSession(data: CreateMobileSessionRequest): Promise<{ session: MobileSession }> {
    return this.request('/api/muednote/mobile/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * セッション一覧取得
   */
  async getSessions(params?: {
    limit?: number;
    offset?: number;
  }): Promise<MobileSessionListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());

    const query = searchParams.toString();
    const endpoint = `/api/muednote/mobile/sessions${query ? `?${query}` : ''}`;

    return this.request<MobileSessionListResponse>(endpoint);
  }

  /**
   * 特定セッションのログ取得
   */
  async getSessionLogs(sessionId: string): Promise<SessionLogsResponse> {
    return this.request(`/api/muednote/mobile/sessions/${sessionId}/logs`);
  }

  // ========================================
  // Mobile Logs API
  // ========================================

  /**
   * ログ一括保存
   */
  async saveLogs(data: SaveLogsRequest): Promise<SaveLogsResponse> {
    return this.request('/api/muednote/mobile/logs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ========================================
  // Sync Helper
  // ========================================

  /**
   * セッションとログを一括同期
   * 1. セッション作成
   * 2. ログ一括送信
   */
  async syncSession(
    sessionData: CreateMobileSessionRequest,
    logs: Array<{ timestamp_sec: number; text: string; confidence?: number }>
  ): Promise<{
    session: MobileSession;
    savedLogs: number;
  }> {
    // 1. Create session
    const { session } = await this.createSession(sessionData);

    // 2. Save logs
    let savedLogs = 0;
    if (logs.length > 0) {
      const result = await this.saveLogs({
        session_id: session.id,
        logs,
      });
      savedLogs = result.saved_count;
    }

    return { session, savedLogs };
  }
}

// シングルトンエクスポート
export const apiClient = new ApiClient();
