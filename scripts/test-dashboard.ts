/**
 * Test Dashboard Page
 * ダッシュボードページのランタイムエラーをテスト
 */

import { chromium } from '@playwright/test';

async function testDashboard() {
  console.log('🔍 Testing dashboard page...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

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
  const pageErrors: Array<{ message: string; stack?: string }> = [];
  page.on('pageerror', (error) => {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
    };
    pageErrors.push(errorInfo);
    console.log('❌ Page Error:', error.message);
    if (error.stack) {
      console.log('Stack:', error.stack);
    }
  });

  try {
    // Navigate to homepage first
    const baseUrl = 'http://localhost:3000';
    console.log(`🌐 Navigating to: ${baseUrl}\n`);

    await page.goto(baseUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Get page title
    const title = await page.title();
    console.log(`📄 Homepage Title: ${title}\n`);

    // Take screenshot
    await page.screenshot({
      path: '/tmp/dashboard-test.png',
      fullPage: true
    });
    console.log('📸 Screenshot saved: /tmp/dashboard-test.png\n');

  } catch (error) {
    console.error('❌ Navigation Error:', error);
  }

  await browser.close();

  // Summary
  console.log('='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));

  console.log(`\n🔢 Total Console Messages: ${consoleMessages.length}`);
  console.log(`🔢 Total Page Errors: ${pageErrors.length}`);

  if (pageErrors.length > 0) {
    console.log('\n❌ Page Errors:');
    pageErrors.forEach((err, i) => {
      console.log(`\n${i + 1}. ${err.message}`);
      if (err.stack) {
        console.log(`Stack: ${err.stack}`);
      }
    });
    process.exit(1);
  } else {
    console.log('\n✅ No errors detected!');
    process.exit(0);
  }

  console.log('\n' + '='.repeat(60));
}

testDashboard().catch(console.error);
