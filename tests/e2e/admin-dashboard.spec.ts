/**
 * Admin Dashboard E2E Tests
 *
 * End-to-end tests for the admin dashboard including RAG metrics visualization,
 * provenance tracking, and quality monitoring features.
 */

import { test, expect, Page } from '@playwright/test';

// Admin user credentials (configured in test environment)
const ADMIN_USER = {
  email: 'admin@test.example.com',
  password: 'AdminPassword123!',
};

// Helper function to login as admin
async function loginAsAdmin(page: Page) {
  await page.goto('/sign-in');
  await page.fill('input[name="identifier"]', ADMIN_USER.email);
  await page.click('button:has-text("Continue")');
  await page.fill('input[name="password"]', ADMIN_USER.password);
  await page.click('button:has-text("Continue")');
  await page.waitForURL('/dashboard');
}

test.describe('Admin Dashboard - RAG Metrics', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/dashboard');
  });

  test('should display metrics overview cards', async ({ page }) => {
    // Check for key metric cards
    await expect(page.locator('[data-testid="metric-card-quality"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-card-retrieval"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-card-generation"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-card-latency"]')).toBeVisible();

    // Check that metrics display numeric values
    const qualityScore = await page.locator('[data-testid="quality-score-value"]').textContent();
    expect(qualityScore).toMatch(/\d+\.\d+/); // Should be a decimal number
  });

  test('should display quality trends chart', async ({ page }) => {
    await expect(page.locator('[data-testid="quality-trends-chart"]')).toBeVisible();

    // Check chart has data points
    const dataPoints = await page.locator('[data-testid="chart-data-point"]').count();
    expect(dataPoints).toBeGreaterThan(0);

    // Check time range selector
    await expect(page.locator('[data-testid="time-range-selector"]')).toBeVisible();
  });

  test('should filter metrics by date range', async ({ page }) => {
    // Open date range picker
    await page.click('[data-testid="date-range-picker"]');

    // Select last 7 days
    await page.click('[data-testid="range-option-7d"]');

    await page.waitForTimeout(500); // Wait for data to load

    // Verify URL updated with date params
    expect(page.url()).toContain('range=7d');

    // Check that chart updated
    await expect(page.locator('[data-testid="quality-trends-chart"]')).toBeVisible();
  });

  test('should display retrieval metrics details', async ({ page }) => {
    // Navigate to retrieval metrics tab
    await page.click('[data-testid="tab-retrieval-metrics"]');

    // Check for retrieval-specific metrics
    await expect(page.locator('[data-testid="metric-precision"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-recall"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-f1-score"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-mrr"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-ndcg"]')).toBeVisible();

    // Check that values are numeric
    const precision = await page.locator('[data-testid="metric-precision-value"]').textContent();
    expect(parseFloat(precision || '0')).toBeGreaterThan(0);
    expect(parseFloat(precision || '0')).toBeLessThanOrEqual(1);
  });

  test('should display generation metrics details', async ({ page }) => {
    // Navigate to generation metrics tab
    await page.click('[data-testid="tab-generation-metrics"]');

    // Check for generation-specific metrics
    await expect(page.locator('[data-testid="metric-coherence"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-relevance"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-factuality"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-fluency"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-bleu"]')).toBeVisible();

    // Check ROUGE scores
    await expect(page.locator('[data-testid="metric-rouge-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-rouge-2"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-rouge-l"]')).toBeVisible();
  });

  test('should display latency distribution chart', async ({ page }) => {
    await page.click('[data-testid="tab-performance"]');

    // Check latency charts
    await expect(page.locator('[data-testid="retrieval-latency-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="generation-latency-chart"]')).toBeVisible();

    // Check percentile metrics
    await expect(page.locator('[data-testid="latency-p50"]')).toBeVisible();
    await expect(page.locator('[data-testid="latency-p95"]')).toBeVisible();
    await expect(page.locator('[data-testid="latency-p99"]')).toBeVisible();
  });

  test('should show performance regression alerts', async ({ page }) => {
    // Check for regression alerts section
    const alertsSection = page.locator('[data-testid="regression-alerts"]');

    if (await alertsSection.isVisible()) {
      // Check alert severity indicators
      const alerts = await page.locator('[data-testid="regression-alert"]').all();

      for (const alert of alerts) {
        const severity = await alert.getAttribute('data-severity');
        expect(['minor', 'moderate', 'severe']).toContain(severity);
      }
    }
  });

  test('should export metrics data', async ({ page }) => {
    // Click export button
    await page.click('[data-testid="export-metrics-button"]');

    // Select export format
    await page.click('[data-testid="export-format-csv"]');

    // Wait for download
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="confirm-export"]');
    const download = await downloadPromise;

    // Verify download
    expect(download.suggestedFilename()).toMatch(/metrics.*\.csv/);
  });
});

