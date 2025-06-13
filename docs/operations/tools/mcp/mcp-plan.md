# Playwright MCPを活用したCursorとClaudeデスクトップの統合によるブラウザ自動化

ブラウザ操作の自動化において、既存のPlaywrightテスト環境とMCP（Model Context Protocol）を統合する手法が最も効果的です。Cursor IDEとClaudeデスクトップアプリを連携させることで、AIを活用した高度なブラウザ操作自動化が実現できます。

## 推奨手順: Playwright MCPの統合

### 1. Playwright MCPのインストールと初期設定

```bash
# Playwright本体とMCPアドオンのインストール
npm install --save-dev playwright @playwright/mcp
```

インストール後、プロジェクトルートに`playwright.config.mjs`ファイルを作成し、MCP連携用の設定を追加します[7][11]。

```javascript
// playwright.config.mjs
import { defineConfig } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'mcp-integration',
      use: {
        mcpServer: {
          command: 'npx @playwright/mcp@latest',
          timeout: 30000
        }
      }
    }
  ]
});
```

### 2. Cursor IDEの設定

1. Cursorを起動し、`Cmd + ,`（Mac）または`Ctrl + ,`（Windows）で設定を開く
2. 左メニューの「Features」→「MCP」を選択
3. 「Add New Global MCP Server」をクリックし、以下の設定を追加[1][13]

```json
{
  "mcpServers": {
    "playwright-mcp": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"],
      "env": {
        "PLAYWRIGHT_BROWSERS_PATH": "./browsers"
      }
    }
  }
}
```

### 3. Claudeデスクトップアプリとの連携設定

Claudeデスクトップアプリで以下の手順を実行[5][14]：

1. アプリ設定→「Advanced」→「MCP Servers」を開く
2. 新しいMCPサーバーを追加：

```yaml
name: playwright-mcp
type: sse
url: http://localhost:3000/mcp
```

3. 権限設定で「ブラウザ操作」「ファイルシステムアクセス」「ネットワークリクエスト」を許可

### 4. 統合テストスクリプトの作成

`tests/mcp-integration.spec.ts`ファイルを作成[1][11]：

```typescript
import { test, expect } from '@playwright/test';

test('AI駆動ブラウザ操作テスト', async ({ page }) => {
  // AIによる動的なテストケース生成
  const aiInstructions = `
    1. 音楽レッスン予約ページに遷移
    2. 空き枠がある最初の日時を選択
    3. 支払い情報を有効なテストカードで入力
    4. 予約完了画面のスクリーンショットを保存
  `;

  await page.goto('https://your-staging-url');
  
  // Claudeとの連携
  const response = await page.evaluate(async (instructions) => {
    return await fetch('/mcp/execute', {
      method: 'POST',
      body: JSON.stringify({
        instructions,
        tools: ['browser', 'screenshot']
      })
    });
  }, aiInstructions);

  const result = await response.json();
  expect(result.status).toBe('completed');
});
```

### 5. CI/CDパイプラインへの統合

`.github/workflows/e2e-tests.yml`を追加[11]：

```yaml
name: E2E Tests with MCP

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps
      - name: Start MCP Server
        run: npx @playwright/mcp@latest &
      - name: Run Tests
        run: npx playwright test
```

### 6. 動作確認コマンド

```bash
# MCPサーバー起動
npx @playwright/mcp@latest --port 3000

# 別ターミナルでテスト実行
npx playwright test -c playwright.config.mjs
```

## 技術的優位性

この統合手法の主な利点は：

1. **既存テスト資産の活用**: 従来のPlaywrightテストを拡張可能[1][11]
2. **AI連携の柔軟性**: Claudeの自然言語処理能力とPlaywrightの安定動作を結合[5][14]
3. **マルチ環境対応**: ローカル開発環境とCI/CDパイプラインの両方で同一設定を利用可能[11]
4. **セキュリティ**: MCP経由の操作で直接的なシステムアクセスを制限[7][14]

## トラブルシューティング

| 現象 | 解決策 |
|------|--------|
| MCPサーバー接続エラー | `lsof -i :3000`でポート競合確認 |
| ブラウザ操作が反映されない | `PLAYWRIGHT_DEBUG=1`環境変数で詳細ログ出力 |
| Claude連携エラー | MCP権限設定の再確認とOAuthトークンの更新 |

この構成により、AIを活用した動的なブラウザ操作テストから、安定したCI/CDパイプラインまでの一貫したワークフローを構築できます。特に大規模なフロントエンドプロジェクトでは、回帰テストの自動化と問題検出精度の向上に顕著な効果が期待できます[7][11][14]。

Citations:
[1] https://zenn.dev/bamboohouse/articles/74037522a0a815
[2] https://qiita.com/tatsuya1221/items/2f1207fc2e4fbdcab3de
[3] https://zenn.dev/kazuph/articles/5a6cc61ae21940
[4] https://zenn.dev/yh007/articles/6868da4e696ccc
[5] https://chatgpt-lab.com/n/nd8bbfc60a480
[6] https://note.com/shuzon__/n/na2aafacf7324
[7] https://docs.cursor.com/context/model-context-protocol
[8] https://docs.anthropic.com/ja/docs/agents-and-tools/claude-code/tutorials
[9] https://apidog.com/jp/blog/cursor-ai-mcp/
[10] https://qiita.com/eiji-noguchi/items/a24881f5b5e32710f028
[11] https://qiita.com/taka_yayoi/items/eea79a88bd638847beb8
[12] https://zenn.dev/snaka/scraps/1d7df986707b84
[13] https://cly7796.net/blog/other/using-mcp-with-cursor/
[14] https://docs.anthropic.com/en/docs/claude-code/tutorials
[15] https://dev.classmethod.jp/articles/cursor-claudecode/
[16] https://engineering.mobalab.net/2025/04/21/connect-to-remote-mcp-server-from-claude-desktop-app-ja/
[17] https://qiita.com/hikagami/items/98a23f00e3c983f80858
[18] https://cursor.directory/mcp
[19] https://note.com/atali/n/n64b709af8411
[20] https://qiita.com/takurot/items/f683190de8f141844202

---
Perplexity の Eliot より: pplx.ai/share