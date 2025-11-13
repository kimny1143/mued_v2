/**
 * Phase 2 Complete User Flow E2E Tests
 * Tests the full Phase 2 features: i18n, plugins, RAG metrics
 */

import { test, expect } from '@playwright/test';

test.describe('Phase 2 Complete User Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin dashboard (assuming authenticated)
    await page.goto('/admin');
    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');
  });

  test('should navigate through all Phase 2 features', async ({ page }) => {
    // Check if we're on admin dashboard
    await expect(page).toHaveURL(/\/admin/, { timeout: 15000 });

    // Navigate to RAG Metrics Dashboard
    const ragMetricsLink = page.getByRole('link', { name: /RAG Metrics/i }).or(
      page.getByText('RAG Metrics').first()
    );
    await ragMetricsLink.click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/admin\/rag-metrics/, { timeout: 15000 });
    await expect(
      page.getByRole('heading', { name: /RAG|メトリクス/i }).or(
        page.getByText(/RAG.*Dashboard|RAGメトリクスダッシュボード/).first()
      )
    ).toBeVisible({ timeout: 15000 });

    // Navigate to Plugin Management
    const pluginsLink = page.getByRole('link', { name: /Plugins/i }).or(
      page.getByText('Plugins').first()
    );
    await pluginsLink.click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/admin\/plugins/, { timeout: 15000 });
    await expect(
      page.getByRole('heading', { name: /Plugin|プラグイン/i }).or(
        page.getByText(/Plugin Management|プラグイン管理/).first()
      )
    ).toBeVisible({ timeout: 15000 });

    // Navigate to Library
    const libraryLink = page.getByRole('link', { name: /Library/i }).or(
      page.getByText('Library').first()
    );
    await libraryLink.click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/library/, { timeout: 15000 });
    await expect(
      page.getByRole('heading', { name: /Library|ライブラリ/i }).or(
        page.getByText(/Content Library|コンテンツライブラリ/).first()
      )
    ).toBeVisible({ timeout: 15000 });
  });

  test('should switch language and verify translations', async ({ page }) => {
    // Look for language switcher
    const languageSwitcher = page.locator('[data-testid="language-switcher"]').or(
      page.locator('button:has-text("EN")').or(page.locator('button:has-text("JA")'))
    );

    // Switch to Japanese
    await languageSwitcher.click();
    await page.click('text=日本語');

    // Verify Japanese translation
    await expect(page.getByText('ダッシュボード')).toBeVisible({ timeout: 5000 });

    // Switch back to English
    await languageSwitcher.click();
    await page.click('text=English');

    // Verify English translation
    await expect(page.getByText('Dashboard')).toBeVisible({ timeout: 5000 });
  });

  test('should display RAG metrics dashboard correctly', async ({ page }) => {
    await page.goto('/admin/rag-metrics');

    // Check for main sections
    await expect(page.getByText(/SLO Status|SLOステータス/)).toBeVisible();
    await expect(page.getByText(/Current Metrics|現在のメトリクス/)).toBeVisible();
    await expect(page.getByText(/Historical Trends|履歴トレンド/)).toBeVisible();

    // Check for specific metrics
    await expect(page.getByText(/Citation Rate|引用率/)).toBeVisible();
    await expect(page.getByText(/Latency|レイテンシ/)).toBeVisible();
    await expect(page.getByText(/Cost|コスト/)).toBeVisible();

    // Check for period selector
    const periodSelector = page.locator('button:has-text("7")').or(
      page.locator('button:has-text("30")')
    );
    await expect(periodSelector.first()).toBeVisible();
  });

  test('should display plugin management interface', async ({ page }) => {
    await page.goto('/admin/plugins');

    // Check for plugin list
    await expect(page.getByText(/Registered Plugins|登録済みプラグイン/)).toBeVisible();

    // Check for plugin cards (should show note.com and local plugins)
    const pluginCards = page.locator('[data-testid="plugin-card"]').or(
      page.locator('text=Note.com').locator('xpath=ancestor::div[contains(@class, "card")]')
    );

    await expect(pluginCards.first()).toBeVisible({ timeout: 5000 });

    // Check for plugin capabilities
    await expect(page.getByText(/Capabilities|機能/)).toBeVisible();
    await expect(page.getByText(/Health Status|ヘルス状態/)).toBeVisible();
  });

  test('should check plugin health', async ({ page }) => {
    await page.goto('/admin/plugins');

    // Wait for plugins to load
    await page.waitForSelector('text=Note.com', { timeout: 5000 });

    // Click health check button
    const healthButton = page.locator('button:has-text("Check Health")').or(
      page.locator('button:has-text("ヘルスチェック")')
    ).first();

    if (await healthButton.isVisible()) {
      await healthButton.click();

      // Wait for health check result
      await expect(page.getByText(/Healthy|正常|Unhealthy|異常/)).toBeVisible({ timeout: 10000 });
    }
  });

  test('should load content from library', async ({ page }) => {
    await page.goto('/library');

    // Wait for content to load
    await page.waitForLoadState('networkidle');

    // Check for library content or empty state
    const hasContent = await page.locator('[data-testid="library-card"]').count() > 0;
    const hasEmptyState = await page.locator('text=No content found').or(
      page.locator('text=コンテンツが見つかりません')
    ).isVisible();

    expect(hasContent || hasEmptyState).toBeTruthy();

    if (hasContent) {
      // Verify content cards have required elements
      const firstCard = page.locator('[data-testid="library-card"]').first();
      await expect(firstCard).toBeVisible();
    }
  });

  test('should filter library content by source', async ({ page }) => {
    await page.goto('/library');

    // Look for source filter
    const sourceFilter = page.locator('[data-testid="source-filter"]').or(
      page.locator('select:near(:text("Source"))').or(
        page.locator('button:has-text("note.com")'))
    );

    if (await sourceFilter.isVisible()) {
      await sourceFilter.click();

      // Select a source
      await page.click('text=note.com');

      // Wait for filtered results
      await page.waitForLoadState('networkidle');
    }
  });

  test('should search library content', async ({ page }) => {
    await page.goto('/library');

    // Look for search input
    const searchInput = page.locator('input[type="search"]').or(
      page.locator('input[placeholder*="Search"]').or(
        page.locator('input[placeholder*="検索"]')
      )
    );

    if (await searchInput.isVisible()) {
      await searchInput.fill('music theory');
      await searchInput.press('Enter');

      // Wait for search results
      await page.waitForLoadState('networkidle');
    }
  });

  test('should display metrics charts', async ({ page }) => {
    await page.goto('/admin/rag-metrics');

    // Wait for charts to render
    await page.waitForLoadState('networkidle');

    // Check for chart containers (Recharts typically uses SVG)
    const charts = page.locator('svg').or(
      page.locator('[data-testid="metrics-chart"]')
    );

    const chartCount = await charts.count();
    expect(chartCount).toBeGreaterThan(0);
  });

  test('should handle period switching in metrics', async ({ page }) => {
    await page.goto('/admin/rag-metrics');
    await page.waitForLoadState('networkidle');

    // Find period selector by data-testid
    const period7d = page.getByTestId('period-7d');
    const period30d = page.getByTestId('period-30d');

    // Click 30 days if available
    if (await period30d.isVisible()) {
      await period30d.click();
      await page.waitForLoadState('networkidle');

      // Verify period changed using data-selected attribute
      await expect(period30d).toHaveAttribute('data-selected', 'true');
      await expect(period7d).toHaveAttribute('data-selected', 'false');
    }
  });
});

