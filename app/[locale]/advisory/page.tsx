//
// MUED advisory LP v7 (staged). Mirrors app/[locale]/ai-mixing/page.tsx:
// generateMetadata + JSON-LD + a self-contained client landing component.
// STAGED: robots index/follow are tied to ADVISORY_LIVE (false => noindex).
import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales, type Locale } from "@/lib/i18n/config";
import { generateHreflangAlternates } from "@/components/seo/hreflang-links";
import { ADVISORY_LIVE } from "@/lib/advisory/config";
import { AdvisoryLandingContent } from "@/components/features/advisory-landing";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

// q5 (費用感) removed — duplicated the Pricing section (content課 dedup, kimny live review).
const FAQ_KEYS = ["q1", "q2", "q3", "q4"] as const;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "advisory.meta" });

  return {
    title: t("title"),
    description: t("description"),
    // STAGED: not indexed until the kimny-gated unlock flips ADVISORY_LIVE.
    robots: {
      index: ADVISORY_LIVE,
      follow: ADVISORY_LIVE,
    },
    alternates: {
      // Self-referencing canonical. Without it, /ja/advisory and /en/advisory are near-identical
      // pages in the sitemap with no declared preference, so Search Console reports
      // "Duplicate, Google chose different canonical than user" — the message is literal:
      // the user (this site) never chose one. hreflang alone does not say which URL is
      // canonical for a given locale.
      canonical: `https://mued.jp/${locale}/advisory`,
      languages: generateHreflangAlternates("/advisory"),
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      type: "website",
      url: `https://mued.jp/${locale}/advisory`,
    },
  };
}

export default async function AdvisoryPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const tFaq = await getTranslations({ locale, namespace: "advisory.faq" });
  const tMeta = await getTranslations({ locale, namespace: "advisory.meta" });
  const tPricing = await getTranslations({ locale, namespace: "advisory.pricing" });
  const priceValues = tPricing.raw("values") as {
    initialConsultationYen: number;
    programMonthlyYen: number;
    programTotalYen: number;
    guardianMonthlyYen: number;
    spotYen: number;
  };
  const taxIncluded = (price: number) => Math.round(price * 1.1);
  const offerDescription = (key: "consult" | "program" | "guardian" | "spot") =>
    locale === "ja"
      ? `${tPricing(`${key}.price`)}。${tPricing(`${key}.what`)}`
      : `${tPricing(`${key}.price`)}. ${tPricing(`${key}.what`)}`;

  // FAQPage — LLMO/GEO. FAQ copy is v7.1 draft (kimny redline before unlock).
  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_KEYS.map((key) => ({
      "@type": "Question",
      name: tFaq(`${key}.question`),
      acceptedAnswer: {
        "@type": "Answer",
        text: tFaq(`${key}.answer`),
      },
    })),
  };

  // ProfessionalService + Organization + Person (Atsushi Kimura) — LLMO/GEO entity grounding.
  // Person carries the real name into the graph (必須線1). GitHub excluded per #4=(B);
  // LinkedIn retained (kimny-approved v7 canonical). note added to sameAs after POV publish.
  const serviceStructuredData = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "MUED advisory",
    description: tMeta("description"),
    url: `https://mued.jp/${locale}/advisory`,
    areaServed: "JP",
    // カテゴリ定義一句
    slogan:
      locale === "ja"
        ? "AIに任せた開発を、ちゃんと使える品質で回す。"
        : "AI-delegated development, run at a quality you can actually use.",
    provider: {
      "@type": "Organization",
      name: "glasswerks inc.",
      url: "https://www.glasswerks.jp",
      email: "support@mued.jp",
      founder: {
        "@type": "Person",
        name: "Atsushi Kimura",
        alternateName: ["kimny", "木村篤史"],
        jobTitle:
          locale === "ja" ? "作編曲家 / 代表" : "Composer-Arranger / Representative",
        worksFor: {
          "@type": "Organization",
          name: "glasswerks inc.",
        },
        sameAs: [
          "https://mued.jp",
          "https://www.linkedin.com/in/kimura-atsushi-758b8b156",
        ],
      },
    },
    offers: {
      "@type": "OfferCatalog",
      name: "MUED advisory",
      itemListElement: [
        {
          "@type": "Offer",
          name: tPricing("consult.name"),
          price: String(priceValues.initialConsultationYen),
          priceCurrency: "JPY",
          description: offerDescription("consult"),
        },
        {
          "@type": "Offer",
          name: tPricing("program.name"),
          price: String(taxIncluded(priceValues.programTotalYen)),
          priceCurrency: "JPY",
          description: offerDescription("program"),
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: String(taxIncluded(priceValues.programMonthlyYen)),
            priceCurrency: "JPY",
            unitText: "MONTH",
          },
        },
        {
          "@type": "Offer",
          name: tPricing("guardian.name"),
          price: String(taxIncluded(priceValues.guardianMonthlyYen)),
          priceCurrency: "JPY",
          description: offerDescription("guardian"),
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: String(taxIncluded(priceValues.guardianMonthlyYen)),
            priceCurrency: "JPY",
            unitText: "MONTH",
          },
        },
        {
          "@type": "Offer",
          name: tPricing("spot.name"),
          price: String(taxIncluded(priceValues.spotYen)),
          priceCurrency: "JPY",
          description: offerDescription("spot"),
        },
      ],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      <AdvisoryLandingContent />
    </>
  );
}
