---

# MCP 導入 TODO リスト (MUED プロジェクト同一ワークスペース版)

このリストを上から順に実行すれば、Playwright + MCP サーバーを MUED リポジトリ内で動かせるようになります。**各ステップは「誰が」「何を」「どこで」やるかが明確になるように書いてあります。**

## 0. 前提チェック
- [x] Node.js 18 以上がインストール済みか確認
- [x] MUED リポジトリで `npm install` が問題なく完了することを確認

---

## 1. 依存パッケージ追加
- [x] ルートで  
  ```bash
  npm install --save-dev playwright @playwright/test @playwright/mcp
  ```
- [x] インストール後、ブラウザバイナリを取得  
  ```bash
  npx playwright install --with-deps
  ```

---

## 2. `package.json` スクリプト設定
- [x] `scripts` ブロックに追記  
  ```jsonc
  {
    "scripts": {
      // ...既存...
      "test:e2e": "playwright test",
      "mcp": "playwright mcp --port 3333"
    }
  }
  ```

---

## 3. 環境変数ファイル追加
- [x] ルートに `.env.test` を作成し、下記を追加  
  ```
  PLAYWRIGHT_MCP_TOKEN=dev-local-<適当な長いランダム文字列>
  ```
- [x] `.gitignore` に `.env.test` が含まれているか確認

---

## 4. `playwright.config.mjs` 作成／更新
- [x] ルートにファイルが無ければ新規作成し、以下をベースに設定  
  ```javascript
  import { defineConfig, devices } from '@playwright/test';

  export default defineConfig({
    timeout: 60_000,
    use: { baseURL: 'http://localhost:3000' },
    webServer: {
      command: 'npm run start',   // 本番ビルド用なら 'npm run build && npm run start'
      port: 3000,
      reuseExistingServer: !process.env.CI
    },
    projects: [
      {
        name: 'chromium',
        use: { ...devices['Desktop Chrome'] }
      },
      {
        name: 'mcp',
        use: {
          mcpServer: {
            command: 'npm run mcp',
            token: process.env.PLAYWRIGHT_MCP_TOKEN,
            timeout: 30_000
          }
        }
      }
    ]
  });
  ```

---

## 5. サンプル MCP クライアントユーティリティ
- [x] `tests/lib/mcpClient.ts` を作成  
  ```typescript
  export async function execMcp(page, instructions: string) {
    const res = await page.evaluate(async ({ instructions, token }) => {
      const r = await fetch('http://localhost:3333/mcp/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ instructions, tools: ['browser', 'screenshot'] })
      });
      return await r.json();
    }, { instructions, token: process.env.PLAYWRIGHT_MCP_TOKEN });
    return res;
  }
  ```

---

## 6. サンプル E2E テスト追加
- [x] `tests/agent-booking.spec.ts` を作成し、下記をコピペ  
  ```typescript
  import { test, expect } from '@playwright/test';
  import { execMcp } from './lib/mcpClient';

  test('AI エージェントがレッスン予約を完了できる', async ({ page }) => {
    await page.goto('/');
    const result = await execMcp(page, `
      1. 「レッスンを予約」ボタンをクリック
      2. 最初の空き時間を選択
      3. 決済情報にテストカード 4242424242424242 を入力
      4. 完了画面のスクリーンショットを撮影
    `);
    expect(result.status).toBe('completed');
  });
  ```

---

## 7. GitHub Actions ワークフロー追加
- [x] `.github/workflows/e2e-mcp.yml` を作成  
  ```yaml
  name: E2E + MCP
  on: [push, pull_request]
  jobs:
    e2e:
      runs-on: ubuntu-latest
      env:
        PLAYWRIGHT_MCP_TOKEN: ${{ secrets.PLAYWRIGHT_MCP_TOKEN }}
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with:
            node-version: '18'
        - name: Install deps
          run: npm ci
        - name: Install Playwright browsers
          run: npx playwright install --with-deps
        - name: Run tests
          run: npm run test:e2e
  ```

---

## 8. Cursor / Claude デスクトップ設定
- [ ] **Cursor**  
  1. Settings → Features → MCP  
  2. 「Add New Global MCP Server」  
     ```json
     {
       "command": "npm",
       "args": ["run", "mcp"],
       "env": { "PLAYWRIGHT_BROWSERS_PATH": "./browsers" }
     }
     ```
- [ ] **Claude**  
  1. Settings → Advanced → MCP Servers  
     ```
     name: playwright-mcp
     type: sse
     url: http://localhost:3333/mcp
     token: dev-local-<同じトークン>
     ```

---

## 9. README 追記
- [x] 開発者向けに「E2E と MCP の起動方法」を追記  
  ```md
  ## E2E / MCP の動かし方
  ```bash
  # MCP サーバー起動（別ターミナル）
  npm run mcp
  # Next.js dev サーバー起動
  npm run dev
  # テスト実行
  npm run test:e2e
  ```
  ```

---

## 10. 動作確認フロー
- [ ] 3 つのターミナルで  
  1. `npm run mcp`  
  2. `npm run dev`  
  3. `npm run test:e2e`  
  を起動し、テストがパスするか確認
- [ ] 失敗した場合 `PLAYWRIGHT_DEBUG=1 npm run test:e2e` でログを確認

---

# MCP サーバー実装 TODO

## 1. 環境構築
- [x] 前提条件の確認
  - [x] Node.js v18以上
  - [x] npm または pnpm
- [x] 依存パッケージの追加
  - [x] Playwright
  - [x] MCP サーバー
- [x] package.json の更新
  - [x] MCP 関連のスクリプト追加
- [x] .gitignore の更新
  - [x] .env.test の追加
- [x] playwright.config.mjs の作成
  - [x] MCP プロジェクト設定の追加
- [x] MCP クライアントユーティリティの作成
  - [x] tests/lib/mcpClient.ts の作成

## 2. MCP サーバーの設定
- [x] サーバーの起動設定
  - [x] ポート番号の設定
  - [x] 認証トークンの設定
- [x] ツールの設定
  - [x] ブラウザツールの有効化
  - [x] スクリーンショットツールの有効化

## 3. テストの実装
- [x] 基本的なテストケースの作成
  - [x] ページ遷移のテスト
  - [x] 要素の操作テスト
  - [x] スクリーンショットのテスト
- [x] エラーハンドリングのテスト
  - [x] 無効な命令のテスト
  - [x] タイムアウトのテスト

## 4. ドキュメント
- [x] セットアップ手順の文書化
- [x] 使用例の追加
- [x] トラブルシューティングガイドの作成

## 5. メンテナンス
- [ ] 定期的な依存パッケージの更新
- [ ] テストの継続的な改善
- [ ] パフォーマンスの最適化

---

