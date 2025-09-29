#!/usr/bin/env node
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { z } = require("zod");
const { chromium } = require("@playwright/test");

// Create an MCP server
const server = new McpServer({
  name: "mued-debug",
  version: "1.0.0"
});

// デバッグ用詳細テストツール
server.registerTool(
  "debug_calendar_slots",
  {
    title: "Debug Calendar Slots",
    description: "Debug why slots are not showing in calendar",
    inputSchema: {}
  },
  async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const logs = [];

    // コンソールログをキャプチャ
    page.on('console', msg => {
      logs.push({ type: 'console', level: msg.type(), text: msg.text() });
    });

    // ネットワークリクエストをキャプチャ
    const apiCalls = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiCalls.push({
          method: request.method(),
          url: request.url()
        });
      }
    });

    // レスポンスをキャプチャ
    const apiResponses = [];
    page.on('response', async response => {
      if (response.url().includes('/api/lessons')) {
        try {
          const body = await response.json();
          apiResponses.push({
            url: response.url(),
            status: response.status(),
            slotsCount: body.slots ? body.slots.length : 0
          });
        } catch (e) {
          apiResponses.push({
            url: response.url(),
            status: response.status(),
            error: 'Failed to parse response'
          });
        }
      }
    });

    try {
      // ログイン
      await page.goto("http://localhost:3000/sign-in");
      await page.waitForSelector('[data-clerk-component="SignIn"]', { timeout: 10000 });
      await page.waitForTimeout(2000);
      await page.fill('input[name="identifier"]', 'test_student');
      await page.click('button:has-text("Continue")');
      await page.waitForTimeout(2000);

      const passwordField = await page.$('input[type="password"]');
      if (passwordField) {
        await passwordField.fill('TestPassword123!');
        const signInButton = await page.$('button:has-text("Continue"), button:has-text("Sign in")');
        if (signInButton) await signInButton.click();
      }

      await page.waitForURL('**/dashboard', { timeout: 10000 });

      // カレンダーページへ
      await page.goto("http://localhost:3000/dashboard/booking-calendar");

      // 3つの待機戦略を試す
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('load');
      await page.waitForLoadState('networkidle');

      // さらに待つ
      await page.waitForTimeout(5000);

      // DOM要素を直接評価
      const domAnalysis = await page.evaluate(() => {
        const availableElements = document.querySelectorAll('[data-available="true"]');
        const buttons = document.querySelectorAll('button');
        const bookingButtons = Array.from(buttons).filter(b =>
          b.textContent && b.textContent.includes('このスロットを予約')
        );

        // React Fiberを確認（React DevToolsなしで）
        let hasReactFiber = false;
        const rootElement = document.getElementById('__next');
        if (rootElement) {
          const keys = Object.keys(rootElement);
          hasReactFiber = keys.some(key => key.startsWith('__react'));
        }

        return {
          availableElementsCount: availableElements.length,
          allButtonsCount: buttons.length,
          bookingButtonsCount: bookingButtons.length,
          hasReactFiber,
          pageHTML: document.body.innerHTML.substring(0, 500)
        };
      });

      // 手動API呼び出し
      const manualApiCall = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/lessons?available=true');
          const data = await response.json();
          return {
            status: response.status,
            slotsCount: data.slots ? data.slots.length : 0
          };
        } catch (error) {
          return { error: error.message };
        }
      });

      await browser.close();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              timestamp: new Date().toISOString(),
              apiCalls,
              apiResponses,
              domAnalysis,
              manualApiCall,
              consoleLogs: logs.slice(0, 10) // 最初の10個のログ
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      await browser.close();
      return {
        content: [
          {
            type: "text",
            text: `Debug failed: ${error.message}`
          }
        ]
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Debug Server started successfully");
}

main().catch(console.error);