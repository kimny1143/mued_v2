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
  name: "mued-browser-debug",
  version: "1.0.0"
});

// Helper function to generate timestamp
function getTimestamp() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
}

// Helper function to parse error stack and extract source location
function parseErrorStack(stack) {
  if (!stack) return null;

  // Match patterns like "at file:///path/file.js:line:col" or "at Function.name (file:///path:line:col)"
  const stackLines = stack.split('\n');
  for (const line of stackLines) {
    // Try to extract file path and line number
    const match = line.match(/at\s+(?:.*?\s+\()?(.+?):(\d+):(\d+)\)?/);
    if (match) {
      let filePath = match[1];
      const lineNumber = parseInt(match[2]);
      const columnNumber = parseInt(match[3]);

      // Clean up file path (remove file:// prefix, extract filename)
      if (filePath.includes('/_next/')) {
        // Extract the meaningful part from Next.js build output
        const parts = filePath.split('/_next/');
        if (parts[1]) {
          filePath = '_next/' + parts[1];
        }
      } else if (filePath.includes('/')) {
        // Get just the filename for readability
        filePath = filePath.split('/').pop();
      }

      return {
        file: filePath,
        line: lineNumber,
        column: columnNumber
      };
    }
  }

  return null;
}

// Helper function to categorize error types
function categorizeError(error) {
  const message = error.message || '';
  const stack = error.stack || '';

  if (message.includes('Cannot read properties of undefined') ||
      message.includes('Cannot read property')) {
    return 'runtime';
  }
  if (message.includes('is not a function')) {
    return 'type-error';
  }
  if (message.includes('Failed to fetch') ||
      message.includes('Network request failed')) {
    return 'network';
  }
  if (message.includes('SyntaxError')) {
    return 'syntax';
  }
  if (message.includes('ReferenceError')) {
    return 'reference';
  }
  if (stack.includes('Promise') || stack.includes('async')) {
    return 'async';
  }

  return 'unknown';
}

// Tool 1: debug_page - ページをロードしてエラーを検出
server.registerTool(
  "debug_page",
  {
    title: "Debug Page",
    description: "Load a page and detect console errors, network issues, and runtime errors",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "Base URL to test (default: http://localhost:3001)"
        },
        path: {
          type: "string",
          description: "Path to append to URL (e.g., /dashboard/library)"
        },
        waitForSelector: {
          type: "string",
          description: "CSS selector to wait for before capturing"
        },
        timeout: {
          type: "number",
          description: "Timeout in milliseconds (default: 30000)"
        }
      }
    }
  },
  async (params) => {
    const baseUrl = params.url || 'http://localhost:3001';
    const path = params.path || '';
    const fullUrl = baseUrl + path;
    const waitForSelector = params.waitForSelector;
    const timeout = params.timeout || 30000;
    const timestamp = getTimestamp();

    const browser = await chromium.launch({
      headless: true,
      args: ['--disable-blink-features=AutomationControlled']
    });

    try {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        extraHTTPHeaders: {
          'x-test-mode': 'true'  // Skip authentication for E2E testing
        }
      });

      const page = await context.newPage();

      // Collect console logs and errors
      const consoleLogs = [];
      const errors = [];
      const networkRequests = [];
      const failedRequests = [];

      // Listen for console events
      page.on('console', (msg) => {
        const log = {
          type: msg.type(),
          text: msg.text(),
          timestamp: new Date().toISOString(),
          location: msg.location()
        };

        consoleLogs.push(log);

        if (msg.type() === 'error') {
          errors.push({
            message: msg.text(),
            stack: null,
            type: 'console-error'
          });
        }
      });

      // Listen for page errors (uncaught exceptions)
      page.on('pageerror', (error) => {
        const errorInfo = {
          message: error.message,
          stack: error.stack,
          type: categorizeError(error),
          location: parseErrorStack(error.stack)
        };
        errors.push(errorInfo);
      });

      // Listen for request failures
      page.on('requestfailed', (request) => {
        const failure = {
          url: request.url(),
          method: request.method(),
          failure: request.failure(),
          resourceType: request.resourceType()
        };
        failedRequests.push(failure);

        errors.push({
          message: `Network request failed: ${request.method()} ${request.url()} - ${request.failure()?.errorText}`,
          stack: null,
          type: 'network'
        });
      });

      // Listen for responses
      page.on('response', (response) => {
        // Only track API calls and important resources
        const url = response.url();
        if (url.includes('/api/') ||
            url.includes('.json') ||
            response.status() >= 400) {
          networkRequests.push({
            url: url,
            status: response.status(),
            method: response.request().method(),
            statusText: response.statusText()
          });
        }
      });

      // Add test query parameter to bypass authentication
      const testUrl = new URL(fullUrl);
      testUrl.searchParams.set('test', 'true');

      // Navigate to the page
      let navigationError = null;
      try {
        await page.goto(testUrl.toString(), {
          waitUntil: 'networkidle',
          timeout: timeout
        });

        // Wait for specific selector if provided
        if (waitForSelector) {
          await page.waitForSelector(waitForSelector, { timeout: 5000 });
        }

        // Wait a bit for any async errors to appear
        await page.waitForTimeout(2000);

      } catch (error) {
        navigationError = error;
        errors.push({
          message: `Navigation error: ${error.message}`,
          stack: error.stack,
          type: 'navigation'
        });
      }

      // Take screenshot
      const screenshotPath = `/tmp/browser-debug-${timestamp}.png`;
      let screenshotTaken = false;
      try {
        await page.screenshot({
          path: screenshotPath,
          fullPage: false
        });
        screenshotTaken = true;
      } catch (error) {
        console.error('Failed to take screenshot:', error.message);
      }

      // Check for common React errors in the DOM
      const reactErrors = await page.evaluate(() => {
        const errorBoundary = document.querySelector('.error-boundary');
        const nextError = document.querySelector('#__next-error');
        const errors = [];

        if (errorBoundary) {
          errors.push({
            type: 'react-error-boundary',
            element: errorBoundary.textContent
          });
        }

        if (nextError) {
          errors.push({
            type: 'next-error',
            element: nextError.textContent
          });
        }

        // Check for hydration errors
        const hydrationErrors = Array.from(document.querySelectorAll('[data-nextjs-error]'));
        hydrationErrors.forEach(el => {
          errors.push({
            type: 'hydration-error',
            element: el.textContent
          });
        });

        return errors;
      });

      // Add React errors to the errors array
      reactErrors.forEach(reactError => {
        errors.push({
          message: `React Error (${reactError.type}): ${reactError.element}`,
          stack: null,
          type: reactError.type
        });
      });

      // Generate summary
      const hasErrors = errors.length > 0;
      const errorTypes = [...new Set(errors.map(e => e.type))];

      let summary = '';
      if (!hasErrors) {
        summary = `✅ No errors detected on ${fullUrl}`;
      } else {
        summary = `❌ Found ${errors.length} error(s) on ${fullUrl}\n`;
        summary += `Error types: ${errorTypes.join(', ')}\n`;

        // Add source file information if available
        const filesWithErrors = errors
          .map(e => e.location?.file)
          .filter(Boolean)
          .filter((v, i, a) => a.indexOf(v) === i);

        if (filesWithErrors.length > 0) {
          summary += `Files with errors: ${filesWithErrors.join(', ')}`;
        }
      }

      // Format the response
      const result = {
        success: !hasErrors,
        url: fullUrl,
        timestamp: new Date().toISOString(),
        errors: errors.map(e => ({
          message: e.message,
          stack: e.stack,
          type: e.type,
          sourceFile: e.location?.file,
          lineNumber: e.location?.line,
          columnNumber: e.location?.column
        })),
        consoleLogs: consoleLogs.slice(0, 50), // Limit to 50 most recent logs
        networkRequests: networkRequests.slice(0, 30), // Limit to 30 requests
        failedRequests,
        screenshot: screenshotTaken ? screenshotPath : null,
        summary
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };

    } finally {
      await browser.close();
    }
  }
);

