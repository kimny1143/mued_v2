import useSWR from 'swr';

import { supabaseBrowser } from '@/lib/supabase-browser';

export interface LessonSession {
  id: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'NO_SHOW';
  scheduled_start: string;
  scheduled_end: string;
  actual_start?: string;
  actual_end?: string;
  lesson_notes?: string;
  homework?: string;
  materials_used?: any;
  student_feedback?: string;
  mentor_feedback?: string;
  rating?: number;
  reservation: {
    id: string;
    status: string;
    total_amount: number;
    booked_start_time: string;
    booked_end_time: string;
  };
  teacher: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  student: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
}

interface SessionsResponse {
  sessions: LessonSession[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

interface UseSessionsOptions {
  userId?: string;
  status?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export function useSessions(options: UseSessionsOptions = {}) {
  const queryParams = new URLSearchParams();
  if (options.userId) queryParams.set('user_id', options.userId);
  if (options.status) queryParams.set('status', options.status);
  if (options.from) queryParams.set('from', options.from);
  if (options.to) queryParams.set('to', options.to);
  if (options.limit) queryParams.set('limit', options.limit.toString());
  if (options.offset) queryParams.set('offset', options.offset.toString());

  const { data, error, mutate } = useSWR<SessionsResponse>(
    // userIdがない場合はnullを返してSWRの実行を防ぐ
    options.userId ? `/api/sessions?${queryParams.toString()}` : null,
    async (url: string) => {
      console.log('useSessions - API呼び出し開始:', url);
      
      // セッションからアクセストークンを取得
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token;
      
      console.log('useSessions - 認証トークン:', token ? 'あり' : 'なし');
      
      if (!token) {
        console.warn('useSessions - 認証トークンがありません');
        throw new Error('Authentication required');
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      console.log('useSessions - APIレスポンス:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('useSessions - APIエラー:', response.status, errorText);
        throw new Error(`Failed to fetch sessions: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('useSessions - 取得データ:', data);
      
      return data;
    }
  );

  return {
    sessions: data?.sessions || [],
    pagination: data?.pagination,
    isLoading: !error && !data,
    isError: error,
    mutate
  };
}

export function useSession(sessionId: string | null) {
  const { data, error, mutate } = useSWR<LessonSession>(
    sessionId ? `/api/sessions/${sessionId}` : null,
    async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch session');
      }
      return response.json();
    }
  );

  return {
    session: data,
    isLoading: !error && !data,
    isError: error,
    mutate
  };
}