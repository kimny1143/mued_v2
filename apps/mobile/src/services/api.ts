import { supabase } from './supabase';

// Next.js API Routesを使用（web版と同じ）
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

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
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
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