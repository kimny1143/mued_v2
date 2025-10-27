/**
 * E2E Tests: Teacher Workflow
 *
 * Complete teacher journey from material creation to class management
 */

import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'crypto';

// Helper to login as teacher
async function loginAsTeacher(page: Page) {
  // In test mode, we might bypass Clerk or use test credentials
  await page.goto('/');
  // TODO: Implement proper test auth strategy
  await page.evaluate(() => {
    localStorage.setItem('test-role', 'teacher');
    localStorage.setItem('test-user-id', 'teacher-123');
  });
}

// Helper to create test material
async function createTestMaterial(page: Page, title: string) {
  const abc = `
X:1
T:${title}
M:4/4
L:1/4
Q:1/4=120
K:Cmaj
C D E F | G A B c | c B A G | F E D C |
G E C E | G E C2 | F D B, D | F D B,2 |
  `.trim();

  await page.goto('/dashboard/materials/create');
  await page.fill('input[name="title"]', title);
  await page.fill('textarea[name="abc"]', abc);
  await page.selectOption('select[name="instrument"]', 'piano');

  return abc;
}

test.describe('Teacher Material Creation Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page);
  });

  test('should create and analyze material with quality gate', async ({ page }) => {
    const materialTitle = `Test Material ${randomUUID().slice(0, 8)}`;

    // Navigate to material creation
    await page.goto('/dashboard/materials/create');

    // Fill in material details
    await page.fill('input[name="title"]', materialTitle);

    const abcContent = `
X:1
T:${materialTitle}
M:4/4
L:1/4
Q:1/4=120
K:Cmaj
C D E F | G A B c | c B A G | F E D C |
|: G E C E | G E C2 :| F D B, D | F D B,2 ||
    `.trim();

    await page.fill('textarea[name="abc"]', abcContent);
    await page.selectOption('select[name="instrument"]', 'piano');

    // Trigger quality analysis
    await page.click('button:has-text("Analyze Quality")');

    // Wait for analysis to complete
    await expect(page.locator('[data-testid="quality-analysis"]')).toBeVisible({
      timeout: 10000
    });

    // Verify quality scores are displayed
    await expect(page.locator('[data-testid="playability-score"]')).toBeVisible();
    await expect(page.locator('[data-testid="learning-value-score"]')).toBeVisible();

    // Check instrument-specific feedback
    await expect(page.locator('text=/楽器.*piano/i')).toBeVisible();

    // Verify difficulty level assessment
    await expect(page.locator('text=/難易度.*(beginner|intermediate|advanced)/i')).toBeVisible();

    // Check quality gate status
    const qualityGateStatus = page.locator('[data-testid="quality-gate-status"]');
    const gateText = await qualityGateStatus.textContent();

    if (gateText?.includes('合格') || gateText?.includes('Pass')) {
      // If passed, publish button should be enabled
      await expect(page.locator('button:has-text("Publish")')).toBeEnabled();

      // Publish the material
      await page.click('button:has-text("Publish")');
      await expect(page.locator('text=/Published successfully|公開されました/i')).toBeVisible();
    } else {
      // If failed, should show draft-only option
      await expect(page.locator('button:has-text("Save as Draft")')).toBeEnabled();
      await expect(page.locator('button:has-text("Publish")')).toBeDisabled();
    }
  });

  test('should handle material with poor quality scores', async ({ page }) => {
    await page.goto('/dashboard/materials/create');

    // Create intentionally poor quality material
    const poorAbc = `
X:1
T:Poor Quality Material
M:4/4
L:1/16
Q:1/4=200
K:Cmaj
C,,,, c'''' C,,,, c'''' | =c ^c =c ^c _c =c ^c =c |
    `.trim();

    await page.fill('input[name="title"]', 'Poor Quality Test');
    await page.fill('textarea[name="abc"]', poorAbc);
    await page.selectOption('select[name="instrument"]', 'piano');

    await page.click('button:has-text("Analyze Quality")');

    // Wait for analysis
    await expect(page.locator('[data-testid="quality-analysis"]')).toBeVisible();

    // Should show low scores
    const learningScore = await page.locator('[data-testid="learning-value-score"]').textContent();
    const scoreValue = parseFloat(learningScore?.match(/[\d.]+/)?.[0] || '0');
    expect(scoreValue).toBeLessThan(6.0);

    // Quality gate should fail
    await expect(page.locator('text=/品質ゲート.*不合格|Quality gate.*failed/i')).toBeVisible();

    // Only draft save should be available
    await expect(page.locator('button:has-text("Publish")')).toBeDisabled();
    await expect(page.locator('button:has-text("Save as Draft")')).toBeEnabled();
  });
});

