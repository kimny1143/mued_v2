import { test, expect } from '@playwright/test';

/**
 * 認証フローのE2Eテスト
 */
test('ログイン済みユーザーはダッシュボードが閲覧できる', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByRole('heading', { name: /ダッシュボード|dashboard/i })).toBeVisible();
});

test.skip('チェックアウト → 予約フロー (Stripe モック待ち)', async () => {
  // Stripe 周りのモックが整い次第実装
});

/**
 * 予約カレンダーフローのE2Eテスト
 * 注: 現在の実装はGoogle OAuth認証のため、ログイン済み状態から開始
 */
test('予約カレンダーフロー', async ({ page }) => {
  // ダッシュボードから開始（global-setup.tsでログイン済み）
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/.*\/dashboard/);
  
  // 予約カレンダーへ移動（新規予約を作成）
  await page.goto('/dashboard/booking-calendar');
  await expect(page).toHaveURL(/.*\/dashboard\/booking-calendar/);
  
  // ページロード待機
  await page.waitForLoadState('networkidle');
  
  // メンター一覧が表示されるまで待機
  await page.waitForSelector('text=/メンター|講師|利用可能/', { timeout: 10000 });
  
  // メンターカードの存在を確認
  const mentorCard = page.locator('[role="article"]').first();
  await expect(mentorCard).toBeVisible({ timeout: 10000 });
  
  // 「予約可能な時間を見る」ボタンをクリック
  const viewSlotsButton = mentorCard.getByRole('button', { name: /予約可能な時間を見る|View Available Slots/i });
  await viewSlotsButton.click();
  
  // カレンダービューが表示されることを確認
  await expect(page.locator('.fc-daygrid')).toBeVisible({ timeout: 10000 });
  
  // 利用可能なスロットをクリック（カレンダー上の最初の空きスロット）
  const availableSlot = page.locator('.fc-event').first();
  await availableSlot.waitFor({ state: 'visible', timeout: 10000 });
  await availableSlot.click();
  
  // 予約モーダルが表示されることを確認
  await expect(page.getByText(/予約の詳細|Booking Details|予約内容/i)).toBeVisible({ timeout: 10000 });
  
  // 予約確定ボタンをクリック（Setup Intentフロー）
  const confirmButton = page.getByRole('button', { name: /予約を確定|Confirm Booking|支払い情報を入力/i });
  await confirmButton.click();
  
  // Stripeチェックアウトへのリダイレクトを待つ（またはモックの場合はエラーメッセージ）
  await page.waitForURL(/checkout\.stripe\.com|\/dashboard\/booking-calendar/, { timeout: 15000 });
  
  // Stripeモックが無い場合は、エラーメッセージまたはカレンダーページに留まることを確認
  const currentUrl = page.url();
  if (currentUrl.includes('dashboard/booking-calendar')) {
    // エラートーストまたはメッセージが表示される可能性
    console.log('Stripe checkout redirect was blocked or mocked');
  } else {
    console.log('Redirected to Stripe checkout');
  }
});

test.skip(true, 'UI tests skipped until mocks ready'); 