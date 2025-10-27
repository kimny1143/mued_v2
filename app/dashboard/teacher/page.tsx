import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { RevenueStats } from '@/components/features/revenue-stats';

export default async function TeacherDashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  // Get user and verify mentor role
  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  });

  if (!user || (user.role !== 'mentor' && user.role !== 'admin')) {
    redirect('/dashboard');
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">講師ダッシュボード</h1>
        <p className="text-muted-foreground mt-2">
          レッスン状況と収益を確認できます
        </p>
      </div>

      <div className="grid gap-6">
        {/* Revenue Statistics */}
        <RevenueStats />

        {/* Additional sections can be added here */}
        <div className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">次のステップ</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• レッスンスロットを作成して予約を受け付けましょう</li>
            <li>• 教材を作成して生徒の学習をサポートしましょう</li>
            <li>• プロフィールを充実させて予約率を向上させましょう</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