test.describe('Admin Dashboard - Provenance Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/dashboard/provenance');
  });

  test('should display provenance records list', async ({ page }) => {
    // Check table/list is visible
    await expect(page.locator('[data-testid="provenance-list"]')).toBeVisible();

    // Check table headers
    await expect(page.locator('[data-testid="header-content-id"]')).toBeVisible();
    await expect(page.locator('[data-testid="header-created-at"]')).toBeVisible();
    await expect(page.locator('[data-testid="header-model"]')).toBeVisible();
    await expect(page.locator('[data-testid="header-sources"]')).toBeVisible();

    // Check at least one record exists
    const records = await page.locator('[data-testid="provenance-record"]').count();
    expect(records).toBeGreaterThan(0);
  });

  test('should filter provenance by model', async ({ page }) => {
    // Open model filter
    await page.click('[data-testid="filter-model"]');

    // Select GPT-4
    await page.click('[data-testid="model-option-gpt-4"]');

    await page.waitForTimeout(500);

    // Verify all visible records use GPT-4
    const models = await page.locator('[data-testid="record-model"]').allTextContents();
    models.forEach(model => {
      expect(model).toContain('gpt-4');
    });
  });

  test('should filter provenance by date range', async ({ page }) => {
    // Open date filter
    await page.click('[data-testid="filter-date-range"]');

    // Select custom range
    await page.fill('[data-testid="date-from"]', '2024-01-01');
    await page.fill('[data-testid="date-to"]', '2024-01-31');
    await page.click('[data-testid="apply-date-filter"]');

    await page.waitForTimeout(500);

    // Verify dates are within range
    const dates = await page.locator('[data-testid="record-date"]').allTextContents();
    dates.forEach(dateStr => {
      const date = new Date(dateStr);
      expect(date.getTime()).toBeGreaterThanOrEqual(new Date('2024-01-01').getTime());
      expect(date.getTime()).toBeLessThanOrEqual(new Date('2024-01-31').getTime());
    });
  });

  test('should view detailed provenance information', async ({ page }) => {
    // Click on first record
    await page.click('[data-testid="provenance-record"]');

    // Check detail view opened
    await expect(page.locator('[data-testid="provenance-detail-modal"]')).toBeVisible();

    // Check sections are present
    await expect(page.locator('[data-testid="section-generation-trace"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-source-attribution"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-transformations"]')).toBeVisible();
    await expect(page.locator('[data-testid="section-metadata"]')).toBeVisible();
  });

  test('should display source attribution details', async ({ page }) => {
    await page.click('[data-testid="provenance-record"]');

    // Check source cards are visible
    const sources = await page.locator('[data-testid="source-card"]').count();
    expect(sources).toBeGreaterThan(0);

    // Check first source details
    const firstSource = page.locator('[data-testid="source-card"]').first();
    await expect(firstSource.locator('[data-testid="source-title"]')).toBeVisible();
    await expect(firstSource.locator('[data-testid="source-type"]')).toBeVisible();
    await expect(firstSource.locator('[data-testid="source-score"]')).toBeVisible();
    await expect(firstSource.locator('[data-testid="source-usage"]')).toBeVisible();
  });

  test('should display generation trace information', async ({ page }) => {
    await page.click('[data-testid="provenance-record"]');

    // Check generation parameters
    await expect(page.locator('[data-testid="gen-model"]')).toBeVisible();
    await expect(page.locator('[data-testid="gen-temperature"]')).toBeVisible();
    await expect(page.locator('[data-testid="gen-max-tokens"]')).toBeVisible();

    // Check token usage
    await expect(page.locator('[data-testid="gen-prompt-tokens"]')).toBeVisible();
    await expect(page.locator('[data-testid="gen-completion-tokens"]')).toBeVisible();
    await expect(page.locator('[data-testid="gen-total-tokens"]')).toBeVisible();

    // Check latency
    await expect(page.locator('[data-testid="gen-latency"]')).toBeVisible();
  });

  test('should view transformation history', async ({ page }) => {
    await page.click('[data-testid="provenance-record"]');

    // Navigate to transformations tab
    await page.click('[data-testid="tab-transformations"]');

    // Check timeline is visible
    await expect(page.locator('[data-testid="transformations-timeline"]')).toBeVisible();

    // Check transformation entries
    const transformations = await page.locator('[data-testid="transformation-entry"]').count();
    expect(transformations).toBeGreaterThan(0);

    // Check first transformation details
    const firstTransform = page.locator('[data-testid="transformation-entry"]').first();
    await expect(firstTransform.locator('[data-testid="transform-operation"]')).toBeVisible();
    await expect(firstTransform.locator('[data-testid="transform-timestamp"]')).toBeVisible();
  });

  test('should compare provenance versions', async ({ page }) => {
    // Select a record with multiple versions
    await page.click('[data-testid="provenance-record"][data-versions="2"]');

    // Click compare versions button
    await page.click('[data-testid="compare-versions-button"]');

    // Check comparison view
    await expect(page.locator('[data-testid="version-comparison"]')).toBeVisible();

    // Check side-by-side display
    await expect(page.locator('[data-testid="version-1-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="version-2-panel"]')).toBeVisible();

    // Check diff highlights
    const diffs = await page.locator('[data-testid="diff-highlight"]').count();
    expect(diffs).toBeGreaterThanOrEqual(0);
  });

  test('should search provenance records', async ({ page }) => {
    // Enter search query
    await page.fill('[data-testid="provenance-search"]', 'jazz progression');
    await page.press('[data-testid="provenance-search"]', 'Enter');

    await page.waitForTimeout(500);

    // Verify search results
    const records = await page.locator('[data-testid="provenance-record"]').allTextContents();
    const matchesFound = records.some(text =>
      text.toLowerCase().includes('jazz') || text.toLowerCase().includes('progression')
    );
    expect(matchesFound).toBe(true);
  });
});

