import { redirect } from 'next/navigation';


import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/server/auth';

import SlotsCalendarClient from './SlotsCalendarClient';

// このページは動的である必要があります（認証チェックのため）
export const dynamic = 'force-dynamic';

export default async function SlotsCalendarPage() {
  // サーバーサイドで認証チェック
  const session = await getServerSession();
  
  if (!session) {
    redirect('/login');
  }

  // ユーザー情報とロール情報を取得
  const user = await prisma.users.findUnique({
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

  if (!user) {
    redirect('/login');
  }

  const userRole = user.roles?.name?.toLowerCase() || 'student';
  const userName = user.name || user.email || 'ユーザー';

  return (
    <SlotsCalendarClient userRole={userRole} />
  );
}