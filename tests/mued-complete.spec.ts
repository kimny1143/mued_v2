import { test, expect } from '@playwright/test';

// Helper function to wait for slots with retries
async function waitForSlotsToRender(page: any, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    // Wait for network to settle
    await page.waitForLoadState('networkidle');

    // Check for loading spinner and wait for it to disappear
    const spinnerGone = await page.waitForFunction(() => {
      const spinner = document.querySelector('.animate-spin');
      return !spinner || spinner.style.display === 'none';
    }, { timeout: 5000 }).catch(() => false);

    // Force a small wait for React re-render
    await page.waitForTimeout(1000);

    // Check if slots are rendered
    const slotsCount = await page.evaluate(() => {
      return document.querySelectorAll('[data-available="true"]').length;
    });

    if (slotsCount > 0) {
      console.log(`Found ${slotsCount} slots on attempt ${i + 1}`);
      return slotsCount;
    }

    // If no slots found, wait and retry
    if (i < maxRetries - 1) {
      console.log(`Attempt ${i + 1}: No slots found, retrying...`);
      await page.waitForTimeout(2000);
    }
  }

  return 0;
}

test.describe('MUED LMS Complete Test Suite', () => {
  test('01: Health Check', async ({ page }) => {
    const response = await page.request.get('/api/health');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('healthy');
  });

  test('02: Database Connection', async ({ page }) => {
    const response = await page.request.get('/api/health/db');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.database).toBe('connected');
  });

  test('03: Lessons API', async ({ page }) => {
    const response = await page.request.get('/api/lessons?available=true');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.slots).toBeDefined();
    expect(data.slots.length).toBeGreaterThan(0);
    console.log(`Found ${data.slots.length} available slots from API`);
  });

  test('04: Login Flow', async ({ page }) => {
    await page.goto('/sign-in');

    // Wait for Clerk component
    await page.waitForSelector('[data-clerk-component="SignIn"]', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Fill username
    await page.fill('input[name="identifier"]', 'test_student');
    await page.click('button:has-text("Continue")');

    // Fill password
    await page.waitForTimeout(2000);
    const passwordField = await page.locator('input[type="password"]');
    await passwordField.fill('TestPassword123!');

    // Click sign in
    const signInButton = await page.locator('button:has-text("Continue"), button:has-text("Sign in")').first();
    await signInButton.click();

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('05: Dashboard Display', async ({ page }) => {
    // First login
    await page.goto('/sign-in');
    await page.waitForSelector('[data-clerk-component="SignIn"]', { timeout: 10000 });
    await page.waitForTimeout(2000);
    await page.fill('input[name="identifier"]', 'test_student');
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(2000);
    const passwordField = await page.locator('input[type="password"]');
    await passwordField.fill('TestPassword123!');
    const signInButton = await page.locator('button:has-text("Continue"), button:has-text("Sign in")').first();
    await signInButton.click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Check dashboard elements
    await expect(page.locator('text=ようこそ')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('h2:has-text("レッスン予約")')).toBeVisible({ timeout: 5000 });
  });

  test('06: Booking Calendar Page', async ({ page }) => {
    // First login
    await page.goto('/sign-in');
    await page.waitForSelector('[data-clerk-component="SignIn"]', { timeout: 10000 });
    await page.waitForTimeout(2000);
    await page.fill('input[name="identifier"]', 'test_student');
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(2000);
    const passwordField = await page.locator('input[type="password"]');
    await passwordField.fill('TestPassword123!');
    const signInButton = await page.locator('button:has-text("Continue"), button:has-text("Sign in")').first();
    await signInButton.click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Navigate to booking calendar
    await page.goto('/dashboard/booking-calendar');

    // Wait for page load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('load');

    // Verify calendar view
    const calendarView = await page.locator('[data-testid="calendar-view"], .bg-white.rounded-lg.shadow').first();
    await expect(calendarView).toBeVisible({ timeout: 5000 });

    // Wait for slots to render
    const slotsCount = await waitForSlotsToRender(page);
    expect(slotsCount).toBeGreaterThan(0);
    console.log(`Found ${slotsCount} available slots on calendar`);
  });

  test('07: Slot Booking Click', async ({ page }) => {
    // First login
    await page.goto('/sign-in');
    await page.waitForSelector('[data-clerk-component="SignIn"]', { timeout: 10000 });
    await page.waitForTimeout(2000);
    await page.fill('input[name="identifier"]', 'test_student');
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(2000);
    const passwordField = await page.locator('input[type="password"]');
    await passwordField.fill('TestPassword123!');
    const signInButton = await page.locator('button:has-text("Continue"), button:has-text("Sign in")').first();
    await signInButton.click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Navigate to booking calendar
    await page.goto('/dashboard/booking-calendar');

    // Wait for slots
    const slotsCount = await waitForSlotsToRender(page);
    expect(slotsCount).toBeGreaterThan(0);

    // Click on first available slot
    const firstSlot = await page.locator('[data-available="true"]').first();
    const bookButton = await firstSlot.locator('button:has-text("このスロットを予約")');
    await bookButton.click();

    // Verify action (button clicked)
    await page.waitForTimeout(2000);
    console.log('Successfully clicked on booking button');
  });

  test('08: Complete User Flow', async ({ page }) => {
    // Login
    await page.goto('/sign-in');
    await page.waitForSelector('[data-clerk-component="SignIn"]', { timeout: 10000 });
    await page.waitForTimeout(2000);
    await page.fill('input[name="identifier"]', 'test_student');
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(2000);
    const passwordField = await page.locator('input[type="password"]');
    await passwordField.fill('TestPassword123!');
    const signInButton = await page.locator('button:has-text("Continue"), button:has-text("Sign in")').first();
    await signInButton.click();

    // Wait for dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    expect(page.url()).toContain('/dashboard');

    // Navigate to booking
    await page.goto('/dashboard/booking-calendar');

    // Wait for calendar
    await page.waitForLoadState('networkidle');
    const calendarView = await page.locator('[data-testid="calendar-view"], .bg-white.rounded-lg.shadow').first();
    await expect(calendarView).toBeVisible({ timeout: 5000 });

    // Wait for slots
    const slotsCount = await waitForSlotsToRender(page);
    expect(slotsCount).toBeGreaterThan(0);

    // Try to book
    const firstSlot = await page.locator('[data-available="true"]').first();
    const bookButton = await firstSlot.locator('button:has-text("このスロットを予約")');
    await bookButton.click();

    await page.waitForTimeout(2000);
    console.log('Complete user flow executed successfully');
  });
});

test.describe('Performance Tests', () => {
  test('09: Page Load Performance', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
    console.log(`Page loaded in ${loadTime}ms`);
  });

  test('10: API Response Time', async ({ page }) => {
    const startTime = Date.now();
    const response = await page.request.get('/api/lessons?available=true');
    const responseTime = Date.now() - startTime;

    expect(response.status()).toBe(200);
    expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
    console.log(`API responded in ${responseTime}ms`);
  });
});