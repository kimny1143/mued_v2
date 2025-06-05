import { redirect } from 'next/navigation';


import { Card } from "@/app/components/ui/card";
import { getServerSession } from '@/lib/server/auth';
import { getDashboardData } from '@/lib/server/dashboard-data';

import DashboardClient from './DashboardClient';

// Next.js 14のキャッシュ設定
export const dynamic = 'force-dynamic'; // 動的レンダリングを強制
export const revalidate = 0; // キャッシュを無効化（リアルタイムデータのため）

export default async function DashboardPage() {
  // 認証チェック
  const session = await getServerSession();
  
  if (!session) {
    redirect('/login');
  }

  // ダッシュボードデータを取得
  const dashboardData = await getDashboardData(session.user.id);

  if (!dashboardData) {
    // エラー時のフォールバック
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="p-6">
          <p className="text-sm text-red-500">データの取得に失敗しました。再度お試しください。</p>
        </Card>
      </div>
    );
  }

  // クライアントコンポーネントに初期データを渡す
  return <DashboardClient initialData={dashboardData} />;
}