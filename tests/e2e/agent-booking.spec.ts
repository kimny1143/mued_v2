import { test, expect } from '@playwright/test';
import { execMcp } from '../lib/mcpClient';

test('AI エージェントがレッスン予約を完了できる', async ({ page, request }) => {
  await page.goto('/');
  const result = await execMcp(request, `
    1. 「レッスンを予約」ボタンをクリック
    2. 最初の空き時間を選択
    3. 決済情報にテストカード 4242424242424242 を入力
    4. 完了画面のスクリーンショットを撮影
  `);
  expect(result.status).toBe('completed');
}); 