import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { TeacherDashboardContent } from '@/components/features/teacher-dashboard-content';

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

  return <TeacherDashboardContent />;
}