// Tool 2: capture_api_response - 特定のAPIレスポンスをキャプチャ
server.registerTool(
  "capture_api_response",
  {
    title: "Capture API Response",
    description: "Load a page and capture specific API responses",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "Page URL to load"
        },
        apiPattern: {
          type: "string",
          description: "API URL pattern to capture (e.g., '**/api/content**')"
        }
      },
      required: ["url", "apiPattern"]
    }
  },
  async (params) => {
    const { url, apiPattern } = params;

    const browser = await chromium.launch({
      headless: true
    });

    try {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        extraHTTPHeaders: {
          'x-test-mode': 'true'
        }
      });

      const page = await context.newPage();
      const capturedRequests = [];

      // Setup route handler to intercept matching requests
      await page.route(apiPattern, async (route) => {
        const request = route.request();

        // Continue the request and capture the response
        const response = await route.fetch();
        const responseBody = await response.body();

        let parsedResponse = null;
        try {
          parsedResponse = JSON.parse(responseBody.toString());
        } catch {
          parsedResponse = responseBody.toString();
        }

        capturedRequests.push({
          url: request.url(),
          method: request.method(),
          status: response.status(),
          requestHeaders: request.headers(),
          requestBody: request.postData(),
          responseBody: parsedResponse,
          timestamp: new Date().toISOString()
        });

        // Fulfill the original request
        await route.fulfill({ response });
      });

      // Add test query parameter
      const testUrl = new URL(url);
      testUrl.searchParams.set('test', 'true');

      // Navigate to the page
      await page.goto(testUrl.toString(), {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Wait a bit for any async API calls
      await page.waitForTimeout(3000);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            url: url,
            pattern: apiPattern,
            capturedCount: capturedRequests.length,
            requests: capturedRequests
          }, null, 2)
        }]
      };

    } finally {
      await browser.close();
    }
  }
);

// Tool 3: check_console_errors - コンソールエラーのみをチェック
server.registerTool(
  "check_console_errors",
  {
    title: "Check Console Errors",
    description: "Load a page and check for console errors and warnings only",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "Page URL to check"
        }
      },
      required: ["url"]
    }
  },
  async (params) => {
    const { url } = params;

    const browser = await chromium.launch({
      headless: true
    });

    try {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        extraHTTPHeaders: {
          'x-test-mode': 'true'
        }
      });

      const page = await context.newPage();
      const errors = [];
      const warnings = [];

      // Listen for console events
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        } else if (msg.type() === 'warning') {
          warnings.push(msg.text());
        }
      });

      // Listen for page errors
      page.on('pageerror', (error) => {
        errors.push(error.message);
      });

      // Add test query parameter
      const testUrl = new URL(url);
      testUrl.searchParams.set('test', 'true');

      // Navigate to the page
      await page.goto(testUrl.toString(), {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Wait for any async errors
      await page.waitForTimeout(2000);

      const hasErrors = errors.length > 0;

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            url: url,
            hasErrors,
            errorCount: errors.length,
            warningCount: warnings.length,
            errors,
            warnings,
            summary: hasErrors
              ? `❌ Found ${errors.length} error(s) and ${warnings.length} warning(s)`
              : `✅ No console errors found (${warnings.length} warning(s))`
          }, null, 2)
        }]
      };

    } finally {
      await browser.close();
    }
  }
);

// サーバー起動
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MUED Browser Debug Server started successfully");
}

main().catch(console.error);