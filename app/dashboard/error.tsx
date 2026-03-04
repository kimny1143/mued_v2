'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { PageError } from '@/components/ui/error-boundary';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return <PageError error={error} onRetry={reset} />;
}
