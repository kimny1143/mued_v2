//
// MUEDsp product page (wave1 redesign, STAGED). Mirrors app/[locale]/muedsat/page.tsx:
// generateMetadata (robots tied to MUEDSP_LIVE => noindex while staged) + JSON-LD (gated) + a
// self-contained client landing component. Hero + masterchain copy live in the muedsp.* i18n
// namespace; the saturation block reuses muedsat.*.
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales, type Locale } from "@/lib/i18n/config";
import { generateHreflangAlternates } from "@/components/seo/hreflang-links";
import { MUEDSP_LIVE } from "@/lib/muedsp/config";
import { MuedspLandingContent } from "@/components/features/muedsp-landing";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "muedsp.meta" });

  return {
    title: t("title"),
    description: t("description"),
    // STAGED: not indexed until the kimny-gated unlock flips MUEDSP_LIVE.
    robots: {
      index: MUEDSP_LIVE,
      follow: MUEDSP_LIVE,
    },
    alternates: {
      languages: generateHreflangAlternates("/muedsp"),
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      type: "website",
      url: `https://mued.jp/${locale}/muedsp`,
    },
  };
}

export default async function MuedspPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const tMeta = await getTranslations({ locale, namespace: "muedsp.meta" });

  // Product line (LLMO/GEO). Emitted only when LIVE: while staged the page is noindex and
  // undiscoverable, so no structured data leaks either. Numbers sealed (no version, no rating).
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "MUEDsp",
    description: tMeta("description"),
    brand: {
      "@type": "Brand",
      name: "MUEDsp",
    },
    publisher: {
      "@type": "Organization",
      name: "glasswerks inc.",
      url: "https://www.glasswerks.jp",
    },
  };

  return (
    <>
      {MUEDSP_LIVE && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
      <MuedspLandingContent />
    </>
  );
}
