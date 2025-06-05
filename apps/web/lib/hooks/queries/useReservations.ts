// lib/hooks/queries/useReservations.ts
import { ReservationStatus } from '@prisma/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { supabaseBrowser } from '@/lib/supabase-browser';

import { useUser } from '../use-user';
import { useSupabaseChannel } from '../useSupabaseChannel';


export interface LessonSlot {
  id: string;
  startTime: Date;
  endTime: Date;
  teacher: {
    id: string;
    name: string;
    image: string | null;
  };
  isAvailable: boolean;
  price?: number;
  mentorName?: string;
}

export interface Reservation {
  id: string;
  status: ReservationStatus;
  createdAt: Date;
  updatedAt: Date;
  slotId: string;
  studentId: string;
  paymentId: string | null;
  notes: string | null;
  lessonSlot: LessonSlot;
}

export interface UseReservationsOptions {
  status?: ReservationStatus;
  take?: number;
  skip?: number;
  includeAll?: boolean;
}

export function useReservations(options?: UseReservationsOptions) {
  const queryClient = useQueryClient();
  const { user } = useUser();

  // デバッグログ
  console.log('useReservations - 開始', { 
    options, 
    userExists: !!user, 
    userId: user?.id
  });

  // リアルタイム更新の設定
  useSupabaseChannel('reservations', {
    table: 'reservations',
    event: '*', // INSERT, UPDATE, DELETE すべてのイベントを監視
    filter: options?.includeAll ? undefined : user ? `student_id=eq.${user.id}` : undefined,
    onEvent: () => {
      // キャッシュを無効化して再取得をトリガー
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    }
  });

  return useQuery<Reservation[]>({
    // token が取れるまでは実行しない
    queryKey: ['reservations', options],
    enabled: options?.includeAll ? true : !!user,
    queryFn: async () => {
      console.log('useReservations - queryFn実行開始', { options });

      const params = new URLSearchParams();
      if (options?.includeAll) {
        params.append('all', 'true');
      } else {
        if (options?.status) params.append('status', options.status);
        if (options?.take) params.append('take', options.take.toString());
        if (options?.skip) params.append('skip', options.skip.toString());
      }

      const url = `/api/my-reservations?${params.toString()}`;
      console.log('API呼び出しURL:', url);

      // セッションからアクセストークンを取得
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token ?? null;
      console.log('認証トークン:', token ? 'あり' : 'なし');

      try {
        console.log('fetchリクエスト開始:', url);
        const response = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include',
          cache: 'no-store', // キャッシュを無効化
        });

        console.log('APIレスポンス:', response.status, response.statusText);

        if (!response.ok) {
          console.warn('my-reservations API error:', response.status);
          return [];
        }
        
        const data = await response.json();
        console.log('取得データ数:', data.length);
        return data;
      } catch (error) {
        console.error('API呼び出しエラー:', error);
        throw error;
      }
    },
    initialData: [],
    staleTime: 30 * 1000, // 30秒間はキャッシュを新鮮と見なす
  });
}