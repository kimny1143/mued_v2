# CLAUDE.md

このファイルは、Claude Code (claude.ai/code) がこのリポジトリのコードを扱う際のガイドラインを提供します。

## プロジェクト概要

**MUED LMS v2** - Next.js 15.5ベースの教育管理システム

### 技術スタック
- **Frontend**: Next.js 15.5.4 (App Router), React 19, TypeScript, TailwindCSS 4
- **Backend**: Clerk認証, Neon PostgreSQL, Drizzle ORM
- **Payments**: Stripe
- **AI**: OpenAI API
- **Testing**: Vitest (unit), Playwright (E2E)

### アーキテクチャパターン
- コンポーネント分離: `/components/ui`, `/components/features`, `/components/layouts`
- カスタムフック: `/hooks`
- Repository パターンによるデータアクセス抽象化

---

## MCP (Model Context Protocol) サーバー実装ルール

### 📋 必須ルール

#### ✅ 推奨パターン: McpServer + registerTool()

**新規MCPサーバーは必ずこのパターンを使用すること**

```javascript
// CommonJS (.js)
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");

const server = new McpServer({
  name: "server-name",
  version: "1.0.0"
});

server.registerTool(
  "tool_name",
  {
    title: "Tool Title",
    description: "Tool description",
    inputSchema: {
      type: "object",
      properties: {
        param: { type: "string", description: "Parameter description" }
      },
      required: ["param"]
    }
  },
  async (params) => {
    // Tool implementation
    return {
      content: [{
        type: "text",
        text: "Result"
      }]
    };
  }
);

// サーバー起動
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Server started successfully");
}

main().catch(console.error);
```

**理由:**
- 高レベルAPI、安全で宣言的
- `tools/list`と`tools/call`の配線が自動化
- 公式SDK README で「新規コードに推奨」と明記
- バグ混入の余地が少ない

---

#### ⚠️ 低レベルパターン: Server + setRequestHandler() (必要な場合のみ)

プロトコル層の細かい制御が必要な場合のみ使用：

```javascript
// ESM (.mjs)
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  { name: "server-name", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// ⚠️ 重要: 必ずSchemaオブジェクトを第1引数に渡すこと
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: "tool_name",
    description: "Tool description",
    inputSchema: {
      type: "object",
      properties: { param: { type: "string" } },
      required: ["param"]
    }
  }]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "tool_name":
      return {
        content: [{ type: "text", text: "Result" }]
      };
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

**注意事項:**
- `setRequestHandler`は必ず**Zodスキーマオブジェクト**を第1引数にする
- 文字列を渡すと実行時エラーになる

---

#### ❌ 絶対に使ってはいけないパターン

```javascript
// ❌ 間違い: 文字列を渡している
server.setRequestHandler("tools/list", async () => {...});
server.setRequestHandler("tools/call", async () => {...});

// エラー発生:
// TypeError: Cannot read properties of undefined (reading 'method')
// at protocol.js:369: const method = requestSchema.shape.method.value;
```

**なぜエラーになるか:**
- `setRequestHandler`の型定義は `<T extends ZodObject<{method: ZodLiteral<string>}>>`
- 第1引数は必ず`requestSchema.shape.method.value`を持つオブジェクトが必要
- 文字列には`.shape`プロパティが存在しない

---

### 📁 ファイル配置とネーミング

#### MCPサーバーファイルの配置
```
/scripts/mcp/
  ├── mued-playwright-e2e.js          # E2Eテスト用
  ├── mued-playwright-screenshot.js   # スクリーンショット撮影用
  ├── mued-complete-server.js         # 統合サーバー
  ├── test-server.js                  # テスト用サーバー
  └── debug-login.js                  # デバッグ用
