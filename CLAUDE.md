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
| [docs/guides/figma-workflow.md](docs/guides/figma-workflow.md) | Figma → コード実装手順 |
| [docs/mcp/mcp-implementation-guide.md](docs/mcp/mcp-implementation-guide.md) | MCP サーバー実装詳細 |
| [docs/database/database-operations.md](docs/database/database-operations.md) | DB マイグレーション詳細 |

---

## 学習メモ

### Patterns（推奨パターン）

- **gitignoreの効率的な書き方**: 個別ファイル列挙より `*` で全て無視して `!` でホワイトリスト指定する方が管理しやすい。例: `.claude/skills/*` + `!.claude/skills/ai-models/` (2026-01-21)

- **ブランチ作成の判断基準**: 実装開始前にリスク判断を行い、高リスクならブランチを提案する (2026-01-24)
  | 観点 | 低リスク（直接コミット可） | 高リスク（ブランチ推奨） |
  |------|--------------------------|------------------------|
  | ファイル数 | 1-2個 | 5個以上 |
  | 変更の性質 | typo修正、コメント追加 | 構造変更、リファクタ、最適化 |
  | 影響範囲 | 局所的 | ページ全体、コア機能 |
  | ロールバック | 簡単 | 複雑 |

### Gotchas（落とし穴）

- **シンボリックリンクとgit**: ファイル→シンボリックリンクに変更すると `typechange` としてgitに検出される。シンボリックリンク自体をコミットするか、.gitignoreで除外するか事前に決める必要あり (2026-01-21)

- **マーケティングと実装の乖離に注意**: プラン画面（translations.ts）に書いた機能が実装されているか、tier制限が実際にかかっているか確認すること。今回「ダッシュボード・エクスポート」は未実装、「DAWログ連携」はtier制限なしだった (2026-01-21)

- **db:pushでカラム削除警告が出たらスキーマ確認**: Drizzleの`db:push`で「You're about to delete X column」警告が出たら、DBに存在するカラムがスキーマ定義に不足している。マイグレーションを直接実行するか、スキーマを修正すること (2026-01-21)

- **テストの期待値は実装に追従させる**: 価格変更などの後、関連するテストの期待値も更新が必要。translations.test.tsで古い価格がハードコードされていてCIが落ちた (2026-01-21)

- **設計を複雑に考えすぎない**: macOS HubアプリはDAWログを取得してAPIに送るシンプルなラッパー。認証も他のMUEDnote APIと同じClerk JWTパターン。PATシステム等を複雑に考えすぎた。「本質は何か」を最初に確認すべき (2026-01-21)

- **CLAUDE.mdの情報を鵜呑みにしない**: ディレクトリ構造等の情報は古くなっている可能性あり。実際のファイルシステムを `ls` で確認してから言及すること (2026-01-21)

- **計画モードの決定事項が実装時に引き継がれない**: 計画モードで決めた手順（ブランチ作成等）が、実装モードに移行した際に忘れられることがある。計画書には技術的ステップだけでなく、gitワークフロー（ブランチ作成、PR作成等）も明記すること (2026-01-25)

---

*最終更新: 2026-01-25*
