"use client";

import React from "react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { CalendarIcon, ClockIcon, CheckCircleIcon, AlertCircleIcon } from "lucide-react";
import { format } from "date-fns";
import Link from 'next/link';
import type { DashboardData } from '@/lib/server/dashboard-data';

interface DashboardClientProps {
  initialData: DashboardData;
}

export default function DashboardClient({ initialData }: DashboardClientProps) {
  const { user, todaySchedule, reservationStats } = initialData;
  const userRole = user.role_id || 'student';

  return (
    <>
      {/* ロール別の予約状況セクション */}
      <section className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* 今日の予定カード */}
          <Link href="/dashboard/my-lessons" passHref>
            <Card className="p-6 bg-white hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center mb-4">
                <CalendarIcon className="h-5 w-5 mr-2 text-blue-500" />
                <h3 className="font-semibold">今日の予定</h3>
              </div>
              
              <div className="space-y-3">
                {todaySchedule && todaySchedule.length > 0 ? (
                  todaySchedule.map((reservation) => (
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

          {/* 予約状況カード */}
          <Link href={userRole === 'mentor' ? '/dashboard/slots-calendar' : '/dashboard/booking-calendar'} passHref>
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
                  <span className="text-lg font-semibold text-yellow-600">{reservationStats.pendingApproval}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <ClockIcon className="h-4 w-4 mr-2 text-blue-500" />
                    <span className="text-sm text-gray-600">
                      {userRole === 'mentor' ? '承認済み' : '決済待ち'}
                    </span>
                  </div>
                  <span className="text-lg font-semibold text-blue-600">{reservationStats.approved}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-4 w-4 mr-2 text-green-500" />
                    <span className="text-sm text-gray-600">確定済み</span>
                  </div>
                  <span className="text-lg font-semibold text-green-600">{reservationStats.confirmed}</span>
                </div>
              </div>
            </Card>
          </Link>
        </div>
      </section>

      {/* Recent Activity */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <Card className="bg-white divide-y">
          {[1, 2, 3].map((item) => (
            <div key={item} className="p-4 flex items-center justify-between">
              <div>
                <h4 className="font-medium">Completed Lesson {item}</h4>
                <p className="text-sm text-gray-500">2 days ago</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
              >
                View Details
              </Button>
            </div>
          ))}
        </Card>
      </section>
    </>
  );
}