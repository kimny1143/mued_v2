import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { locales, type Locale } from "@/lib/i18n/config";
import { SHARE_IMAGES } from "@/lib/seo/share-image";
import { generateHreflangAlternates } from "@/components/seo/hreflang-links";
import { notFound } from "next/navigation";
import { MUEDVOX_LIVE, MUEDVOX_PURCHASE_LIVE, muedvoxPageVisible } from "@/lib/muedvox/config";
import { MuedvoxLandingContent } from "@/components/features/muedvox-landing";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "muedvox.meta" });
  return {
    title: t("title"),
    description: t("description"),
    robots: { index: MUEDVOX_LIVE, follow: MUEDVOX_LIVE },
    alternates: {
      canonical: `https://mued.jp/${locale}/muedvox`,
      languages: generateHreflangAlternates("/muedvox"),
    },
    openGraph: {
      images: SHARE_IMAGES,
      title: t("title"),
      description: t("description"),
      type: "website",
      url: `https://mued.jp/${locale}/muedvox`,
    },
    twitter: {
      images: SHARE_IMAGES,
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
  };
}

export default async function MuedvoxPage({ params }: PageProps) {
  const { locale } = await params;
  // ★Not released → 404 in production (preview / dev still render). See muedvoxPageVisible.
  if (!muedvoxPageVisible(MUEDVOX_LIVE, process.env.VERCEL_ENV)) notFound();
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "muedvox.meta" });
  const softwareStructuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "MUEDvox",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "macOS, Windows",
    description: t("description"),
    ...(MUEDVOX_PURCHASE_LIVE ? {
      offers: { "@type": "Offer", price: "69", priceCurrency: "USD" },
    } : {}),
    publisher: {
      "@type": "Organization",
      name: "glasswerks inc.",
      url: "https://www.glasswerks.jp",
    },
  };
  return (
    <>
      {MUEDVOX_LIVE && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareStructuredData).replace(/</g, "\\u003c") }}
        />
      )}
      <MuedvoxLandingContent />
    </>
  );
}
