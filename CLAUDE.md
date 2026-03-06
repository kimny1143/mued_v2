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

**MUED LMS v2** - 音楽教育管理システム

### 技術スタック

| カテゴリ | 技術 |
|---------|------|
| **Frontend** | Next.js 15.5 (App Router), React 19, TypeScript, TailwindCSS 4 |
| **Backend** | Next.js API Routes, Clerk認証 |
| **Database** | Neon PostgreSQL, Drizzle ORM |
| **Payments** | Stripe |
| **AI** | OpenAI (本番), Claude (開発/MCP経由) |
| **Testing** | Vitest (unit), Playwright (E2E) |

### アーキテクチャ

- **App Router**: ファイルベースルーティング、Server Components優先
- **Repository パターン**: データアクセス抽象化 (`lib/repositories/`)
- **サービス層**: ビジネスロジック分離 (`lib/services/`)
- **DI**: 依存性注入でテスタビリティ確保 (`lib/di/`)

---

## ディレクトリ構造

```
mued_v2/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 認証関連ページ
│   ├── api/               # APIルート
│   └── dashboard/         # ダッシュボード
├── apps/                   # サブアプリケーション（別リポジトリ）
│   ├── muednote-hub-macos/ # macOS DAW Hub アプリ
│   ├── muednote-mobile/   # モバイルアプリ
│   ├── muedear/           # 耳コピ支援アプリ
│   └── muednote-poc/      # POC実験用
├── components/             # UIコンポーネント
│   ├── ui/                # 基本UIパーツ
│   ├── features/          # 機能別コンポーネント
│   ├── layouts/           # レイアウト
│   └── providers/         # Context Providers
├── db/                     # データベース
│   ├── schema/            # Drizzle スキーマ
│   └── migrations/        # マイグレーションSQL
├── docs/                   # ドキュメント
├── hooks/                  # カスタム React Hooks
├── lib/                    # コアロジック
│   ├── actions/           # Server Actions
│   ├── ai/                # AI関連
│   ├── repositories/      # データアクセス層
│   ├── services/          # ビジネスロジック
│   └── utils/             # ユーティリティ
├── scripts/mcp/            # MCP サーバー
├── tests/                  # ユニット・統合テスト
├── e2e/                    # E2Eテスト (Playwright)
└── types/                  # TypeScript型定義
```

---

## 重要な注意事項

### グローバルリリース・i18n

- **MUEDnoteは全世界向けにリリース**（日本限定ではない）
- **英語・日本語の両方を正式サポート**
- 開発者が日本語話者のため開発中は日本語が混ざることがあるが、プロダクトは多言語対応が前提
- ランディングページ: `next-intl` + サブパスルーティング (`/ja`, `/en`)
- ダッシュボード: `LocaleProvider` + `localStorage` による言語切り替え
- **新規UIを追加する際は必ずi18n対応すること**

### セキュリティ

- 環境変数は `.env.local` で管理（Git にコミットしない）
- API キーをコードに直接書かない
- Clerk 認証ミドルウェアを全保護ルートに適用

### パフォーマンス

- Server Components 優先
- `use client` の範囲を最小限に
- `next/image` で画像最適化

### アクセシビリティ

- セマンティック HTML
- ARIA ラベル適切に設定
- キーボードナビゲーション対応

### デザインポリシー

UI/UX作業時は `.claude/skills/ui-ux-pro-max/SKILL.md` を参照。

**核心: 「全部ちゃんとやる」がAI生成感の正体。「何を捨てるか」がデザイン。**

### Video Branding (MUEDear)

- Primary: #F5A623 (Hoo amber)
- Background: #1A1A2E (app dark)
- Accent: #4f46e5 (MUED CTA indigo)
- Text: #FFFFFF
- Muted: #94a3b8
- Game Colors: mufreq=#F5A623, mucomp=#7D9B76, murush=#EF4444, muverb=#3B82F6, mupan=#8B5CF6, muhorse=#14B8A6
- Font Heading: Geist Sans
- Font Body: Geist Sans
- Mascot: Hoo (owl, public/hoo-animated.svg)

---

## Commands（スラッシュコマンド）

頻繁に使う操作は `.claude/commands/` のコマンドを使用：

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
| `ui-ux-pro-max` | UI/UX設計、glassmorphism、**アクセシビリティ（WCAG）** |
| `tdd` | テスト駆動開発（RED→GREEN→REFACTOR） |
| `backend-patterns` | APIルート、Repository、バリデーション規約 |
| `database` | DB操作、マイグレーション、スキーマ変更 |
| `mcp` | MCPサーバーの作成・修正・使用 |
| `hooks` | Claude Code Hookの作成・修正 |
| `git-worktree` | ブランチ操作、worktree作成・削除 |
| `coding-rules` | コード実装、レビュー |
| `ai-models` | AIモデル使用、OpenAI API呼び出し |
| `web-performance` | Core Web Vitals最適化、パフォーマンス改善 |

