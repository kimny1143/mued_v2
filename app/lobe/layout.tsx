import { cookies, headers } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { locales, type Locale, getPreferredLocale } from '@/lib/i18n/config';

export default async function LobeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE')?.value;
  let locale: Locale;
  if (localeCookie && locales.includes(localeCookie as Locale)) {
    locale = localeCookie as Locale;
  } else {
    const headerStore = await headers();
    locale = getPreferredLocale(headerStore.get('accept-language'));
  }

  const messages = (await import(`../../messages/${locale}.json`)).default;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
