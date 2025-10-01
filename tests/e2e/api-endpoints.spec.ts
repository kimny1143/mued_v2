import { test, expect } from '@playwright/test';

/**
 * E2E Test: API Endpoints
 * Tests public API endpoints without authentication
 */

test.describe('API Endpoints', () => {
  test('should return healthy status from health check', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('healthy');
    expect(data.service).toBe('MUED LMS API');
    expect(data.timestamp).toBeDefined();
  });

  test('should connect to database successfully', async ({ request }) => {
    const response = await request.get('/api/health/db');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('healthy');
    expect(data.database).toBe('connected');
  });

  test('should return lesson slots from API', async ({ request }) => {
    const response = await request.get('/api/lessons?available=true');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.slots).toBeDefined();
    expect(Array.isArray(data.slots)).toBe(true);

    // Should have at least some slots in the future
    if (data.slots.length > 0) {
      const slot = data.slots[0];
      expect(slot.id).toBeDefined();
      expect(slot.startTime).toBeDefined();
      expect(slot.endTime).toBeDefined();
      expect(slot.status).toBe('available');
    }
  });

  test('should filter lessons by availability', async ({ request }) => {
    const allSlots = await request.get('/api/lessons');
    const availableSlots = await request.get('/api/lessons?available=true');

    expect(allSlots.status()).toBe(200);
    expect(availableSlots.status()).toBe(200);

    const allData = await allSlots.json();
    const availableData = await availableSlots.json();

    // Available slots should be subset or equal to all slots
    expect(availableData.slots.length).toBeLessThanOrEqual(allData.slots.length);

    // All returned slots should have status 'available'
    availableData.slots.forEach((slot: any) => {
      expect(slot.status).toBe('available');
    });
  });
});

test.describe('Performance Metrics', () => {
  test('home page should load within 3 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(3000);
    console.log(`✓ Home page loaded in ${loadTime}ms`);
  });

  test('lessons API should respond within 2 seconds', async ({ request }) => {
    const startTime = Date.now();
    const response = await request.get('/api/lessons?available=true');
    const responseTime = Date.now() - startTime;

    expect(response.status()).toBe(200);
    expect(responseTime).toBeLessThan(2000);
    console.log(`✓ API responded in ${responseTime}ms`);
  });

  test('dashboard page should be accessible', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to sign-in since not authenticated
    await page.waitForURL('**/sign-in**', { timeout: 5000 });
    expect(page.url()).toContain('sign-in');
  });
});