test.describe('Teacher Quick Test Generation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page);
  });

  test('should generate quick test from class weak spots', async ({ page }) => {
    // Navigate to quick test generator
    await page.goto('/dashboard/teacher/quick-test');

    // Select or enter material
    await page.fill('input[name="materialId"]', 'test-material-001');

    // Select students (in real app, this might be checkboxes)
    await page.fill('textarea[name="studentIds"]', 'student-1, student-2, student-3');

    // Set parameters
    await page.fill('input[name="problemCount"]', '3');
    await page.fill('input[name="duration"]', '5');

    // Generate test
    await page.click('button:has-text("Generate Quick Test")');

    // Wait for generation (with loading state)
    await expect(page.locator('text=/Generating|生成中/i')).toBeVisible();

    // Wait for results
    await expect(page.locator('[data-testid="quick-test-results"]')).toBeVisible({
      timeout: 30000
    });

    // Verify test structure
    await expect(page.locator('[data-testid="problem-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="problem-2"]')).toBeVisible();
    await expect(page.locator('[data-testid="problem-3"]')).toBeVisible();

    // Each problem should have ABC notation
    const problem1 = page.locator('[data-testid="problem-1"]');
    await expect(problem1.locator('text=/X:1/')).toBeVisible();
    await expect(problem1.locator('text=/Focus Area|重点箇所/i')).toBeVisible();

    // Test playback functionality
    const playButton = problem1.locator('button[aria-label="Play"]');
    if (await playButton.isVisible()) {
      await playButton.click();
      // Verify player state changes
      await expect(problem1.locator('[data-testid="player-active"]')).toBeVisible();
    }

    // Export to PDF
    await page.click('button:has-text("Export PDF")');

    // Wait for download
    const downloadPromise = page.waitForEvent('download');
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain('.pdf');
    expect(download.suggestedFilename()).toContain('quick-test');
  });

  test('should show aggregated weak spots analysis', async ({ page }) => {
    await page.goto('/dashboard/teacher/quick-test');

    // Enter test data
    await page.fill('input[name="materialId"]', 'test-material-002');
    await page.fill('textarea[name="studentIds"]', 'student-1, student-2');

    // Request analysis
    await page.click('button:has-text("Analyze Weak Spots")');

    // Wait for analysis results
    await expect(page.locator('[data-testid="weak-spots-analysis"]')).toBeVisible({
      timeout: 10000
    });

    // Verify aggregation display
    await expect(page.locator('text=/Total Students|生徒総数/i')).toBeVisible();
    await expect(page.locator('text=/Students with Data|データのある生徒/i')).toBeVisible();

    // Check weak spots table
    const weakSpotsTable = page.locator('[data-testid="weak-spots-table"]');
    await expect(weakSpotsTable).toBeVisible();

    // Verify sorting by frequency
    const firstRow = weakSpotsTable.locator('tr').nth(1);
    await expect(firstRow).toContainText(/Bar|小節/i);
    await expect(firstRow).toContainText(/Students Affected|影響を受ける生徒/i);
  });

  test('should handle no weak spots gracefully', async ({ page }) => {
    await page.goto('/dashboard/teacher/quick-test');

    // Use material with no practice data
    await page.fill('input[name="materialId"]', 'new-material-no-data');
    await page.fill('textarea[name="studentIds"]', 'new-student-1');

    await page.click('button:has-text("Generate Quick Test")');

    // Should show appropriate message
    await expect(page.locator('text=/No weak spots identified|弱点が特定されていません/i')).toBeVisible({
      timeout: 10000
    });

    await expect(page.locator('text=/Students need to practice first|生徒が先に練習する必要があります/i')).toBeVisible();
  });
});

