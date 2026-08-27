//
// MUEDrive standalone free-download LP (/[locale]/muedrive). Mirrors app/[locale]/muedlim/page.tsx:
// generateMetadata (robots tied to MUEDRIVE_LIVE), SoftwareApplication JSON-LD, + a self-contained
// client landing component. Third module in the MUEDsp free family. Copy = muedrive.* namespace.
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales, type Locale } from "@/lib/i18n/config";
import { generateHreflangAlternates } from "@/components/seo/hreflang-links";
import { MUEDRIVE_LIVE } from "@/lib/muedrive/config";
import { MuedriveLandingContent } from "@/components/features/muedrive-landing";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "muedrive.meta" });

  return {
    title: t("title"),
    description: t("description"),
    // Indexed only while MUEDRIVE_LIVE (currently true — reopened at #658).
    robots: {
      index: MUEDRIVE_LIVE,
      follow: MUEDRIVE_LIVE,
    },
    alternates: {
      // Self-referencing canonical. Without it, /ja/muedrive and /en/muedrive are near-identical
      // pages in the sitemap with no declared preference, so Search Console reports
      // "Duplicate, Google chose different canonical than user" — the message is literal:
      // the user (this site) never chose one. hreflang alone does not say which URL is
      // canonical for a given locale.
      canonical: `https://mued.jp/${locale}/muedrive`,
      languages: generateHreflangAlternates("/muedrive"),
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      type: "website",
      url: `https://mued.jp/${locale}/muedrive`,
    },
  };
}

export default async function MuedrivePage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const tMeta = await getTranslations({ locale, namespace: "muedrive.meta" });

  // SoftwareApplication (free plugin) — LLMO/GEO. Emitted only when LIVE. Numbers sealed per the
  // fact-lock (no version, no rating).
  const softwareStructuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "MUEDsp limiter",
    alternateName: "MUEDrive",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "macOS",
    description: tMeta("description"),
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    publisher: {
      "@type": "Organization",
      name: "glasswerks inc.",
      url: "https://www.glasswerks.jp",
    },
  };

  return (
    <>
      {MUEDRIVE_LIVE && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareStructuredData) }}
        />
      )}
      <MuedriveLandingContent />
    </>
  );
}
