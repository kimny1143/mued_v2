/**
 * Fetch Production HTML
 * 本番環境のHTMLを取得してエラーを確認
 */

import { chromium } from '@playwright/test';

async function fetchProdHTML() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors: string[] = [];
  const consoleLogs: string[] = [];

  // Capture console
  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    consoleLogs.push(text);
    if (msg.type() === 'error') {
      console.log('❌', text);
    }
  });

  // Capture errors
  page.on('pageerror', err => {
    const stack = err.stack || '';
    errors.push(`${err.message}\n${stack}`);
    console.log('\n❌ PAGE ERROR:');
    console.log(err.message);
    console.log('\nStack:', stack);
  });

  try {
    console.log('🌐 Loading production site...\n');

    await page.goto('https://mued-v2.vercel.app/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await page.waitForTimeout(5000);

    const html = await page.content();
    console.log(`\n📄 HTML Length: ${html.length} characters`);

    // Check for specific error patterns
    const hasLengthError = html.includes('Cannot read properties of undefined');
    console.log(`\n🔍 Contains 'Cannot read properties' error: ${hasLengthError}`);

    if (errors.length > 0) {
      console.log(`\n❌ Total Errors: ${errors.length}`);
      errors.forEach((err, i) => {
        console.log(`\n--- Error ${i + 1} ---`);
        console.log(err);
      });
    }

    // Try to extract source map info
    const sourceMapMatches = [...html.matchAll(/\/\/_sourceMappingURL=([^\s]+)/g)];
    if (sourceMapMatches.length > 0) {
      console.log(`\n🗺️  Source Maps Found: ${sourceMapMatches.length}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

fetchProdHTML().catch(console.error);
