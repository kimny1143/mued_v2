import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MUEDial — ミックス、フェーダーに触らなくていい。",
  description:
    "ステムを上げて、AIと話すだけ。おまかせミックス$8から。スライダーもプラグインもなし。チャットでミックスが仕上がる。",
  alternates: {
    canonical: "https://dial.mued.jp/",
  },
  openGraph: {
    title: "MUEDial — ミックス、フェーダーに触らなくていい。",
    description:
      "ステムを上げて、AIと話すだけ。おまかせミックス$8から。",
    url: "https://dial.mued.jp",
    siteName: "MUEDial",
    images: [
      {
        url: "/muedial-hoo-mixing-console.jpg",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MUEDial — ミックス、フェーダーに触らなくていい。",
    description:
      "ステムを上げて、AIと話すだけ。おまかせミックス$8から。",
  },
};

export default function DialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