```

#### ネーミング規則
- プレフィックス: `mued-` (プロジェクト名)
- 目的を明確に: `playwright-e2e`, `playwright-screenshot`
- 拡張子: `.js` (CommonJS) を推奨

#### Claude Desktop 設定
```json
{
  "mcpServers": {
    "mued_playwright_screenshot": {
      "command": "node",
      "args": ["/absolute/path/to/scripts/mcp/mued-playwright-screenshot.js"]
    }
  }
}
```

設定ファイル: `/Users/kimny/Library/Application Support/Claude/claude_desktop_config.json`

---

### 🔍 トラブルシューティング

#### MCPサーバーが起動しない場合

1. **ログを確認**
   ```bash
   tail -f "/Users/kimny/Library/Logs/Claude/mcp-server-{server_name}.log"
   ```

2. **よくあるエラー**

   **エラー: `Cannot read properties of undefined (reading 'method')`**
   - 原因: `setRequestHandler`に文字列を渡している
   - 解決: `ListToolsRequestSchema`などのSchemaオブジェクトを使う、または`registerTool()`に切り替え

   **エラー: `Module not found`**
   - 原因: `@modelcontextprotocol/sdk`がインストールされていない
   - 解決: `npm install @modelcontextprotocol/sdk`

3. **動作確認**
   - Claude Desktopを再起動
   - 設定でサーバーが緑色（接続済み）になっているか確認
   - ツールが利用可能リストに表示されるか確認

---

### 📚 参考リソース

- [MCP TypeScript SDK 公式リポジトリ](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP 公式ドキュメント](https://modelcontextprotocol.io/)
- SDK バージョン: `@modelcontextprotocol/sdk@1.18.2`

---

## Figma デザイン → コード実装ワークフロー

### 🎯 基本原則

**✅ 必須: Figma REST API または Figma MCP サーバー経由でデザインを取得**

**❌ 厳禁: スクリーンショットからの直接実装**
- スクリーンショットはプレビュー・確認用途のみ
- 実装時は必ずFigma APIまたはMCPサーバーから正確なデザイン仕様を取得
- 理由: 色・サイズ・スペーシング等の精度が著しく低下するため

---

### ワークフロー手順

#### 1. Figma Desktop でコンポーネント化

1. デザイン要素（ボタン、カード、入力フィールド等）を選択
2. 右クリック → **「コンポーネントを作成」** (Cmd/Ctrl + Option + K)
3. 適切な命名（例: `buttonPrimary`, `cardDashboard`, `inputText`）

#### 2. Figma REST API で仕様を取得

```bash
# 環境変数
export FIGMA_FILE_KEY="78YAYofOn7AjLsDypdCnp6"
export FIGMA_ACCESS_TOKEN="your_access_token"

# ファイル全体を取得
curl -H "X-Figma-Token: $FIGMA_ACCESS_TOKEN" \
  "https://api.figma.com/v1/files/$FIGMA_FILE_KEY" \
  -o /tmp/figma-design.json

# コンポーネント一覧を確認
jq '.components | keys' /tmp/figma-design.json

