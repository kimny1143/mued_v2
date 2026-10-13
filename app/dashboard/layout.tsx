import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { cookies } from 'next/headers';
import { type Locale, locales, defaultLocale } from '@/lib/i18n/config';
import { clientMessages } from '@/lib/muedvox/config';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE')?.value;
  const locale: Locale = localeCookie && locales.includes(localeCookie as Locale)
    ? (localeCookie as Locale)
    : defaultLocale;

  const messages = (await import(`../../messages/${locale}.json`)).default;

  return (
    <NextIntlClientProvider locale={locale} messages={clientMessages(messages)}>
      {children}
    </NextIntlClientProvider>
  );
}
