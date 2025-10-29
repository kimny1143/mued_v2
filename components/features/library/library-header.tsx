'use client';

import { useLocale } from '@/lib/i18n/locale-context';

export function LibraryHeader() {
  const { t } = useLocale();

  return (
    <section className="mb-8">
      <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">
        {t.library.title}
      </h1>
      <p className="text-[var(--color-text-secondary)]">
        {t.library.subtitle}
      </p>
    </section>
  );
}
