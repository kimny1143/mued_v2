import type { Metadata } from "next";
import Script from "next/script";
import { FirstTouchTracker } from "@/components/dial/first-touch-tracker";

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
          price: "7.49",
          priceCurrency: "USD",
          description: "AIがステムを自動解析してプロ品質のミックスを生成",
        },
        {
          "@type": "Offer",
          name: "対話ミックス",
          price: "13.99",
          priceCurrency: "USD",
          description: "AIと会話しながら音の方向性を細かく調整",
        },
        {
          "@type": "Offer",
          name: "マスタリング",
          price: "5.99",
          priceCurrency: "USD",
          description: "AIがラウドネス・ダイナミクスを最終仕上げ",
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
    "ステムをアップロードしてAIと話すだけ。宅録・DTM向けAIミキシング・マスタリング。DTMの仕上げはMUEDial。おまかせミックス$7.49から。日本語対応AIミックスサービス唯一の存在。",
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
  // PWA (Phase 0): installable only under /dial (i.e. dial.mued.jp). The root layout
  // (mued.jp marketing) intentionally has no manifest, so mued.jp stays non-installable.
  // Service worker is intentionally NOT registered in Phase 0 — iOS Add-to-Home-Screen
  // does not require one, and a stale SW would be a liability for a dynamic app.
  manifest: "/dial.webmanifest",
  appleWebApp: {
    capable: true,
    title: "MUEDial",
    // "black" (not "black-translucent"): reserves the iOS status-bar area so content
    // starts below it — the dial top tab bar (added in #509) is never obscured. The
    // black bar blends with the near-black dial UI. True full-bleed-behind-status-bar
    // would need safe-area-inset CSS; deferred to a later touch.
    statusBarStyle: "black",
  },
  // Next 16 emits the standardized <meta name="mobile-web-app-capable"> for appleWebApp.capable
  // and no longer emits the legacy apple-prefixed tag. Modern iOS honors the manifest's
  // display:standalone, but we add the legacy tag explicitly as a zero-cost belt-and-suspenders
  // so standalone launch is guaranteed across older iOS versions too.
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
  icons: {
    icon: [
      { url: "/icons/dial-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/dial-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon-180.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "MUEDial — 宅録・DTMの仕上げをAIと。",
    description:
      "ステムをアップロードしてAIと話すだけ。宅録・DTM向けAIミキシング・マスタリング。おまかせミックス$7.49から。",
    url: "https://dial.mued.jp/",
    siteName: "MUEDial",
    images: [
      {
        url: "/muedial-hoo-mixing-console.webp",
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
      "ステムをアップロードしてAIと話すだけ。宅録・DTM向けAIミキシング・マスタリング。おまかせミックス$7.49から。",
    images: ["/muedial-hoo-mixing-console.webp"],
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
      <FirstTouchTracker />
      {children}
    </>
  );
}
