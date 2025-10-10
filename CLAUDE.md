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

*最終更新: 2025-10-03*
