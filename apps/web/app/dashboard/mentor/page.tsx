import { redirect } from 'next/navigation';
import { Card } from "@/app/components/ui/card";
import { getServerSession } from '@/lib/server/auth';
import { getMentorDashboardData } from '@/lib/server/mentor-dashboard-data';
import MentorDashboardClient from './MentorDashboardClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MentorDashboardPage() {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/login');
  }

  // メンターでない場合は通常のダッシュボードへリダイレクト
  if (session.role !== 'mentor') {
    redirect('/dashboard');
  }

  const dashboardData = await getMentorDashboardData(session.user.id);

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="p-6">
          <p className="text-sm text-red-500">データの取得に失敗しました。再度お試しください。</p>
        </Card>
      </div>
    );
  }

  return <MentorDashboardClient initialData={dashboardData} />;
}