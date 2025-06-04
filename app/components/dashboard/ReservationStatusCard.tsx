"use client";

import React from "react";
import Link from 'next/link';
import { Card } from "@/app/components/ui/card";
import { CheckCircleIcon, AlertCircleIcon, ClockIcon } from "lucide-react";
import { DashboardCardProps } from "./types";
import { useReservationStats } from '@/lib/hooks/queries/useReservationStats';

export const ReservationStatusCard: React.FC<DashboardCardProps> = ({ userRole, userId }) => {
  const { data: statusData, isLoading, error } = useReservationStats({ userId, userRole });

  // hrefを動的に決定
  const cardHref = userRole === 'mentor' ? '/dashboard/slots-calendar' : '/dashboard/booking-calendar';

  if (isLoading) {
    return (
      <Link href={cardHref} passHref>
        <Card className="p-6 bg-white hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center mb-4">
            <ClockIcon className="h-5 w-5 mr-2 text-green-500" />
            <h3 className="font-semibold">予約状況</h3>
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
            <ClockIcon className="h-5 w-5 mr-2 text-green-500" />
            <h3 className="font-semibold">予約状況</h3>
          </div>
          <p className="text-sm text-red-500">予約状況の取得に失敗しました</p>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={cardHref} passHref>
      <Card className="p-6 bg-white hover:shadow-lg transition-shadow cursor-pointer">
        <div className="flex items-center mb-4">
          <CheckCircleIcon className="h-5 w-5 mr-2 text-green-500" />
          <h3 className="font-semibold">予約状況</h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircleIcon className="h-4 w-4 mr-2 text-yellow-500" />
              <span className="text-sm text-gray-600">
                {userRole === 'mentor' ? '承認待ち' : '承認待ち'}
              </span>
            </div>
            <span className="text-lg font-semibold text-yellow-600">{statusData?.pendingApproval || 0}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ClockIcon className="h-4 w-4 mr-2 text-blue-500" />
              <span className="text-sm text-gray-600">
                {userRole === 'mentor' ? '承認済み' : '決済待ち'}
              </span>
            </div>
            <span className="text-lg font-semibold text-blue-600">{statusData?.approved || 0}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircleIcon className="h-4 w-4 mr-2 text-green-500" />
              <span className="text-sm text-gray-600">確定済み</span>
            </div>
            <span className="text-lg font-semibold text-green-600">{statusData?.confirmed || 0}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}; 