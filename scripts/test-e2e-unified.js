#!/usr/bin/env node

/**
 * Unified E2E Test Suite for MUED LMS v2
 *
 * This script consolidates all E2E testing functionality:
 * - Login/authentication flows
 * - Booking system tests
 * - Calendar functionality
 * - Screenshot capture
 *
 * Usage:
 *   node test-e2e-unified.js                    # Run all tests
 *   node test-e2e-unified.js --suite login      # Run login tests only
 *   node test-e2e-unified.js --suite booking    # Run booking tests only
 *   node test-e2e-unified.js --headless=false   # Run with browser visible
 *   node test-e2e-unified.js --screenshot       # Capture screenshots
 */

const { chromium } = require('@playwright/test');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
  headless: process.argv.includes('--headless=false') ? false : true,
  screenshot: process.argv.includes('--screenshot'),
  timeout: 30000,
  testUser: {
    student: 'test_student',
    mentor: 'test_mentor',
    password: 'TestPassword123!',
    email: 'test_student@example.com'
  }
};

// Test suite selector
const SUITE = (() => {
  const suiteArg = process.argv.find(arg => arg.startsWith('--suite='));
  return suiteArg ? suiteArg.split('=')[1] : 'all';
})();

// Test results tracker
const testResults = {
  passed: [],
  failed: [],
  skipped: [],
  startTime: new Date(),
  endTime: null
};

// Utility: Run individual test with error handling
async function runTest(name, testFn, context) {
  console.log(`\n📝 Running: ${name}`);
  try {
    await testFn(context);
    testResults.passed.push(name);
    console.log(`✅ Passed: ${name}`);
  } catch (error) {
    testResults.failed.push({ name, error: error.message });
    console.error(`❌ Failed: ${name}`);
    console.error(`   Error: ${error.message}`);

    if (CONFIG.screenshot && context.page) {
      const screenshotPath = path.join(__dirname, 'screenshots', `error-${name.replace(/\s+/g, '-')}.png`);
      await context.page.screenshot({ path: screenshotPath });
      console.log(`   Screenshot saved: ${screenshotPath}`);
    }
  }
}

// Test Suite: Authentication/Login Tests
async function runLoginTests(context) {
  const { page } = context;

  // Test 1: Basic login flow
  await runTest('Basic Login Flow', async () => {
    await page.goto(`${CONFIG.baseUrl}/sign-in`);
    await page.waitForSelector('[data-clerk-component="SignIn"]', { timeout: 5000 });

    // Enter username
    await page.fill('input[name="identifier"]', CONFIG.testUser.student);
    await page.click('button:has-text("Continue")');

    // Wait for password field
    await page.waitForSelector('input[type="password"]', { timeout: 5000 });
    await page.fill('input[type="password"]', CONFIG.testUser.password);

    // Submit login
    await page.click('button[type="submit"]');

    // Verify successful login (redirect to dashboard)
    await page.waitForURL('**/dashboard/**', { timeout: 10000 });
  }, context);

  // Test 2: Check Clerk components
  await runTest('Clerk Component Verification', async () => {
    await page.goto(`${CONFIG.baseUrl}/sign-in`);
    const clerkElements = await page.$$('[data-clerk-id]');
    if (clerkElements.length === 0) {
      throw new Error('No Clerk components found on login page');
    }
  }, context);

  // Test 3: Invalid credentials
  await runTest('Invalid Credentials Handling', async () => {
    await page.goto(`${CONFIG.baseUrl}/sign-in`);
    await page.waitForSelector('[data-clerk-component="SignIn"]', { timeout: 5000 });

    await page.fill('input[name="identifier"]', 'invalid_user');
    await page.click('button:has-text("Continue")');

    // Should show error or stay on login page
    await page.waitForTimeout(2000);
    const url = page.url();
    if (!url.includes('sign-in')) {
      throw new Error('Should remain on sign-in page with invalid credentials');
    }
  }, context);
}

