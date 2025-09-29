#!/usr/bin/env node
import { chromium } from "playwright";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// MUED LMS用のPlaywright MCPサーバー
class MuedPlaywrightServer {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
    this.baseUrl = "http://localhost:3000";
  }

  async init() {
    this.browser = await chromium.launch({ headless: false });
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  // ホームページテスト
  async testHomePage() {
    await this.page.goto(this.baseUrl);
    const title = await this.page.title();
    const heroText = await this.page.locator("h2").first().textContent();

    return {
      success: true,
      title,
      heroText,
      url: this.page.url()
    };
  }

  // サインアップフローテスト
  async testSignUp(username, password) {
    await this.page.goto(`${this.baseUrl}/sign-up`);

    // Clerkフォームの読み込みを待つ
    await this.page.waitForSelector("form", { timeout: 10000 });

    // ユーザー名入力
    const usernameField = this.page.locator('input[name="username"]');
    if (await usernameField.count() > 0) {
      await usernameField.fill(username);

      // パスワード入力
      await this.page.locator('input[name="password"]').fill(password);

      // 確認パスワード
      const confirmField = this.page.locator('input[name="confirmPassword"]');
      if (await confirmField.count() > 0) {
        await confirmField.fill(password);
      }

      return {
        success: true,
        message: "サインアップフォームに入力完了"
      };
    }

    return {
      success: false,
      message: "サインアップフォームが見つかりません"
    };
  }

  // レッスン一覧テスト
  async testLessonList() {
    await this.page.goto(`${this.baseUrl}/dashboard/lessons`);

    // 認証チェック
    if (this.page.url().includes("sign-in")) {
      return {
        success: false,
        message: "認証が必要です",
        redirected: true
      };
    }

    // レッスン一覧の要素確認
    await this.page.waitForSelector("h1", { timeout: 5000 });
    const title = await this.page.locator("h1").textContent();

    // レッスンカードの数を数える
    const lessonCards = await this.page.locator('[class*="rounded-lg shadow"]').count();

    return {
      success: true,
      title,
      lessonCount: lessonCards
    };
  }

  // API直接テスト
  async testAPI(endpoint) {
    const response = await this.page.request.get(`${this.baseUrl}${endpoint}`);
    const data = await response.json();

    return {
      success: response.ok(),
      status: response.status(),
      data
    };
  }

  // スクリーンショット取得
  async takeScreenshot(filename = "screenshot.png") {
    const screenshot = await this.page.screenshot({ fullPage: true });
    return {
      success: true,
      filename,
      size: screenshot.length
    };
  }
}

// MCPサーバーの設定
const server = new Server({
  name: "mued-playwright",
  version: "1.0.0"
});

const playwrightServer = new MuedPlaywrightServer();

// ツール定義
server.setRequestHandler("tools/list", async () => ({
  tools: [
    {
      name: "test_home",
      description: "ホームページのテスト",
      inputSchema: { type: "object", properties: {} }
    },
    {
      name: "test_signup",
      description: "サインアップフローのテスト",
      inputSchema: {
        type: "object",
        properties: {
          username: { type: "string" },
          password: { type: "string" }
        },
        required: ["username", "password"]
      }
    },
    {
      name: "test_lessons",
      description: "レッスン一覧ページのテスト",
      inputSchema: { type: "object", properties: {} }
    },
    {
      name: "test_api",
      description: "APIエンドポイントのテスト",
      inputSchema: {
        type: "object",
        properties: {
          endpoint: { type: "string" }
        },
        required: ["endpoint"]
      }
    },
    {
      name: "screenshot",
      description: "現在のページのスクリーンショットを取得",
      inputSchema: {
        type: "object",
        properties: {
          filename: { type: "string" }
        }
      }
    }
  ]
}));

// ツール実行
server.setRequestHandler("tools/call", async (request) => {
  if (!playwrightServer.browser) {
    await playwrightServer.init();
  }

  switch (request.params.name) {
    case "test_home":
      return await playwrightServer.testHomePage();

    case "test_signup":
      return await playwrightServer.testSignUp(
        request.params.arguments.username,
        request.params.arguments.password
      );

    case "test_lessons":
      return await playwrightServer.testLessonList();

    case "test_api":
      return await playwrightServer.testAPI(request.params.arguments.endpoint);

    case "screenshot":
      return await playwrightServer.takeScreenshot(request.params.arguments.filename);

    default:
      throw new Error(`Unknown tool: ${request.params.name}`);
  }
});

// サーバー起動
const transport = new StdioServerTransport();
server.connect(transport);

// クリーンアップ
process.on("SIGINT", async () => {
  await playwrightServer.cleanup();
  process.exit(0);
});