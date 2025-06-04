"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { useUser } from "@/lib/hooks/use-user";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Loader2 } from "lucide-react";
import { runFullDiagnostic } from "@/lib/debug-helpers";
import { TodayScheduleCard } from "@/app/components/dashboard/TodayScheduleCard";
import { ReservationStatusCard } from "@/app/components/dashboard/ReservationStatusCard";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const router = useRouter();
  const { user, loading: userLoading, error, isAuthenticated } = useUser();

  // 認証状態を確認（ページ保護用）
  useEffect(() => {
    // 初期セッションチェック
    const getSession = async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      if (!data.session) {
        // ログインしていない場合はログインページへリダイレクト
        router.push('/login');
      }
      setLoading(false);
    };

    getSession();
  }, [router]);

  // ユーザーロールを取得
  useEffect(() => {
    const fetchUserRole = async () => {
      if (user?.id) {
        try {
          const response = await fetch(`/api/user?userId=${user.id}`);
          if (response.ok) {
            const userData = await response.json();
            setUserRole(userData.roleName || 'student');
            console.log('取得したユーザーロール:', userData.roleName);
          }
        } catch (error) {
          console.error('ロール取得エラー:', error);
          setUserRole('student'); // デフォルト
        }
      }
    };

    fetchUserRole();
  }, [user]);

  // 開発環境でのみデバッグ診断を実行
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG === 'true') {
      console.log('🔍 ダッシュボードロード時の診断を実行');
      runFullDiagnostic().then(result => {
        console.log('診断結果:', result);
      });
    }
  }, []);

  // 認証チェックとユーザー情報の両方が完了するまで待機
  if (loading || userLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-600">ダッシュボードを読み込み中...</p>
        </div>
      </div>
    );
  }

  // 認証状態を確認
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-sm text-gray-600">認証を確認中...</p>
      </div>
    );
  }

  // ユーザー情報が取得できていない場合の処理
  if (!user || !user.id) {
    console.warn('ユーザー情報が未取得:', { user, isAuthenticated });
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-600">ユーザー情報を取得中...</p>
        </div>
      </div>
    );
  }

  // ロールが未取得の場合も待機
  if (!userRole && userLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-600">ユーザー情報を取得中...</p>
        </div>
      </div>
    );
  }

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