#!/usr/bin/env node
/**
 * Test Library RSS Feed
 * Libraryページでnote.comマガジンRSSフィードが正しく表示されるかテスト
 */

const { chromium } = require('playwright');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function testLibraryRSS() {
  console.log('🚀 Starting Library RSS Feed Test...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Navigate to library page
    console.log('📍 Navigating to library page...');
    await page.goto('http://localhost:3000/dashboard/library', { waitUntil: 'domcontentloaded' });

    // 2. Check if authentication is required
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);

    if (currentUrl.includes('/sign-in') || currentUrl.includes('/sign-up')) {
      console.log('🔐 Authentication required. Please sign in manually...');
      console.log('   Waiting for you to complete sign-in...');

      // Wait for user to sign in (up to 2 minutes)
      await page.waitForURL('**/dashboard/library', { timeout: 120000 });
      console.log('✅ Signed in successfully!');
    }

    // 3. Wait for content to load
    console.log('\n📦 Waiting for RSS content to load...');
    await page.waitForTimeout(3000); // Give time for API call

    // 4. Check for content cards
    const contentCards = await page.locator('[data-testid="library-card"], article, .card').count();
    console.log(`   Found ${contentCards} content cards`);

    // 5. Take screenshot
    const screenshotPath = path.join(__dirname, '..', 'tests', 'reports', 'library-rss-test.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`\n📸 Screenshot saved: ${screenshotPath}`);

    // 6. Check for specific magazine content
    const pageContent = await page.content();
    const hasRecordingContent = pageContent.includes('レコーディング') || pageContent.includes('MUED教材');
    const hasArrangementContent = pageContent.includes('編曲');

    console.log('\n📊 Content Check:');
    console.log(`   - Has recording content: ${hasRecordingContent ? '✅' : '❌'}`);
    console.log(`   - Has arrangement content: ${hasArrangementContent ? '✅' : '❌'}`);
    console.log(`   - Total cards found: ${contentCards}`);

    // 7. Get visible titles
    console.log('\n📝 Visible Content Titles:');
    const titles = await page.locator('h1, h2, h3, h4').allTextContents();
    titles.slice(0, 10).forEach((title, i) => {
      if (title.trim()) console.log(`   ${i + 1}. ${title.trim()}`);
    });

    console.log('\n✅ Test completed successfully!');

    // Keep browser open for inspection
    console.log('\n👀 Browser will stay open for inspection. Press Ctrl+C to close.');
    await page.waitForTimeout(300000); // Keep open for 5 minutes

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

testLibraryRSS().catch(console.error);
