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
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const router = useRouter();
  const { user, loading: userLoading, error, isAuthenticated } = useUser();
  
  // デバッグ用ログ（初回のみ）
  useEffect(() => {
    console.log('🎯 ダッシュボードページ初期化:', {
      isAuthenticated,
      userId: user?.id,
      userRole
    });
  }, []); // 空の依存配列で初回のみ実行

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
      if (user?.id && userRole === null) { // すでにロールが設定されている場合はスキップ
        console.log('📋 ユーザーロール取得開始:', user.id);
        setRoleLoading(true);
        try {
          const response = await fetch(`/api/user?userId=${user.id}`);
          if (response.ok) {
            const userData = await response.json();
            const role = userData.roleName || userData.role_id || 'student';
            setUserRole(role);
            console.log('✅ 取得したユーザーロール:', role);
          } else {
            console.warn('ロール取得失敗:', response.status);
            setUserRole('student'); // デフォルト
          }
        } catch (error) {
          console.error('ロール取得エラー:', error);
          setUserRole('student'); // デフォルト
        } finally {
          setRoleLoading(false);
        }
      } else if (!user?.id) {
        console.log('ユーザーIDがないためロール取得をスキップ');
        setRoleLoading(false);
      }
    };

    fetchUserRole();
  }, [user?.id, userRole]); // user.idとuserRoleを依存配列に含める

  // 開発環境でのみデバッグ診断を実行
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG === 'true') {
      console.log('🔍 ダッシュボードロード時の診断を実行');
      runFullDiagnostic().then(result => {
        console.log('診断結果:', result);
      });
    }
  }, []);

  // すべての初期化が完了するまで待機
  if (loading || userLoading || roleLoading) {
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
    console.warn('🚫 未認証状態でダッシュボードにアクセス');
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-sm text-gray-600">認証を確認中...</p>
      </div>
    );
  }

  // ユーザー情報が取得できていない場合の処理
  if (!user || !user.id) {
    console.warn('❌ ユーザー情報が未取得:', { user, isAuthenticated });
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-600">ユーザー情報を取得中...</p>
        </div>
      </div>
    );
  }
  
  // ロールが取得できていない場合はデフォルト値を使用
  const finalUserRole = userRole || 'student';

  return (
    <>
      {/* ロール別の予約状況セクション */}
      <section className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <TodayScheduleCard userRole={finalUserRole} userId={user.id} />
          <ReservationStatusCard userRole={finalUserRole} userId={user.id} />
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