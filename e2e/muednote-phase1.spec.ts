import { test, expect } from '@playwright/test';

/**
 * MUEDnote Phase 1.0 MVP E2E Tests
 *
 * テストシナリオ:
 * 1. チャットページ表示
 * 2. メッセージ送信とAI応答
 * 3. タイムラインページで記録確認
 */

test.describe('MUEDnote Phase 1.0 MVP', () => {
  test.beforeEach(async ({ page }) => {
    // 認証が必要な場合はここでログイン処理
    // TODO: Clerk認証のセットアップ
  });

  test('should display chat interface', async ({ page }) => {
    await page.goto('/muednote');

    // チャットUIの要素を確認
    await expect(page.getByRole('heading', { name: 'MUEDnote' })).toBeVisible();
    await expect(
      page.getByPlaceholder('今日はコード進行の練習をした...')
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /送信|send/i })).toBeVisible();
  });

  test('should show empty state message', async ({ page }) => {
    await page.goto('/muednote');

    // 空状態のメッセージを確認
    await expect(
      page.getByText('今日の音楽活動を記録しましょう')
    ).toBeVisible();
  });

  test('should send message and receive AI response', async ({ page }) => {
    await page.goto('/muednote');

    const testMessage = 'ピアノでCメジャースケールの練習をした';

    // メッセージ入力
    const textarea = page.getByPlaceholder('今日はコード進行の練習をした...');
    await textarea.fill(testMessage);

    // 送信ボタンをクリック
    const sendButton = page.getByRole('button', { name: /送信|send/i });
    await sendButton.click();

    // ユーザーメッセージが表示されることを確認
    await expect(page.getByText(testMessage)).toBeVisible();

    // AI応答を待機（ストリーミングなので少し時間がかかる）
    await page.waitForTimeout(3000);

    // AI応答が表示されることを確認（整形後、タグ、コメントのいずれかが含まれる）
    const aiResponse = page.locator('.whitespace-pre-wrap').nth(1);
    await expect(aiResponse).toBeVisible();
  });

  test('should navigate to timeline page', async ({ page }) => {
    await page.goto('/muednote/timeline');

    // タイムラインページの要素を確認
    await expect(
      page.getByRole('heading', { name: 'タイムライン' })
    ).toBeVisible();
    await expect(
      page.getByText('これまでの音楽活動記録を振り返りましょう')
    ).toBeVisible();
  });

  test('should show timeline entries if exists', async ({ page }) => {
    // 先にチャットでメッセージを送信
    await page.goto('/muednote');

    const testMessage = 'ギターでDメジャーコードの練習';
    const textarea = page.getByPlaceholder('今日はコード進行の練習をした...');
    await textarea.fill(testMessage);

    const sendButton = page.getByRole('button', { name: /送信|send/i });
    await sendButton.click();

    // AI応答を待機
    await page.waitForTimeout(3000);

    // タイムラインページに移動
    await page.goto('/muednote/timeline');

    // 記録が表示されることを確認
    await expect(page.getByText(testMessage)).toBeVisible();

    // 統計情報が表示されることを確認
    await expect(page.getByText(/全\d+件の記録/)).toBeVisible();
  });

  test('should show empty state in timeline if no entries', async ({ page }) => {
    // 新規ユーザーまたは記録がない場合
    await page.goto('/muednote/timeline');

    // 空状態のメッセージとリンクを確認
    await expect(page.getByText('まだ記録がありません')).toBeVisible();
    await expect(
      page.getByText('チャットで今日の音楽活動を記録してみましょう')
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'チャットを開く' })
    ).toBeVisible();
  });

  test('should handle keyboard shortcuts (Enter to send)', async ({ page }) => {
    await page.goto('/muednote');

    const testMessage = 'DTMで新しいトラックを作った';
    const textarea = page.getByPlaceholder('今日はコード進行の練習をした...');

    await textarea.fill(testMessage);

    // Enterキーで送信
    await textarea.press('Enter');

    // メッセージが送信されることを確認
    await expect(page.getByText(testMessage)).toBeVisible();
  });

  test('should handle Shift+Enter for new line', async ({ page }) => {
    await page.goto('/muednote');

    const textarea = page.getByPlaceholder('今日はコード進行の練習をした...');

    await textarea.fill('1行目');

    // Shift+Enterで改行
    await textarea.press('Shift+Enter');

    // テキストエリアの値を確認（改行が含まれている）
    const value = await textarea.inputValue();
    expect(value).toContain('\n');
  });
});