---

## 関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [docs/guides/mcp-implementation-guide.md](docs/guides/mcp-implementation-guide.md) | MCP サーバー実装詳細 |
| [docs/guides/database-operations.md](docs/guides/database-operations.md) | DB マイグレーション詳細 |

---

## 学習メモ

### Patterns（推奨パターン）

- **gitignoreの効率的な書き方**: 個別ファイル列挙より `*` で全て無視して `!` でホワイトリスト指定する方が管理しやすい。例: `.claude/skills/*` + `!.claude/skills/ai-models/` (2026-01-21)

- **ブランチ作成の判断基準**: 実装開始前にリスク判断を行い、高リスクならブランチを提案する (2026-01-24)

- **UIコンポーネントのテンプレート化は最優先**: 同じスタイルが2箇所以上で使われる場合、最初からコンポーネント化すべき。CTAボタンが6箇所に直書きされていてスタイル変更時に全箇所手動更新が必要だった。`components/ui/cta-button.tsx` のように共通化することで保守性向上 (2026-01-27)
  | 観点 | 低リスク（直接コミット可） | 高リスク（ブランチ推奨） |
  |------|--------------------------|------------------------|
  | ファイル数 | 1-2個 | 5個以上 |
  | 変更の性質 | typo修正、コメント追加 | 構造変更、リファクタ、最適化 |
  | 影響範囲 | 局所的 | ページ全体、コア機能 |
  | ロールバック | 簡単 | 複雑 |

- **参照ブランドが指定されたら徹底比較する**: 「Spitfireレベルにして」等の指示では、そのサイトを実際に確認し、ボタンサイズ・余白・画像比率等を具体的に比較すること。最初の実装でボタンが大きすぎたのは、参照サイトの実寸を確認せずに「それっぽく」作ったため (2026-02-02)

- **プレミアムデザインの公式**: `Premium = (画像の質 × サイズ) + 余白 - 装飾`。backdrop-blur、グロー、hover:scale等の効果を足すほどAI生成感が増す。Spitfire/Native Instruments等のプレミアムサイトは「大きな画像 + 最小テキスト + 単色背景」で構成されている (2026-02-02)

- **大規模リファクタは「新規作成→呼び出し元更新→検証」の3段階で**: コードの移動・抽出リファクタは Phase 1（新ファイル作成、既存コードに影響なし）→ Phase 2（importの差し替え）→ Phase 3（typecheck/build/test）の順序で行うと安全。Phase 1では何も壊れないため、安心して並行作成できる (2026-02-11)

- **re-export barrelパターンでimport元を維持**: ファイルを別ディレクトリに移動する際、元のファイルを `export { ... } from './new-location'` のre-export barrelに変換すると、既存のimporter全てが変更不要になる。`hoo-prompt.ts` → `prompts/hoo.ts` 移動時に4箇所のimportを変更せずに済んだ (2026-02-11)

- **AIプロンプトは `lib/ai/prompts/{feature}.ts` に集約する**: 規約として確立。1機能 = 1ファイル、フラット構造、ケバブケース。各ファイルに `*_PROMPT_VERSION` を定義。詳細は `docs/muedlobe/muedlobe-ui-brushup-proposal.md` 参照不要、コード内の `lib/ai/prompts/` が正 (2026-02-11)

### Gotchas（落とし穴）

- **シンボリックリンクとgit**: ファイル→シンボリックリンクに変更すると `typechange` としてgitに検出される。シンボリックリンク自体をコミットするか、.gitignoreで除外するか事前に決める必要あり (2026-01-21)

- **スキルファイルは別リポジトリで集中管理**: `.claude/skills/` 内のスキルは `/Users/kimny/Dropbox/_DevProjects/claude-code-template` へのシンボリックリンク。スキルを編集すると `claude-code-template` リポジトリ側に変更が反映される。コミットもそちらで行う。`mued_v2` の git status には表示されない (2026-02-01)

- **マーケティングと実装の乖離に注意**: プラン画面（translations.ts）に書いた機能が実装されているか、tier制限が実際にかかっているか確認すること。今回「ダッシュボード・エクスポート」は未実装、「DAWログ連携」はtier制限なしだった (2026-01-21)

- **db:pushでカラム削除警告が出たらスキーマ確認**: Drizzleの`db:push`で「You're about to delete X column」警告が出たら、DBに存在するカラムがスキーマ定義に不足している。マイグレーションを直接実行するか、スキーマを修正すること (2026-01-21)

- **テストの期待値は実装に追従させる**: 価格変更などの後、関連するテストの期待値も更新が必要。translations.test.tsで古い価格がハードコードされていてCIが落ちた (2026-01-21)

- **設計を複雑に考えすぎない**: macOS HubアプリはDAWログを取得してAPIに送るシンプルなラッパー。認証も他のMUEDnote APIと同じClerk JWTパターン。PATシステム等を複雑に考えすぎた。「本質は何か」を最初に確認すべき (2026-01-21)

