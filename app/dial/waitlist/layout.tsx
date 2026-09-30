import { DIAL_SHARE_IMAGES } from "@/lib/seo/share-image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "waitlist登録 — AIミキシング先行アクセス | MUEDial",
  description:
    "MUEDial waitlist登録ページ。宅録・DTM制作者向けAIミキシング・マスタリングサービスへの先行アクセスを取得。無料診断・プレビュー1回試せます。",
  keywords: [
    "MUEDial waitlist",
    "AIミキシング 登録",
    "AIマスタリング 先行アクセス",
    "宅録 AIミックス 登録",
    "DTM AIミックス 先行",
    "AI mix waitlist",
    "AI mixing early access",
    "MUEDial 申し込み",
  ],
  alternates: {
    canonical: "https://dial.mued.jp/waitlist",
  },
  openGraph: {
    title: "waitlist登録 — AIミキシング先行アクセス | MUEDial",
    description:
      "MUEDial waitlist登録。宅録・DTM向けAIミキシングへの先行アクセス。無料診断・プレビュー1回試せます。",
    url: "https://dial.mued.jp/waitlist",
    siteName: "MUEDial",
    images: DIAL_SHARE_IMAGES,
  },
  // ★A layout/page og or twitter REPLACES its parent's (no merge): images and twitter are set here too.
  twitter: {
    card: "summary_large_image",
    title: "waitlist登録 — AIミキシング先行アクセス | MUEDial",
    description: "MUEDial waitlist登録。宅録・DTM向けAIミキシングへの先行アクセス。無料診断・プレビュー1回試せます。",
    images: DIAL_SHARE_IMAGES,
  },
};

export default function WaitlistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
