# AGENTS.md

Codex がこのリポジトリで作業する際のガイドライン。

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
npm run test:unit                 # ユニットテスト（★CI が回すのはこれ・Docker 不要）
npm run test                      # ★全層 直列（unit+components+integration+e2e）。e2e/integration はローカル専用
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
| **Frontend** | Next.js 16.2 (App Router), React 19, TypeScript, TailwindCSS 4 |
| **Backend** | Next.js API Routes, Clerk認証 |
| **Database** | Neon PostgreSQL, Drizzle ORM |
| **Payments** | Stripe |
| **AI** | 本番=OpenAI（RAG・ドリル生成 `lib/ai/providers/openai.ts`）＋ Anthropic Claude（Hoo/dial の会話 `lib/ai/providers/claude.ts`・SDK 直呼び） / 開発=Codex (MCP 経由) |
| **Testing** | Vitest (unit), Playwright (E2E) |
| **Analytics** | GA4 (gtag.js + `lib/analytics/gtag.ts`), Vercel Analytics |

### アーキテクチャ

- **App Router**: ファイルベースルーティング、Server Components優先
- **Repository パターン**: データアクセス抽象化 (`lib/repositories/`)
- **サービス層**: ビジネスロジック分離 (`lib/services/`)

---

## 作業ルール

- **自己終了禁止**: ユーザーが明示的に終了を指示するまで、残タスクがある限り作業を続行すること。自己判断で切り上げない。ブロッカーがある場合はユーザーに報告して指示を仰ぐ。

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

UI/UX作業時は `.Codex/skills/ui-ux-pro-max/SKILL.md` を参照。

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

特定の作業時は `.Codex/skills/` の該当スキルを参照：

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
| `hooks` | Codex Hookの作成・修正 |
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

*最終更新: 2026-03-31*
