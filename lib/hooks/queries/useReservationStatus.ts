import { useQuery } from '@tanstack/react-query';

interface ReservationStatus {
  status: string;
  reservationId?: string;
  error?: string;
}

export function useReservationStatus(sessionId: string | null) {
  return useQuery<ReservationStatus>({
    queryKey: ['reservationStatus', sessionId],
    queryFn: async () => {
      if (!sessionId) {
        throw new Error('セッションIDが必要です');
      }

      const response = await fetch(`/api/checkout/status?session_id=${sessionId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '予約状態の確認中にエラーが発生しました');
      }

      return response.json();
    },
    enabled: !!sessionId, // セッションIDが存在する場合のみクエリを実行
    retry: 1, // エラー時に1回だけリトライ
    staleTime: 30 * 1000, // 30秒間はキャッシュを新鮮と見なす
  });
} 