test.describe('Teacher Class Metrics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page);
  });

  test('should display class overview metrics', async ({ page }) => {
    await page.goto('/dashboard/teacher/class-metrics');

    // Overall class statistics
    await expect(page.locator('[data-testid="class-stats"]')).toBeVisible();
    await expect(page.locator('text=/Active Students|アクティブな生徒/i')).toBeVisible();
    await expect(page.locator('text=/Average Progress|平均進捗/i')).toBeVisible();
    await expect(page.locator('text=/Total Practice Time|総練習時間/i')).toBeVisible();

    // Individual student cards
    const studentCards = page.locator('[data-testid^="student-card-"]');
    const cardCount = await studentCards.count();
    expect(cardCount).toBeGreaterThan(0);

    // Check first student card details
    const firstCard = studentCards.first();
    await expect(firstCard.locator('[data-testid="student-name"]')).toBeVisible();
    await expect(firstCard.locator('[data-testid="achievement-rate"]')).toBeVisible();
    await expect(firstCard.locator('[data-testid="practice-time"]')).toBeVisible();
    await expect(firstCard.locator('[data-testid="last-practice"]')).toBeVisible();
  });

  test('should filter and sort students', async ({ page }) => {
    await page.goto('/dashboard/teacher/class-metrics');

    // Filter by achievement level
    await page.selectOption('[data-testid="filter-achievement"]', 'below-50');
    await expect(page.locator('[data-testid="filtered-results"]')).toBeVisible();

    // Sort by practice time
    await page.selectOption('[data-testid="sort-by"]', 'practice-time-desc');

    // Verify sorting applied
    const studentCards = page.locator('[data-testid^="student-card-"]');
    const firstCardTime = await studentCards.first().locator('[data-testid="practice-time"]').textContent();
    const secondCardTime = await studentCards.nth(1).locator('[data-testid="practice-time"]').textContent();

    // Parse times and compare (assuming format like "120 min")
    const firstTime = parseInt(firstCardTime?.match(/\d+/)?.[0] || '0');
    const secondTime = parseInt(secondCardTime?.match(/\d+/)?.[0] || '0');
    expect(firstTime).toBeGreaterThanOrEqual(secondTime);
  });

  test('should export class report', async ({ page }) => {
    await page.goto('/dashboard/teacher/class-metrics');

    // Select export options
    await page.click('button:has-text("Export Report")');

    // Choose format in modal
    await expect(page.locator('[data-testid="export-modal"]')).toBeVisible();
    await page.click('input[value="pdf"]');
    await page.click('input[value="include-charts"]');

    // Set date range
    await page.fill('input[name="startDate"]', '2024-01-01');
    await page.fill('input[name="endDate"]', '2024-01-31');

    // Generate report
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Generate Report")');

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('class-report');
    expect(download.suggestedFilename()).toContain('.pdf');
  });
});

test.describe('Teacher A/B Test Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTeacher(page);
  });

  test('should create A/B test for material', async ({ page }) => {
    const materialTitle = `A/B Test Material ${Date.now()}`;

    // Create base material first
    await createTestMaterial(page, materialTitle);

    // Navigate to A/B test setup
    await page.goto('/dashboard/materials');
    await page.click(`text=${materialTitle}`);
    await page.click('button:has-text("Create A/B Test")');

    // Configure variants
    await expect(page.locator('[data-testid="ab-test-modal"]')).toBeVisible();

    // Variant A (original)
    await page.fill('textarea[name="variantA"]', 'Original ABC content');

    // Variant B (modified)
    const variantB = `
X:1
T:${materialTitle} - Variant B
M:4/4
L:1/8
Q:1/4=100
K:Cmaj
CC DD EE FF | GG AA BB cc |
    `.trim();
    await page.fill('textarea[name="variantB"]', variantB);

    // Set distribution
    await page.fill('input[name="distributionRatio"]', '50');

    // Set duration
    await page.fill('input[name="testDuration"]', '7'); // 7 days

    // Start test
    await page.click('button:has-text("Start A/B Test")');

    await expect(page.locator('text=/A\/B Test Started|A\/Bテスト開始/i')).toBeVisible();

    // Verify test status on material
    await expect(page.locator('[data-testid="ab-test-badge"]')).toBeVisible();
    await expect(page.locator('[data-testid="ab-test-badge"]')).toContainText('Active');
  });

  test('should monitor A/B test results', async ({ page }) => {
    // Assume test material with active A/B test exists
    await page.goto('/dashboard/teacher/ab-tests');

    // Find active test
    const activeTest = page.locator('[data-testid="ab-test-active"]').first();
    await activeTest.click();

    // View results dashboard
    await expect(page.locator('[data-testid="ab-results"]')).toBeVisible();

    // Check metrics comparison
    await expect(page.locator('[data-testid="variant-a-metrics"]')).toBeVisible();
    await expect(page.locator('[data-testid="variant-b-metrics"]')).toBeVisible();

    // Verify statistical significance indicator
    const significanceIndicator = page.locator('[data-testid="statistical-significance"]');
    if (await significanceIndicator.isVisible()) {
      const sigText = await significanceIndicator.textContent();
      expect(sigText).toMatch(/Significant|Not Significant|有意|有意でない/i);
    }

    // Check conversion metrics
    await expect(page.locator('text=/Completion Rate|完了率/i')).toBeVisible();
    await expect(page.locator('text=/Average Score|平均スコア/i')).toBeVisible();
    await expect(page.locator('text=/Practice Time|練習時間/i')).toBeVisible();
  });
});