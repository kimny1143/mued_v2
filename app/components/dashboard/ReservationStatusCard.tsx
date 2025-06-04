"use client";

import React from "react";
import Link from 'next/link';
import { Card } from "@/app/components/ui/card";
import { CheckCircleIcon, AlertCircleIcon, ClockIcon } from "lucide-react";
import { DashboardCardProps } from "./types";

interface ReservationStatusCardProps extends DashboardCardProps {
  initialData?: {
    pendingApproval: number;
    approved: number;
    confirmed: number;
  };
}

export const ReservationStatusCard: React.FC<ReservationStatusCardProps> = ({ userRole, userId, initialData }) => {
  // hrefを動的に決定
  const cardHref = userRole === 'mentor' ? '/dashboard/slots-calendar' : '/dashboard/booking-calendar';
  
  const statusData = initialData || { pendingApproval: 0, approved: 0, confirmed: 0 };


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
            <span className="text-lg font-semibold text-yellow-600">{statusData.pendingApproval}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ClockIcon className="h-4 w-4 mr-2 text-blue-500" />
              <span className="text-sm text-gray-600">
                {userRole === 'mentor' ? '承認済み' : '決済待ち'}
              </span>
            </div>
            <span className="text-lg font-semibold text-blue-600">{statusData.approved}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircleIcon className="h-4 w-4 mr-2 text-green-500" />
              <span className="text-sm text-gray-600">確定済み</span>
            </div>
            <span className="text-lg font-semibold text-green-600">{statusData.confirmed}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}; 