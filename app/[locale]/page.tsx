import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { IntegratedLandingContentV2 } from "@/components/features/landing/integrated-landing-content-v2";
import { locales, type Locale } from "@/lib/i18n/config";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "landing.v2.meta" });

  const title = t("title");
  const description = t("description");

  return {
    title,
    description,
    alternates: {
      canonical: `https://mued.jp/${locale}`,
    },
    openGraph: {
      title,
      description,
    },
    // Override the root layout's lore twitter card so the home's social preview is product-first too
    // (§4). Layout defaults stay for the other pages.
    twitter: {
      title,
      description,
    },
  };
}

export default async function LocaleLandingPage({ params }: PageProps) {
  const { locale } = await params;

  // Enable static rendering
  setRequestLocale(locale as Locale);

  const user = await currentUser();

  // Redirect to dashboard if already logged in
  if (user) {
    redirect("/dashboard");
  }

  // wave1 redesign cutover (kimny GO 2026-07-10): the home now renders the reworked portal
  // (products-first · MIX→MASTER→TRAIN · hero C1). The old IntegratedLandingContent is retired from
  // the home (dead code, follow-up cleanup). Home stays indexable (no robots override); the /muedial
  // and /philosophy stubs remain noindex until their wave2 pages ship. go-live gated by kimny.
  return <IntegratedLandingContentV2 />;
}
