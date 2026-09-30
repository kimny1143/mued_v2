//
// MUEDsat free-download LP (staged). Mirrors app/[locale]/advisory/page.tsx:
// generateMetadata (robots tied to MUEDSAT_LIVE => noindex while staged) + JSON-LD + a
// self-contained client landing component. All copy lives in the muedsat.* i18n namespace.
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales, type Locale } from "@/lib/i18n/config";
import { generateHreflangAlternates } from "@/components/seo/hreflang-links";
import { MUEDSAT_LIVE } from "@/lib/muedsat/config";
import { MuedsatLandingContent } from "@/components/features/muedsat-landing";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "muedsat.meta" });

  return {
    title: t("title"),
    description: t("description"),
    // STAGED: not indexed until the kimny-gated unlock flips MUEDSAT_LIVE.
    robots: {
      index: MUEDSAT_LIVE,
      follow: MUEDSAT_LIVE,
    },
    alternates: {
      // Self-referencing canonical. Without it, /ja/muedsat and /en/muedsat are near-identical
      // pages in the sitemap with no declared preference, so Search Console reports
      // "Duplicate, Google chose different canonical than user" — the message is literal:
      // the user (this site) never chose one. hreflang alone does not say which URL is
      // canonical for a given locale.
      canonical: `https://mued.jp/${locale}/muedsat`,
      languages: generateHreflangAlternates("/muedsat"),
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      type: "website",
      url: `https://mued.jp/${locale}/muedsat`,
    },
    // ★Same title/description as og — without it twitter:* fell back to the site default (conductor 2026-10-01).
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
  };
}

export default async function MuedsatPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const tMeta = await getTranslations({ locale, namespace: "muedsat.meta" });

  // SoftwareApplication (free plugin) — LLMO/GEO. Emitted only when LIVE: while staged the page
  // is noindex and undiscoverable, so no structured data leaks either. Numbers are sealed
  // (no version, no rating) per the fact-lock.
  const softwareStructuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "MUEDsp saturation",
    alternateName: "MUEDsat",
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
      {MUEDSAT_LIVE && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareStructuredData) }}
        />
      )}
      <MuedsatLandingContent />
    </>
  );
}
