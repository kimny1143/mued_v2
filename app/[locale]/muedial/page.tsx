//
// /muedial LP (wave2 "使い始める" LP, STAGED). Replaces the wave1 placeholder stub. Mirrors
// app/[locale]/muedsp/page.tsx: generateMetadata (robots tied to MUEDIAL_LP_LIVE => noindex while
// staged) + gated JSON-LD + a self-contained client landing component. All copy = muedialLp.* i18n.
import { SHARE_IMAGES } from "@/lib/seo/share-image";
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales, type Locale } from "@/lib/i18n/config";
import { generateHreflangAlternates } from "@/components/seo/hreflang-links";
import { MUEDIAL_LP_LIVE } from "@/lib/muedial/config";
import { MuedialLpContent } from "@/components/features/muedial-landing/muedial-lp-content";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "muedialLp.meta" });

  return {
    title: t("title"),
    description: t("description"),
    // STAGED: not indexed until the kimny-gated unlock flips MUEDIAL_LP_LIVE.
    robots: {
      index: MUEDIAL_LP_LIVE,
      follow: MUEDIAL_LP_LIVE,
    },
    alternates: {
      canonical: `https://mued.jp/${locale}/muedial`,
      languages: generateHreflangAlternates("/muedial"),
    },
    openGraph: {
      images: SHARE_IMAGES,
      title: t("title"),
      description: t("description"),
      type: "website",
      url: `https://mued.jp/${locale}/muedial`,
    },
    // ★Same title/description as og — without it twitter:* fell back to the site default (conductor 2026-10-01).
    twitter: {
      images: SHARE_IMAGES,
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
  };
}

export default async function MuedialPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const tMeta = await getTranslations({ locale, namespace: "muedialLp.meta" });

  // Service (conversational AI mixing/mastering) — LLMO/GEO. Emitted only when LIVE: while staged
  // the page is noindex and undiscoverable, so no structured data leaks either.
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "MUEDial",
    serviceType: "AI mixing & mastering",
    description: tMeta("description"),
    provider: {
      "@type": "Organization",
      name: "glasswerks inc.",
      url: "https://www.glasswerks.jp",
    },
  };

  return (
    <>
      {MUEDIAL_LP_LIVE && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
      <MuedialLpContent />
    </>
  );
}
