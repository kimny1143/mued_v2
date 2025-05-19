import { test, expect } from '@playwright/test';
import { execMcp } from '../lib/mcpClient';

test('無効な命令を実行した場合、エラーが返される', async ({ page }) => {
  await page.goto('/');
  const result = await execMcp(page, `
    1. 存在しないボタン「予約する」をクリック
  `);
  expect(result.status).toBe('error');
  expect(result.error).toContain('要素が見つかりません');
});

test('タイムアウトが発生した場合、エラーが返される', async ({ page }) => {
  await page.goto('/');
  const result = await execMcp(page, `
    1. 無限に待機する要素を待つ
  `);
  expect(result.status).toBe('error');
  expect(result.error).toContain('タイムアウト');
}); 