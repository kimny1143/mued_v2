/**
 * Materials Sharing Flow E2E Tests
 *
 * End-to-end tests for sharing materials to library
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

// Helper function to create a test material
async function createTestMaterial(page: Page) {
  await page.goto('/dashboard/materials/new');

  // Fill in material creation form
  await page.fill('[data-testid="material-title"]', 'Test Piano Exercises');
  await page.selectOption('[data-testid="material-type"]', 'practice');
  await page.selectOption('[data-testid="material-difficulty"]', 'intermediate');
  await page.fill('[data-testid="material-description"]', 'A set of piano exercises for intermediate students');

  // Submit form
  await page.click('button:has-text("Generate Material")');

  // Wait for material to be created
  await page.waitForURL(/\/dashboard\/materials\/[a-zA-Z0-9-]+/, { timeout: 30000 });
}

test.describe('Materials Sharing Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page);
  });

  test('should create and share a material to library', async ({ page }) => {
    // Create a new material
    await createTestMaterial(page);

    // Material detail page should be visible
    await expect(page.locator('h1:has-text("Test Piano Exercises")')).toBeVisible();

    // Share to Library button should be visible
    const shareButton = page.locator('[data-testid="share-to-library-button"]');
    await expect(shareButton).toBeVisible();

    // Click share button
    await shareButton.click();

    // Success message should appear
    await expect(page.locator('[data-testid="share-success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="share-success-message"]')).toContainText('shared to Library');

    // Navigate to Library
    await page.goto('/dashboard/library');

    // Filter for AI-generated content
    await page.click('[data-testid="source-filter"]');
    await page.click('button:has-text("AI Generated")');

    await page.waitForTimeout(500);

    // The shared material should be visible
    const sharedContent = page.locator('[data-testid="library-card"]:has-text("Test Piano Exercises")');
    await expect(sharedContent).toBeVisible();
  });

  test('should show AI metadata badge on shared materials', async ({ page }) => {
    // Navigate to existing material
    await page.goto('/dashboard/materials');

    // Click on first material if exists, or create new one
    const materialCards = await page.locator('[data-testid="material-card"]').count();

    if (materialCards > 0) {
      await page.locator('[data-testid="material-card"]').first().click();
    } else {
      await createTestMaterial(page);
    }

    // Share to library
    await page.click('[data-testid="share-to-library-button"]');
    await expect(page.locator('[data-testid="share-success-message"]')).toBeVisible();

    // Go to Library and find the shared content
    await page.goto('/dashboard/library');
    await page.click('[data-testid="source-filter"]');
    await page.click('button:has-text("AI Generated")');

    await page.waitForTimeout(500);

    // Check for AI badge on the card
    const aiGeneratedCard = page.locator('[data-testid="library-card"]').first();
    await expect(aiGeneratedCard.locator('[data-testid="ai-badge"]')).toBeVisible();
    await expect(aiGeneratedCard.locator('[data-testid="ai-badge"]')).toContainText('AI');
  });

  test('should prevent sharing materials not owned by user', async ({ page }) => {
    // This test would require multiple user accounts
    // For now, we'll test that the share button is not visible on materials page for non-owned content

    await page.goto('/dashboard/materials');

    // If there are public/shared materials from other users
    // The share button should not be visible on those cards
    const publicMaterials = await page.locator('[data-testid="public-material-card"]').count();

    if (publicMaterials > 0) {
      await page.locator('[data-testid="public-material-card"]').first().click();

      // Share button should not be visible
      await expect(page.locator('[data-testid="share-to-library-button"]')).not.toBeVisible();
    }
  });

  test('should display reverse reference link in Library', async ({ page }) => {
    // Create and share a material
    await createTestMaterial(page);
    await page.click('[data-testid="share-to-library-button"]');
    await expect(page.locator('[data-testid="share-success-message"]')).toBeVisible();

    // Get the material ID from URL
    const url = page.url();
    const materialId = url.split('/').pop();

    // Navigate to Library
    await page.goto('/dashboard/library');
    await page.click('[data-testid="source-filter"]');
    await page.click('button:has-text("AI Generated")');

    await page.waitForTimeout(500);

    // Find the shared content
    const sharedCard = page.locator('[data-testid="library-card"]:has-text("Test Piano Exercises")');
    await sharedCard.click();

    // Should show link back to original material
    const sourceLink = page.locator('[data-testid="source-material-link"]');
    await expect(sourceLink).toBeVisible();
    await expect(sourceLink).toContainText('View Original Material');

    // Click link should navigate back to material
    await sourceLink.click();
    await expect(page).toHaveURL(new RegExp(`/dashboard/materials/${materialId}`));
  });

  test('should update Library immediately after sharing', async ({ page }) => {
    // Count existing AI-generated content in Library
    await page.goto('/dashboard/library');
    await page.click('[data-testid="source-filter"]');
    await page.click('button:has-text("AI Generated")');
    await page.waitForTimeout(500);

    const initialCount = await page.locator('[data-testid="library-card"]').count();

    // Create and share new material
    await createTestMaterial(page);
    await page.click('[data-testid="share-to-library-button"]');
    await expect(page.locator('[data-testid="share-success-message"]')).toBeVisible();

    // Go back to Library
    await page.goto('/dashboard/library');
    await page.click('[data-testid="source-filter"]');
    await page.click('button:has-text("AI Generated")');
    await page.waitForTimeout(500);

    // Count should be increased by 1
    const newCount = await page.locator('[data-testid="library-card"]').count();
    expect(newCount).toBe(initialCount + 1);
  });

  test('should preserve material metadata when sharing', async ({ page }) => {
    // Create material with specific metadata
    await page.goto('/dashboard/materials/new');

    const materialData = {
      title: 'Advanced Jazz Improvisation',
      type: 'practice',
      difficulty: 'advanced',
      description: 'Complex jazz improvisation exercises with chord progressions',
    };

    await page.fill('[data-testid="material-title"]', materialData.title);
    await page.selectOption('[data-testid="material-type"]', materialData.type);
    await page.selectOption('[data-testid="material-difficulty"]', materialData.difficulty);
    await page.fill('[data-testid="material-description"]', materialData.description);

    await page.click('button:has-text("Generate Material")');
    await page.waitForURL(/\/dashboard\/materials\/[a-zA-Z0-9-]+/, { timeout: 30000 });

    // Share to Library
    await page.click('[data-testid="share-to-library-button"]');
    await expect(page.locator('[data-testid="share-success-message"]')).toBeVisible();

    // Check in Library
    await page.goto('/dashboard/library');
    await page.click('[data-testid="source-filter"]');
    await page.click('button:has-text("AI Generated")');
    await page.waitForTimeout(500);

    // Find the shared content
    const sharedCard = page.locator(`[data-testid="library-card"]:has-text("${materialData.title}")`);
    await expect(sharedCard).toBeVisible();

    // Check metadata is preserved
    await expect(sharedCard.locator('[data-testid="content-difficulty"]')).toContainText('Advanced');
    await expect(sharedCard.locator('[data-testid="content-type"]')).toContainText('Practice');
    await expect(sharedCard.locator('[data-testid="content-description"]')).toContainText(materialData.description);
  });

  test('should handle share failures gracefully', async ({ page }) => {
    // Navigate to materials
    await page.goto('/dashboard/materials');

    // Mock network failure
    await page.route('**/api/materials/share-to-library', route => {
      route.abort('failed');
    });

    // Try to share a material (create one if needed)
    const materialCards = await page.locator('[data-testid="material-card"]').count();

    if (materialCards > 0) {
      await page.locator('[data-testid="material-card"]').first().click();
    } else {
      await createTestMaterial(page);
    }

    // Attempt to share
    await page.click('[data-testid="share-to-library-button"]');

    // Error message should appear
    await expect(page.locator('[data-testid="share-error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="share-error-message"]')).toContainText('Failed to share');
  });

  test('should disable share button while sharing', async ({ page }) => {
    // Create a material
    await createTestMaterial(page);

    // Intercept the share API call to make it slow
    await page.route('**/api/materials/share-to-library', async route => {
      await page.waitForTimeout(2000); // Simulate slow network
      await route.continue();
    });

    const shareButton = page.locator('[data-testid="share-to-library-button"]');

    // Button should be enabled initially
    await expect(shareButton).toBeEnabled();

    // Click share
    await shareButton.click();

    // Button should be disabled during sharing
    await expect(shareButton).toBeDisabled();
    await expect(shareButton).toContainText('Sharing...');

    // Wait for completion
    await expect(page.locator('[data-testid="share-success-message"]')).toBeVisible({ timeout: 5000 });

    // Button should be re-enabled but show "Shared" state
    await expect(shareButton).toBeEnabled();
    await expect(shareButton).toContainText('Shared');
  });

  test('should track sharing history', async ({ page }) => {
    // Create and share multiple materials
    const materials = [
      { title: 'Material 1', type: 'practice' },
      { title: 'Material 2', type: 'quiz' },
    ];

    for (const material of materials) {
      await page.goto('/dashboard/materials/new');
      await page.fill('[data-testid="material-title"]', material.title);
      await page.selectOption('[data-testid="material-type"]', material.type);
      await page.selectOption('[data-testid="material-difficulty"]', 'beginner');
      await page.fill('[data-testid="material-description"]', 'Test description');

      await page.click('button:has-text("Generate Material")');
      await page.waitForURL(/\/dashboard\/materials\/[a-zA-Z0-9-]+/, { timeout: 30000 });

      await page.click('[data-testid="share-to-library-button"]');
      await expect(page.locator('[data-testid="share-success-message"]')).toBeVisible();
    }

    // Check Library shows both shared materials
    await page.goto('/dashboard/library');
    await page.click('[data-testid="source-filter"]');
    await page.click('button:has-text("AI Generated")');
    await page.waitForTimeout(500);

    for (const material of materials) {
      await expect(page.locator(`[data-testid="library-card"]:has-text("${material.title}")`)).toBeVisible();
    }
  });
});