# 特定のコンポーネント詳細を取得
jq '.. | objects | select(.id == "2:9689")' /tmp/figma-design.json
```

#### 3. デザイン仕様を解析

**取得すべき情報:**
- **色**: RGB値 → Hex変換 → `globals.css` に登録
- **サイズ**: width, height, padding, margin
- **角丸**: cornerRadius
- **フォント**: fontSize, fontWeight, fontFamily, lineHeight
- **シャドウ**: effects配列のDROP_SHADOW

**例:**
```json
{
  "backgroundColor": {"r": 0.459, "g": 0.738, "b": 0.067},
  "cornerRadius": 8.0,
  "paddingLeft": 16.0,
  "paddingRight": 16.0,
  "paddingTop": 8.0,
  "paddingBottom": 8.0
}
```

→ `bg-[#75bc11] rounded-lg px-4 py-2`

#### 4. グローバルCSS にデザイントークンを登録

```css
/* app/globals.css */
@theme inline {
  /* Figma Design System Colors */
  --color-brand-green: #75bc11;
  --color-brand-green-hover: #65a20f;
  --color-brand-green-active: #559308;
  --color-brand-text: #000a14;
}
```

#### 5. React/TypeScript コンポーネントを実装

```tsx
// components/ui/button.tsx
const variants = {
  default: 'bg-brand-green hover:bg-brand-green-hover text-brand-text',
  // ...
};
```

---

### Figma MCP サーバー経由（推奨）

**セットアップ:**

```bash
# Figma MCP サーバーを Claude Code に接続
claude mcp add --transport http figma-dev-mode-mcp-server http://127.0.0.1:3845/mcp

# 確認
claude mcp list
```

**使用方法:**

1. Figma Desktop で要素を選択
2. Claude Code に指示：
   ```
   Figmaで選択中のボタンを /components/ui/button.tsx として実装して
   ```
3. MCPサーバーが自動的にデザイン仕様を取得
4. コンポーネントを自動生成

**制限事項:**
- Figma Desktop アプリが起動している必要あり
- Dev seat または Full seat が必要（Professional/Organization/Enterprise プラン）
- ベータ版のため、一部機能が不安定な可能性あり

---

### トラブルシューティング

**Q: 色の値が正しく取得できない**

**A:** RGB値（0-1の範囲）をHexに変換：
```javascript
const rgbToHex = (r, g, b) => {
  const toHex = (n) => Math.round(n * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// RGB(0.459, 0.738, 0.067) → #75bc11
```

**Q: Figma API のレート制限に達した**

**A:**
- `/v1/files/:key/components` で対象を絞る
- 必要な node-ids だけを指定して取得
- キャッシュを活用（一度取得したJSONをローカル保存）

---

## 開発ワークフロー

### 開発サーバー起動
```bash
npm run dev
```

### テスト実行
```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Type check
npm run typecheck
```

### ビルド
```bash
npm run build
```

---

## Git Worktree による並行開発ワークフロー

### 🎯 Git Worktreeとは

Git worktree を使用すると、同じリポジトリの複数ブランチを**異なるディレクトリで同時に**チェックアウトできます。これにより、ブランチ切り替えに伴う再ビルド時間を大幅に削減し、緊急バグ修正やコードレビューを並行して進められます。

### 📁 標準ディレクトリ構成

```
~/Dropbox/_DevProjects/mued/
├── mued_v2/              # メイン開発用 (main or feature branch)
├── mued_v2-hotfix/       # 緊急修正用 (detached HEAD)
└── mued_v2-review/       # PRレビュー用 (detached HEAD)
```

### 🚀 基本コマンド

#### Worktree 一覧表示
```bash
git worktree list
```

#### 新しいWorktreeを作成
```bash
# detached HEAD で作成（推奨）
git worktree add --detach ../mued_v2-feature HEAD

# 特定のブランチで作成
git worktree add -b feature/new-feature ../mued_v2-feature main
```

#### Worktreeを削除
```bash
git worktree remove ../mued_v2-feature
```

### 💡 実践的な使用例

#### シナリオ1: 緊急バグ修正
```bash
# メインで開発中 (feature/payment-flow)
cd ~/Dropbox/_DevProjects/mued/mued_v2

# Slackで緊急バグ報告！
cd ../mued_v2-hotfix
git checkout main
git pull
git checkout -b hotfix/stripe-error

# 修正 → テスト → PR
npm run test
git add .
git commit -m "fix: resolve Stripe webhook error"
git push origin hotfix/stripe-error

# すぐに開発に戻る（stash不要！）
cd ../mued_v2
# feature/payment-flow の作業を継続
```

#### シナリオ2: チームメイトのPRレビュー
```bash
# メインで開発中
cd ~/Dropbox/_DevProjects/mued/mued_v2

# PRレビュー依頼が来た
cd ../mued_v2-review
gh pr checkout 456
npm run test:e2e
npm run build

# レビューコメント記入後、開発に戻る
cd ../mued_v2
# そのまま継続
```

#### シナリオ3: 複数機能の並行開発
```bash
# 新機能Aの開発開始
git worktree add -b feature/ai-tutor ../mued_v2-ai-tutor main
cd ../mued_v2-ai-tutor
npm install
npm run dev

# 別ターミナルで新機能Bも開始
cd ~/Dropbox/_DevProjects/mued/mued_v2
git worktree add -b feature/analytics ../mued_v2-analytics main
cd ../mued_v2-analytics
npm install
npm run dev --port 3001

# 両方のブラウザを開いて同時にテスト可能
```

### ⚡ メリット

1. **ビルド時間の節約**
   - Next.js ビルド: ~1-2分
   - ブランチ切り替え10回/日 = **15-25分/日の節約**
   - 各worktreeが独立したビルドキャッシュを保持

2. **コンテキストスイッチングの高速化**
   - `git stash` 不要
   - ディレクトリ移動だけ（< 5秒）
   - 開発中の作業がそのまま残る

3. **並行作業の実現**
   - 開発とレビューを同時進行
   - 緊急修正中も開発を中断しない
   - 複数の開発サーバーを同時起動可能

### ⚠️ 注意点

#### 1. node_modules の管理
各worktreeで個別にインストール推奨：
```bash
cd ../mued_v2-hotfix
npm install  # 独立したnode_modules
```

#### 2. 環境変数の共有
`.env.local` は各worktreeで共有されます：
```bash
# シンボリックリンクで共有（オプション）
cd ../mued_v2-hotfix
ln -s ../mued_v2/.env.local .env.local
```

#### 3. IDEサポート
- **VS Code / Cursor**: 各worktreeを別ウィンドウで開く
- **Claude Code**: 各worktreeのディレクトリで`claude`を起動

#### 4. 使い終わったら削除
```bash
# 不要になったworktreeは削除
git worktree remove ../mued_v2-feature-old
git worktree prune  # 参照を整理
```

### 📊 推奨される運用

#### 常設Worktree（2つ）
```bash
mued_v2-hotfix/   # 緊急修正用（常に最新のmainをpull）
mued_v2-review/   # PRレビュー用（チェックアウトして使用）
```

#### 一時的なWorktree
```bash
# 機能開発時に作成
git worktree add -b feature/new-feature ../mued_v2-new-feature main

# 完了後に削除
git worktree remove ../mued_v2-new-feature
```

### 🔍 トラブルシューティング

**Q: 「'main' is already used by worktree」エラー**
```bash
# detached HEAD で作成
git worktree add --detach ../mued_v2-temp HEAD

# または明示的に新しいブランチを指定
git worktree add -b temp-branch ../mued_v2-temp main
```

**Q: Worktreeが残っているか確認したい**
```bash
git worktree list
```

**Q: 削除したWorktreeの参照が残っている**
```bash
git worktree prune
```

---

## コーディング規約

### TypeScript/React
- Strict mode有効
- 関数コンポーネント + hooks使用
- Props型定義必須
- `any`型の使用禁止（やむを得ない場合はコメントで理由を明記）

### ファイル構成
- 1ファイル1コンポーネント原則
- 200行を超える場合は分割を検討
- UI層とビジネスロジックの分離

### インポート順序
1. React/Next.js
2. 外部ライブラリ
3. 内部モジュール (`@/`)
4. 相対パス
5. 型定義

---

## 重要な注意事項

### セキュリティ
- 環境変数は`.env.local`で管理（Gitにコミットしない）
- APIキーやシークレットをコードに直接書かない
- Clerk認証のミドルウェアを全保護ルートに適用

### パフォーマンス
- Server Componentsを優先使用
- Client Componentは最小限（`use client`の範囲を限定）
- 画像は`next/image`で最適化

### アクセシビリティ
- セマンティックHTML使用
- ARIAラベル適切に設定
- キーボードナビゲーション対応

---

## Neon PostgreSQL データベース運用

### データベース構成

- **プロバイダー**: Neon (Serverless PostgreSQL)
- **ORM**: Drizzle ORM
- **接続方法**: `@neondatabase/serverless` パッケージ
- **環境変数**: `DATABASE_URL` (`.env.local`に設定)

### マイグレーション管理

#### 🔧 基本コマンド

```bash
# データベース接続テスト
npm run db:test-connection

# Phase 2マイグレーション実行
npm run db:migrate:phase2

# Drizzle Studio（データベースGUI）
npm run db:studio
```

#### 📝 マイグレーションファイルの作成ルール

**重要: Neon PostgreSQLでは以下の構文に注意**

1. **ENUM型の作成** - 存在チェック必須
```sql
-- ❌ NG: 再実行時にエラー
CREATE TYPE content_type AS ENUM ('material', 'note_article');

-- ✅ OK: 冪等性を保証
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_type') THEN
    CREATE TYPE content_type AS ENUM ('material', 'note_article');
  END IF;
END $$;
```

2. **インデックスの作成** - IF NOT EXISTS必須
```sql
-- ❌ NG: 再実行時にエラー
CREATE INDEX idx_user_email ON users(email);

-- ✅ OK: 冪等性を保証
CREATE INDEX IF NOT EXISTS idx_user_email ON users(email);
```

3. **外部キー制約** - 存在チェック必須
```sql
-- ❌ NG: ALTER TABLE ADD CONSTRAINT IF NOT EXISTSは非対応
ALTER TABLE ai_dialogue_log
ADD CONSTRAINT IF NOT EXISTS fk_user
FOREIGN KEY (user_id) REFERENCES users(id);

-- ✅ OK: DO $$ブロックで存在チェック
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_user'
  ) THEN
    ALTER TABLE ai_dialogue_log
    ADD CONSTRAINT fk_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;
```

4. **トリガーの作成** - 存在チェック必須
```sql
-- ✅ OK: トリガーも DO $$ブロックで
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_table_updated_at'
  ) THEN
    CREATE TRIGGER update_table_updated_at
      BEFORE UPDATE ON table_name
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
```

#### 🎯 マイグレーション実行のベストプラクティス

1. **テスト接続**: 必ず最初に接続テスト
   ```bash
   npm run db:test-connection
   ```

2. **冪等性の確保**: 全てのDDL文は再実行可能に
   - `CREATE TABLE IF NOT EXISTS`
   - `CREATE INDEX IF NOT EXISTS`
   - ENUM/制約/トリガーは`DO $$`ブロックで存在チェック

3. **トランザクション管理**: Neon SDKの制約
   - 単一のSQL文のみサポート
   - 複数文を実行する場合は個別に分割
   - `BEGIN; ... COMMIT;`は使用不可（自動トランザクション）

4. **ロールバック準備**: 緊急時のロールバックスクリプトを用意
   ```bash
   npx tsx scripts/rollback-phase2.ts
   ```

### Neon固有の制約と対処法

| 制約 | 対処法 |
|------|--------|
| 複数SQL文の一括実行不可 | 文を分割して個別実行 |
| `ALTER TABLE ADD CONSTRAINT IF NOT EXISTS` 非対応 | `DO $$`ブロックで存在チェック |
| ローカルpostgresqlとの接続方法の違い | `@neondatabase/serverless`を使用 |

### トラブルシューティング

**Q: `type "xxx" already exists` エラー**
- **原因**: ENUM型を`CREATE TYPE`で直接作成している
- **解決**: `DO $$`ブロックで存在チェックを追加

**Q: `relation "xxx" already exists` エラー（インデックス）**
- **原因**: `CREATE INDEX`に`IF NOT EXISTS`がない
- **解決**: `CREATE INDEX IF NOT EXISTS`に変更

**Q: `trigger "xxx" for relation "yyy" already exists`**
- **原因**: トリガーが`DO $$`ブロック外で作成されている
- **解決**: 存在チェック付き`DO $$`ブロックに移動

**Q: `cannot insert multiple commands into a prepared statement`**
- **原因**: 複数のSQL文を一度に実行しようとしている
- **解決**: SQL文を分割して個別に実行

### Phase 2マイグレーション詳細

```
db/migrations/
├── 0006_add_rag_metrics.sql      # RAGメトリクステーブル作成
├── 0007_optimize_rag_indexes.sql # パフォーマンス最適化インデックス
├── 0008_add_foreign_keys_fixed.sql # 外部キー制約
└── rollback_0006_add_rag_metrics.sql # 緊急ロールバック用
```

**作成されるテーブル:**
- `ai_dialogue_log` - AIチャット履歴とRAGメトリクス
- `provenance` - データプロヴェナンス管理
- `rag_metrics_history` - 日次集計メトリクス
- `plugin_registry` - プラグイン登録情報

**作成されるENUM型:**
- `content_type` - コンテンツタイプ
- `acquisition_method` - 取得方法
- `license_type` - ライセンス種別

---

## Claude Code での MCP サーバー利用

### テスト駆動開発用 MCP サーバー

Claude Code には以下のテスト用 MCP サーバーが登録されています。コーディング中に即座にテストを実行できます。

#### 利用可能なサーバー

**1. mued_unit_test** - ユニット・コンポーネントテスト
```
パス: /scripts/mcp/mued-unit-test.js
用途: Vitestによるユニットテストとコンポーネントテストの実行
```

**提供ツール:**
- `run_unit_tests(pattern)` - ユニットテスト実行（パターン指定可能）
- `run_component_tests()` - コンポーネントテスト実行
- `run_integration_tests()` - 統合テスト実行
- `run_all_tests()` - 全テスト実行
- `run_test_watch(testType)` - ウォッチモードでテスト実行

**2. mued_e2e** - E2Eテスト
```
パス: /scripts/mcp/mued-playwright-e2e.js
用途: Playwright による E2E テストの実行
```

**提供ツール:**
- `run_e2e_tests(spec)` - E2Eテスト実行（spec指定可能）
- `run_e2e_headed()` - ヘッドモードでE2E実行（ブラウザ表示）
- `run_e2e_debug(spec)` - デバッグモードでE2E実行

### 使用例

**開発中のテストフロー:**

1. **コンポーネント作成後:**
```
「LibraryCard コンポーネントを作成しました。関連するテストを実行してください」
→ mued_unit_test の run_component_tests ツールを使用
```

2. **特定のテストファイルのみ実行:**
```
「lib/plugins 配下のテストだけ実行して」
→ mued_unit_test の run_unit_tests("lib/plugins") を使用
```

3. **E2E テストで動作確認:**
```
「phase2-complete-flow の E2E テストを実行」
→ mued_e2e の run_e2e_tests("phase2-complete-flow") を使用
```

4. **ウォッチモードで開発:**
```
「コンポーネントテストをウォッチモードで」
→ mued_unit_test の run_test_watch("components") を使用
```

### MCP サーバーの確認

登録済みサーバーの確認:
```bash
claude mcp list
```

新しいサーバーの追加:
```bash
claude mcp add <server_name> node /path/to/server.js
```

### トラブルシューティング

**サーバーが接続できない場合:**

1. サーバーファイルの存在確認:
```bash
ls -la /Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/mcp/
```

2. Node.js で手動実行してエラー確認:
```bash
node /Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/mcp/mued-unit-test.js
```

3. Claude Code の再起動

---

*最終更新: 2025-10-29*
