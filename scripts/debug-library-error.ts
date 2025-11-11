/**
 * Debug Library Page Error
 * ライブラリページのエラーをデバッグ
 *
 * Playwrightを使用してブラウザでエラーを再現し、詳細を収集
 */

import { chromium } from '@playwright/test';

async function debugLibraryError() {
  console.log('🔍 Starting library page debug...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Collect console messages
  const consoleMessages: string[] = [];
  page.on('console', (msg) => {
    const text = msg.text();
    consoleMessages.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'error') {
      console.log('❌ Console Error:', text);
    }
  });

  // Collect page errors
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => {
    const errorText = error.toString();
    pageErrors.push(errorText);
    console.log('❌ Page Error:', errorText);
    console.log('Stack:', error.stack);
  });

  // Intercept API requests
  const apiRequests: Array<{ url: string; response: any }> = [];
  await page.route('**/api/content**', async (route) => {
    const response = await route.fetch();
    const json = await response.json();

    apiRequests.push({
      url: route.request().url(),
      response: json,
    });

    console.log('\n📡 API Request:', route.request().url());
    console.log('📦 Response:', JSON.stringify(json, null, 2));

    await route.fulfill({ response });
  });

  try {
    // Navigate to library page (using localhost for testing)
    const url = 'http://localhost:3000/dashboard/library';

    console.log(`🌐 Navigating to: ${url}\n`);

    // Mock authentication by setting cookies/local storage
    await page.goto('http://localhost:3000');

    // Wait for any redirects
    await page.waitForTimeout(1000);

    // Now go to library page
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Wait for content to load or error to occur
    await page.waitForTimeout(3000);

    // Check for React error boundary
    const errorBoundary = await page.locator('text=/error|Error|failed/i').first().textContent().catch(() => null);
    if (errorBoundary) {
      console.log('\n⚠️  Error Boundary Detected:', errorBoundary);
    }

    // Get page title
    const title = await page.title();
    console.log(`\n📄 Page Title: ${title}`);

    // Check if content loaded
    const contentCards = await page.locator('[data-testid="library-card"], .library-card, [class*="card"]').count();
    console.log(`📊 Content Cards Found: ${contentCards}`);

    // Take screenshot
    await page.screenshot({
      path: '/tmp/library-debug.png',
      fullPage: true
    });
    console.log('📸 Screenshot saved: /tmp/library-debug.png');

  } catch (error) {
    console.error('\n❌ Navigation Error:', error);
  }

  await browser.close();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 DEBUG SUMMARY');
  console.log('='.repeat(60));

  console.log(`\n🔢 Total Console Messages: ${consoleMessages.length}`);
  console.log(`🔢 Total Page Errors: ${pageErrors.length}`);
  console.log(`🔢 Total API Requests: ${apiRequests.length}`);

  if (pageErrors.length > 0) {
    console.log('\n❌ Page Errors:');
    pageErrors.forEach((err, i) => {
      console.log(`\n${i + 1}. ${err}`);
    });
  }

  if (apiRequests.length > 0) {
    console.log('\n📡 API Request Details:');
    apiRequests.forEach((req, i) => {
      console.log(`\n${i + 1}. ${req.url}`);
      console.log('Response structure:', {
        hasSuccess: 'success' in req.response,
        hasData: 'data' in req.response,
        dataType: req.response.data ? typeof req.response.data : 'N/A',
        dataKeys: req.response.data ? Object.keys(req.response.data) : [],
      });
    });
  }

  console.log('\n' + '='.repeat(60));
}

debugLibraryError().catch(console.error);
