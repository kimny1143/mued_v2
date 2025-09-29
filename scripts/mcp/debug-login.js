#!/usr/bin/env node
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { chromium } = require("@playwright/test");

// Create an MCP server
const server = new McpServer({
  name: "mued-debug",
  version: "1.0.0"
});

// Debug login page tool
server.registerTool(
  "debug_login_page",
  {
    title: "Debug Login Page",
    description: "Debug login page to understand why tests fail",
    inputSchema: {}
  },
  async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      const results = [];

      // Step 1: Navigate
      await page.goto("http://localhost:3000/sign-in");
      results.push({
        step: "Navigate to /sign-in",
        success: true
      });

      // Step 2: Wait for any element
      await page.waitForTimeout(3000);

      // Step 3: Check various selectors
      const selectors = [
        '[data-clerk-component="SignIn"]',
        '[data-clerk-id]',
        'input[name="identifier"]',
        'input[type="text"]',
        'input',
        'button',
        '.cl-signIn-root',
        'form'
      ];

      for (const selector of selectors) {
        try {
          const element = await page.$(selector);
          const count = await page.$$eval(selector, els => els.length);
          results.push({
            selector,
            found: !!element,
            count
          });
        } catch (e) {
          results.push({
            selector,
            found: false,
            error: e.message
          });
        }
      }

      // Step 4: Get page title and URL
      const title = await page.title();
      const url = page.url();

      results.push({
        pageInfo: {
          title,
          url
        }
      });

      // Step 5: Check for error messages
      const bodyText = await page.evaluate(() => {
        const body = document.querySelector('body');
        return body ? body.innerText.substring(0, 200) : 'No body found';
      });

      results.push({
        bodyPreview: bodyText
      });

      await browser.close();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              timestamp: new Date().toISOString(),
              results
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
  console.error("MCP Debug Server started");
}

main().catch(console.error);