/**
 * Library Page
 * ライブラリページ
 *
 * Displays unified content from note.com and other sources
 */

import { Suspense } from 'react';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';
import { DashboardTabs } from '@/components/layouts/dashboard-tabs';
import { LibraryContent } from '@/components/features/library/library-content';
import { LibraryHeader } from '@/components/features/library/library-header';
import { LoadingState } from '@/components/ui/loading-state';

export const metadata = {
  title: 'Library - MUED',
  description: 'Browse educational materials from note.com and other sources',
};

export default async function LibraryPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <DashboardLayout>
      <DashboardTabs />

      <LibraryHeader />

      <Suspense fallback={<LoadingState message="Loading library content..." />}>
        <LibraryContent />
      </Suspense>
    </DashboardLayout>
  );
}
