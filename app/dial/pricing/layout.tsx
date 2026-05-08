import type { Metadata } from "next";
import Script from "next/script";

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "MUEDial のサブスクリプションプランは何がありますか？ / What subscription plans does MUEDial offer?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Hoo Pass（$5.99/月・100cr）のみ提供しています。サブスク継続中はクレジットが無期限ロールオーバーします。 / Only Hoo Pass ($5.99/month · 100cr) is currently available. Subscription credits roll over indefinitely while your subscription is active.",
      },
    },
    {
      "@type": "Question",
      name: "クレジットとは何ですか？各操作で何クレジット必要ですか？ / What are credits and how many does each operation cost?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "クレジットはMUEDialの処理単位です。おまかせミックス：300cr、対話ミックス：530cr、マスタリング：220cr、ミックス診断：10cr、音声クリーンアップ：10cr。 / Credits are the processing unit of MUEDial. Omakase Mix: 300cr, Dialogue Mix: 530cr, Mastering: 220cr, Mix Diagnosis: 10cr, Audio Cleanup: 10cr.",
      },
    },
    {
      "@type": "Question",
      name: "サブスクリプションなしで使えますか？ / Can I use MUEDial without a subscription?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "はい。セッション単位での購入が可能です。おまかせミックス $7.49、対話ミックス $13.99、マスタリング $5.99。サブスクリプション不要で使い始められます。 / Yes. Pay-per-session options are available: Omakase Mix $7.49, Dialogue Mix $13.99, Mastering $5.99. No subscription required to get started.",
      },
    },
    {
      "@type": "Question",
      name: "クレジットパックとは何ですか？ / What are credit packs?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "クレジットパックはサブスクリプションのクレジットが不足した際に追加購入できます。Small Pack（500cr・$12.99）とLarge Pack（1,500cr・$34.99）の2種類。クレジットパックは購入後12ヶ月有効です。 / Credit packs let you top up at any time. Small Pack (500cr · $12.99) and Large Pack (1,500cr · $34.99). Credit packs are valid for 12 months from purchase.",
      },
    },
    {
      "@type": "Question",
      name: "クレジットはロールオーバーしますか？ / Do credits roll over?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "サブスク継続中はクレジットが無期限ロールオーバーします。クレジットパックは購入後12ヶ月有効。キャンセル後は30日間の猶予期間があります。 / Subscription credits roll over indefinitely while your subscription is active. Credit packs are valid for 12 months. A 30-day grace period applies after cancellation.",
      },
    },
    {
      "@type": "Question",
      name: "MUEDial は日本語に対応していますか？ / Does MUEDial support Japanese?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "はい。MUEDial はAIミキシングサービスとして日本語に唯一対応しています。AIアシスタントHooと日本語で会話しながらミックスを仕上げることができます。 / Yes. MUEDial is the only AI mixing service with full Japanese language support. You can chat with Hoo AI in Japanese to guide and refine your mix.",
      },
    },
    {
      "@type": "Question",
      name: "どんな音楽ジャンルに対応していますか？ / What music genres does MUEDial support?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ジャンルを問わず対応しています。宅録・DTM・ポップス・ロック・電子音楽・アンビエントなど、幅広いジャンルのステムミックスに対応。AIがジャンルの特性を考慮したミックスを提案します。 / MUEDial supports all genres including home recording, DAW production, pop, rock, electronic, ambient, and more. The AI considers genre characteristics when proposing mix decisions.",
      },
    },
  ],
};

export const metadata: Metadata = {
  title: "料金プラン | MUEDial — AIミキシング・マスタリング",
  description:
    "MUEDialの料金プラン。おまかせミックス$7.49・対話ミックス$13.99・マスタリング$5.99。宅録・DTM向けAIミックスサービス。ステムを送るだけでプロ品質のミックスが完成。",
  keywords: [
    "AIミックス 料金",
    "AIミキシング 価格",
    "AIマスタリング 料金",
    "宅録 ミックス 料金",
    "DTM ミックス サービス 料金",
    "MUEDial プラン",
    "おまかせミックス",
    "対話ミックス",
    "AI mix price",
    "AI mixing pricing",
    "AI mastering price",
    "MUEDial pricing",
  ],
  alternates: {
    canonical: "https://dial.mued.jp/pricing",
  },
  openGraph: {
    title: "料金プラン | MUEDial — AIミキシング・マスタリング",
    description:
      "おまかせミックス$7.49・対話ミックス$13.99・マスタリング$5.99。宅録・DTM向けAIミックスサービス。",
    url: "https://dial.mued.jp/pricing",
    siteName: "MUEDial",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Script
        id="dial-pricing-faq-jsonld"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {children}
    </>
  );
}
