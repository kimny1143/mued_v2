import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/server/auth';
import { prisma } from '@/lib/prisma';
import BookingCalendarClient from './BookingCalendarClient';

export default async function BookingCalendarPage() {
  // サーバーサイドで認証チェック
  const session = await getServerSession();
  
  if (!session) {
    redirect('/login');
  }

  // ユーザー情報を取得
  const user = await prisma.users.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role_id: true,
    }
  });

  if (!user) {
    redirect('/login');
  }

  const userRole = user.role_id || 'student';
  const userName = user.name || user.email || 'ユーザー';

  return (
    <BookingCalendarClient userRole={userRole} userName={userName} />
  );
}