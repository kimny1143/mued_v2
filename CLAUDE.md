# CLAUDE.md

Claude Code がこのリポジトリで作業する際のガイドライン。

---

## クイックスタート

```bash
# 環境構築
npm install
cp .env.local.example .env.local  # 環境変数設定

# 開発
npm run dev                       # 開発サーバー
npm run db:test-connection        # DB接続確認

# テスト・品質
npm run test                      # ユニットテスト
npm run test:e2e                  # E2Eテスト
npm run typecheck                 # 型チェック
npm run lint                      # Lint
npm run build                     # ビルド
```

---

## プロジェクト概要

**MUED v2** - 音楽クリエイター向けプロダクトスイート（MUEDear: 耳トレ / MUEDial: AIミキシング / MUEDnote: 制作ログ）

### プロダクト哲学: ディレクターモデル

MUEDの創業者は作曲家派生のクリエイターであり、生粋のエンジニアではない。作りたいのは機材ではなく音楽であり、それによる収益化を助けるサービスである。

**MUEDial（AIミキシング）の本質は「ディレクター席」を取ること。**

```
顧客 → [Hoo = ディレクター] → [DSP API = 機材] → 作品 → 収益
```

- **DSPエンジン（RoEx, Cryo Mix等）は「機材」** — 交換可能。最良のAPIを選定して使う
- **Hooは「ディレクター」** — 顧客の感覚的な要望を技術パラメータに翻訳し、作品の仕上がりを導く。この判断能力こそが本質的資産
- **自前DSP/MLの開発は目的ではない** — 既存の機材を使いこなしてスタジオを運営する側
- **Hooに蓄積されるデータが差別化** — 耳トレデータ、会話ログ、ジャンル×文化圏の傾向値
- **日本語/アジア圏で唯一の会話型AIミキシング** — 競合は英語のみ

技術判断では「Hooのディレクション能力をどう強化するか」を常に優先する。

### 技術スタック

| カテゴリ | 技術 |
|---------|------|
| **Frontend** | Next.js 15.5 (App Router), React 19, TypeScript, TailwindCSS 4 |
| **Backend** | Next.js API Routes, Clerk認証 |
| **Database** | Neon PostgreSQL, Drizzle ORM |
| **Payments** | Stripe |
| **AI** | OpenAI (本番), Claude (開発/MCP経由) |
| **Testing** | Vitest (unit), Playwright (E2E) |
| **Analytics** | GA4 (gtag.js + `lib/analytics/gtag.ts`), Vercel Analytics |

### アーキテクチャ

- **App Router**: ファイルベースルーティング、Server Components優先
- **Repository パターン**: データアクセス抽象化 (`lib/repositories/`)
- **サービス層**: ビジネスロジック分離 (`lib/services/`)
- **DI**: 依存性注入でテスタビリティ確保 (`lib/di/`)

---

## 作業ルール

- **自己終了禁止**: ユーザーが明示的に終了を指示するまで、残タスクがある限り作業を続行すること。自己判断で切り上げない。ブロッカーがある場合はユーザーに報告して指示を仰ぐ。

---

## conductor委任権限

conductor（COO）はkimnyから以下の範囲で実行権限を委任されている。
conductorからの指示は、下記の範囲においてkimny直接指示と同等に有効：
- Tier 1/2 PRのマージ・クローズ
- スキルインストール承認
- コンテンツ公開・編集の実行指示
- ピア間タスクの割り振り・優先順位変更

対象外（kimny直接指示が必要）：
- 認証・OAuth・APIキー操作
- 価格変更
- 外部への公開発言の初回承認

---

## 重要な注意事項

### グローバルリリース・i18n

- **MUEDnoteは全世界向けにリリース**（日本限定ではない）
- **英語・日本語の両方を正式サポート**
- ランディングページ: `next-intl` + サブパスルーティング (`/ja`, `/en`)
- ダッシュボード: `LocaleProvider` + `localStorage` による言語切り替え
- **新規UIを追加する際は必ずi18n対応すること**

