import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

/**
 * フィーチャーフラグを使用してビューとテーブルを切り替えるフック
 */
export function useActiveSlots(teacherId?: string) {
  const useDbViews = process.env.NEXT_PUBLIC_USE_DB_VIEWS === 'true';

  return useQuery({
    queryKey: ['active-slots', teacherId, useDbViews],
    queryFn: async () => {
      const endpoint = useDbViews 
        ? '/api/lesson-slots/v2/active' 
        : '/api/lesson-slots/active';
      
      const params = teacherId ? `?teacherId=${teacherId}` : '';
      const response = await apiClient.get(`${endpoint}${params}`);
      
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5分間キャッシュ
  });
}

/**
 * 本日のレッスンセッションを取得
 */
export function useTodaysSessions() {
  const useDbViews = process.env.NEXT_PUBLIC_USE_DB_VIEWS === 'true';

  return useQuery({
    queryKey: ['todays-sessions', useDbViews],
    queryFn: async () => {
      if (!useDbViews) {
        // 従来のクエリ（複雑なJOIN）
        const response = await apiClient.get('/api/sessions/today');
        return response.data;
      }
      
      // ビューを使用（シンプル）
      const response = await apiClient.get('/api/sessions/v2/today');
      return response.data;
    },
    staleTime: 1000 * 60 * 1, // 1分間キャッシュ
  });
}