# MCP (Model Context Protocol) Documentation

このディレクトリには、MCP Server の開発・運用に関するドキュメントが含まれています。

## 📋 ドキュメント一覧

### デバッグ・トラブルシューティング
- **`mcp-browser-debug.md`** - MCP Server のブラウザデバッグ手順とトラブルシューティング

## 🚀 MCP Server 実装状況

### 音楽教材生成
- **実装パス**: `/scripts/mcp/mued-material-generator-claude.js`
- **用途**: Claude Sonnet 4.5 による音楽教材生成（開発・管理者モード）
- **ツール**:
  - `generate_music_material_claude` - 教材生成
  - `test_comt_quality` - 品質テスト

### テスト実行
- **ユニットテスト**: `/scripts/mcp/mued-unit-test.js`
- **E2Eテスト**: `/scripts/mcp/mued-playwright-e2e.js`
- **スクリーンショット**: `/scripts/mcp/mued-playwright-screenshot.js`

## 📚 関連ドキュメント

- **MCP 実装ルール**: `/CLAUDE.md` の「MCP (Model Context Protocol) サーバー実装ルール」セクション
- **Claude Desktop 設定**: `/Users/kimny/Library/Application Support/Claude/claude_desktop_config.json`
- **ログ確認**: `/Users/kimny/Library/Logs/Claude/mcp-server-*.log`

## 🔍 よくあるエラーと解決策

### `Cannot read properties of undefined (reading 'method')`
- **原因**: `setRequestHandler` に文字列を渡している
- **解決**: Schema オブジェクトを使用、または `registerTool()` に切り替え

### `Module not found`
- **原因**: `@modelcontextprotocol/sdk` 未インストール
- **解決**: `npm install @modelcontextprotocol/sdk`

### dotenv の console 出力で JSON-RPC が破損
- **原因**: dotenv v17 の banner メッセージ
- **解決**: 手動で .env.local をパース（例: `mued-material-generator-claude.js`）

## ⚠️ 重要な注意事項

1. **必ず `McpServer + registerTool()` パターンを使用**
   - 高レベルAPI、安全で宣言的
   - 低レベル `setRequestHandler()` は特殊な場合のみ

2. **dotenv は使用禁止**
   - console 出力が JSON-RPC を破壊する
   - 手動パースを実装すること

3. **Zod schema を使用**
   - `inputSchema` は JSON Schema ではなく Zod オブジェクト

---

*最終更新: 2025-11-12*
