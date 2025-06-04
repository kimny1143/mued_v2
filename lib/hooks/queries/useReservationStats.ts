"use client";

import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api-client';

// APIレスポンス用の型定義
interface Reservation {
  id: string;
  status: string;
  studentId?: string;
  mentorId?: string;
}

export interface ReservationStats {
  pendingApproval: number;
  approved: number;
  confirmed: number;
}

export interface UseReservationStatsOptions {
  userId?: string;
  userRole?: string;
}

export function useReservationStats({ userId, userRole }: UseReservationStatsOptions) {
  return useQuery<ReservationStats>({
    queryKey: ['reservations', userId, { stats: true }],
    queryFn: async () => {
      // userId が undefined の場合は早期リターン
      if (!userId || userId === 'undefined') {
        console.log('useReservationStats: userId が利用できません', { userId });
        return { pendingApproval: 0, approved: 0, confirmed: 0 };
      }

      try {
        console.log('予約状況取得開始:', { userRole, userId });
        const reservations: Reservation[] = await api.get('/api/reservations') as Reservation[];
        console.log('取得した予約一覧:', reservations);
        
        // ステータス別に集計
        const pendingApproval = reservations.filter((res: Reservation) => res.status === 'PENDING_APPROVAL').length;
        const approved = reservations.filter((res: Reservation) => res.status === 'APPROVED').length;
        const confirmed = reservations.filter((res: Reservation) => res.status === 'CONFIRMED').length;
        
        return {
          pendingApproval,
          approved,
          confirmed
        };
      } catch (err) {
        console.error('予約状況取得エラー:', err);
        if (err instanceof ApiError) {
          console.error(`予約状況の取得に失敗しました (${err.status}): ${err.message}`);
        }
        return { pendingApproval: 0, approved: 0, confirmed: 0 };
      }
    },
    enabled: !!userId && userId !== 'undefined',
    retry: false, // 認証エラーでリトライしない
    staleTime: 30 * 1000, // 30秒間はキャッシュを新鮮と見なす
    refetchOnWindowFocus: false, // ウィンドウフォーカス時の再フェッチを無効化
  });
}