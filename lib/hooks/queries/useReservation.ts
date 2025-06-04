import { useQuery } from '@tanstack/react-query';
import { ReservationStatus } from '@prisma/client';

interface Reservation {
  id: string;
  status: ReservationStatus;
  lessonSlot: {
    id: string;
    startTime: Date;
    endTime: Date;
    teacher: {
      id: string;
      name: string;
      image: string | null;
    };
  };
  payment: {
    id: string;
    amount: number;
    currency: string;
    status: string;
  } | null;
  createdAt: Date;
  updatedAt: Date | null;
}

export function useReservation(id: string) {
  return useQuery<Reservation>({
    queryKey: ['reservation', id],
    queryFn: async () => {
      const response = await fetch(`/api/reservations/${id}`);
      if (!response.ok) {
        throw new Error('予約情報の取得に失敗しました');
      }
      return response.json();
    },
    enabled: !!id, // idが存在する場合のみクエリを実行
    staleTime: 30 * 1000, // 30秒間はキャッシュを新鮮と見なす
  });
} 