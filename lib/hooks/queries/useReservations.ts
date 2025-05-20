import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ReservationStatus } from '@prisma/client';
import { useSupabaseChannel } from '../useSupabaseChannel';
import { useUser } from '../use-user';
import { supabaseBrowser } from '@/lib/supabase-browser';

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
}

export function useReservations(options?: UseReservationsOptions) {
  const queryClient = useQueryClient();
  const { user } = useUser();

  // リアルタイム更新の設定
  useSupabaseChannel('reservations', {
    table: 'reservations',
    event: '*', // INSERT, UPDATE, DELETE すべてのイベントを監視
    filter: user ? `student_id=eq.${user.id}` : undefined,
    onEvent: () => {
      // キャッシュを無効化して再取得をトリガー
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    }
  });

  return useQuery<Reservation[]>({
    // token が取れるまでは実行しない
    queryKey: ['reservations', options],
    enabled: !!user,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.status) params.append('status', options.status);
      if (options?.take) params.append('take', options.take.toString());
      if (options?.skip) params.append('skip', options.skip.toString());

      // アクセストークン取得
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token ?? null;

      if (!token) return [];

      const response = await fetch(`/api/my-reservations?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (!response.ok) {
        console.warn('my-reservations API error:', response.status);
        return [];
      }
      return response.json();
    },
    initialData: [],
  });
} 