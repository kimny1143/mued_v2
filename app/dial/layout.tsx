import type { Metadata } from "next";
import Script from "next/script";

const dialJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": "https://dial.mued.jp/#muedial",
      name: "MUEDial",
      alternateName: ["ミュードアイアル", "AI Mix", "AIミキシング"],
      applicationCategory: "MusicApplication",
      operatingSystem: "Web",
      url: "https://dial.mued.jp/",
      description:
        "宅録・DTM制作者向けAIミキシング・マスタリングサービス。ステムをアップロードしてAIと話すだけでプロ品質のミックスが完成。DTMの仕上げをAIと。日本語対応のAIミキシングサービスとして唯一の存在。 | AI mixing and mastering for home recording and DAW producers. Upload stems, chat with AI, get a pro-quality mix.",
      keywords: [
        "AIミックス",
        "AIミキシング",
        "AIマスタリング",
        "宅録",
        "DTM",
        "DAW",
        "ホームレコーディング",
        "AI mix",
        "AI mixing",
        "AI mastering",
        "home recording",
      ],
      offers: [
        {
          "@type": "Offer",
          name: "おまかせミックス",
          price: "8",
          priceCurrency: "USD",
          description: "AIがステムを自動解析してプロ品質のミックスを生成",
        },
        {
          "@type": "Offer",
          name: "対話ミックス",
          price: "15",
          priceCurrency: "USD",
          description: "AIと会話しながら音の方向性を細かく調整",
        },
      ],
      creator: {
        "@type": "Organization",
        name: "glasswerks inc.",
        url: "https://www.glasswerks.jp",
      },
      inLanguage: ["ja", "en"],
    },
  ],
};

export const metadata: Metadata = {
  title: "MUEDial — 宅録・DTMの仕上げをAIと。",
  description:
    "ステムをアップロードしてAIと話すだけ。宅録・DTM向けAIミキシング・マスタリング。DTMの仕上げはMUEDial。おまかせミックス$8から。日本語対応AIミックスサービス唯一の存在。",
  keywords: [
    "AIミックス",
    "AIミキシング",
    "AIマスタリング",
    "宅録",
    "DTM",
    "DAW",
    "ホームレコーディング",
    "ミックスダウン",
    "ステムミックス",
    "DTM仕上げ",
    "日本語AIミキシング",
    "おまかせミックス",
    "MUEDial",
    "AI mix",
    "AI mixing",
    "AI mastering",
    "home recording",
    "stem mixing",
    "AI mixing service",
  ],
  alternates: {
    canonical: "https://dial.mued.jp/",
  },
  openGraph: {
    title: "MUEDial — 宅録・DTMの仕上げをAIと。",
    description:
      "ステムをアップロードしてAIと話すだけ。宅録・DTM向けAIミキシング・マスタリング。おまかせミックス$8から。",
    url: "https://dial.mued.jp/",
    siteName: "MUEDial",
    images: [
      {
        url: "/muedial-hoo-mixing-console.jpg",
        width: 1200,
        height: 630,
        alt: "MUEDial — 宅録・DTM向けAIミキシング",
      },
    ],
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "MUEDial — 宅録・DTMの仕上げをAIと。",
    description:
      "ステムをアップロードしてAIと話すだけ。宅録・DTM向けAIミキシング・マスタリング。おまかせミックス$8から。",
  },
};

export default function DialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Script
        id="dial-jsonld"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(dialJsonLd) }}
      />
      {children}
    </>
  );
}
