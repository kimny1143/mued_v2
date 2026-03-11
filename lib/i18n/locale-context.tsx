'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { type Locale } from './config';
import enMessages from '../../messages/en.json';
import jaMessages from '../../messages/ja.json';

/**
 * Translation data sourced from messages/{en,ja}.json (single source of truth).
 * This replaces the old translations.ts import.
 */
const messages = { en: enMessages, ja: jaMessages } as const;

type Messages = typeof enMessages;

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Messages;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>('en');

  // Load locale from localStorage or cookie on mount
  useEffect(() => {
    const savedLocale = localStorage.getItem('locale') as Locale | null;
    if (savedLocale && (savedLocale === 'en' || savedLocale === 'ja')) {
      setLocaleState(savedLocale);
      return;
    }
    // Fallback: read NEXT_LOCALE cookie (set by middleware for subdomain routing)
    const cookieLocale = document.cookie
      .split('; ')
      .find((c) => c.startsWith('NEXT_LOCALE='))
      ?.split('=')[1] as Locale | undefined;
    if (cookieLocale && (cookieLocale === 'en' || cookieLocale === 'ja')) {
      setLocaleState(cookieLocale);
      localStorage.setItem('locale', cookieLocale);
    }
  }, []);

  // Save locale to localStorage + cookie when it changes
  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('locale', newLocale);
    // Set cookie so server components (dashboard layout) can read it
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000;SameSite=Lax`;
    router.refresh();
  }, [router]);

  const t = messages[locale];

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}

/**
 * @deprecated Use `Locale` from '@/lib/i18n/config' instead
 */
export type { Locale };
