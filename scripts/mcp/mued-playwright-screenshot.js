#!/usr/bin/env node
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { chromium } = require("@playwright/test");
const fs = require("fs").promises;
const path = require("path");

// Project root directory
const PROJECT_ROOT = path.resolve(__dirname, '../..');

// Load .env.test silently (suppress ALL dotenv output that breaks MCP JSON protocol)
const originalStderrWrite = process.stderr.write;
const originalStdoutWrite = process.stdout.write;
process.stderr.write = () => {}; // Suppress stderr
process.stdout.write = (chunk, encoding, callback) => {
  // Only allow MCP JSON messages through
  if (typeof chunk === 'string' && chunk.startsWith('{"jsonrpc":')) {
    return originalStdoutWrite.call(process.stdout, chunk, encoding, callback);
  }
  return true;
};
require("dotenv").config({ path: path.join(PROJECT_ROOT, '.env.test') });
process.stderr.write = originalStderrWrite; // Restore stderr
process.stdout.write = originalStdoutWrite; // Restore stdout

// MCPサーバー作成
const server = new McpServer({
  name: "mued-screenshot",
  version: "1.0.0"
});

// スクリーンショット撮影ツール登録
server.registerTool(
  "capture_screenshots",
  {
    title: "Capture Screenshots for Figma",
    description: "Figma用に全ページの高品質スクリーンショットを撮影（viewport版とfullpage版）",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  async () => {
    const browser = await chromium.launch({
      headless: true,
      args: ['--disable-blink-features=AutomationControlled']
    });

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      extraHTTPHeaders: {
        'x-test-mode': 'true'  // Skip authentication for E2E testing
      }
    });

    const page = await context.newPage();
    const baseUrl = "http://localhost:3000";
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const outputDir = path.join(__dirname, "../../screenshots", timestamp);

    const defaultPages = [
      { path: "/", name: "landing" },
      { path: "/dashboard", name: "dashboard" },
      { path: "/dashboard/lessons", name: "lessons" },
      { path: "/dashboard/materials", name: "materials" },
      { path: "/dashboard/materials/new", name: "materials-new" },
      { path: "/dashboard/reservations", name: "reservations" },
      { path: "/dashboard/subscription", name: "subscription" },
      { path: "/dashboard/booking-calendar", name: "booking-calendar" },
    ];

    await fs.mkdir(outputDir, { recursive: true });

    const results = [];
    const errors = [];

    for (const pageInfo of defaultPages) {
      try {
        const pagePath = pageInfo.path;
        const pageName = pageInfo.name;

        console.error(`Capturing: ${pagePath} (${pageName})`);

        // Add test=true query parameter to bypass authentication
        const url = new URL(pagePath, baseUrl);
        url.searchParams.set('test', 'true');

        await page.goto(url.toString(), {
          waitUntil: 'networkidle',
          timeout: 10000
        });

        if (page.url().includes('sign-in')) {
          console.error(`  ⚠️  Requires authentication, skipping ${pageName}`);
          errors.push({ page: pagePath, error: 'Authentication required' });
          continue;
        }

        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1000);

        try {
          await page.waitForFunction(() => {
            const spinner = document.querySelector('.animate-spin');
            return !spinner;
          }, { timeout: 5000 });
        } catch {
          // No spinner, continue
        }

        const viewportPath = path.join(outputDir, `${pageName}-viewport.png`);
        await page.screenshot({ path: viewportPath, fullPage: false });

        const fullpagePath = path.join(outputDir, `${pageName}-fullpage.png`);
        await page.screenshot({ path: fullpagePath, fullPage: true });

        results.push({
          page: pagePath,
          name: pageName,
          viewport: viewportPath,
          fullpage: fullpagePath,
          success: true
        });

        console.error(`  ✅ Captured successfully`);

      } catch (error) {
        console.error(`  ❌ Error: ${error.message}`);
        errors.push({ page: pageInfo.path, error: error.message });
      }
    }

    // HTMLビューアー生成
    const screenshots = results.map(r => `
      <div class="screenshot-item">
        <h3>${r.name}</h3>
        <p class="path">${r.page}</p>
        <div class="images">
          <div class="image-container">
            <h4>Viewport (1440x900)</h4>
            <img src="${path.basename(r.viewport)}" alt="${r.name} viewport">
          </div>
          <div class="image-container">
            <h4>Full Page</h4>
            <img src="${path.basename(r.fullpage)}" alt="${r.name} fullpage">
          </div>
        </div>
      </div>
    `).join('');

    const indexHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MUED LMS Screenshots - ${timestamp}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 40px 20px; }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 { font-size: 2rem; margin-bottom: 10px; color: #333; }
    .meta { color: #666; margin-bottom: 40px; font-size: 0.9rem; }
    .screenshot-item { background: white; border-radius: 12px; padding: 30px; margin-bottom: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .screenshot-item h3 { font-size: 1.5rem; margin-bottom: 5px; color: #2563eb; }
    .path { color: #666; font-size: 0.9rem; margin-bottom: 20px; font-family: monospace; }
    .images { display: grid; grid-template-columns: repeat(auto-fit, minmax(600px, 1fr)); gap: 20px; }
    .image-container h4 { font-size: 0.9rem; margin-bottom: 10px; color: #666; text-transform: uppercase; }
    img { width: 100%; border: 1px solid #e5e5e5; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .usage { background: #eff6ff; border-left: 4px solid #2563eb; padding: 20px; margin-top: 40px; border-radius: 8px; }
    .usage h2 { font-size: 1.2rem; margin-bottom: 10px; color: #1e40af; }
    .usage ol { margin-left: 20px; line-height: 1.8; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📸 MUED LMS Screenshots</h1>
    <div class="meta">Generated: ${timestamp}<br>Total: ${results.length} pages captured</div>
    ${screenshots}
    <div class="usage">
      <h2>📋 Figmaへのインポート方法</h2>
      <ol>
        <li>Figmaでデザインファイルを開く</li>
        <li>このフォルダから必要なPNGファイルをドラッグ&ドロップ</li>
        <li>viewport版: コンポーネント設計用</li>
        <li>fullpage版: ページフロー文書化用</li>
      </ol>
    </div>
  </div>
</body>
</html>`;

    const indexPath = path.join(outputDir, 'index.html');
    await fs.writeFile(indexPath, indexHtml);

    await browser.close();

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          timestamp,
          outputDir,
          captured: results.length,
          total: defaultPages.length,
          results,
          errors,
          indexHtml: indexPath,
          message: `Screenshots saved to: ${outputDir}`
        }, null, 2)
      }]
    };
  }
);

// サーバー起動
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MUED Playwright Screenshot Server started successfully");
}

main().catch(console.error);
