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
├── apps/                   # サブアプリケーション
│   └── muednote-v3/       # Tauri デスクトップアプリ
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

## Skills（詳細ガイド）

特定の作業時は `.claude/skills/` の該当スキルを参照：

| スキル | 用途 |
|-------|------|
| `database` | DB操作、マイグレーション、スキーマ変更 |
| `mcp` | MCPサーバーの作成・修正・使用 |
| `hooks` | Claude Code Hookの作成・修正 |
| `git-worktree` | ブランチ操作、worktree作成・削除 |
| `coding-rules` | コード実装、レビュー |
| `ai-models` | AIモデル使用、OpenAI API呼び出し |

---

## 関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [docs/guides/figma-workflow.md](docs/guides/figma-workflow.md) | Figma → コード実装手順 |
| [docs/mcp/mcp-implementation-guide.md](docs/mcp/mcp-implementation-guide.md) | MCP サーバー実装詳細 |
| [docs/database/database-operations.md](docs/database/database-operations.md) | DB マイグレーション詳細 |

---

*最終更新: 2025-12-19*
