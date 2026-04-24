import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hoo MCP セットアップ | MUEDnote — AIアシスタントとの接続",
  description:
    "HooをClaudeやCursorなどのAIツールに接続するセットアップガイド。APIキー発行 → ホスト設定 → 接続テストの3ステップで完了。MUEDnoteの制作コンテキストをどこでも活用。",
  keywords: [
    "Hoo MCP",
    "MUEDnote MCP",
    "Claude MCP 音楽",
    "Cursor MCP 音楽制作",
    "AIアシスタント 接続",
    "Hoo セットアップ",
    "音楽制作 AI ツール連携",
    "MCP setup",
    "Hoo API",
    "AI music production assistant",
  ],
  alternates: {
    canonical: "https://mued.jp/connect",
  },
  openGraph: {
    title: "Hoo MCP セットアップ | MUEDnote",
    description:
      "HooをClaudeやCursorなどのAIツールに接続。3ステップで音楽制作コンテキストをどこでも活用できます。",
    url: "https://mued.jp/connect",
    siteName: "MUEDnote",
  },
};

export default function ConnectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
