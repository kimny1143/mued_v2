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

const FAQ_KEYS = ["q1", "q2", "q3", "q4", "q5"] as const;

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
      email: "info@glasswerks.jp",
      founder: {
        "@type": "Person",
        name: "Atsushi Kimura",
        alternateName: "kimny",
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
          name: locale === "ja" ? "まず相談（壁打ち）" : "First consultation",
          price: "30000",
          priceCurrency: "JPY",
          description:
            locale === "ja"
              ? "初回60分無料。以降 ¥30,000/回。"
              : "First 60 minutes free. Then ¥30,000 per session.",
        },
        {
          "@type": "Offer",
          name: locale === "ja" ? "見立て＋設計図（単発）" : "Assessment + blueprint (one-off)",
          price: "250000",
          priceCurrency: "JPY",
        },
        {
          "@type": "Offer",
          name: locale === "ja" ? "月額でつくる" : "Monthly build",
          price: "200000",
          priceCurrency: "JPY",
          description: locale === "ja" ? "¥200,000/月〜" : "From ¥200,000/month",
        },
        {
          "@type": "Offer",
          name: locale === "ja" ? "月額で並走する" : "Monthly companion",
          price: "400000",
          priceCurrency: "JPY",
          description: locale === "ja" ? "¥400,000/月〜" : "From ¥400,000/month",
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
