/**
 * E2E Tests: Music Material Flow
 *
 * 音楽教材の作成から学習メトリクストラッキングまでのフロー
 */

import { test, expect } from '@playwright/test';

test.describe('Music Material Learning Flow', () => {
  test.beforeEach(async ({ page }) => {
    // ログイン処理（Clerkの認証をスキップする場合）
    // TODO: テスト用ユーザーでログイン
    await page.goto('/');
  });

  test('should create and analyze ABC material with quality gate', async ({ page }) => {
    // 1. 教材作成ページに移動
    await page.goto('/dashboard/materials/create');

    // 2. タイトル入力
    await page.fill('input[name="title"]', 'C Major Scale Practice');

    // 3. ABC記法を入力
    const abcContent = `
X:1
T:C Major Scale
M:4/4
L:1/4
Q:1/4=120
K:Cmaj
C D E F | G A B c | c B A G | F E D C |
    `.trim();

    await page.fill('textarea[name="abc"]', abcContent);

    // 4. 楽器を選択
    await page.selectOption('select[name="instrument"]', 'piano');

    // 5. 「Analyze Quality」ボタンをクリック
    await page.click('button:has-text("Analyze Quality")');

    // 6. 品質分析結果を待つ
    await page.waitForSelector('[data-testid="quality-score"]', { timeout: 10000 });

    // 7. スコアを確認
    const learningValueScore = await page.textContent('[data-testid="learning-value-score"]');
    expect(learningValueScore).toBeTruthy();

    const scoreValue = parseFloat(learningValueScore || '0');
    expect(scoreValue).toBeGreaterThan(0);

    // 8. スコアが6.0以上なら公開可能
    if (scoreValue >= 6.0) {
      await expect(page.locator('[data-testid="publish-button"]')).toBeEnabled();
    } else {
      await expect(page.locator('[data-testid="publish-button"]')).toBeDisabled();
      await expect(page.locator('text=Quality gate failed')).toBeVisible();
    }
  });

  test('should track learning metrics during practice', async ({ page }) => {
    // テスト用教材にアクセス
    const testMaterialId = 'test-material-uuid'; // TODO: テストデータのセットアップ

    await page.goto(`/materials/${testMaterialId}/practice`);

    // 1. プレイヤーが表示されることを確認
    await expect(page.locator('[data-testid="abc-player"]')).toBeVisible();

    // 2. 「Start Tracking」ボタンをクリック
    await page.click('button:has-text("Start Practice")');

    // 3. ループ範囲を選択（1-4小節）
    await page.fill('input[name="loopStartBar"]', '1');
    await page.fill('input[name="loopEndBar"]', '4');
    await page.click('button:has-text("Set Loop")');

    // 4. 再生
    await page.click('button[aria-label="Play"]');

    // 5. 3秒待機（練習をシミュレート）
    await page.waitForTimeout(3000);

    // 6. 停止
    await page.click('button[aria-label="Stop"]');

    // 7. セクション完了をマーク
    await page.click('button:has-text("Mark Section Complete")');

    // 8. 「Stop Tracking」をクリック
    await page.click('button:has-text("Stop Practice")');

    // 9. メトリクスが保存されたことを確認
    await expect(page.locator('text=Session saved successfully')).toBeVisible({
      timeout: 5000,
    });

    // 10. ダッシュボードに移動して進捗リングを確認
    await page.goto('/dashboard');

    await expect(page.locator('[data-testid="progress-ring-achievement"]')).toBeVisible();
    await expect(page.locator('[data-testid="progress-ring-tempo"]')).toBeVisible();
    await expect(page.locator('[data-testid="progress-ring-practice"]')).toBeVisible();
  });

  test('teacher should generate quick test from class weak spots', async ({ page }) => {
    // 教師アカウントでログイン（TODO: 教師ロール設定）

    // 1. Quick Test ページに移動
    await page.goto('/dashboard/teacher/quick-test');

    // 2. Material ID を入力
    await page.fill('input[name="materialId"]', 'test-material-uuid');

    // 3. Student IDs を入力（カンマ区切り）
    await page.fill(
      'textarea[name="studentIds"]',
      'student-uuid-1, student-uuid-2, student-uuid-3'
    );

    // 4. 問題数を設定
    await page.fill('input[name="sectionsCount"]', '3');

    // 5. 「Generate Quick Test」をクリック
    await page.click('button:has-text("Generate Quick Test")');

    // 6. 生成を待つ（最大30秒）
    await expect(page.locator('text=Generating...')).toBeVisible();
    await expect(page.locator('[data-testid="quick-test-result"]')).toBeVisible({
      timeout: 30000,
    });

    // 7. 小テストが表示されることを確認
    await expect(page.locator('text=Problem 1')).toBeVisible();
    await expect(page.locator('text=Problem 2')).toBeVisible();
    await expect(page.locator('text=Problem 3')).toBeVisible();

    // 8. 「Download PDF」ボタンをクリック
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Download PDF")');
    const download = await downloadPromise;

    // 9. ダウンロードファイル名を確認
    expect(download.suggestedFilename()).toContain('.pdf');
  });

  test('student should generate personalized weak drill', async ({ page }) => {
    // 生徒アカウントでログイン

    // 1. 教材ページに移動
    await page.goto('/materials/test-material-uuid/practice');

    // 2. ループ範囲を選択（弱点箇所）
    await page.fill('input[name="loopStartBar"]', '5');
    await page.fill('input[name="loopEndBar"]', '8');
    await page.click('button:has-text("Set Loop")');

    // 3. 「Generate Weak Drill」ボタンをクリック
    await page.click('button:has-text("Generate Weak Drill")');

    // 4. モーダルが表示されることを確認
    await expect(page.locator('[data-testid="weak-drill-modal"]')).toBeVisible({
      timeout: 20000,
    });

    // 5. 3つのバリエーションタブがあることを確認
    await expect(page.locator('button:has-text("Easier (-1)")')).toBeVisible();
    await expect(page.locator('button:has-text("Same Level")')).toBeVisible();
    await expect(page.locator('button:has-text("Harder (+1)")')).toBeVisible();

    // 6. 「Easier」タブに切り替え
    await page.click('button:has-text("Easier (-1)")');
    await expect(page.locator('text=Simplified Version')).toBeVisible();

    // 7. ABC記法が表示されることを確認
    await expect(page.locator('pre:has-text("X:1")')).toBeVisible();

    // 8. 「Copy ABC Notation」ボタンをクリック
    await page.click('button:has-text("Copy ABC Notation")');
    await expect(page.locator('text=copied to clipboard')).toBeVisible();
  });

  test('should enforce accessibility standards', async ({ page }) => {
    await page.goto('/dashboard');

    // 1. キーボードナビゲーション
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // フォーカスが見えることを確認
    const focusedElement = await page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // 2. スキップリンク（もし実装されていれば）
    await page.keyboard.press('Tab');
    const skipLink = page.locator('a:has-text("Skip to content")');
    if (await skipLink.isVisible()) {
      await expect(skipLink).toBeFocused();
    }

    // 3. 全ての画像にalt属性があることを確認
    const images = page.locator('img');
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute('alt');
      expect(alt).toBeTruthy();
    }

    // 4. ARIAラベルが適切に設定されていることを確認
    const buttons = page.locator('button[aria-label]');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);
  });
});

test.describe('A/B Test Material Distribution', () => {
  test('should assign students to variants deterministically', async ({ page }) => {
    // Student 1 でログイン
    await page.goto('/materials/ab-test-theme-learning-scales');

    // Variant A または B が表示される
    const variantIndicator = page.locator('[data-testid="ab-variant"]');
    await expect(variantIndicator).toBeVisible();

    const variant = await variantIndicator.textContent();
    expect(variant).toMatch(/Variant (A|B)/);

    // 同じ学生が再度アクセスしても同じバリアントが表示されることを確認
    await page.reload();
    await expect(variantIndicator).toHaveText(variant || '');
  });
});
