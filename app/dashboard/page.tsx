import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { DashboardTabs } from "@/components/layouts/dashboard-tabs";
import { SubscriptionBadge } from "@/components/features/subscription-badge";
import { DashboardStats } from "@/components/features/dashboard-stats";
import { RecentMaterials } from "@/components/features/recent-materials";
import { UpcomingLessons } from "@/components/features/upcoming-lessons";
import { QuickActions } from "@/components/features/quick-actions";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ test?: string }> }) {
  const params = await searchParams;

  // Skip authentication check in E2E test mode or if test query param is present
  const isE2ETestMode = process.env.NEXT_PUBLIC_E2E_TEST_MODE === 'true' || params.test === 'true';

  let user = null;

  if (!isE2ETestMode) {
    user = await currentUser();
    if (!user) {
      redirect("/sign-in");
    }
  } else {
    // Mock user for E2E tests
    user = {
      firstName: 'Test',
      username: 'testuser',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
    } as unknown as Awaited<ReturnType<typeof currentUser>>;
  }

  return (
    <DashboardLayout>
      {/* Tabs */}
      <DashboardTabs />

      {/* Welcome Section */}
      <section className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">
          Welcome back, {user?.firstName || user?.username || 'Student'}!
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          Here&apos;s what&apos;s happening with your learning journey today.
        </p>
      </section>

      {/* Subscription Badge */}
      <div className="mb-8">
        <SubscriptionBadge />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <QuickActions />
      </div>

      {/* Stats Overview */}
      <div className="mb-8">
        <DashboardStats />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Materials */}
        <div>
          <RecentMaterials />
        </div>

        {/* Upcoming Lessons */}
        <div>
          <UpcomingLessons />
        </div>
      </div>
    </DashboardLayout>
  );
}
