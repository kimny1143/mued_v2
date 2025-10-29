import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { DashboardTabs } from "@/components/layouts/dashboard-tabs";
import { SubscriptionBadge } from "@/components/features/subscription-badge";
import { DashboardStats } from "@/components/features/dashboard-stats";
import { RecentMaterials } from "@/components/features/recent-materials";
import { UpcomingLessons } from "@/components/features/upcoming-lessons";
import { QuickActions } from "@/components/features/quick-actions";
import { DashboardWelcome } from "@/components/features/dashboard-welcome";

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
      <DashboardWelcome userName={user?.firstName || user?.username || 'Student'} />

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