test.describe('Admin Dashboard - Quality Monitoring', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/dashboard/quality');
  });

  test('should display quality score distribution', async ({ page }) => {
    await expect(page.locator('[data-testid="quality-distribution-chart"]')).toBeVisible();

    // Check distribution buckets
    await expect(page.locator('[data-testid="bucket-0-50"]')).toBeVisible();
    await expect(page.locator('[data-testid="bucket-50-70"]')).toBeVisible();
    await expect(page.locator('[data-testid="bucket-70-85"]')).toBeVisible();
    await expect(page.locator('[data-testid="bucket-85-100"]')).toBeVisible();
  });

  test('should display user feedback summary', async ({ page }) => {
    // Check feedback metrics
    await expect(page.locator('[data-testid="feedback-thumbs-up"]')).toBeVisible();
    await expect(page.locator('[data-testid="feedback-thumbs-down"]')).toBeVisible();
    await expect(page.locator('[data-testid="feedback-satisfaction-rate"]')).toBeVisible();

    // Check reported issues
    await expect(page.locator('[data-testid="reported-issues-list"]')).toBeVisible();
  });

  test('should filter by quality score range', async ({ page }) => {
    // Open quality filter
    await page.click('[data-testid="filter-quality"]');

    // Set min/max quality
    await page.fill('[data-testid="quality-min"]', '0.8');
    await page.fill('[data-testid="quality-max"]', '1.0');
    await page.click('[data-testid="apply-quality-filter"]');

    await page.waitForTimeout(500);

    // Verify filtered results
    const scores = await page.locator('[data-testid="content-quality-score"]').allTextContents();
    scores.forEach(scoreStr => {
      const score = parseFloat(scoreStr);
      expect(score).toBeGreaterThanOrEqual(0.8);
      expect(score).toBeLessThanOrEqual(1.0);
    });
  });

  test('should view content with low quality scores', async ({ page }) => {
    // Click low quality alert
    await page.click('[data-testid="low-quality-alert"]');

    // Check filtered list
    await expect(page.locator('[data-testid="low-quality-list"]')).toBeVisible();

    // Verify all items have low scores
    const scores = await page.locator('[data-testid="content-quality-score"]').allTextContents();
    scores.forEach(scoreStr => {
      const score = parseFloat(scoreStr);
      expect(score).toBeLessThan(0.7);
    });
  });

  test('should view reported issues details', async ({ page }) => {
    // Click on an issue
    await page.click('[data-testid="reported-issue"]');

    // Check issue detail modal
    await expect(page.locator('[data-testid="issue-detail-modal"]')).toBeVisible();

    // Check issue information
    await expect(page.locator('[data-testid="issue-type"]')).toBeVisible();
    await expect(page.locator('[data-testid="issue-description"]')).toBeVisible();
    await expect(page.locator('[data-testid="issue-reporter"]')).toBeVisible();
    await expect(page.locator('[data-testid="issue-timestamp"]')).toBeVisible();
    await expect(page.locator('[data-testid="related-content"]')).toBeVisible();
  });

  test('should mark issue as resolved', async ({ page }) => {
    await page.click('[data-testid="reported-issue"]');

    // Mark as resolved
    await page.click('[data-testid="mark-resolved-button"]');

    // Add resolution note
    await page.fill('[data-testid="resolution-note"]', 'Fixed factual error in chord progression');
    await page.click('[data-testid="confirm-resolution"]');

    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText('marked as resolved');
  });

  test('should compare quality across models', async ({ page }) => {
    // Navigate to model comparison
    await page.click('[data-testid="tab-model-comparison"]');

    // Check comparison table
    await expect(page.locator('[data-testid="model-comparison-table"]')).toBeVisible();

    // Check models listed
    await expect(page.locator('[data-testid="model-gpt-4"]')).toBeVisible();
    await expect(page.locator('[data-testid="model-gpt-3-5-turbo"]')).toBeVisible();

    // Check metrics columns
    await expect(page.locator('[data-testid="col-avg-quality"]')).toBeVisible();
    await expect(page.locator('[data-testid="col-avg-latency"]')).toBeVisible();
    await expect(page.locator('[data-testid="col-total-content"]')).toBeVisible();
  });
});

test.describe('Admin Dashboard - Access Control', () => {
  test('should redirect non-admin users', async ({ page }) => {
    // Login as regular user (not admin)
    await page.goto('/sign-in');
    await page.fill('input[name="identifier"]', 'student@test.example.com');
    await page.click('button:has-text("Continue")');
    await page.fill('input[name="password"]', 'StudentPassword123!');
    await page.click('button:has-text("Continue")');

    // Try to access admin dashboard
    await page.goto('/admin/dashboard');

    // Should be redirected
    await page.waitForURL('/dashboard', { timeout: 5000 });

    // Should not see admin content
    await expect(page.locator('[data-testid="admin-dashboard"]')).not.toBeVisible();
  });

  test('should require authentication', async ({ page }) => {
    // Try to access admin dashboard without login
    await page.goto('/admin/dashboard');

    // Should redirect to sign-in
    await page.waitForURL(/\/sign-in/);
  });
});
