import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "料金プラン | MUEDial — AIミキシング・マスタリング",
  description:
    "MUEDialの料金プラン。おまかせミックス$8・対話ミックス$15・マスタリング$6。宅録・DTM向けAIミックスサービス。ステムを送るだけでプロ品質のミックスが完成。",
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
      "おまかせミックス$8・対話ミックス$15・マスタリング$6。宅録・DTM向けAIミックスサービス。",
    url: "https://dial.mued.jp/pricing",
    siteName: "MUEDial",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
