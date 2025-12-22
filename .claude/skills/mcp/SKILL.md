---
name: mcp-server
description: MCPサーバーの作成、修正、デバッグ、ツール登録。MCP、Model Context Protocol、サーバー実装、ツール追加時に使用。
---

# MCP サーバー (MUED LMS v2)

## 登録済みサーバー

| サーバー | ファイル | 用途 |
|---------|---------|------|
| `mued_unit_test` | `mued-unit-test.js` | Vitest ユニットテスト実行 |
| `mued_e2e` | `mued-playwright-e2e.js` | Playwright E2E テスト実行 |
| `mued_material_generator` | `mued-material-generator-claude.js` | Claude による教材生成 |
| `mued_browser_debug` | `mued-browser-debug.js` | ブラウザデバッグ自動化 |
| `mued_screenshot` | `mued-playwright-screenshot.js` | スクリーンショット取得 |

## 使用例

```
「ユニットテスト実行して」→ mued_unit_test の run_unit_tests
「E2Eテスト実行して」→ mued_e2e の run_all_e2e_tests
「教材を生成して」→ mued_material_generator
```

## 新規MCP作成時の必須パターン

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

## ファイルの場所

- `scripts/mcp/` - MCP サーバースクリプト

## 詳細ドキュメント

[docs/mcp/mcp-implementation-guide.md](docs/mcp/mcp-implementation-guide.md)
