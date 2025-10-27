#!/usr/bin/env node
const { chromium } = require("@playwright/test");
const fs = require("fs").promises;
const path = require("path");
const dotenv = require("dotenv");

// Project root directory
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Load test environment variables from .env.test
dotenv.config({ path: path.join(PROJECT_ROOT, '.env.test') });

async function captureScreenshots() {
  console.log('🚀 Starting screenshot capture...');
  console.log(`E2E_TEST_MODE: ${process.env.NEXT_PUBLIC_E2E_TEST_MODE}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });

  const page = await context.newPage();
  const baseUrl = "http://localhost:3000";
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const outputDir = path.join(PROJECT_ROOT, "screenshots", timestamp);

  const pages = [
    { path: "/", name: "landing" },
    { path: "/dashboard", name: "dashboard" },
    { path: "/dashboard/lessons", name: "lessons" },
    { path: "/dashboard/materials", name: "materials" },
    { path: "/dashboard/reservations", name: "reservations" },
    { path: "/dashboard/booking-calendar", name: "booking-calendar" },
  ];

  await fs.mkdir(outputDir, { recursive: true });

  const results = [];
  const errors = [];

  for (const pageInfo of pages) {
    try {
      const pagePath = pageInfo.path;
      const pageName = pageInfo.name;

      console.log(`📸 Capturing: ${pagePath} (${pageName})`);

      await page.goto(`${baseUrl}${pagePath}`, {
        waitUntil: 'networkidle',
        timeout: 15000
      });

      // Check if redirected to sign-in
      if (page.url().includes('sign-in')) {
        console.log(`  ⚠️  Redirected to sign-in, authentication bypass failed for ${pageName}`);
        errors.push({ page: pagePath, error: 'Authentication required' });
        continue;
      }

      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      // Wait for spinners to disappear
      try {
        await page.waitForFunction(() => {
          const spinner = document.querySelector('.animate-spin');
          return !spinner;
        }, { timeout: 5000 });
      } catch {
        // No spinner, continue
      }

      // Capture viewport screenshot
      const viewportPath = path.join(outputDir, `${pageName}-viewport.png`);
      await page.screenshot({ path: viewportPath, fullPage: false });
      console.log(`  ✅ Viewport: ${viewportPath}`);

      // Capture fullpage screenshot
      const fullpagePath = path.join(outputDir, `${pageName}-fullpage.png`);
      await page.screenshot({ path: fullpagePath, fullPage: true });
      console.log(`  ✅ Fullpage: ${fullpagePath}`);

      results.push({
        page: pagePath,
        name: pageName,
        viewport: viewportPath,
        fullpage: fullpagePath,
        status: '✅'
      });

    } catch (error) {
      console.error(`  ❌ Error capturing ${pageInfo.name}: ${error.message}`);
      errors.push({ page: pageInfo.path, error: error.message });
    }
  }

  await browser.close();

  console.log('\n📊 Summary:');
  console.log(`✅ Success: ${results.length}`);
  console.log(`❌ Errors: ${errors.length}`);
  console.log(`📁 Output: ${outputDir}`);

  if (errors.length > 0) {
    console.log('\n❌ Errors:');
    errors.forEach(err => console.log(`  - ${err.page}: ${err.error}`));
  }

  return { results, errors, outputDir };
}

captureScreenshots()
  .then(() => {
    console.log('\n✅ Screenshot capture complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Screenshot capture failed:', error);
    process.exit(1);
  });
