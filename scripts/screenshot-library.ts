/**
 * Screenshot Library Page
 * ライブラリページのスクリーンショットを撮影
 */

import { chromium } from '@playwright/test';

async function screenshotLibrary() {
  console.log('📸 Taking screenshot of library page...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Collect console errors
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.log('❌ Console Error:', msg.text());
    }
  });

  page.on('pageerror', (error) => {
    errors.push(error.message);
    console.log('❌ Page Error:', error.message);
  });

  try {
    const baseUrl = 'http://localhost:3000';

    // Navigate to homepage
    console.log(`🌐 Navigating to: ${baseUrl}\n`);
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Take homepage screenshot
    await page.screenshot({
      path: '/tmp/library-homepage.png',
      fullPage: true
    });
    console.log('✅ Homepage screenshot saved: /tmp/library-homepage.png\n');

    // Try to navigate to library page (might require auth)
    console.log('🌐 Attempting to navigate to /dashboard/library...\n');
    await page.goto(`${baseUrl}/dashboard/library`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Check for "Material not found" text
    const notFoundText = await page.locator('text=/material not found/i').count();
    console.log(`🔍 "Material not found" occurrences: ${notFoundText}\n`);

    // Check for library cards
    const cardCount = await page.locator('[class*="bg-white"][class*="rounded"]').count();
    console.log(`📦 Content cards found: ${cardCount}\n`);

    // Take library page screenshot
    await page.screenshot({
      path: '/tmp/library-page.png',
      fullPage: true
    });
    console.log('✅ Library page screenshot saved: /tmp/library-page.png\n');

    // Get page title
    const title = await page.title();
    console.log(`📄 Page Title: ${title}\n`);

    if (errors.length > 0) {
      console.log('❌ Errors detected:', errors.length);
      errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

screenshotLibrary().catch(console.error);
