import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { MuednoteLandingContent } from "@/components/features/muednote-landing";
import { locales, type Locale } from "@/lib/i18n/config";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "landing.hero" });

  const title = `MUEDnote - ${t("headline")}`;
  const description = t("description").replace(/\n/g, " ");

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
  };
}

export default async function MuednoteLandingPage({ params }: PageProps) {
  const { locale } = await params;

  // Enable static rendering
  setRequestLocale(locale as Locale);

  return <MuednoteLandingContent />;
}
