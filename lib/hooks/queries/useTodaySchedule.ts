"use client";

import { useQuery } from '@tanstack/react-query';
import { format, isToday, isFuture, startOfDay } from "date-fns";
import { api, ApiError } from '@/lib/api-client';

// APIレスポンス用の型定義
interface Reservation {
  id: string;
  bookedStartTime: string;
  bookedEndTime: string;
  status: string;
  student?: {
    id: string;
    name: string;
  };
  lessonSlots?: {
    users?: {
      id: string;
      name: string;
    };
  };
  users?: {
    id: string;
    name: string;
  };
}

export interface ScheduleItem {
  id: string;
  startTime: string;
  endTime: string;
  actorName: string;
  status: string;
}

export interface UseTodayScheduleOptions {
  userId?: string;
  userRole?: string;
}

export function useTodaySchedule({ userId, userRole }: UseTodayScheduleOptions) {
  return useQuery<ScheduleItem[]>({
    queryKey: ['reservations', { status: 'CONFIRMED', today: true }],
    queryFn: async () => {
      if (!userId) return [];

      try {
        const reservations = await api.get(`/api/reservations?status=CONFIRMED`) as Reservation[];
        console.log('取得した確定済み予約:', { userRole, userId, reservations });
        
        const today = startOfDay(new Date());
        const filteredReservations = reservations.filter(res => {
          const lessonDate = new Date(res.bookedStartTime);
          return isToday(lessonDate) || isFuture(lessonDate);
        });

        return filteredReservations.map((res: Reservation) => ({
          id: res.id,
          startTime: res.bookedStartTime,
          endTime: res.bookedEndTime,
          actorName: userRole === 'mentor' 
            ? (res.student?.name || res.users?.name || '生徒情報なし') 
            : (res.lessonSlots?.users?.name || 'メンター情報なし'),
          status: res.status
        })).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

      } catch (err) {
        console.error('確定済み予定取得エラー:', err);
        if ((err instanceof ApiError && err.status === 404)) {
          console.log('本日以降の確定済みの予定はありません');
          return [];
        }
        throw err;
      }
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30秒間はキャッシュを新鮮と見なす
    initialData: [],
  });
}