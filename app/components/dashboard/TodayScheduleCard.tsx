"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/app/components/ui/card";
import { CalendarIcon, ClockIcon } from "lucide-react";
import { format, isToday } from "date-fns";
import { ja } from "date-fns/locale";
import { TodayScheduleData, DashboardCardProps } from "./types";

// APIレスポンス用の型定義
interface LessonSlot {
  id: string;
  reservations?: Array<{
    status: string;
  }>;
}

interface Reservation {
  id: string;
  bookedStartTime: string;
  bookedEndTime: string;
  status: string;
  lessonSlot?: {
    teacher?: {
      name: string;
    };
  };
  lessonSlots?: {
    users?: {
      name: string;
    };
  };
}

export const TodayScheduleCard: React.FC<DashboardCardProps> = ({ userRole, userId }) => {
  const [scheduleData, setScheduleData] = useState<TodayScheduleData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTodaySchedule = async () => {
      if (!userId) return;

      try {
        setLoading(true);
        
        if (userRole === 'mentor') {
          // 今日の日付を取得
          const today = format(new Date(), 'yyyy-MM-dd');
          console.log('メンター用スケジュール取得:', { userId, today });
          
          // 既存のAPI呼び出し（lesson-slots）
          const response = await fetch(`/api/lesson-slots?teacherId=${userId}&from=${today}&to=${today}`, {
            cache: 'no-cache'
          });
          
          if (response.ok) {
            const slots: LessonSlot[] = await response.json();
            console.log('取得したスロット:', slots);
            
            const totalSlots = slots.length;
            const bookedSlots = slots.filter((slot: LessonSlot) => 
              slot.reservations?.some((res: { status: string }) => res.status === 'CONFIRMED')
            ).length;
            const availableSlots = totalSlots - bookedSlots;
            
            setScheduleData({
              totalSlots,
              bookedSlots,
              availableSlots
            });
          } else {
            console.error('スロット取得エラー:', response.status);
            setScheduleData({ totalSlots: 0, bookedSlots: 0, availableSlots: 0 });
          }
        } else if (userRole === 'student') {
          console.log('生徒用スケジュール取得:', { userId });
          
          // 既存のAPI呼び出し（reservations）
          const response = await fetch(`/api/reservations`, {
            cache: 'no-cache'
          });
          
          if (response.ok) {
            const reservations: Reservation[] = await response.json();
            console.log('取得した予約:', reservations);
            
            // 今日の予約のみフィルタ
            const todayReservations = reservations.filter((res: Reservation) => 
              isToday(new Date(res.bookedStartTime))
            );
            
            setScheduleData({
              upcomingReservations: todayReservations.map((res: Reservation) => ({
                id: res.id,
                startTime: res.bookedStartTime,
                endTime: res.bookedEndTime,
                mentorName: res.lessonSlot?.teacher?.name || res.lessonSlots?.users?.name || '不明',
                status: res.status
              }))
            });
          } else {
            console.error('予約取得エラー:', response.status);
            setScheduleData({ upcomingReservations: [] });
          }
        }
      } catch (error) {
        console.error('今日の予定取得エラー:', error);
        setScheduleData({ 
          totalSlots: 0, 
          bookedSlots: 0, 
          availableSlots: 0,
          upcomingReservations: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTodaySchedule();
  }, [userRole, userId]);

  if (loading) {
    return (
      <Card className="p-6 bg-white">
        <div className="flex items-center mb-4">
          <CalendarIcon className="h-5 w-5 mr-2 text-blue-500" />
          <h3 className="font-semibold">今日の予定</h3>
        </div>
        <p className="text-sm text-gray-500">読み込み中...</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-white">
      <div className="flex items-center mb-4">
        <CalendarIcon className="h-5 w-5 mr-2 text-blue-500" />
        <h3 className="font-semibold">今日の予定</h3>
      </div>
      
      {userRole === 'mentor' ? (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">総スロット数</span>
            <span className="text-2xl font-bold">{scheduleData.totalSlots || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">予約済み</span>
            <span className="text-lg font-semibold text-green-600">{scheduleData.bookedSlots || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">空きスロット</span>
            <span className="text-lg font-semibold text-blue-600">{scheduleData.availableSlots || 0}</span>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {scheduleData.upcomingReservations && scheduleData.upcomingReservations.length > 0 ? (
            scheduleData.upcomingReservations.map((reservation) => (
              <div key={reservation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <ClockIcon className="h-4 w-4 mr-2 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">
                      {format(new Date(reservation.startTime), 'HH:mm')} - 
                      {format(new Date(reservation.endTime), 'HH:mm')}
                    </p>
                    <p className="text-xs text-gray-500">{reservation.mentorName}先生</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  reservation.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                  reservation.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {reservation.status === 'CONFIRMED' ? '確定' :
                   reservation.status === 'APPROVED' ? '決済待ち' : '承認待ち'}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">今日の予定はありません</p>
          )}
        </div>
      )}
    </Card>
  );
}; 