/**
 * Library Flow E2E Tests
 *
 * End-to-end tests for Library browsing and content viewing
 */

import { test, expect, Page } from '@playwright/test';

// Test user credentials
const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!',
};

// Helper function to login
async function login(page: Page) {
  await page.goto('/sign-in');
  await page.fill('input[name="identifier"]', TEST_USER.email);
  await page.click('button:has-text("Continue")');
  await page.fill('input[name="password"]', TEST_USER.password);
  await page.click('button:has-text("Continue")');
  await page.waitForURL('/dashboard');
}

test.describe('Library Browsing Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page);
  });

  test('should navigate to Library and display content', async ({ page }) => {
    // Navigate to Library
    await page.goto('/dashboard');
    await page.click('a[href="/dashboard/library"]');
    await page.waitForURL('/dashboard/library');

    // Check page title
    await expect(page.locator('h1')).toContainText('Library');

    // Check that filters are visible
    await expect(page.locator('[data-testid="library-filters"]')).toBeVisible();

    // Check that content cards are loaded
    await page.waitForSelector('[data-testid="library-card"]', { timeout: 10000 });
    const cards = await page.locator('[data-testid="library-card"]').count();
    expect(cards).toBeGreaterThan(0);
  });

  test('should filter content by source', async ({ page }) => {
    await page.goto('/dashboard/library');
    await page.waitForSelector('[data-testid="library-card"]');

    // Apply filter for note.com content
    await page.click('[data-testid="source-filter"]');
    await page.click('button:has-text("note.com")');

    // Wait for filtered results
    await page.waitForTimeout(500); // Wait for filter to apply

    // Check that all visible cards are from note.com
    const cards = await page.locator('[data-testid="library-card"]').all();
    for (const card of cards) {
      const source = await card.locator('[data-testid="content-source"]').textContent();
      expect(source?.toLowerCase()).toContain('note');
    }
  });

  test('should filter content by difficulty', async ({ page }) => {
    await page.goto('/dashboard/library');
    await page.waitForSelector('[data-testid="library-card"]');

    // Apply beginner filter
    await page.click('[data-testid="difficulty-filter"]');
    await page.click('button:has-text("Beginner")');

    // Wait for filtered results
    await page.waitForTimeout(500);

    // Check that filtered cards show beginner difficulty
    const cards = await page.locator('[data-testid="library-card"]').all();
    for (const card of cards) {
      const difficulty = await card.locator('[data-testid="content-difficulty"]').textContent();
      expect(difficulty?.toLowerCase()).toContain('beginner');
    }
  });

  test('should search content by keyword', async ({ page }) => {
    await page.goto('/dashboard/library');
    await page.waitForSelector('[data-testid="library-card"]');

    // Search for "piano"
    await page.fill('[data-testid="search-input"]', 'piano');
    await page.press('[data-testid="search-input"]', 'Enter');

    // Wait for search results
    await page.waitForTimeout(1000);

    // Check that results contain the search term
    const cards = await page.locator('[data-testid="library-card"]').all();
    expect(cards.length).toBeGreaterThan(0);

    // At least one card should contain "piano" in title or description
    let foundPiano = false;
    for (const card of cards) {
      const text = await card.textContent();
      if (text?.toLowerCase().includes('piano')) {
        foundPiano = true;
        break;
      }
    }
    expect(foundPiano).toBe(true);
  });

  test('should sort content by date', async ({ page }) => {
    await page.goto('/dashboard/library');
    await page.waitForSelector('[data-testid="library-card"]');

    // Sort by newest first
    await page.click('[data-testid="sort-dropdown"]');
    await page.click('button:has-text("Newest First")');

    await page.waitForTimeout(500);

    // Get dates from first few cards
    const dates = await page.locator('[data-testid="content-date"]').allTextContents();
    const parsedDates = dates.slice(0, 5).map(d => new Date(d));

    // Check that dates are in descending order
    for (let i = 0; i < parsedDates.length - 1; i++) {
      expect(parsedDates[i].getTime()).toBeGreaterThanOrEqual(parsedDates[i + 1].getTime());
    }
  });

  test('should sort content by quality score', async ({ page }) => {
    await page.goto('/dashboard/library');
    await page.waitForSelector('[data-testid="library-card"]');

    // Sort by quality score
    await page.click('[data-testid="sort-dropdown"]');
    await page.click('button:has-text("Highest Quality")');

    await page.waitForTimeout(500);

    // Get quality scores from cards
    const scores = await page.locator('[data-testid="quality-score"]').allTextContents();
    const parsedScores = scores.slice(0, 5).map(s => parseFloat(s));

    // Check that scores are in descending order
    for (let i = 0; i < parsedScores.length - 1; i++) {
      expect(parsedScores[i]).toBeGreaterThanOrEqual(parsedScores[i + 1]);
    }
  });

  test('should display AI transparency metadata for AI-generated content', async ({ page }) => {
    await page.goto('/dashboard/library');

    // Filter for AI-generated content
    await page.click('[data-testid="source-filter"]');
    await page.click('button:has-text("AI Generated")');

    await page.waitForTimeout(500);

    // Click on first AI-generated content card
    const firstCard = await page.locator('[data-testid="library-card"]').first();
    await firstCard.click();

    // Check for AI metadata display
    await expect(page.locator('[data-testid="ai-metadata"]')).toBeVisible();
    await expect(page.locator('[data-testid="ai-model"]')).toBeVisible();
    await expect(page.locator('[data-testid="quality-scores"]')).toBeVisible();

    // Check for quality metrics
    await expect(page.locator('[data-testid="playability-score"]')).toBeVisible();
    await expect(page.locator('[data-testid="learning-value-score"]')).toBeVisible();
    await expect(page.locator('[data-testid="accuracy-score"]')).toBeVisible();
  });

  test('should show external link modal for note.com content', async ({ page }) => {
    await page.goto('/dashboard/library');

    // Filter for note.com content
    await page.click('[data-testid="source-filter"]');
    await page.click('button:has-text("note.com")');

    await page.waitForTimeout(500);

    // Click on a note.com content card
    const noteCard = await page.locator('[data-testid="library-card"]').first();
    await noteCard.click();

    // External link modal should appear
    await expect(page.locator('[data-testid="external-link-modal"]')).toBeVisible();

    // Check modal content
    await expect(page.locator('[data-testid="modal-title"]')).toContainText('External Content');
    await expect(page.locator('[data-testid="modal-description"]')).toContainText('note.com');

    // Check buttons
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
    await expect(page.locator('button:has-text("Continue to note.com")')).toBeVisible();

    // Cancel should close modal
    await page.click('button:has-text("Cancel")');
    await expect(page.locator('[data-testid="external-link-modal"]')).not.toBeVisible();
  });

  test('should paginate through content', async ({ page }) => {
    await page.goto('/dashboard/library');
    await page.waitForSelector('[data-testid="library-card"]');

    // Check if pagination exists
    const pagination = await page.locator('[data-testid="pagination"]');
    if (await pagination.isVisible()) {
      // Get first page content IDs
      const firstPageIds = await page.locator('[data-testid="content-id"]').allTextContents();

      // Go to next page
      await page.click('[data-testid="next-page"]');
      await page.waitForTimeout(500);

      // Get second page content IDs
      const secondPageIds = await page.locator('[data-testid="content-id"]').allTextContents();

      // Content should be different
      expect(firstPageIds).not.toEqual(secondPageIds);

      // Go back to first page
      await page.click('[data-testid="prev-page"]');
      await page.waitForTimeout(500);

      // Should be back to first page content
      const backToFirstIds = await page.locator('[data-testid="content-id"]').allTextContents();
      expect(backToFirstIds).toEqual(firstPageIds);
    }
  });

  test('should clear all filters', async ({ page }) => {
    await page.goto('/dashboard/library');
    await page.waitForSelector('[data-testid="library-card"]');

    // Apply multiple filters
    await page.click('[data-testid="source-filter"]');
    await page.click('button:has-text("note.com")');

    await page.click('[data-testid="difficulty-filter"]');
    await page.click('button:has-text("Beginner")');

    await page.fill('[data-testid="search-input"]', 'test');
    await page.press('[data-testid="search-input"]', 'Enter');

    await page.waitForTimeout(500);

    // Clear all filters
    await page.click('[data-testid="clear-filters"]');

    await page.waitForTimeout(500);

    // Check that filters are cleared
    const searchInput = await page.locator('[data-testid="search-input"]').inputValue();
    expect(searchInput).toBe('');

    // Check that all content is showing (no active filter badges)
    const filterBadges = await page.locator('[data-testid="active-filter-badge"]').count();
    expect(filterBadges).toBe(0);
  });

  test('should handle empty search results gracefully', async ({ page }) => {
    await page.goto('/dashboard/library');
    await page.waitForSelector('[data-testid="library-card"]');

    // Search for something that won't return results
    await page.fill('[data-testid="search-input"]', 'xyzabc123nonexistent');
    await page.press('[data-testid="search-input"]', 'Enter');

    await page.waitForTimeout(1000);

    // Should show no results message
    await expect(page.locator('[data-testid="no-results"]')).toBeVisible();
    await expect(page.locator('[data-testid="no-results"]')).toContainText('No content found');

    // Clear search to restore content
    await page.fill('[data-testid="search-input"]', '');
    await page.press('[data-testid="search-input"]', 'Enter');

    await page.waitForTimeout(500);

    // Content should be visible again
    await expect(page.locator('[data-testid="library-card"]').first()).toBeVisible();
  });
});