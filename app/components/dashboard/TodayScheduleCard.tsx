"use client";

import React from "react";
import Link from 'next/link';
import { Card } from "@/app/components/ui/card";
import { CalendarIcon, ClockIcon } from "lucide-react";
import { format } from "date-fns";
import { DashboardCardProps } from "./types";
import { useTodaySchedule } from '@/lib/hooks/queries/useTodaySchedule';

export const TodayScheduleCard: React.FC<DashboardCardProps> = ({ userRole, userId }) => {
  const { data: upcomingReservations = [], isLoading, error } = useTodaySchedule({ userId, userRole });

  const cardHref = "/dashboard/my-lessons";

  if (isLoading) {
    return (
      <Link href={cardHref} passHref>
        <Card className="p-6 bg-white hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center mb-4">
            <CalendarIcon className="h-5 w-5 mr-2 text-blue-500" />
            <h3 className="font-semibold">今日の予定</h3>
          </div>
          <p className="text-sm text-gray-500">読み込み中...</p>
        </Card>
      </Link>
    );
  }

  if (error) {
    return (
      <Link href={cardHref} passHref>
        <Card className="p-6 bg-white hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center mb-4">
            <CalendarIcon className="h-5 w-5 mr-2 text-blue-500" />
            <h3 className="font-semibold">今日の予定</h3>
          </div>
          <p className="text-sm text-red-500">予定情報の取得に失敗しました</p>
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
          {upcomingReservations && upcomingReservations.length > 0 ? (
            upcomingReservations.map((reservation) => (
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