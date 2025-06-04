"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/hooks/use-user";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { TodayScheduleCard } from "@/app/components/dashboard/TodayScheduleCard";
import { ReservationStatusCard } from "@/app/components/dashboard/ReservationStatusCard";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: userLoading, isAuthenticated } = useUser();
  const [redirecting, setRedirecting] = useState(false);

  // 認証状態を確認（ページ保護用）
  useEffect(() => {
    if (!userLoading && !isAuthenticated && !redirecting) {
      setRedirecting(true);
      router.push('/login');
    }
  }, [userLoading, isAuthenticated, router, redirecting]);

  // スケルトンUIを表示（初期読み込み時）
  if (userLoading || !user) {
    return (
      <>
        {/* スケルトンUI - 実際のコンテンツと同じレイアウト */}
        <section className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* TodayScheduleCard スケルトン */}
            <Card className="p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </Card>
            
            {/* ReservationStatusCard スケルトン */}
            <Card className="p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </Card>
          </div>
        </section>

        {/* Recent Activity スケルトン */}
        <section>
          <div className="h-6 bg-gray-200 rounded w-40 mb-4 animate-pulse"></div>
          <Card className="bg-white divide-y">
            {[1, 2, 3].map((item) => (
              <div key={item} className="p-4 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                  </div>
                  <div className="h-8 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
            ))}
          </Card>
        </section>
      </>
    );
  }

  // ユーザーロールはuseUserフックから直接取得
  const userRole = user.role_id || 'student';

  return (
    <>
      {/* ロール別の予約状況セクション */}
      <section className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <TodayScheduleCard userRole={userRole} userId={user.id} />
          <ReservationStatusCard userRole={userRole} userId={user.id} />
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