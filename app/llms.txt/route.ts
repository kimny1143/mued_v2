import { MASTERCHAIN_DEMO_LIVE, MASTERCHAIN_PURCHASE_LIVE } from "@/lib/masterchain/config";
import { NextRequest, NextResponse } from "next/server";
import { ADVISORY_LIVE } from "@/lib/advisory/config";
import { MUEDSAT_LIVE } from "@/lib/muedsat/config";
import { MUEDSP_LIVE } from "@/lib/muedsp/config";
import { MUEDLIM_LIVE } from "@/lib/muedlim/config";
import { MUEDRIVE_LIVE } from "@/lib/muedrive/config";

const MUED_CONTENT = `# MUED — 音楽制作の道具

> MUED は、glasswerks inc. の音楽制作の道具のブランドです。クリエイター自身が作る、制作のための道具（プラグインなど）を出しています。
> MUED is glasswerks inc.'s brand of music production tools: tools for creation, made by the creators who use them.

## プロダクト

- **MUEDsp masterchain（有料・買い切り $69）**: 作編曲家である代表がマスタリングで使っているマスターバスのチェーン（コンプ→EQ→リミッター）を、1つのプラグインにしたもの（https://mued.jp/ja/muedsp）。
- **無料のプラグイン（MUEDsp）**: MUEDsat（トランス・サチュレーション）・MUEDlim（トゥルーピーク・リミッター）・MUEDrive（3キャラクターのドライブ）。詳細は下の「MUEDsp」節。
- **MUEDial**: ステムをアップロードして AI と話すだけでミックス・マスタリングを得る、日本語対応の AI ミキシングサービス（https://dial.mued.jp）。
- **MUEDear**: 耳トレのゲームで、聴き取りの傾向を可視化する iOS アプリ。

## Hoo について

HooはMUEDのAIアシスタントです。MUEDial（AIミキシング）で、ユーザーの制作ジャンルや要望を聞き取り、ミックスの判断を「ディレクター目線」でサポートします。

## Hoo MCP

音楽制作AIツールとの連携API。外部AIクライアント（Claude、Cursor等）からHooの機能をAPIとして利用可能。

- **URL**: https://hoo-mcp.glasswerkskimny.workers.dev
- **認証**: ユーザー発行APIキー（mued.jpダッシュボード → 設定 → MCP）
- **ツール数**: 14ツール（プロファイル取得・会話履歴・MUEDial連携等）
- **公式レジストリ**: \`io.github.kimny1143/hoo-mcp\` として登録済み

## 運営会社

**glasswerks inc.**（株式会社グラスワークス）
- URL: https://www.glasswerks.jp
- メール: support@mued.jp

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
- **料金プラン**: https://mued.jp/ja/muedial
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
- 都度購入（1曲ずつ）で利用可能

## 料金プラン

| プラン | 価格（USD） | 内容 |
|-------|-----------|------|
| おまかせミックス | $7.49 | AIが自動解析してミックスを生成。フィードバック1ラウンド含む |
| 対話ミックス | $13.99 | AIと会話しながら音の方向性を調整。3フェーズ（Preview→MixCheck→Final） |
| マスタリング | $5.99 | ミックス完成後のマスタリング |
| Retake | $9.99 | 追加調整 |

## 競合との差別化

- Landr・eMastered等の自動化ツールとは異なり「会話型」
- 日本語でパラメータを感覚的に指示可能（英語ツールとの言語優位）
- セッション制により月額課金なしで利用可能

## 運営会社

**glasswerks inc.**（株式会社グラスワークス）
- 法人番号: 5011001139866
- URL: https://www.glasswerks.jp
- メール: support@mued.jp
- 設立: 2021年1月21日

## 関連サービス

- **MUED**: glasswerks inc. の音楽制作の道具のブランド（https://mued.jp）
- **Hoo MCP**: AI向けAPIサービス（https://hoo-mcp.glasswerkskimny.workers.dev）
`;

