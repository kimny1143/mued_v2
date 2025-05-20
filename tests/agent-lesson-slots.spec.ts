import { test, expect } from '@playwright/test';
import { execMcp } from './utils/mcpClient';

test.describe('メンターのレッスンスロット管理', () => {
  test('レッスンスロットを作成できる', async () => {
    // 1. レッスンスロット管理ページに移動
    const res1 = await execMcp('レッスンスロット管理ページに移動');
    expect(res1.ok).toBe(true);

    // 2. 新規作成ボタンをクリック
    const res2 = await execMcp('「Create New Slot」ボタンをクリック');
    expect(res2.ok).toBe(true);

    // 3. 日付を選択
    const res3 = await execMcp('明日の日付を選択');
    expect(res3.ok).toBe(true);

    // 4. 開始時間を設定
    const res4 = await execMcp('開始時間を10:00に設定');
    expect(res4.ok).toBe(true);

    // 5. 終了時間を設定
    const res5 = await execMcp('終了時間を11:00に設定');
    expect(res5.ok).toBe(true);

    // 6. 作成ボタンをクリック
    const res6 = await execMcp('「Create」ボタンをクリック');
    expect(res6.ok).toBe(true);

    // 7. 作成成功の確認
    const res7 = await execMcp('新しく作成されたスロットが表示されていることを確認');
    expect(res7.ok).toBe(true);
    expect(res7.data?.hasNewSlot).toBe(true);
  });

  test('無効な時間設定でエラーになる', async () => {
    // 1. レッスンスロット管理ページに移動
    const res1 = await execMcp('レッスンスロット管理ページに移動');
    expect(res1.ok).toBe(true);

    // 2. 新規作成ボタンをクリック
    const res2 = await execMcp('「Create New Slot」ボタンをクリック');
    expect(res2.ok).toBe(true);

    // 3. 日付を選択
    const res3 = await execMcp('明日の日付を選択');
    expect(res3.ok).toBe(true);

    // 4. 開始時間を設定（終了時間より後）
    const res4 = await execMcp('開始時間を12:00に設定');
    expect(res4.ok).toBe(true);

    // 5. 終了時間を設定（開始時間より前）
    const res5 = await execMcp('終了時間を11:00に設定');
    expect(res5.ok).toBe(true);

    // 6. 作成ボタンをクリック
    const res6 = await execMcp('「Create」ボタンをクリック');
    expect(res6.ok).toBe(false);
    expect(res6.error).toMatch(/開始時間は終了時間より前である必要があります/);
  });

  test('予約済みスロットを確認できる', async () => {
    // 1. レッスンスロット管理ページに移動
    const res1 = await execMcp('レッスンスロット管理ページに移動');
    expect(res1.ok).toBe(true);

    // 2. 予約済みタブをクリック
    const res2 = await execMcp('「Reserved」タブをクリック');
    expect(res2.ok).toBe(true);

    // 3. 予約済みスロットの表示を確認
    const res3 = await execMcp('予約済みスロットが表示されていることを確認');
    expect(res3.ok).toBe(true);
    expect(res3.data?.hasReservedSlots).toBe(true);
  });

  test('未ログイン時はアクセスできない', async () => {
    // 1. ログアウト状態でレッスンスロット管理ページにアクセス
    const res = await execMcp('未ログイン状態でレッスンスロット管理ページにアクセス');
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/ログインが必要です/);
  });

  test('メンター以外のロールはアクセスできない', async () => {
    // 1. 生徒ロールでレッスンスロット管理ページにアクセス
    const res = await execMcp('生徒ロールでレッスンスロット管理ページにアクセス');
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/このページにアクセスする権限がありません/);
  });
}); 