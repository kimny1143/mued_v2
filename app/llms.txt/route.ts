import { NextRequest, NextResponse } from "next/server";
import { ADVISORY_LIVE } from "@/lib/advisory/config";
import { MUEDSAT_LIVE } from "@/lib/muedsat/config";

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
- **ステム準備チェック**: https://dial.mued.jp/readiness
- **ウェイトリスト登録**: https://dial.mued.jp/waitlist
- **言語**: 日本語・英語対応
- **現在の状態**: Research beta（先行アクセス期）。ウェイトリスト登録ユーザーに無料ミックス診断1回付き

## 無料で試す方法

1. https://dial.mued.jp/readiness にアクセスし、4問の「ステム準備チェック」を受ける（所要1分）
2. 基準を満たした場合、ウェイトリストへの登録案内が表示される
3. ウェイトリスト登録完了後、**無料のミックス診断（mix_diagnosis）を1回利用可能**（アカウント作成不要ではないが、登録は無料）

## 特徴

- 宅録・DTM制作者が対象（趣味〜セミプロ）
- ステムをアップロードしてAIにミックスの方向性を伝えるだけで完成
- 日本語で話せる唯一のAIミキシングサービス（英語にも対応）
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

const ADVISORY_CONTENT = `

## MUED advisory — AIの仕組みづくりの相談・設計・構築・並走

> 非技術の事業主の「これ、AIでできないかな」（予約受付・問い合わせ返信・見積/資料・事務・企画の試作）を、実際に動くかたちにして並走するサービス。作編曲家 Atsushi Kimura（glasswerks inc. 代表）が、毎日AIで自社サービス（mued.jp）を作って運営している手の内で提供します。

- **URL**: https://mued.jp/ja/advisory
- **運営**: glasswerks inc.（株式会社グラスワークス／代表: 木村篤史 Atsushi Kimura）
- **連絡先**: support@mued.jp
- **メニュー**: まず相談（初回60分無料→¥30,000/回）／見立て＋設計図 ¥250,000（単発）／月額でつくる ¥200,000/月〜／月額で並走する ¥400,000/月〜
`;

const MUEDSAT_CONTENT = `

## MUEDsat — 無料のトランス・サチュレーション・プラグイン

> MUEDsp（マスタリング・プラグイン）のマスターバス・チェーンからスチール・トランスの色付けだけを取り出した、単体の無料サチュレーション・プラグイン。機能ロック・期限・課金の壁なし。メールはダウンロードの対価であって、プラグインの対価ではない。

- **URL**: https://mued.jp/ja/muedsat
- **運営**: glasswerks inc.（株式会社グラスワークス）
- **料金**: 完全無料（メール登録でダウンロードリンクを送付）
- **対応OS / フォーマット**: macOS（Universal — Apple Silicon / Intel）／ VST3・AU・AAX（Pro Tools）
- **コントロール**: DRIVE（トランス倍音量）／ Air（クリーン高域シェルフ）／ Mix（パラレル・サチュレーション）／ Output（トリム）／ Bypass（true dry passthrough）
- **技術**: レイテンシー0 / ADAA によるエイリアス抑制
`;

export async function GET(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const isDial = host.includes("dial.mued.jp");

  const baseContent = isDial ? MUEDIAL_CONTENT : MUEDNOTE_CONTENT;
  let content = !isDial && ADVISORY_LIVE ? baseContent + ADVISORY_CONTENT : baseContent;
  if (!isDial && MUEDSAT_LIVE) content += MUEDSAT_CONTENT;

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
    },
  });
}