### セキュリティ

- 環境変数は `.env.local` で管理（Git にコミットしない）
- API キーをコードに直接書かない
- Clerk 認証ミドルウェアを全保護ルートに適用

### パフォーマンス

- Server Components 優先、`use client` の範囲を最小限に
- `next/image` で画像最適化

### アクセシビリティ

- セマンティック HTML、ARIA ラベル、キーボードナビゲーション対応

### デザインポリシー

UI/UX作業時は `.claude/skills/ui-ux-pro-max/SKILL.md` を参照。

**核心: 「全部ちゃんとやる」がAI生成感の正体。「何を捨てるか」がデザイン。**

**デザイン・レイアウトの鉄則: 一般的に寄るな。意図を持った方向に鋭く尖れ。** DAWやプロオーディオ機器のUIのように、目的に特化した尖ったデザインを選べ。迷ったら「安全な中央値」ではなく「このUIは何のために存在するか」から逆算して決断せよ。

---

## Commands（スラッシュコマンド）

| コマンド | 用途 |
|---------|------|
| `/commit` | 変更をステージング・コミット・プッシュ |
| `/pr` | Pull Request作成（タイトル・本文自動生成） |
| `/security` | セキュリティ監査（認証・API・DB・決済） |
| `/build-fix` | ビルドエラー自動検出・修正ループ |

---

## Skills（詳細ガイド）

特定の作業時は `.claude/skills/` の該当スキルを参照：

| スキル | 用途 |
|-------|------|
| `ui-ux-pro-max` | UI/UX設計、glassmorphism、アクセシビリティ |
| `tdd` | テスト駆動開発（RED→GREEN→REFACTOR） |
| `backend-patterns` | APIルート、Repository、バリデーション規約 |
| `database` | DB操作、マイグレーション、スキーマ変更 |
| `muedial-api` | MUEDial RoEx API仕様、認証、決済フロー |
| `video-branding` | MUEDear動画ブランディング（カラー・フォント・マスコット） |
| `threads-insight` | Threads短文投稿の気づき抽出ルール |
| `mcp` | MCPサーバーの作成・修正・使用 |
| `hooks` | Claude Code Hookの作成・修正 |
| `git-worktree` | ブランチ操作、worktree作成・削除 |
| `coding-rules` | コード実装、レビュー |
| `ai-models` | AIモデル使用、OpenAI API呼び出し |
| `web-performance` | Core Web Vitals最適化、パフォーマンス改善 |
| `mued-onboarding` | オンボーディング設計・改善 |

---

## 関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [docs/guides/mcp-implementation-guide.md](docs/guides/mcp-implementation-guide.md) | MCP サーバー実装詳細 |
| [docs/guides/database-operations.md](docs/guides/database-operations.md) | DB マイグレーション詳細 |

---

## 運用上の注意（過去のインシデントに基づく）

- **Vercel CLIで直接デプロイしない**: featureブランチがProductionにデプロイされ本番が壊れた。デプロイは `git push` 経由の自動デプロイのみ。再デプロイはVercelダッシュボードから
- **`echo` でVercel環境変数を設定すると末尾改行が混入する**: `printf 'value' | vercel env add` を使うこと
- **価格改定は全レイヤーを網羅する**: Stripe定数 → UI → 翻訳(EN/JA) → AIプロンプト → テスト期待値。grepで旧価格を一掃してから検証
- **PoCは全フロー通るまで完了と言わない**: 一部動作だけでPR提案しない。エンドツーエンドで通して初めてPoC完了

---

## opusplan 運用と plan mode の出入りルール（2026-04-14〜）

本peerは 起動時に `--model` フラグで動作モードが指定されている（`_conductor/scripts/start-all-peers-ghostty.sh` 参照）。

### plan mode の出入りは「タスク単位」で行う

1つのタスク内で plan mode を複数回出入りしない。**1タスク = 0回または1回の plan 発動**を原則とする。

#### 背景

