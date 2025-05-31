"use client";

import React, { useEffect, useState } from "react";
import Link from 'next/link';
import { Card } from "@/app/components/ui/card";
import { CalendarIcon, ClockIcon } from "lucide-react";
import { format, isToday, isFuture, startOfDay } from "date-fns";
import { TodayScheduleData, DashboardCardProps } from "./types";
import { api, ApiError } from '@/lib/api-client';

// APIレスポンス用の型定義を更新
interface Reservation {
  id: string;
  bookedStartTime: string;
  bookedEndTime: string;
  status: string;
  student?: { // 予約した生徒の情報
    id: string;
    name: string;
  };
  lessonSlots?: { // 予約されたスロットの情報
    users?: { // スロットの担当メンター(講師)の情報
      id: string;
      name: string;
    };
  };
  // APIの `/api/reservations` のGETレスポンスでは、
  // 予約に紐づく生徒情報が `users` プロパティとして返ってくる場合もあるため、それも考慮
  users?: { // 生徒の情報 (studentプロパティのエイリアス元)
    id: string;
    name: string;
  };
}

export const TodayScheduleCard: React.FC<DashboardCardProps> = ({ userRole, userId }) => {
  // scheduleDataの型はTodayScheduleDataのupcomingReservationsのみを想定するように変更
  const [scheduleData, setScheduleData] = useState<Pick<TodayScheduleData, 'upcomingReservations'>>({ upcomingReservations: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let reservations: Reservation[] = [];
    let filteredReservations: Reservation[] = [];
    const fetchTodaySchedule = async () => {
      if (!userId) return;

      try {
        setLoading(true);
        setError(null);
        
        reservations = await api.get(`/api/reservations?status=CONFIRMED`) as Reservation[];
        console.log('取得した確定済み予約:', { userRole, userId, reservations });
            
        const today = startOfDay(new Date());

        filteredReservations = reservations.filter(res => {
          const lessonDate = new Date(res.bookedStartTime);
          return isToday(lessonDate) || isFuture(lessonDate);
        });

        setScheduleData({
          upcomingReservations: filteredReservations.map((res: Reservation) => ({
            id: res.id,
            startTime: res.bookedStartTime,
            endTime: res.bookedEndTime,
            // userRoleに応じて相手の名前をactorNameにセット
            actorName: userRole === 'mentor' 
              ? (res.student?.name || res.users?.name || '生徒情報なし') 
              : (res.lessonSlots?.users?.name || 'メンター情報なし'),
            status: res.status
          })).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()) // 時間順にソート
        });

      } catch (err) {
        console.error('確定済み予定取得エラー:', err);
        // 404エラーまたは取得した予約が空の場合
        if ((err instanceof ApiError && err.status === 404) || (filteredReservations && filteredReservations.length === 0)) {
          console.log('本日以降の確定済みの予定はありません');
          setScheduleData({ upcomingReservations: [] });
        } else if (err instanceof ApiError) {
          setError(`予定情報の取得に失敗しました (${err.status}): ${err.message}`);
          setScheduleData({ upcomingReservations: [] });
        } else {
          setError(err instanceof Error ? err.message : '予定情報の取得に失敗しました');
          setScheduleData({ upcomingReservations: [] });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTodaySchedule();
  }, [userRole, userId]);

  const cardHref = "/dashboard/my-lessons";

  if (loading) {
    return (
      <Link href={cardHref} passHref>
        <Card className="p-6 bg-white hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center mb-4">
            <CalendarIcon className="h-5 w-5 mr-2 text-blue-500" />
            <h3 className="font-semibold">今日の予定</h3>
          </div>
          {error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : (
            <p className="text-sm text-gray-500">読み込み中...</p>
          )}
        </Card>
      </Link>
    );
  }

  return (
    <Link href={cardHref} passHref>
      <Card className="p-6 bg-white hover:shadow-lg transition-shadow cursor-pointer">
        <div className="flex items-center mb-4">
          <CalendarIcon className="h-5 w-5 mr-2 text-blue-500" />
          <h3 className="font-semibold">今日の予定</h3>
        </div>
        
        <div className="space-y-3">
          {scheduleData.upcomingReservations && scheduleData.upcomingReservations.length > 0 ? (
            scheduleData.upcomingReservations.map((reservation) => (
              <div key={reservation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <ClockIcon className="h-4 w-4 mr-2 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">
                      {format(new Date(reservation.startTime), 'yyyy/MM/dd HH:mm')} - 
                      {format(new Date(reservation.endTime), 'HH:mm')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {reservation.actorName}
                      {userRole === 'mentor' ? 'さん' : '先生'}
                    </p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  reservation.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                  reservation.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                  reservation.status === 'PENDING_APPROVAL' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {reservation.status === 'CONFIRMED' ? '確定' :
                   reservation.status === 'APPROVED' ? '決済待ち' :
                   reservation.status === 'PENDING_APPROVAL' ? '承認待ち' :
                   reservation.status}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">確定済みの予定はありません</p>
          )}
        </div>
      </Card>
    </Link>
  );
}; 