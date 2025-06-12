"use client";

import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { 
  CalendarIcon, 
  ClockIcon, 
  AlertCircleIcon,
  UsersIcon,
  TrendingUpIcon,
  DollarSignIcon,
  CheckCircleIcon
} from "lucide-react";
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
      {/* 統計カード */}
      <section className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* 承認待ち */}
          <Link href="/dashboard/slots-calendar">
            <Card className="p-6 bg-white hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">承認待ち</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pendingApproval}</p>
                </div>
                <AlertCircleIcon className="h-8 w-8 text-yellow-500" />
              </div>
            </Card>
          </Link>

          {/* 本日のレッスン */}
          <Card className="p-6 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">本日のレッスン</p>
                <p className="text-2xl font-bold text-blue-600">{stats.todayLessons}</p>
              </div>
              <CalendarIcon className="h-8 w-8 text-blue-500" />
            </div>
          </Card>

          {/* 今週のレッスン */}
          <Card className="p-6 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">今週のレッスン</p>
                <p className="text-2xl font-bold text-green-600">{stats.thisWeekLessons}</p>
              </div>
              <TrendingUpIcon className="h-8 w-8 text-green-500" />
            </div>
          </Card>

          {/* 今月の収益 */}
          <Card className="p-6 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">今月の収益</p>
                <p className="text-2xl font-bold text-purple-600">
                  ¥{stats.thisMonthEarnings.toLocaleString()}
                </p>
              </div>
              <DollarSignIcon className="h-8 w-8 text-purple-500" />
            </div>
          </Card>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 今後の予定 */}
        <section>
          <Card className="p-6 bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center">
                <ClockIcon className="h-5 w-5 mr-2 text-blue-500" />
                今後の予定
              </h3>
              <Link href="/dashboard/my-lessons">
                <Button variant="ghost" size="sm">すべて見る</Button>
              </Link>
            </div>
            
            <div className="space-y-3">
              {upcomingLessons && upcomingLessons.length > 0 ? (
                upcomingLessons.map((lesson) => (
                  <div key={lesson.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <UsersIcon className="h-4 w-4 mr-2 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium">
                          {lesson.studentName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(lesson.startTime), 'M月d日(E) HH:mm', { locale: ja })} - 
                          {format(new Date(lesson.endTime), 'HH:mm')}
                        </p>
                      </div>
                    </div>
                    <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  確定済みの予定はありません
                </p>
              )}
            </div>
          </Card>
        </section>

        {/* 最近のアクティビティ */}
        <section>
          <Card className="p-6 bg-white">
            <h3 className="font-semibold mb-4">最近のアクティビティ</h3>
            
            <div className="space-y-3">
              {recentActivities && recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm">{activity.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {format(new Date(activity.timestamp), 'M月d日 HH:mm', { locale: ja })}
                      </p>
                    </div>
                    {activity.type === 'approval_pending' && (
                      <Link href="/dashboard/slots-calendar">
                        <Button size="sm" variant="outline">確認</Button>
                      </Link>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  アクティビティはありません
                </p>
              )}
            </div>
          </Card>
        </section>
      </div>

      {/* クイックアクション */}
      <section className="mt-8">
        <Card className="p-6 bg-white">
          <h3 className="font-semibold mb-4">クイックアクション</h3>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/slots-calendar">
              <Button variant="outline">
                <CalendarIcon className="h-4 w-4 mr-2" />
                スロット管理
              </Button>
            </Link>
            <Link href="/dashboard/reservations">
              <Button variant="outline">
                <ClockIcon className="h-4 w-4 mr-2" />
                予約一覧
              </Button>
            </Link>
            <Link href="/dashboard/messages">
              <Button variant="outline">
                <UsersIcon className="h-4 w-4 mr-2" />
                メッセージ
              </Button>
            </Link>
          </div>
        </Card>
      </section>
    </>
  );
}