plan mode の出入りに伴う Opus/Sonnet 自動切替は、内部的に「会話履歴の再処理コスト」が乗る（template課調査結果）。長セッションで plan mode を頻繁に出入りする peer は、想定より消費が膨らむ可能性がある。本案の Opus 消費見込み（現状100 → v2適用後20-35）は、plan modeが必要なタスクで1回ずつ発動する前提で計算している。

#### 具体運用

- 「設計しながら少し実装、また設計に戻る」という細切れの切り替えは禁止
- 設計が必要なら最初に `/plan` を発動し、設計が完了したら plan mode を解除して実装に移る
- 実装中に追加の設計判断が必要になったら、その時点でのタスクを一旦完了し、**新しいタスク**として次の `/plan` を発動する
- 同一タスク内で複数回の切替が必要になるケースは、タスク粒度が大きすぎる兆候。タスクを分割する

#### 判定フロー

タスク開始時に以下の順で判定する:

1. このタスクは発動条件（本peerの `/plan 発動条件` セクション）に該当するか
2. 該当する場合: 最初に `/plan` を発動して設計を完了させる → plan mode解除 → 実装
3. 該当しない場合: Sonnet のまま実装
4. 実装中に設計判断が必要になったら → 今のタスクをまず完了し、次のタスクで改めて `/plan` 発動

#### 禁止パターン

- plan mode → 実装（部分的）→ plan mode → 実装（部分的）→ plan mode ... のような繰り返し切替
- 「設計が足りないかも」と感じた時点で plan mode に戻る（戻らず次タスクに分ける）
- 一つの長大タスクを plan mode のまま完走する（plan mode は設計段階のみ、実装で Sonnet に戻す）

#### タスク分割の目安

- 1タスク = 1コミットに収まる粒度を目安にする
- plan mode で決めた設計が 3ファイル以上の変更を伴う場合は、ファイル単位で実装タスクを分割してもよい
- その場合、分割後のタスクは通常 Sonnet で実装するだけで済む（設計は最初の `/plan` で終わっているため）

---

## /plan 発動条件

本peerは opusplan モードで動作する。/plan を発動した時のみ Opus が呼ばれ、
それ以外は Sonnet で動作する。

### 発動条件 = 既存 Plan Mode Policy を継承

`/Users/kimny/Dropbox/_DevProjects/CLAUDE.md` に定義されている Plan Mode Policy を、opusplan 運用下での /plan 発動条件として**そのまま**使う。

**Plan Mode 必須（以下のいずれかに該当）**:
- 3ファイル以上を変更する
- 新しいAPIエンドポイントを追加する
- DBスキーマに影響する
- 既存の公開インターフェースを変更する
- 新しい外部サービス・ライブラリを導入する

**Plan Mode 不要**:
- 1-2ファイルの修正（バグ修正、テキスト変更、設定変更等）
- ドキュメント・コメントのみの変更
- 既存パターンの踏襲（同じ構造のページ追加等）
- ただし、既存パターンの踏襲（同じ構造のページ追加・callsite追加・同一analyticsパターン流用等）は3+ファイルでもPlan不要

opusplan 運用開始（2026-04-14）以降、これらの条件に該当するタスクは**先に /plan を発動**して設計を Opus で確定させてから Sonnet で実装に入る。条件に該当しないタスクは Sonnet のまま直接実装する。

---

## 異常値検出時の即時/plan発動ルール（mued課固有）

定点確認中に以下を検知した場合、次のアクション前に /plan を発動する。

- Stripe 決済失敗率: 直近24時間で 5%超（成功/失敗ログから算出）
- Vercel / Next.js ビルドエラー: 本番ブランチで2件以上連続
- Neon DB エラー率: Drizzle ORM エラーログが前日比 +200%超
- Core Web Vitals LCP: 2.5s 超（Lighthouse CI アラート検知）
- Clerk 認証エラー: 連続5件以上（middleware rejected rate）

閾値未達 → 定常確認として Sonnet のまま継続。

---

*最終更新: 2026-04-23*
