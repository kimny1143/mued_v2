import { setRequestLocale } from "next-intl/server";
import { MuedearLandingContent } from "@/components/features/muedear-landing";
import { locales, type Locale } from "@/lib/i18n/config";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function MuedearLandingPage({ params }: PageProps) {
  const { locale } = await params;

  // Enable static rendering
  setRequestLocale(locale as Locale);

  return <MuedearLandingContent />;
}
