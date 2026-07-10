//
// Portal redesign PREVIEW route (wave1 mock, STAGED). Renders the reworked portal
// (IntegratedLandingContentV2) for the kimny 現物 gate WITHOUT the logged-in → /dashboard redirect
// that the real home performs — so a signed-in reviewer can see it. Always noindex (it is a preview,
// never a public surface): the live home (app/[locale]/page.tsx) is untouched until the redesign is
// approved and a separate cutover PR swaps the home to the V2 component.
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { locales, type Locale } from "@/lib/i18n/config";
import { IntegratedLandingContentV2 } from "@/components/features/landing/integrated-landing-content-v2";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: "MUED — redesign preview",
  robots: { index: false, follow: false },
};

export default async function RedesignPreviewPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return <IntegratedLandingContentV2 />;
}
