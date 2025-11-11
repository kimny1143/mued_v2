/**
 * Test Material Page
 * 教材ページのAPIレスポンスをテスト
 */

import { chromium } from '@playwright/test';

async function testMaterialPage() {
  const materialId = 'c286c917-49de-4068-bfda-169a622a1644';
  console.log(`🔍 Testing material page: ${materialId}\n`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Collect API responses
  const apiResponses: Array<{ url: string; status: number; body: any }> = [];

  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/ai/materials/')) {
      try {
        const body = await response.json();
        apiResponses.push({
          url,
          status: response.status(),
          body,
        });
        console.log(`\n📡 API Response: ${url}`);
        console.log(`   Status: ${response.status()}`);
        console.log(`   Body: ${JSON.stringify(body, null, 2).substring(0, 500)}...\n`);
      } catch (error) {
        console.log(`\n⚠️  Failed to parse response from ${url}`);
      }
    }
  });

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
    const url = `http://localhost:3000/dashboard/materials/${materialId}`;
    console.log(`🌐 Navigating to: ${url}\n`);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Check for "Material not found" text
    const notFoundCount = await page.locator('text=/Material not found/i').count();
    console.log(`\n🔍 "Material not found" text found: ${notFoundCount}`);

    // Check for error message
    const errorBox = await page.locator('.bg-red-50').count();
    console.log(`🔍 Error boxes found: ${errorBox}`);

    if (errorBox > 0) {
      const errorText = await page.locator('.bg-red-50').first().textContent();
      console.log(`❌ Error message: ${errorText}`);
    }

    // Get page title
    const title = await page.title();
    console.log(`📄 Page Title: ${title}`);

    // Take screenshot
    await page.screenshot({
      path: `/tmp/material-${materialId}.png`,
      fullPage: true
    });
    console.log(`\n📸 Screenshot saved: /tmp/material-${materialId}.png`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`API Responses: ${apiResponses.length}`);
    console.log(`Console Errors: ${errors.length}`);
    console.log(`"Material not found" occurrences: ${notFoundCount}`);

    if (apiResponses.length > 0) {
      console.log('\nAPI Response Details:');
      apiResponses.forEach((resp, i) => {
        console.log(`\n${i + 1}. ${resp.url}`);
        console.log(`   Status: ${resp.status}`);
        console.log(`   Success: ${resp.body.success}`);
        if (resp.body.data) {
          console.log(`   Has Data: true`);
        } else {
          console.log(`   Has Data: false`);
          console.log(`   Error: ${resp.body.error}`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

testMaterialPage().catch(console.error);
