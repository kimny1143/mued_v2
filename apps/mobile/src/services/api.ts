import { supabase } from './supabase';

// APIベースURLの設定
// Vercel rewritesを使用してプロキシする場合は相対パスを使用
// これによりCORS問題を回避できる
const getApiBaseUrl = () => {
  // 環境変数が明示的に設定されている場合はそれを使用（フルURL）
  if (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.startsWith('http')) {
    console.log('[ApiClient] Using full API URL from env:', process.env.REACT_APP_API_URL);
    return process.env.REACT_APP_API_URL;
  }
  
  // Vercel rewritesを使用する場合は相対パスを返す（空文字列）
  console.log('[ApiClient] Using relative path for API (Vercel rewrites)');
  return '';
};

class ApiClient {
  private async getAuthToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAuthToken();
    const baseUrl = getApiBaseUrl();
    const url = baseUrl ? `${baseUrl}/api${endpoint}` : `/api${endpoint}`;
    
    console.log('[ApiClient] Request:', {
      url,
      method: options.method || 'GET',
      hasToken: !!token,
      origin: window.location.origin,
      env: process.env.NODE_ENV,
    });
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
        credentials: 'include', // Cookieを含める
        mode: 'cors', // CORS対応を明示
      });

      console.log('[ApiClient] Response:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
      });

      // HTMLが返ってきた場合のエラー処理
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        console.error('[ApiClient] Received HTML instead of JSON - API endpoint not found');
        throw new Error('APIエンドポイントが見つかりません');
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ApiClient] Error response:', errorText);
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[ApiClient] Data received:', data);
      return data;
    } catch (error) {
      console.error('[ApiClient] Request failed:', {
        url,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        type: error instanceof TypeError ? 'TypeError (Network/CORS issue)' : 'Other error',
      });
      
      // より詳細なエラーメッセージを提供
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('ネットワークエラーまたはCORSエラーが発生しました。開発者ツールのConsoleとNetworkタブを確認してください。');
      }
      
      throw error;
    }
  }

  // 予約関連
  async getMyReservations() {
    return this.request<any[]>('/my-reservations');
  }

  async getReservation(id: string) {
    return this.request<any>(`/reservations/${id}`);
  }

  async createReservation(data: {
    lessonSlotId: string;
    studentMessage?: string;
  }) {
    return this.request('/reservations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async cancelReservation(id: string, reason?: string) {
    return this.request(`/reservations/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // レッスンスロット関連
  async getLessonSlots(mentorId?: string) {
    const url = mentorId 
      ? `/lesson-slots/by-mentor/${mentorId}`
      : '/lesson-slots';
    return this.request<any[]>(url);
  }

  // セッション関連
  async getSessions() {
    return this.request<any[]>('/sessions');
  }

  // ユーザー関連
  async getUserProfile() {
    return this.request<any>('/user');
  }

  async getUserSubscription() {
    return this.request<any>('/user/subscription');
  }

  async getUser(userId: string) {
    return this.request<any>(`/user?userId=${userId}`);
  }
}

export const apiClient = new ApiClient();