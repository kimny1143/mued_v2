/**
 * Load Testing Specifications
 * Phase 2: Performance under concurrent load
 */

import { test, expect } from '@playwright/test';

test.describe('Load Performance Tests', () => {
  test.describe.configure({ mode: 'parallel' });

  test('RAG Metrics Dashboard - Concurrent Users', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/admin/rag-metrics');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Should load within 3 seconds even under load
    expect(loadTime).toBeLessThan(3000);

    // Verify core elements loaded
    await expect(page.getByText(/SLO Status|SLOステータス/)).toBeVisible();
    await expect(page.getByText(/Current Metrics|現在のメトリクス/)).toBeVisible();
  });

  test('Plugin Management - Concurrent Access', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/admin/plugins');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Should load within 2 seconds
    expect(loadTime).toBeLessThan(2000);

    // Verify plugins loaded
    await expect(page.getByText(/Registered Plugins|登録済みプラグイン/)).toBeVisible();
  });

  test('Library Content - Large Dataset', async ({ page }) => {
    // Simulate large content response
    await page.route('**/api/content', route => {
      const largeDataset = Array.from({ length: 200 }, (_, i) => ({
        id: `item-${i}`,
        title: `Content ${i}`,
        content: `Description for content item ${i}`,
        type: i % 2 === 0 ? 'material' : 'note_article',
        createdAt: new Date(2025, 0, i % 30 + 1).toISOString(),
        updatedAt: new Date(2025, 0, i % 30 + 1).toISOString(),
      }));

      route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: largeDataset }),
      });
    });

    const startTime = Date.now();

    await page.goto('/library');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Should handle large datasets within 5 seconds
    expect(loadTime).toBeLessThan(5000);

    // Verify content rendered
    const contentCards = page.locator('[data-testid="library-card"]').or(
      page.locator('article').or(page.locator('[class*="card"]'))
    );
    const count = await contentCards.count();

    expect(count).toBeGreaterThan(0);
  });

  test('Metrics API - High Frequency Polling', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/api/admin/rag-metrics/history**', route => {
      requestCount++;
      route.continue();
    });

    await page.goto('/admin/rag-metrics');
    await page.waitForTimeout(5000); // Wait 5 seconds

    // Should not poll excessively
    expect(requestCount).toBeLessThan(10); // Max 2 req/sec
  });

  test('Plugin Health Check - Timeout Handling', async ({ page }) => {
    // Simulate slow health check
    await page.route('**/api/admin/plugins/**/health', route => {
      setTimeout(() => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ healthy: true, message: 'OK', latencyMs: 2000 }),
        });
      }, 2000);
    });

    await page.goto('/admin/plugins');

    // Click health check
    const healthButton = page.locator('button:has-text("Check Health")').first();
    if (await healthButton.isVisible()) {
      const startTime = Date.now();
      await healthButton.click();

      // Wait for result
      await page.getByText(/Healthy|正常|Unhealthy/).waitFor({ timeout: 5000 });

      const duration = Date.now() - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000);
    }
  });
});

test.describe('Memory and Resource Usage', () => {
  test('should not leak memory on page navigation', async ({ page }) => {
    // Navigate through multiple Phase 2 pages
    const pages = [
      '/admin/rag-metrics',
      '/admin/plugins',
      '/library',
      '/admin/rag-metrics',
      '/admin/plugins',
    ];

    for (const url of pages) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
    }

    // Check JavaScript heap size (if available)
    const heapSize = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return null;
    });

    if (heapSize) {
      // Should not exceed 100MB
      expect(heapSize).toBeLessThan(100 * 1024 * 1024);
    }
  });

  test('should handle rapid component mounting/unmounting', async ({ page }) => {
    await page.goto('/admin/rag-metrics');

    // Rapidly switch periods
    for (let i = 0; i < 10; i++) {
      const period7 = page.locator('button:has-text("7")');
      const period30 = page.locator('button:has-text("30")');

      if (await period30.isVisible()) {
        await period30.click();
        await page.waitForTimeout(100);
      }

      if (await period7.isVisible()) {
        await period7.click();
        await page.waitForTimeout(100);
      }
    }

    // Page should still be responsive
    await expect(page).toHaveURL(/rag-metrics/);
  });
});

test.describe('Network Performance', () => {
  test('should minimize API calls on initial load', async ({ page }) => {
    let apiCallCount = 0;

    await page.route('**/api/**', route => {
      apiCallCount++;
      route.continue();
    });

    await page.goto('/admin/rag-metrics');
    await page.waitForLoadState('networkidle');

    // Should make reasonable number of API calls
    expect(apiCallCount).toBeLessThan(5);
  });

  test('should cache plugin data', async ({ page }) => {
    let pluginApiCalls = 0;

    await page.route('**/api/admin/plugins', route => {
      pluginApiCalls++;
      route.continue();
    });

    await page.goto('/admin/plugins');
    await page.waitForLoadState('networkidle');

    const firstCallCount = pluginApiCalls;

    // Navigate away and back
    await page.goto('/admin/rag-metrics');
    await page.goto('/admin/plugins');
    await page.waitForLoadState('networkidle');

    // Should reuse cached data (or make minimal additional calls)
    expect(pluginApiCalls - firstCallCount).toBeLessThan(2);
  });

  test('should handle offline gracefully', async ({ page, context }) => {
    await page.goto('/admin/rag-metrics');
    await page.waitForLoadState('networkidle');

    // Go offline
    await context.setOffline(true);

    // Try to reload
    await page.reload();

    // Should show offline message
    await expect(page.getByText(/offline|network error|接続エラー/i)).toBeVisible({ timeout: 5000 });

    // Go back online
    await context.setOffline(false);
  });
});

test.describe('Bundle Size and Loading', () => {
  test('should have reasonable JavaScript bundle size', async ({ page }) => {
    const resourceSizes: number[] = [];

    page.on('response', response => {
      const url = response.url();
      if (url.includes('.js') && !url.includes('node_modules')) {
        response.body().then(body => {
          resourceSizes.push(body.length);
        });
      }
    });

    await page.goto('/admin/rag-metrics');
    await page.waitForLoadState('networkidle');

    // Wait for resources to be collected
    await page.waitForTimeout(1000);

    const totalSize = resourceSizes.reduce((sum, size) => sum + size, 0);

    // Total JS should be under 500KB
    expect(totalSize).toBeLessThan(500 * 1024);
  });

  test('should load critical resources first', async ({ page }) => {
    const resourceTimings: Array<{ url: string; startTime: number; }> = [];

    page.on('response', response => {
      resourceTimings.push({
        url: response.url(),
        startTime: Date.now(),
      });
    });

    await page.goto('/admin/rag-metrics');
    await page.waitForLoadState('networkidle');

    // First resources should be HTML and critical CSS/JS
    const firstResources = resourceTimings.slice(0, 3);
    const hasHTML = firstResources.some(r => r.url.includes('/admin/rag-metrics'));

    expect(hasHTML).toBeTruthy();
  });
});
