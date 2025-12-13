# CLAUDE.md

Claude Code がこのリポジトリで作業する際のガイドライン。

## 目次

1. [クイックスタート](#クイックスタート)
2. [プロジェクト概要](#プロジェクト概要)
3. [ディレクトリ構造](#ディレクトリ構造)
4. [開発ワークフロー](#開発ワークフロー)
5. [コーディング規約](#コーディング規約)
6. [データベース運用](#データベース運用)
7. [MCP サーバー](#mcp-サーバー)
8. [Claude Code Hooks](#claude-code-hooks)
9. [Git Worktree](#git-worktree)

---

## クイックスタート

### 環境構築（初回のみ）

```bash
# 依存関係インストール
npm install

# 環境変数設定
cp .env.local.example .env.local
# .env.local を編集して各種キーを設定

# データベース接続確認
npm run db:test-connection
```

### 開発サーバー起動

```bash
npm run dev
```

### テスト実行

```bash
npm run test           # ユニットテスト
npm run test:e2e       # E2Eテスト
npm run typecheck      # 型チェック
npm run lint           # Lint
```

### ビルド

```bash
npm run build
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
│   ├── dashboard/         # ダッシュボード
│   └── ...
├── apps/                   # サブアプリケーション
│   └── muednote-v3/       # Tauri デスクトップアプリ
├── components/             # UIコンポーネント
│   ├── ui/                # 基本UIパーツ (Button, Card, etc.)
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
├── scripts/                # スクリプト
│   └── mcp/               # MCP サーバー
├── tests/                  # テスト
│   ├── unit/              # ユニットテスト
│   └── integration/       # 統合テスト
├── e2e/                    # E2Eテスト (Playwright)
└── types/                  # TypeScript型定義
```

---

## 開発ワークフロー

### コミット規約

Conventional Commits 形式を使用：

```
feat: 新機能追加
fix: バグ修正
docs: ドキュメント
refactor: リファクタリング
test: テスト
chore: その他
```

### ブランチ戦略

```
main              # 本番
├── feature/*     # 機能開発
├── fix/*         # バグ修正
└── hotfix/*      # 緊急修正
```

### PR 作成時の確認事項

1. `npm run typecheck` パス
2. `npm run lint` パス
3. `npm run test` パス
4. 必要に応じて E2E テスト

---

## コーディング規約

### TypeScript/React

- Strict mode 有効
- 関数コンポーネント + Hooks
- Props 型定義必須
- `any` 禁止（やむを得ない場合はコメント必須）

### ファイル構成

- 1ファイル1コンポーネント
- 200行超えたら分割検討
- UI層とロジックを分離

### インポート順序

```typescript
// 1. React/Next.js
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// 2. 外部ライブラリ
import { clsx } from 'clsx';

// 3. 内部モジュール
import { Button } from '@/components/ui/button';

// 4. 型定義
import type { User } from '@/types';
```

### Server Components vs Client Components

```typescript
// デフォルト: Server Component（use client なし）
// データフェッチ、静的レンダリングに使用

// Client Component が必要な場合のみ
'use client';
// useState, useEffect, イベントハンドラ, ブラウザAPI使用時
```

---

## データベース運用

### 基本情報

- **プロバイダー**: Neon (Serverless PostgreSQL)
- **ORM**: Drizzle ORM
- **接続**: `@neondatabase/serverless`

### コマンド

```bash
npm run db:test-connection  # 接続テスト
npm run db:studio           # Drizzle Studio (GUI)
npm run db:migrate:phase2   # マイグレーション実行
```

### マイグレーションルール

**重要: 冪等性を確保すること**

```sql
-- ENUM型: 存在チェック必須
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'my_enum') THEN
    CREATE TYPE my_enum AS ENUM ('value1', 'value2');
  END IF;
END $$;

-- インデックス: IF NOT EXISTS 必須
CREATE INDEX IF NOT EXISTS idx_name ON table(column);

-- 外部キー: DO $$ブロックで存在チェック
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_name'
  ) THEN
    ALTER TABLE t ADD CONSTRAINT fk_name FOREIGN KEY (col) REFERENCES other(id);
  END IF;
END $$;
```

詳細: [docs/database/database-operations.md](docs/database/database-operations.md)

---

## MCP サーバー

### 登録済みサーバー

| サーバー | ファイル | 用途 |
|---------|---------|------|
| `mued_unit_test` | `mued-unit-test.js` | Vitest ユニットテスト実行 |
| `mued_e2e` | `mued-playwright-e2e.js` | Playwright E2E テスト実行 |
| `mued_material_generator` | `mued-material-generator-claude.js` | Claude による教材生成 |
| `mued_browser_debug` | `mued-browser-debug.js` | ブラウザデバッグ自動化 |
| `mued_screenshot` | `mued-playwright-screenshot.js` | スクリーンショット取得 |

### 使用例

```
「ユニットテスト実行して」→ mued_unit_test の run_unit_tests
「E2Eテスト実行して」→ mued_e2e の run_all_e2e_tests
「教材を生成して」→ mued_material_generator
```

### 新規MCP作成時の必須パターン

```javascript
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");

const server = new McpServer({ name: "server-name", version: "1.0.0" });

server.registerTool("tool_name", {
  description: "説明",
  inputSchema: { type: "object", properties: {}, required: [] }
}, async (params) => {
  return { content: [{ type: "text", text: "Result" }] };
});

const transport = new StdioServerTransport();
server.connect(transport);
```

詳細: [docs/mcp/mcp-implementation-guide.md](docs/mcp/mcp-implementation-guide.md)

---

## Claude Code Hooks

### 登録済み Hook

```
.claude/
├── hooks/
│   ├── suggest-claude-md-update.sh   # CLAUDE.md 更新提案
│   ├── suggest-poc-log-update.sh     # PoC ログ更新提案
│   └── suggest-git-cleanup.sh        # Git 整理提案
└── settings.local.json
```

### 1. CLAUDE.md 育成 Hook

**発火**: `git commit` 完了後（PostToolUse）

| 検知パターン | 提案 |
|-------------|------|
| `scripts/mcp/*.js` 追加 | MCP セクション追記 |
| `db/migrations/*.sql` 追加 | DB セクション追記 |
| `apps/`, `app/`, `components/`, `lib/` 新規ディレクトリ | 構造セクション追記 |
| `.claude/hooks/*.sh` 追加 | Hooks セクション追記 |

### 2. Git 整理 Hook

**発火**: 会話終了時（Stop）

| 検知パターン | 提案 |
|-------------|------|
| mainより古いworktree | 削除を検討 |
| mainにマージ済みのローカルブランチ | `git branch -d` で削除 |
| リモートで削除済みのブランチ | `git branch -D` で削除 |

### 動作仕様

- **出力**: stderr に提案メッセージ（ブロックなし）
- **判断**: 人間が決定（自動実行なし）

---

## Git Worktree

### 運用方針

**メインディレクトリは1つだけ。Worktreeは作業単位で一時的に使用する。**

```
~/Dropbox/_DevProjects/mued/
└── mued_v2/                              # メインリポジトリ（main）

~/.claude-worktrees/mued_v2/
└── xxx-yyy/                              # Claude Code が自動生成する一時worktree
```

### NG パターン

```
# 常設の複数ディレクトリは作らない
mued_v2/        # main
mued_v2-poc/    # ← これは冗長。同期の手間、どっちが最新か分からなくなる
```

### 正しいワークフロー

1. **作業開始**: Claude Code が worktree を自動生成
2. **作業中**: worktree 内でブランチ作成・コミット
3. **作業完了**: PR作成 → mainにマージ
4. **クリーンアップ**: worktree とブランチを削除

### コマンド

```bash
# 一覧表示
git worktree list

# 手動作成（通常は Claude Code が自動で行う）
git worktree add ~/.claude-worktrees/mued_v2/feature-xxx -b feature/xxx

# 削除
git worktree remove ~/.claude-worktrees/mued_v2/feature-xxx
git branch -d feature/xxx

# 一括クリーンアップ
git worktree prune && git fetch --prune
```

### 整理用 Hook

会話終了時に `suggest-git-cleanup.sh` が自動実行され、以下を検知して提案：
- mainより古いworktree
- mainにマージ済みのローカルブランチ
- リモートで削除済みのブランチ

---

## 関連ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| [docs/guides/figma-workflow.md](docs/guides/figma-workflow.md) | Figma → コード実装手順 |
| [docs/archive/ai-model-comparison.md](docs/archive/ai-model-comparison.md) | AI モデル選定・比較 |
| [docs/mcp/mcp-implementation-guide.md](docs/mcp/mcp-implementation-guide.md) | MCP サーバー実装詳細 |
| [docs/database/database-operations.md](docs/database/database-operations.md) | DB マイグレーション詳細 |

---

## 重要な注意事項

### AI モデル選定（重要）

**本プロジェクトでは GPT-4o を使用しない。**

| 用途 | 使用モデル | 理由 |
|-----|----------|------|
| **複雑な判断・分析** | GPT-5系 (`gpt-5`, `gpt-5.1`) | 推論能力が必要なタスク |
| **単純生成・会話** | GPT-4.1系 (`gpt-4.1-mini`) | max token節約、コスト効率 |
| **開発/テスト** | Claude (MCP経由) | 日本語品質、教育的コンテンツ |

**推論モデル vs 非推論モデルの使い分け:**
- GPT-5系は**推論モデル**：単純な生成タスクで使うとmax tokenが飽和する
- GPT-4.1系は**非推論モデル**：シンプルな生成に適している
- MUEDnoteの会話機能など単純生成には GPT-4.1系を使用

**実装時の注意:**
- 音楽教材生成（複雑）→ `gpt-5` または `gpt-5.1`
- 会話・単純生成 → `gpt-4.1-mini`
- GPT-4o は品質が低いため使用禁止
- o3, o4-mini は使用しない

詳細: [docs/archive/ai-model-comparison.md](docs/archive/ai-model-comparison.md)

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

*最終更新: 2025-12-13*
