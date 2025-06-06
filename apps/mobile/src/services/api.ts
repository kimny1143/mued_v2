import { supabase } from './supabase';

// Vercelのmonorepoデプロイでは同一ドメインになるため、
// 相対パスで/apiにアクセス可能
const API_BASE_URL = '';

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
    const url = `/api${endpoint}`;
    
    console.log('[ApiClient] Request:', {
      url,
      method: options.method || 'GET',
      hasToken: !!token,
    });
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
        credentials: 'include', // Cookieを含める
      });

      console.log('[ApiClient] Response:', {
        status: response.status,
        statusText: response.statusText,
      });

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