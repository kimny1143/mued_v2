# MCP セットアップガイド

## 前提条件
- Node.js v18以上
- npm または pnpm
- Cursor IDE
- Claude デスクトップアプリ

## 1. 依存パッケージのインストール

```bash
# Playwright本体とMCPアドオンのインストール
npm install --save-dev playwright @playwright/test @playwright/mcp

# ブラウザバイナリのインストール
npx playwright install --with-deps
```

## 2. 環境変数の設定

`.env.test`ファイルを作成し、以下の内容を追加：

```env
PLAYWRIGHT_MCP_TOKEN=dev-local-<適当な長いランダム文字列>
```

## 3. Cursor IDEの設定

1. Cursorを起動し、`Cmd + ,`（Mac）または`Ctrl + ,`（Windows）で設定を開く
2. 左メニューの「Features」→「MCP」を選択
3. 「Add New Global MCP Server」をクリックし、以下の設定を追加：

```json
{
  "command": "npm",
  "args": ["run", "mcp"],
  "env": { "PLAYWRIGHT_BROWSERS_PATH": "./browsers" }
}
```

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

## 5. 動作確認

3つのターミナルで以下のコマンドを実行：

```bash
# ターミナル1: MCPサーバー起動
npm run mcp

# ターミナル2: Next.js開発サーバー起動
npm run dev

# ターミナル3: テスト実行
npm run test:e2e
```

## トラブルシューティング

### MCPサーバー接続エラー
- ポート3333が使用中でないか確認
- 環境変数`PLAYWRIGHT_MCP_TOKEN`が正しく設定されているか確認

### テスト実行エラー
- `PLAYWRIGHT_DEBUG=1 npm run test:e2e`で詳細なログを確認
- ブラウザが正しくインストールされているか確認

### Claude連携エラー
- メニューバーから正しい設定画面を開いているか確認
- 設定ファイルのパスが正しいか確認
- トークンが一致しているか確認
- 設定ファイルのJSON形式が正しいか確認 