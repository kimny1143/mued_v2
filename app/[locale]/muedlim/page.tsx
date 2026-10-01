//
// MUEDlim standalone free-download LP (/[locale]/muedlim). Mirrors app/[locale]/muedsat/page.tsx:
// generateMetadata (robots tied to MUEDLIM_LIVE), SoftwareApplication JSON-LD, + a self-contained
// client landing component. Spun out from the /muedsp §2 MUEDlim section for a direct-link press
// response (kimny GO supersedes the 7/12 "no independent URL" decision). Copy = muedlim.* namespace.
import { SHARE_IMAGES } from "@/lib/seo/share-image";
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales, type Locale } from "@/lib/i18n/config";
import { generateHreflangAlternates } from "@/components/seo/hreflang-links";
import { freePluginOperatingSystem, withWindowsSentence } from "@/lib/plugins/windows-beta";
import { MUEDLIM_LIVE } from "@/lib/muedlim/config";
import { MuedlimLandingContent } from "@/components/features/muedlim-landing";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "muedlim.meta" });
  const tw = await getTranslations({ locale, namespace: "muedsp.windows" });
  // ★Unchanged while the Windows beta is not live (lib/plugins/windows-beta.ts).
  const description = withWindowsSentence(t("description"), tw("productMeta"));

  return {
    title: t("title"),
    description,
    // Indexed only while MUEDLIM_LIVE (currently true — reopened at #658).
    robots: {
      index: MUEDLIM_LIVE,
      follow: MUEDLIM_LIVE,
    },
    alternates: {
      // Self-referencing canonical. Without it, /ja/muedlim and /en/muedlim are near-identical
      // pages in the sitemap with no declared preference, so Search Console reports
      // "Duplicate, Google chose different canonical than user" — the message is literal:
      // the user (this site) never chose one. hreflang alone does not say which URL is
      // canonical for a given locale.
      canonical: `https://mued.jp/${locale}/muedlim`,
      languages: generateHreflangAlternates("/muedlim"),
    },
    openGraph: {
      images: SHARE_IMAGES,
      title: t("title"),
      description,
      type: "website",
      url: `https://mued.jp/${locale}/muedlim`,
    },
    // ★Same title/description as og — without it twitter:* fell back to the site default (conductor 2026-10-01).
    twitter: {
      images: SHARE_IMAGES,
      card: "summary_large_image",
      title: t("title"),
      description,
    },
  };
}

export default async function MuedlimPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const tMeta = await getTranslations({ locale, namespace: "muedlim.meta" });
  const tWin = await getTranslations({ locale, namespace: "muedsp.windows" });

  // SoftwareApplication (free plugin) — LLMO/GEO. Emitted only when LIVE. Numbers sealed per the
  // fact-lock (no version, no rating).
  const softwareStructuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "MUEDsp limiter",
    alternateName: "MUEDlim",
    applicationCategory: "MultimediaApplication",
    operatingSystem: freePluginOperatingSystem(),
    description: withWindowsSentence(tMeta("description"), tWin("productMeta")),
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
      {MUEDLIM_LIVE && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareStructuredData) }}
        />
      )}
      <MuedlimLandingContent />
    </>
  );
}
