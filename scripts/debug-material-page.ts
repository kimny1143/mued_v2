/**
 * Debug Material Detail Page
 * ブラウザコンソールログとスクリーンショットを取得
 */

import { chromium } from '@playwright/test';

async function debugMaterialPage() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Collect console logs
  const consoleLogs: Array<{ type: string; text: string }> = [];
  page.on('console', (msg) => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
    });
  });

  // Collect page errors
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  try {
    // Get the latest material ID from the database
    console.log('Fetching latest material...');

    // Navigate to materials list to get the latest one
    await page.goto('http://localhost:3000/dashboard/materials', {
      waitUntil: 'networkidle',
    });

    // Wait for materials to load
    await page.waitForTimeout(2000);

    // Find the first material link
    const firstMaterialLink = page.locator('a[href*="/dashboard/materials/"]').first();
    const materialHref = await firstMaterialLink.getAttribute('href');

    if (!materialHref) {
      console.error('No materials found!');
      return;
    }

    console.log(`Found material: ${materialHref}`);

    // Navigate to the material detail page
    await page.goto(`http://localhost:3000${materialHref}`, {
      waitUntil: 'networkidle',
    });

    // Wait for content to load
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({
      path: '/tmp/material-detail.png',
      fullPage: true,
    });

    console.log('\n=== Console Logs ===');
    consoleLogs.forEach((log) => {
      console.log(`[${log.type.toUpperCase()}] ${log.text}`);
    });

    if (pageErrors.length > 0) {
      console.log('\n=== Page Errors ===');
      pageErrors.forEach((error) => {
        console.error(error);
      });
    }

    // Check if audio controls are visible
    const audioControls = page.locator('.audio-controls');
    const audioControlsVisible = await audioControls.isVisible().catch(() => false);
    console.log(`\n=== Audio Controls Visible: ${audioControlsVisible} ===`);

    // Check if ABC notation is rendered
    const abcNotation = page.locator('.abc-notation-svg');
    const abcNotationVisible = await abcNotation.isVisible().catch(() => false);
    console.log(`=== ABC Notation Visible: ${abcNotationVisible} ===`);

    console.log('\nScreenshot saved to: /tmp/material-detail.png');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

debugMaterialPage();
