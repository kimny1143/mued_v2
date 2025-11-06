/**
 * Plugin Management Page
 * プラグイン管理ページ
 *
 * Admin interface for managing content source plugins
 */

import { Suspense } from 'react';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { DashboardTabs } from '@/components/layouts/dashboard-tabs';
import { PluginManagement } from '@/components/features/admin/plugin-management';
import { LoadingState } from '@/components/ui/loading-state';

export const metadata = {
  title: 'Plugin Management - MUED Admin',
  description: 'Manage content source plugins and monitor their health',
};

export default async function PluginsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <DashboardLayout>
      <DashboardTabs />

      <Suspense fallback={<LoadingState message="Loading plugin management..." />}>
        <PluginManagement />
      </Suspense>
    </DashboardLayout>
  );
}
