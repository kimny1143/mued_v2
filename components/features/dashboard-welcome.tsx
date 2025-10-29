'use client';

import { useLocale } from '@/lib/i18n/locale-context';

interface DashboardWelcomeProps {
  userName: string;
}

export function DashboardWelcome({ userName }: DashboardWelcomeProps) {
  const { t } = useLocale();

  return (
    <section className="mb-8">
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">
        {t.dashboard.welcome} {userName}!
      </h1>
      <p className="text-[var(--color-text-secondary)]">
        {t.dashboard.subtitle}
      </p>
    </section>
  );
}
