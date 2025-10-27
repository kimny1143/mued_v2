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

      <section className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">
          Content Library
        </h1>
        <p className="text-[var(--color-text-secondary)]">
          Browse educational materials from note.com and other curated sources
        </p>
      </section>

      <Suspense fallback={<LoadingState message="Loading library content..." />}>
        <LibraryContent />
      </Suspense>
    </DashboardLayout>
  );
}
