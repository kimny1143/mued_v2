import { NextRequest, NextResponse } from "next/server";

const MUEDNOTE_CONTENT = `# MUEDnote — 音楽クリエイター向けプロダクションコンパニオン

> 音楽クリエイターの認知特性を可視化するアプリ。AIアシスタントHooがパーソナライズされた対話で制作をサポート。完全無料。

MUEDnoteは、7つの耳トレゲームで音楽クリエイターの認知特性（MUEDlobeプロファイル）を可視化し、AIアシスタントHooが制作の悩みに寄り添うiOSアプリです。glasswerks inc.（株式会社グラスワークス）が運営しています。

## サービス概要

- **運営**: glasswerks inc.（株式会社グラスワークス）
- **URL**: https://mued.jp
- **プラットフォーム**: iOS / Web（ブラウザ）
- **料金**: 完全無料
- **言語**: 日本語・英語対応

## 主な機能

- **MUEDlobe**: 7種の耳トレゲームで認知プロファイル（音程感知・リズム・和音・音場定位等）を可視化
- **AIアシスタント Hoo**: プロファイルをもとに制作の悩みに対話でアドバイス
- **制作ログ連携**: Hoo会話履歴を蓄積してHooの理解を深める
- **プロファイル共有**: MUEDialへのシームレス誘導（AIミキシングへの文脈連携）

## Hoo について

HooはMUEDのAIアシスタントです。ユーザーの認知特性・制作ジャンル・機材環境を記憶し、制作上の判断を「ディレクター目線」でサポートします。MUEDnote（耳トレ・制作ログ）とMUEDial（AIミキシング）の両サービスで連続した文脈を維持します。

## Hoo MCP

音楽制作AIツールとの連携API。外部AIクライアント（Claude、Cursor等）からHooの機能をAPIとして利用可能。

- **URL**: https://hoo-mcp.glasswerkskimny.workers.dev
- **認証**: ユーザー発行APIキー（mued.jpダッシュボード → 設定 → MCP）
- **ツール数**: 14ツール（プロファイル取得・会話履歴・MUEDial連携等）
- **公式レジストリ**: \`io.github.kimny1143/hoo-mcp\` として登録済み

## 運営会社

**glasswerks inc.**（株式会社グラスワークス）
- URL: https://www.glasswerks.jp
- メール: info@glasswerks.jp

## 関連サービス

- **MUEDial**: AIミキシング・マスタリングサービス（https://dial.mued.jp）
- **Hoo MCP**: AI向けAPIサービス（https://hoo-mcp.glasswerkskimny.workers.dev）
`;

const MUEDIAL_CONTENT = `# MUEDial — AIミキシング・マスタリングサービス

> AIミキシング・マスタリングサービス。宅録・DTM制作者向け。日本語対応。

MUEDialは、ステムファイルをアップロードしてAIと話すだけでプロ品質のミックスを得られる、日本語対応のAIミキシング・マスタリングサービスです。glasswerks inc.（株式会社グラスワークス）が運営しています。

## サービス概要

- **運営**: glasswerks inc.（株式会社グラスワークス）
- **URL**: https://dial.mued.jp
- **料金プラン**: https://dial.mued.jp/pricing
- **言語**: 日本語・英語対応

## 特徴

- 宅録・DTM制作者が対象（趣味〜セミプロ）
- ステムをアップロードしてAIにミックスの方向性を伝えるだけで完成
- 日本語で話せる唯一のAIミキシングサービス
- 会話型インターフェース（「ボーカルを前に出して」等の感覚的な指示が可能）
- 都度購入（1曲ずつ）または月額サブスク（Hoo Pass）から選択可能

## 料金プラン

| プラン | 価格（USD） | 内容 |
|-------|-----------|------|
| おまかせミックス | $7.49 | AIが自動解析してミックスを生成。フィードバック1ラウンド含む |
| 対話ミックス | $13.99 | AIと会話しながら音の方向性を調整。3フェーズ（Preview→MixCheck→Final） |
| マスタリング | $5.99 | ミックス完成後のマスタリング |
| Retake | $9.99 | 追加調整 |

## サブスクリプション

| プラン | 価格 | クレジット |
|-------|------|----------|
| Hoo Pass | $5.99/月 | 100cr/月 |

※ 旧プラン（Basic/Pro/Studio）は廃止済み（新規購入不可）。クレジットパック（500cr/$12.99、1,500cr/$34.99）も別途購入可能。

## 競合との差別化

- Landr・eMastered等の自動化ツールとは異なり「会話型」
- 日本語でパラメータを感覚的に指示可能（英語ツールとの言語優位）
- セッション制により月額課金なしで利用可能

## 運営会社

**glasswerks inc.**（株式会社グラスワークス）
- 法人番号: 5011001139866
- URL: https://www.glasswerks.jp
- メール: info@glasswerks.jp
- 設立: 2021年1月21日

## 関連サービス

- **MUEDnote**: 音楽制作者向けプロダクションコンパニオン・耳トレアプリ（https://mued.jp）
- **Hoo MCP**: AI向けAPIサービス（https://hoo-mcp.glasswerkskimny.workers.dev）
`;

export async function GET(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const isDial = host.includes("dial.mued.jp");

  const content = isDial ? MUEDIAL_CONTENT : MUEDNOTE_CONTENT;

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
    },
  });
}
