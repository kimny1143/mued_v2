import { test, expect } from '@playwright/test';
import { execMcp } from '../lib/mcpClient';

test('無効な命令を実行した場合、エラーが返される', async ({ page, request }) => {
  await page.goto('/');
  const res = await execMcp(request, `
    1. 存在しないボタン「予約する」をクリック
  `);
  expect(res.ok).toBe(false);
  expect(res.error).toContain('要素');
});

test('タイムアウトが発生した場合、エラーが返される', async ({ page, request }) => {
  await page.goto('/');
  const res = await execMcp(request, `
    1. 無限に待機する要素を待つ
  `);
  expect(res.ok).toBe(false);
  expect(res.error).toContain('タイムアウト');
}); 