import { test, expect } from '@playwright/test';

test.describe('予約フロー', () => {
  test.beforeEach(async ({ page }) => {
    // テストユーザーでログイン
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('予約→決済→枠消失のフロー', async ({ page }) => {
    // 1. レッスン枠一覧ページに移動
    await page.goto('/dashboard/reservations');
    await expect(page).toHaveURL('/dashboard/reservations');

    // 2. 利用可能な枠を確認
    const availableSlot = page.locator('[data-test="lesson-slot-card"]').first();
    await expect(availableSlot).toBeVisible();

    // 3. 予約ボタンをクリック
    await availableSlot.locator('button:has-text("予約する")').click();

    // 4. 確認モーダルが表示される
    const confirmModal = page.locator('[role="dialog"]');
    await expect(confirmModal).toBeVisible();
    await expect(confirmModal).toContainText('予約を確定しますか？');

    // 5. 確認ボタンをクリック
    await confirmModal.locator('button:has-text("予約する")').click();

    // 6. Stripeチェックアウトページにリダイレクト
    await expect(page).toHaveURL(/^https:\/\/checkout\.stripe\.com/);

    // 7. テスト用カード情報を入力
    await page.fill('input[name="cardNumber"]', '4242424242424242');
    await page.fill('input[name="expiry"]', '1234');
    await page.fill('input[name="cvc"]', '123');
    await page.fill('input[name="billingName"]', 'Test User');
    await page.click('button[type="submit"]');

    // 8. 成功ページにリダイレクト
    await expect(page).toHaveURL(/\/reservation\/success/);
    await expect(page).toContainText('予約が完了しました');

    // 9. ダッシュボードに戻り、予約済み枠を確認
    await page.goto('/dashboard/reservations');
    const bookedSlot = page.locator('[data-test="reservation-card"]').first();
    await expect(bookedSlot).toBeVisible();
    await expect(bookedSlot).toContainText('予約済み');

    // 10. GA4タグの検証
    const gtagInit = page.locator('[data-test="gtag-init"]');
    await expect(gtagInit).toBeVisible();
  });

  test('予約済み枠は選択できない', async ({ page }) => {
    // 1. レッスン枠一覧ページに移動
    await page.goto('/dashboard/reservations');

    // 2. 予約済み枠を確認
    const bookedSlot = page.locator('[data-test="lesson-slot-card"]').first();
    await expect(bookedSlot).toBeVisible();
    await expect(bookedSlot.locator('button:has-text("予約する")')).toBeDisabled();
  });
}); 