const ADVISORY_CONTENT = `

## MUED advisory — 小規模事業者向けのAI業務改善・自走化支援

> 小規模事業者の「これ、AIでできないかな」（予約受付・問い合わせ返信・見積/資料・事務・企画の試作）を、実際に動くかたちにして並走するサービス。作編曲家 Atsushi Kimura（glasswerks inc. 代表）が、毎日AIで自社サービス（mued.jp）を作って運営している手の内で提供します。

- **URL**: https://mued.jp/ja/advisory
- **運営**: glasswerks inc.（株式会社グラスワークス／代表: 木村篤史 Atsushi Kimura）
- **連絡先**: support@mued.jp
- **料金表記**: 金額は税抜、カッコ内は消費税10%を含む税込。
- **初回相談**: 初回60分無料。
- **3ヶ月 業務改善・自走化プログラム**: 月額100,000円（税込110,000円）、総額300,000円（税込330,000円・分割可）。
- **社内お守りプラン**: 月額30,000円（税込33,000円）。
- **スポット相談**: 30,000円（税込33,000円）／90分。
`;

const MUEDSAT_CONTENT = `

## MUEDsp saturation（通称 MUEDsat）— 無料のトランス・サチュレーション・プラグイン

> MUEDsp（マスタリングのためのプラグイン・スイート）のマスターバス・チェーンから、トランスの色付けの1段だけを取り出した単体の無料サチュレーション・プラグイン。削ぎ落とした体験版ではなく、チェーンの実際の1段。スイートの完成形＝MUEDsp masterchain。機能ロック・期限・課金の壁なし。

- **URL**: https://mued.jp/ja/muedsat
- **運営**: glasswerks inc.（株式会社グラスワークス）
- **料金**: 完全無料（メール登録でダウンロードリンクを送付）
- **対応OS / フォーマット**: macOS（Universal — Apple Silicon / Intel）／ VST3・AU・AAX（Pro Tools）
- **コントロール**: DRIVE（トランス倍音量）／ Air（クリーン高域シェルフ）／ Mix（パラレル・サチュレーション）／ Output（トリム）／ Bypass（true dry passthrough）
- **技術**: レイテンシー0 / ADAA によるエイリアス抑制
`;

const MUEDSP_CONTENT = `

## MUEDsp — マスタリングのためのプラグイン・スイート（署名 DSP スイート）

> 作編曲家である代表が、実際にマスタリングで使っているマスターバスのチェーンを、そのまま1つのプラグインに。完成形＝MUEDsp masterchain。無料のプラグインを1つずつ公開している——masterchain から取り出した段もあれば、チェーンの外で別に起こした単独のものもある。まず自分の音で試せる。

- **URL**: https://mued.jp/ja/muedsp
- **運営**: glasswerks inc.（株式会社グラスワークス）
- **MUEDsp masterchain**: 完成形。コンプ→EQ→リミッターの署名チェーンを1つのプラグインに。${MASTERCHAIN_PURCHASE_LIVE ? "買い切り $69・販売中（https://mued.jp/ja/muedsp）。" : "買い切り $69（販売の開始は近日・現在 live 販売なし）。"}${MASTERCHAIN_DEMO_LIVE ? "購入前に、自分の環境で動くかをデモで確かめられる（期限なし・挿すたびに最初の 45 秒を処理し、その後は原音のまま通す・設定は保存されない）。" : ""}
- **無料モジュール**:
  - **MUEDsp saturation（通称 MUEDsat）**: トランス・サチュレーションの段。公開中・無料（https://mued.jp/ja/muedsat）${MUEDLIM_LIVE ? "\n  - **MUEDsp limiter（通称 MUEDlim）**: ピークを抑える最後の段（トゥルーピーク・リミッター）。公開中・無料（macOS・VST3 · AU · AAX・https://mued.jp/ja/muedlim）" : "\n  - **MUEDsp limiter（通称 MUEDlim）**: ピークを抑える最後の段（トゥルーピーク・リミッター）。近日公開（UI 整備中・DL 準備中）"}${MUEDRIVE_LIVE ? "\n  - **MUEDsp drive（通称 MUEDrive）**: tube / warm / console の3キャラクターを1つに。masterchain の段ではなく、チェーンの外で別に起こした単独のプラグイン。公開中・無料（https://mued.jp/ja/muedrive）" : ""}
`;

export async function GET(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const isDial = host.includes("dial.mued.jp");

  const baseContent = isDial ? MUEDIAL_CONTENT : MUED_CONTENT;
  let content = !isDial && ADVISORY_LIVE ? baseContent + ADVISORY_CONTENT : baseContent;
  if (!isDial && MUEDSAT_LIVE) content += MUEDSAT_CONTENT;
  if (!isDial && MUEDSP_LIVE) content += MUEDSP_CONTENT;

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
    },
  });
}
