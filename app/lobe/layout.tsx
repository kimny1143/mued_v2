import { cookies, headers } from 'next/headers';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { locales, type Locale, getPreferredLocale } from '@/lib/i18n/config';
import { getUserUsageLimits } from '@/lib/middleware/usage-limiter';
import Link from 'next/link';

export default async function LobeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth check
  const { userId } = await auth();
  if (!userId) redirect('/sign-in?redirect_url=/lobe');

  // Subscription check
  const limits = await getUserUsageLimits(userId);
  const isPremium = limits.tier === 'premium';

  // i18n
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
      <div className="relative">
        {children}
        {!isPremium && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="max-w-md mx-4 bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-violet-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                {locale === 'ja' ? 'MUEDlobe — Premiumプラン限定' : 'MUEDlobe — Premium Plan Only'}
              </h2>
              <p className="text-white/60 mb-6 text-sm leading-relaxed">
                {locale === 'ja'
                  ? '認知プロファイルを作成し、Hooの会話をあなた専用にパーソナライズ。Premiumプランで利用できます。'
                  : 'Build your cognitive profile and personalize Hoo conversations. Available on the Premium plan.'}
              </p>
              <div className="space-y-3">
                <Link
                  href="/dashboard/subscription"
                  className="block w-full bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl font-semibold transition-colors"
                >
                  {locale === 'ja' ? 'プランを見る' : 'View Plans'}
                </Link>
                <Link
                  href="/dashboard/muednote"
                  className="block w-full text-white/50 hover:text-white py-2 text-sm transition-colors"
                >
                  {locale === 'ja' ? 'ダッシュボードに戻る' : 'Back to Dashboard'}
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </NextIntlClientProvider>
  );
}
