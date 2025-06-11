import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/server/auth';
import { createServiceClient } from '@/lib/supabase/service';

import DashboardLayout from './DashboardLayout';

// ダッシュボード全体を動的レンダリングに設定（認証チェックでcookiesを使用するため）
export const dynamic = 'force-dynamic';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  // サーバーサイドで認証チェック
  const session = await getServerSession();
  
  if (!session) {
    redirect('/login');
  }

  let user = null;
  
  try {
    // まずPrismaで試す
    user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role_id: true,
        roles: {
          select: {
            name: true
          }
        }
      }
    });
  } catch (error) {
    console.error('Prisma error in dashboard layout:', error);
    
    // Prismaエラーの場合、Supabaseクライアントをフォールバックとして使用
    try {
      const supabase = createServiceClient();
      const { data, error: supabaseError } = await supabase
        .from('users')
        .select(`
          id,
          name,
          email,
          role_id,
          roles (
            name
          )
        `)
        .eq('id', session.user.id)
        .single();
      
      if (supabaseError) {
        console.error('Supabase error:', supabaseError);
      } else {
        user = data;
      }
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError);
    }
  }

  if (!user) {
    redirect('/login');
  }

  // roleNameを安全に取得
  const roleName = user.roles?.name || 'student';

  return (
    <DashboardLayout user={user} roleName={roleName}>
      {children}
    </DashboardLayout>
  );
}