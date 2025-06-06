import { supabase } from './supabase';

// APIベースURLの設定
// Vercelが環境ごとに適切な環境変数を設定:
// - Production: https://www.mued.jp
// - Preview: https://mued-lms-fgm-git-develop-glasswerks.vercel.app
// - Development: Vercelのプレビュー環境を使用
const getApiBaseUrl = () => {
  // 環境変数が設定されている場合はそれを使用
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // 環境変数が設定されていない場合はエラー
  console.error('REACT_APP_API_URL is not set. API calls will fail.');
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
    const url = `${baseUrl}/api${endpoint}`;
    
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
      console.error('[ApiClient] Request failed:', error);
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
}

export const apiClient = new ApiClient();