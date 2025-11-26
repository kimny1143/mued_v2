# MCP サーバー実装ガイド

## 概要

Model Context Protocol (MCP) サーバーの実装ルールと詳細。

## 推奨パターン: McpServer + registerTool()

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

## 低レベルパターン: Server + setRequestHandler()

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

// 重要: 必ずSchemaオブジェクトを第1引数に渡すこと
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

---

## 絶対に使ってはいけないパターン

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

## ファイル配置とネーミング

### 配置

```
/scripts/mcp/
  ├── mued-playwright-e2e.js          # E2Eテスト用
  ├── mued-playwright-screenshot.js   # スクリーンショット撮影用
  ├── mued-unit-test.js               # ユニットテスト用
  └── ...
```

### ネーミング規則

- プレフィックス: `mued-` (プロジェクト名)
- 目的を明確に: `playwright-e2e`, `unit-test`
- 拡張子: `.js` (CommonJS) を推奨

### Claude Desktop 設定

```json
{
  "mcpServers": {
    "mued_unit_test": {
      "command": "node",
      "args": ["/absolute/path/to/scripts/mcp/mued-unit-test.js"]
    }
  }
}
```

設定ファイル: `~/Library/Application Support/Claude/claude_desktop_config.json`

---

## トラブルシューティング

### MCPサーバーが起動しない場合

1. **ログを確認**
   ```bash
   tail -f ~/Library/Logs/Claude/mcp-server-{server_name}.log
   ```

2. **よくあるエラー**

   **`Cannot read properties of undefined (reading 'method')`**
   - 原因: `setRequestHandler`に文字列を渡している
   - 解決: `ListToolsRequestSchema`などのSchemaオブジェクトを使う、または`registerTool()`に切り替え

   **`Module not found`**
   - 原因: `@modelcontextprotocol/sdk`がインストールされていない
   - 解決: `npm install @modelcontextprotocol/sdk`

3. **動作確認**
   - Claude Desktopを再起動
   - 設定でサーバーが緑色（接続済み）になっているか確認

---

## 参考リソース

- [MCP TypeScript SDK 公式リポジトリ](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP 公式ドキュメント](https://modelcontextprotocol.io/)
- SDK バージョン: `@modelcontextprotocol/sdk@1.18.2`
