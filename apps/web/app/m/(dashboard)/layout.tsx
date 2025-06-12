import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/server/auth';
import MobileDashboardClient from './dashboard/MobileDashboardClient';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  // サーバーサイドで認証チェックのみ行う
  // ユーザー情報の取得は各ページで行う（Prismaクエリの衝突を避けるため）
  const session = await getServerSession();
  
  if (!session) {
    redirect('/m/login');
  }

  return (
    <MobileDashboardClient>
      {children}
    </MobileDashboardClient>
  );
}