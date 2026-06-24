import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { locales, type Locale } from "@/lib/i18n/config";
import { generateHreflangAlternates } from "@/components/seo/hreflang-links";
import { AiMixingLandingContent } from "@/components/features/ai-mixing-landing";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

const FAQ_KEYS = [
  "q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "q10",
] as const;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "aiMixing.meta" });

  return {
    title: t("title"),
    description: t("description"),
    robots: {
      index: false,
      follow: false,
    },
    alternates: {
      languages: generateHreflangAlternates("/ai-mixing"),
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      type: "website",
      url: `https://mued.jp/${locale}/ai-mixing`,
    },
  };
}

export default async function AiMixingPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const t = await getTranslations({ locale, namespace: "aiMixing.faq" });

  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_KEYS.map((key) => ({
      "@type": "Question",
      name: t(`${key}.question`),
      acceptedAnswer: {
        "@type": "Answer",
        text: t(`${key}.answer`),
      },
    })),
  };

  const softwareAppStructuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "MUEDial",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    url: "https://mued.jp/ja/ai-mixing",
    description:
      "チャットで指示するAIミキシングサービス。歌ってみた・VTuber・DTM制作の音源をアップロードし、AIと対話しながらミックスを仕上げます。",
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "5.99",
      highPrice: "34.99",
      priceCurrency: "USD",
      offerCount: "5",
    },
    provider: {
      "@type": "Organization",
      name: "glasswerks inc.",
      url: "https://www.glasswerks.jp",
    },
    inLanguage: "ja",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqStructuredData),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareAppStructuredData),
        }}
      />
      <AiMixingLandingContent />
    </>
  );
}