test.describe('Phase 2 Accessibility', () => {
  test('should have accessible RAG metrics dashboard', async ({ page }) => {
    await page.goto('/admin/rag-metrics');

    // Check for ARIA labels
    const mainContent = page.locator('main').or(page.locator('[role="main"]'));
    await expect(mainContent).toBeVisible();

    // Check heading hierarchy
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/admin/plugins');

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Check that focus is visible
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'A', 'INPUT']).toContain(focusedElement);
  });
});

test.describe('Phase 2 Error Handling', () => {
  test('should handle plugin errors gracefully', async ({ page }) => {
    // Set up route interception before navigation
    await page.route('**/api/admin/plugins', route =>
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' }),
      })
    );

    await page.goto('/admin/plugins');

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Should show error message with increased timeout for CI
    await expect(
      page.getByText(/error|エラー|failed|失敗/i).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('should handle metrics loading errors', async ({ page }) => {
    // Set up route interception before navigation
    await page.route('**/api/admin/rag-metrics/**', route =>
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Failed to load metrics' }),
      })
    );

    await page.goto('/admin/rag-metrics');

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Should show error state with increased timeout
    await expect(
      page.getByText(/error|failed|エラー|失敗|問題/i).first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('should handle empty library gracefully', async ({ page }) => {
    // Set up route interception before navigation
    await page.route('**/api/content', route =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          data: { content: [] }
        }),
      })
    );

    await page.goto('/library');

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Should show empty state with increased timeout
    await expect(
      page.getByText(/No content|コンテンツが見つかりません|Empty|空/i).first()
    ).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Phase 2 Performance', () => {
  test('should load RAG metrics dashboard within 3 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/admin/rag-metrics');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(3000);
  });

  test('should load plugin management within 2 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/admin/plugins');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(2000);
  });

  test('should handle large content lists efficiently', async ({ page }) => {
    // Mock large content list
    const largeContentList = Array.from({ length: 100 }, (_, i) => ({
      id: `${i}`,
      title: `Content Item ${i}`,
      content: `Description for item ${i}`,
      type: 'material',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    await page.route('**/api/content', route =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          data: { content: largeContentList }
        }),
      })
    );

    const startTime = Date.now();
    await page.goto('/library');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // Should still load within reasonable time
    expect(loadTime).toBeLessThan(5000);
  });
});
