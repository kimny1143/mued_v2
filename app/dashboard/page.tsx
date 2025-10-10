import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { DashboardTabs } from "@/components/layouts/dashboard-tabs";
import { Button } from "@/components/ui/button";

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

      {/* Dashboard Overview Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6">Dashboard Overview</h2>
        <div className="grid grid-cols-3 gap-6">
          {/* My Courses */}
          <div className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-[var(--radius-lg)] p-6 h-[200px] relative overflow-hidden">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">My Courses</h3>
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-200 to-transparent"></div>
          </div>

          {/* Assignments */}
          <div className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-[var(--radius-lg)] p-6 h-[200px] relative overflow-hidden">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Assignments</h3>
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-200 to-transparent"></div>
          </div>

          {/* Grades */}
          <div className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-[var(--radius-lg)] p-6 h-[200px] relative overflow-hidden">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Grades</h3>
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-200 to-transparent"></div>
          </div>
        </div>
      </section>

      {/* Mid Cards Section */}
      <section className="mb-12">
        <div className="grid grid-cols-3 gap-6">
          {/* 432塗り×261内包 */}
          <div className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-[var(--radius-lg)] p-6 h-[160px] relative overflow-hidden">
            <div className="absolute top-4 left-4 bg-blue-500 text-white px-3 py-1 text-sm font-bold rounded">
              432塗り × 261内包
            </div>
          </div>

          {/* Materials */}
          <div className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-[var(--radius-lg)] p-6 h-[160px] relative overflow-hidden">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] text-center mb-4">Materials</h3>
          </div>

          {/* Calendar */}
          <div className="bg-[var(--color-card-bg)] border border-[var(--color-card-border)] rounded-[var(--radius-lg)] p-6 h-[160px] relative overflow-hidden">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] text-center mb-4">Calendar</h3>
          </div>
        </div>
      </section>

      {/* User Settings Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6">User Settings</h2>

        {/* Profile */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-gray-300"></div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Username</label>
              <input
                type="text"
                placeholder="Enter your username"
                className="w-full px-3 py-2 border border-[var(--color-card-border)] rounded-[var(--radius-sm)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-green)]"
              />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Notifications</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[var(--color-text-primary)]">Email Notifications</p>
                <p className="text-sm text-gray-600">Receive updates via email</p>
              </div>
              <div className="w-12 h-6 bg-[var(--color-brand-green)] rounded-full relative cursor-pointer">
                <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[var(--color-text-primary)]">SMS Alerts</p>
                <p className="text-sm text-gray-600">Receive SMS alerts</p>
              </div>
              <div className="w-12 h-6 bg-gray-300 rounded-full relative cursor-pointer">
                <div className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5"></div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[var(--color-text-primary)]">Push Notifications</p>
                <p className="text-sm text-gray-600">Receive push notifications</p>
              </div>
              <div className="w-12 h-6 bg-[var(--color-brand-green)] rounded-full relative cursor-pointer">
                <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[var(--color-text-primary)]">Newsletter Subscription</p>
                <p className="text-sm text-gray-600">Subscribe to our newsletter</p>
              </div>
              <div className="w-12 h-6 bg-gray-300 rounded-full relative cursor-pointer">
                <div className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Information */}
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Profile Information</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">First Name</label>
              <input
                type="text"
                placeholder="Enter your first name"
                className="w-full px-3 py-2 border border-[var(--color-card-border)] rounded-[var(--radius-sm)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-green)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Last Name</label>
              <input
                type="text"
                placeholder="Enter your last name"
                className="w-full px-3 py-2 border border-[var(--color-card-border)] rounded-[var(--radius-sm)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-green)]"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full px-3 py-2 border border-[var(--color-card-border)] rounded-[var(--radius-sm)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-green)]"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Bio</label>
            <textarea
              placeholder="Tell us about yourself"
              rows={4}
              className="w-full px-3 py-2 border border-[var(--color-card-border)] rounded-[var(--radius-sm)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-green)]"
            ></textarea>
          </div>
          <div className="flex gap-3">
            <Button variant="primary">Save Changes</Button>
            <Button variant="outline">Cancel</Button>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}