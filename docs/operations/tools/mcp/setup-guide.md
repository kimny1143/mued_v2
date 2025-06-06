# MCP セットアップガイド

## 前提条件
- Node.js v18以上
- npm または pnpm
- Cursor IDE
- Claude デスクトップアプリ

## 1. 依存パッケージのインストール

```bash
# Playwright本体とMCPサーバーのインストール（既にpackage.jsonに含まれています）
npm install --save-dev playwright @playwright/test @playwright/mcp mcp-server-playwright

# ブラウザバイナリのインストール
npx playwright install --with-deps
```

## 2. 環境変数の設定

`.env.local`ファイルに以下の内容を追加（または`.env.mcp`を使用）：

```env
PLAYWRIGHT_MCP_TOKEN=dev-token-mued-lms
```

## 3. Cursor IDEの設定

### グローバル設定との競合を避ける方法

Cursor IDEにはすでにグローバルMCP設定（`~/.cursor/mcp.json`）があります：
```json
{
  "mcpServers": {
    "claude_code": {
      "command": "/Users/kimny/.nvm/versions/node/v22.15.0/bin/claude",
      "args": ["mcp", "serve"],
      "env": {
        "ANTHROPIC_MODEL": "claude-sonnet-4-20250514"
      }
    }
  }
}
```

このプロジェクトでは、プロジェクトローカルの`.mcp.json`を使用してPlaywright MCPを設定しています。両方が共存できるよう、異なるサーバー名（`playwright-local`）を使用しています。

## 4. Claude デスクトップアプリの設定

1. メニューバーから「Settings...」を選択（アプリ内の設定ボタンではなく、メニューバーの設定）
2. 設定パネルで「Developer」を選択
3. 「Edit Config」をクリック
4. 表示された設定ファイルに以下を追加：

```json
{
  "mcpServers": {
    "playwright-mcp": {
      "type": "sse",
      "url": "http://localhost:3333/mcp",
      "token": "dev-local-<同じトークン>"
    }
  }
}
```

設定ファイルの場所：
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

## 5. プロジェクトの設定ファイル

### 作成済みの設定ファイル

1. **`.mcp.json`** - プロジェクト固有のMCP設定
2. **`mcp-server.config.js`** - MCPサーバーの詳細設定
3. **`playwright.config.mjs`** - Playwright設定（MCP統合済み）
4. **`.env.mcp`** - MCP専用の環境変数

## 6. 動作確認

3つのターミナルで以下のコマンドを実行：

```bash
# ターミナル1: MCPサーバー起動
npm run mcp

# ターミナル2: Next.js開発サーバー起動
npm run dev

# ターミナル3: テスト実行
npm run test:e2e
```

または、ポートを使い分けてクリーンに起動：

```bash
# ポートをクリア
npm run kill-port
npm run kill-mcp-port

# 各サーバーを起動
npm run mcp:clean  # MCPサーバー（3333ポート）
npm run dev:clean  # 開発サーバー（3000ポート）
```

## トラブルシューティング

### ポート競合エラー
```bash
# ポート3333が使用中の場合
lsof -ti:3333 | xargs kill -9
# または
npm run kill-mcp-port

# 別のポートを使用する場合
MCP_SERVER_PORT=3334 npm run mcp
```

### MCPサーバー接続エラー
- 環境変数`PLAYWRIGHT_MCP_TOKEN`が正しく設定されているか確認
- MCPサーバーのヘルスチェック：`curl http://localhost:3333/health`
- ログ確認：`tail -f logs/mcp/*.log`

### テスト実行エラー
- `DEBUG=true npm run test:e2e`で詳細なログを確認
- ブラウザが正しくインストールされているか確認：`npx playwright install`
- テストのタイムアウトを増やす（`playwright.config.mjs`で調整）

### Claude連携エラー
- メニューバーから正しい設定画面を開いているか確認
- 設定ファイルのパスが正しいか確認
- トークンが`.env.mcp`と一致しているか確認
- 設定ファイルのJSON形式が正しいか確認

### Cursor IDEとの競合
- グローバル設定（`~/.cursor/mcp.json`）とプロジェクト設定（`.mcp.json`）が異なるサーバー名を使用しているか確認
- ポート番号が重複していないか確認 