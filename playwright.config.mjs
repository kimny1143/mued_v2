import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

// .env.test が存在すれば追加で読み込む
import fs from 'fs';
import path from 'path';
const testEnvPath = path.resolve('.env.test');
if (fs.existsSync(testEnvPath)) {
  const dotenv = await import('dotenv');
  dotenv.config({ path: testEnvPath });
}

const remoteURL = process.env.E2E_REMOTE_URL; // Vercelなどの本番/プレビューURL
const baseURL = remoteURL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const isCI = !!process.env.CI;

/**
 * Playwright設定
 * https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  /* テストごとのタイムアウト */
  timeout: 30 * 1000,
  
  /* 各テストを実行するプロジェクト（デバイスやブラウザ）の設定 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    /* 必要に応じてモバイルテストを有効化
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    */
  ],

  // リモートURLが指定されている場合はローカルサーバーを起動しない
  ...(remoteURL ? {} : {
    webServer: {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !isCI,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 60 * 1000, // 60秒
    },
  }),

  /* MCPサーバーの設定 */
  mcpServer: {
    command: 'npx --no-install mcp-server-playwright --port 3333',
    url: 'http://localhost:3333',
    reuseExistingServer: true,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 30 * 1000, // 30秒
    env: {
      PLAYWRIGHT_MCP_TOKEN: process.env.PLAYWRIGHT_MCP_TOKEN,
      NODE_ENV: process.env.NODE_ENV || 'development',
    },
  },
}); 