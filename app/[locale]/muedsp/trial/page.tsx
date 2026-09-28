import type { Metadata } from "next";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MASTERCHAIN_DOWNLOAD_URL, MASTERCHAIN_TRIAL_DAYS, MASTERCHAIN_TRIAL_LIVE } from "@/lib/masterchain/config";
import { buildSignInRedirectTarget } from "@/lib/middleware/sign-in-redirect";
import { MasterchainTrialForm } from "@/components/features/muedsp-landing/masterchain-trial-form";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function MasterchainTrialPage({ params, searchParams }: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!MASTERCHAIN_TRIAL_LIVE) notFound();
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, user, query] = await Promise.all([
    getTranslations({ locale, namespace: "muedsp.trial" }), currentUser(), searchParams,
  ]);
  // Only the page's campaign parameters cross the sign-in bounce or enter the request body.
  const utm = Object.fromEntries(Object.entries(query).filter(
    (entry): entry is [string, string | string[]] => entry[0].startsWith("utm_") && entry[1] !== undefined,
  ));
  const campaign = new URLSearchParams();
  for (const [key, value] of Object.entries(utm)) {
    for (const part of Array.isArray(value) ? value : [value]) campaign.append(key, part);
  }
  // The shared first-touch shape (lib/dial/first-touch.ts); the server clips every field again.
  const first = (key: string) => campaign.get(key) ?? undefined;
  const firstTouch = {
    utmSource: first("utm_source"), utmMedium: first("utm_medium"), utmCampaign: first("utm_campaign"),
    utmContent: first("utm_content"), utmTerm: first("utm_term"), landingPath: `/${locale}/muedsp/trial`,
  };
  const redirect = buildSignInRedirectTarget(`/${locale}/muedsp/trial`, campaign.toString());
  const signInHref = `/sign-in?${new URLSearchParams({ redirect_url: redirect })}`;

  return (
    <main className="brand-product dark min-h-screen bg-[var(--bg-base)] px-6 py-16 text-white">
      <div className="mx-auto max-w-xl">
        <Link href={`/${locale}/muedsp`} className="font-mono text-sm text-[#f5a524]">MUEDsp</Link>
        <h1 className="mt-8 text-3xl font-semibold tracking-tight">{t("title", { days: MASTERCHAIN_TRIAL_DAYS })}</h1>
        <p className="mt-4 text-white/75">{t("intro", { days: MASTERCHAIN_TRIAL_DAYS })}</p>
        {!user && <p className="mt-3 text-white/75">{t("signInHint")}</p>}
        <p className="mt-3 text-sm leading-relaxed text-white/65">{t("bypass")}</p>
        <div className="mt-8 border-t border-white/10 pt-6">
          {user ? (
            <MasterchainTrialForm locale={locale} firstTouch={firstTouch} downloadUrl={MASTERCHAIN_DOWNLOAD_URL} />
          ) : (
            <Link href={signInHref} className="inline-flex rounded bg-[#f5a524] px-5 py-3 font-semibold text-black">
              {t("start", { days: MASTERCHAIN_TRIAL_DAYS })}
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
