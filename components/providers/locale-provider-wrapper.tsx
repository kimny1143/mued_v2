'use client';

import { LocaleProvider } from '@/lib/i18n/locale-context';
import { ReactNode } from 'react';

export function LocaleProviderWrapper({ children }: { children: ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}
