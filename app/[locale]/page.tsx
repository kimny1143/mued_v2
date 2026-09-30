import { SHARE_IMAGES } from "@/lib/seo/share-image";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { StudioShowroom } from "@/components/features/landing/studio-showroom";
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
      images: SHARE_IMAGES,
      title,
      description,
    },
    // ★A page's twitter REPLACES the layout's (no merge), so card and images are set here too (CCO #1188).
    twitter: {
      card: "summary_large_image",
      images: SHARE_IMAGES,
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

  // Full-site design proposal: preserve home metadata and the signed-in dashboard redirect.
  return <StudioShowroom locale={locale} preview={false} />;
}
