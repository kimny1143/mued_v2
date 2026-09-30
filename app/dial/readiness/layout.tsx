import { DIAL_SHARE_IMAGES } from "@/lib/seo/share-image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "スタート準備確認 — WAVステム準備ガイド | MUEDial",
  description:
    "MUEDial利用前のWAVステム準備確認ページ。宅録・DTM制作者向けAIミキシングを始めるためのステム書き出し方法・必要条件をご確認ください。",
  keywords: [
    "MUEDial 準備",
    "WAVステム 書き出し",
    "AIミキシング 準備",
    "宅録 ステム 準備",
    "DTM WAV 書き出し",
    "AI mix preparation",
    "WAV stem export",
    "MUEDial readiness",
  ],
  alternates: {
    canonical: "https://dial.mued.jp/readiness",
  },
  openGraph: {
    title: "スタート準備確認 — WAVステム準備ガイド | MUEDial",
    description:
      "MUEDial利用前のWAVステム準備確認。宅録・DTM向けAIミキシングを始めるためのステム書き出し方法を確認できます。",
    url: "https://dial.mued.jp/readiness",
    siteName: "MUEDial",
    images: DIAL_SHARE_IMAGES,
  },
  // ★A layout/page og or twitter REPLACES its parent's (no merge): images and twitter are set here too.
  twitter: {
    card: "summary_large_image",
    title: "スタート準備確認 — WAVステム準備ガイド | MUEDial",
    description: "MUEDial利用前のWAVステム準備確認。宅録・DTM向けAIミキシングを始めるためのステム書き出し方法を確認できます。",
    images: DIAL_SHARE_IMAGES,
  },
};

export default function ReadinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