- **CLAUDE.mdの情報を鵜呑みにしない**: ディレクトリ構造等の情報は古くなっている可能性あり。実際のファイルシステムを `ls` で確認してから言及すること (2026-01-21)

- **計画モードの決定事項が実装時に引き継がれない**: 計画モードで決めた手順（ブランチ作成等）が、実装モードに移行した際に忘れられることがある。計画書には技術的ステップだけでなく、gitワークフロー（ブランチ作成、PR作成等）も明記すること (2026-01-25)

- **Glassmorphism とコントラスト**: 半透明背景 (bg-white/5, bg-black/45等) では下層のコンテンツと混ざり、実効背景色が変わる。`text-slate-*` は使わず `text-white` または `text-white/80` 以上を使用。バッジは同系色 (indigo on indigo) を避け、コントラスト比 4.5:1 以上を確保。UI/UX スキル参照 (2026-01-25)

- **インポート文の部分編集で既存を消さない**: `import { useState, useEffect } from "react"` を編集して新しいものを追加する際、既存の `useEffect` 等を誤って削除しがち。インポート行全体を確認してから編集すること (2026-01-27)

- **public/画像差し替え時のキャッシュ**: `public/` 内の画像ファイルを差し替えた場合、Next.jsの画像最適化キャッシュが残る。`rm -rf .next` でキャッシュクリア → 開発サーバー再起動 → ブラウザでハードリフレッシュ (`Cmd+Shift+R`) が必要 (2026-01-27)

- **決断を求められたら決断せよ**: 「お好みで」「どちらでも」は禁止。根拠を添えて一つを推奨すること。UI/UXスキルの行動原則参照 (2026-01-29)

- **「もっと良くして」は具体的に分解する**: ユーザーが抽象的な改善要求をした場合、最初に具体的な問題点を列挙してもらうこと。今回「ボタンが大きすぎる」「背景が寂しい」等の具体的フィードバックがあって初めて適切に対応できた (2026-02-02)

- **プロンプトファイル↔サービスの循環依存に注意**: `lib/ai/prompts/interviewer.ts` が `interviewer.service.ts` の型をimportし、サービス側がプロンプトをimportすると循環依存になる。プロンプトファイル側にローカル型（`InterviewerPromptInput`）を定義して回避すること (2026-02-11)

---

## MUEDial (RoEx Tonn API)

### 概要
AIミキシング/マスタリングサービス。RoEx Tonn APIを使用。ゲストアクセス対応（ログイン不要で単品購入可能）。

### アーキテクチャ
- **認証**: `withDialAuth` — Clerk auth と `X-Dial-Guest-Token` ヘッダーの両対応
- **ミドルウェア**: `/dial` と `/api/dial` は Clerk middleware matcher から**完全除外**（`clerkMiddleware`はpublicルートでもCookie存在時にハンドシェイクリダイレクトするため）
- **決済**: Stripe先払い → webhook (`metadata.service === 'dial'`) → `paymentStatus: paid` → Upload解放
- **クライアント**: `lib/roex/` — upload, mixing, mastering, analysis

### RoEx Tonn API
- **認証**: Google API key をクエリパラメータで渡す (`?key=API_KEY`)。Bearer tokenではない
- **全エンドポイントPOST only**（GETは405）
- **devキー**: ダミーデータ返却。**prodキー**: 実オーディオ処理（クレジット消費）

| 操作 | エンドポイント | ボディのラッパーキー |
|------|-------------|-------------------|
| Upload URL | `/upload` | なし (`{ filename, contentType }`) |
| Mix Preview 投入 | `/mixpreview` | `multitrackData` |
| Mix Preview 取得 | `/retrievepreviewmix` | `multitrackData` |
| Final Mix 投入 | `/applyaudioeffects` | `applyAudioEffectsData` |
| Final Mix 取得 | `/retrievefinalmix` | `applyAudioEffectsData` (trackData min 2) |
| Mastering Preview 投入 | `/masteringpreview` | `masteringData` |
| Mastering Preview 取得 | `/retrievepreviewmaster` | `masteringData` |
| Mastering Final 取得 | `/retrievefinalmaster` | `masteringData` |

### Enum マッピング（UI → RoEx）
- **Musical Style**: `pop`→`POP`, `rock`→`ROCK_INDIE`, `hiphop`→`HIPHOP_GRIME`, `electronic`→`ELECTRONIC`, `classical`→`ORCHESTRAL`, `metal`→`METAL`, etc.
- **Instrument Group**: `VOCAL`→`VOCAL_GROUP`, `BASS`→`BASS_GROUP`, `DRUMS`→`DRUMS_GROUP`, `GUITAR`→`ACOUSTIC_GUITAR_GROUP`, `KEYS`→`KEYS_GROUP`, etc.

---

*最終更新: 2026-03-07*