// Test Suite: Booking System Tests
async function runBookingTests(context) {
  const { page } = context;

  // Login first
  await page.goto(`${CONFIG.baseUrl}/sign-in`);
  await page.fill('input[name="identifier"]', CONFIG.testUser.student);
  await page.click('button:has-text("Continue")');
  await page.waitForSelector('input[type="password"]', { timeout: 5000 });
  await page.fill('input[type="password"]', CONFIG.testUser.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard/**', { timeout: 10000 });

  // Test 1: Navigate to booking page
  await runTest('Navigate to Booking Page', async () => {
    await page.goto(`${CONFIG.baseUrl}/dashboard/lessons`);
    await page.waitForSelector('h1', { timeout: 5000 });

    const heading = await page.textContent('h1');
    if (!heading.includes('レッスン')) {
      throw new Error('Booking page not loaded correctly');
    }
  }, context);

  // Test 2: Check available slots
  await runTest('Check Available Lesson Slots', async () => {
    await page.goto(`${CONFIG.baseUrl}/dashboard/lessons`);

    // Wait for either slots or empty message
    await page.waitForSelector('.lesson-card, .empty-state', { timeout: 10000 });

    const slots = await page.$$('.lesson-card');
    console.log(`   Found ${slots.length} available lesson slots`);
  }, context);

  // Test 3: Calendar interaction
  await runTest('Calendar Date Selection', async () => {
    const calendarButton = await page.$('[role="button"][aria-label*="calendar"]');
    if (calendarButton) {
      await calendarButton.click();
      await page.waitForTimeout(1000);

      // Try to select a date
      const dateButtons = await page.$$('[role="gridcell"] button');
      if (dateButtons.length > 0) {
        await dateButtons[0].click();
      }
    }
  }, context);
}

// Test Suite: Dashboard Tests
async function runDashboardTests(context) {
  const { page } = context;

  // Login first
  await page.goto(`${CONFIG.baseUrl}/sign-in`);
  await page.fill('input[name="identifier"]', CONFIG.testUser.student);
  await page.click('button:has-text("Continue")');
  await page.waitForSelector('input[type="password"]', { timeout: 5000 });
  await page.fill('input[type="password"]', CONFIG.testUser.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard/**', { timeout: 10000 });

  // Test 1: Dashboard loads correctly
  await runTest('Dashboard Main Page', async () => {
    await page.goto(`${CONFIG.baseUrl}/dashboard`);
    await page.waitForSelector('h1', { timeout: 5000 });

    // Check for key dashboard elements
    const welcomeMessage = await page.$('text=/ようこそ|Welcome|Dashboard/');
    if (!welcomeMessage) {
      throw new Error('Dashboard welcome message not found');
    }
  }, context);

  // Test 2: Navigation menu works
  await runTest('Dashboard Navigation', async () => {
    const navLinks = await page.$$('nav a, aside a');
    console.log(`   Found ${navLinks.length} navigation links`);

    if (navLinks.length === 0) {
      throw new Error('No navigation links found');
    }
  }, context);
}

// Main execution
async function main() {
  console.log('🚀 MUED LMS v2 - Unified E2E Test Suite');
  console.log(`📋 Test Suite: ${SUITE.toUpperCase()}`);
  console.log(`🔧 Configuration:`, CONFIG);
  console.log('='.repeat(60));

  const browser = await chromium.launch({
    headless: CONFIG.headless,
    slowMo: CONFIG.headless ? 0 : 100
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true
  });

  const page = await context.newPage();

  // Create screenshots directory if needed
  if (CONFIG.screenshot) {
    await fs.mkdir(path.join(__dirname, 'screenshots'), { recursive: true });
  }

  try {
    // Run selected test suites
    if (SUITE === 'all' || SUITE === 'login') {
      console.log('\n🔐 Running Login/Authentication Tests...');
      await runLoginTests({ page, browser, context });
    }

    if (SUITE === 'all' || SUITE === 'booking') {
      console.log('\n📅 Running Booking System Tests...');
      await runBookingTests({ page, browser, context });
    }

    if (SUITE === 'all' || SUITE === 'dashboard') {
      console.log('\n📊 Running Dashboard Tests...');
      await runDashboardTests({ page, browser, context });
    }

    // Generate test report
    testResults.endTime = new Date();
    const duration = (testResults.endTime - testResults.startTime) / 1000;

    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${testResults.passed.length}`);
    console.log(`❌ Failed: ${testResults.failed.length}`);
    console.log(`⏭️  Skipped: ${testResults.skipped.length}`);
    console.log(`⏱️  Duration: ${duration.toFixed(2)}s`);

    if (testResults.failed.length > 0) {
      console.log('\n❌ Failed Tests:');
      testResults.failed.forEach(({ name, error }) => {
        console.log(`  - ${name}: ${error}`);
      });
    }

    // Exit code based on results
    process.exit(testResults.failed.length > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n💥 Fatal error:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run the tests
main().catch(console.error);