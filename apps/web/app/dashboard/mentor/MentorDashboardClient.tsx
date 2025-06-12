"use client";

import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarIcon, ClockIcon, CheckCircleIcon, AlertCircleIcon } from "lucide-react";
import Link from 'next/link';
import React from "react";

import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import type { MentorDashboardData } from '@/lib/server/mentor-dashboard-data';

interface MentorDashboardClientProps {
  initialData: MentorDashboardData;
}

export default function MentorDashboardClient({ initialData }: MentorDashboardClientProps) {
  const { user, upcomingLessons, stats, recentActivities } = initialData;

  return (
    <>
      {/* ロール別の予約状況セクション */}
      <section className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* 今後の予定カード */}
          <Link href="/dashboard/my-lessons" passHref>
            <Card className="p-6 bg-white hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center mb-4">
                <CalendarIcon className="h-5 w-5 mr-2 text-blue-500" />
                <h3 className="font-semibold">今後の予定</h3>
              </div>
              
              <div className="space-y-3">
                {upcomingLessons && upcomingLessons.length > 0 ? (
                  upcomingLessons.map((lesson) => (
                    <div key={lesson.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <ClockIcon className="h-4 w-4 mr-2 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium">
                            {format(new Date(lesson.startTime), 'yyyy/MM/dd HH:mm')} - 
                            {format(new Date(lesson.endTime), 'HH:mm')}
                          </p>
                          <p className="text-xs text-gray-500">
                            {lesson.studentName}さん
                          </p>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">
                        確定
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
          <Link href="/dashboard/slots-calendar" passHref>
            <Card className="p-6 bg-white hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center mb-4">
                <CheckCircleIcon className="h-5 w-5 mr-2 text-green-500" />
                <h3 className="font-semibold">予約状況</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <AlertCircleIcon className="h-4 w-4 mr-2 text-yellow-500" />
                    <span className="text-sm text-gray-600">承認待ち</span>
                  </div>
                  <span className="text-lg font-semibold text-yellow-600">{stats.pendingApproval}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <ClockIcon className="h-4 w-4 mr-2 text-blue-500" />
                    <span className="text-sm text-gray-600">本日のレッスン</span>
                  </div>
                  <span className="text-lg font-semibold text-blue-600">{stats.todayLessons}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-4 w-4 mr-2 text-green-500" />
                    <span className="text-sm text-gray-600">今週のレッスン</span>
                  </div>
                  <span className="text-lg font-semibold text-green-600">{stats.thisWeekLessons}</span>
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
          {recentActivities && recentActivities.length > 0 ? (
            recentActivities.slice(0, 3).map((activity) => (
              <div key={activity.id} className="p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{activity.message}</h4>
                  <p className="text-sm text-gray-500">
                    {format(new Date(activity.timestamp), 'yyyy/MM/dd HH:mm')}
                  </p>
                </div>
                {activity.type === 'approval_pending' && (
                  <Link href="/dashboard/slots-calendar">
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                  </Link>
                )}
              </div>
            ))
          ) : (
            <div className="p-4">
              <p className="text-sm text-gray-500">アクティビティはありません</p>
            </div>
          )}
        </Card>
      </section>
    </>
  );
}