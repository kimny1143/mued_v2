import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api';

export const usePrefetch = () => {
  const queryClient = useQueryClient();

  // レッスンスロットをプリフェッチ
  const prefetchLessonSlots = () => {
    queryClient.prefetchQuery({
      queryKey: ['lessonSlots', 'all'],
      queryFn: () => apiClient.getLessonSlots(),
      staleTime: 30 * 1000,
    });
  };

  // 予約をプリフェッチ
  const prefetchReservations = () => {
    queryClient.prefetchQuery({
      queryKey: ['reservations', 'my'],
      queryFn: () => apiClient.getMyReservations(),
      staleTime: 30 * 1000,
    });
  };

  // セッションをプリフェッチ
  const prefetchSessions = () => {
    queryClient.prefetchQuery({
      queryKey: ['sessions'],
      queryFn: () => apiClient.getSessions(),
      staleTime: 30 * 1000,
    });
  };

  // 全てのデータをプリフェッチ
  const prefetchAll = () => {
    prefetchLessonSlots();
    prefetchReservations();
    prefetchSessions();
  };

  return {
    prefetchLessonSlots,
    prefetchReservations,
    prefetchSessions,
    prefetchAll,
  };
};