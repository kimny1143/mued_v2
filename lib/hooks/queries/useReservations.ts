import { useQuery } from '@tanstack/react-query';
import { ReservationStatus } from '@prisma/client';

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
  return useQuery<Reservation[]>({
    queryKey: ['reservations', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.status) params.append('status', options.status);
      if (options?.take) params.append('take', options.take.toString());
      if (options?.skip) params.append('skip', options.skip.toString());

      const response = await fetch(`/api/my-reservations?${params.toString()}`);
      if (!response.ok) {
        throw new Error('予約の取得に失敗しました');
      }
      return response.json();
    },
  });
} 