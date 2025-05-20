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
 * チェックアウト → 予約フローのE2Eテスト
 */
test('チェックアウト → 予約フロー', async ({ page }) => {
  // ログインする
  await page.goto('/login');
  await page.getByLabel('メールアドレス').fill('student@example.com');
  await page.getByLabel('パスワード').fill('password123');
  await page.getByRole('button', { name: /ログイン|Sign in/i }).click();
  
  // ダッシュボードが表示されていることを確認
  await expect(page).toHaveURL(/.*\/dashboard/);
  
  // 予約ページへ移動
  await page.getByRole('link', { name: /予約|Reservations/i }).click();
  
  // 予約ページが表示されていることを確認
  await expect(page).toHaveURL(/.*\/reservations/);
  
  // 利用可能なレッスンスロットがあることを確認
  await expect(page.getByText(/テストレッスン/)).toBeVisible();
  
  // 予約ボタンをクリック
  await page.getByRole('button', { name: /予約する|Book/i }).first().click();
  
  // 予約モーダルが表示されることを確認
  await expect(page.getByText(/予約の確認|Confirm Reservation/i)).toBeVisible();
  
  // 確定ボタンをクリック
  await page.getByRole('button', { name: /確定する|Confirm/i }).click();
  
  // 予約成功メッセージが表示されることを確認
  await expect(page.getByText(/予約が完了しました|Reservation Confirmed/i)).toBeVisible();
  
  // ダッシュボードに戻る
  await page.getByRole('link', { name: /ダッシュボード|Dashboard/i }).click();
  
  // ダッシュボードに予約情報が表示されていることを確認
  await expect(page.getByText(/テストレッスン/)).toBeVisible();
});

test.skip(true, 'UI tests skipped until mocks ready'); 