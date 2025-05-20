import { test, expect } from '@playwright/test';
import { execMcp } from './utils/mcpClient';

test.describe('予約フロー', () => {
  test('レッスン枠を選択して予約できる', async () => {
    // 1. 予約ページに移動
    const res1 = await execMcp('予約ページに移動');
    expect(res1.ok).toBe(true);

    // 2. 利用可能な枠を探す
    const res2 = await execMcp('利用可能なレッスン枠を探す');
    expect(res2.ok).toBe(true);
    expect(res2.data?.found).toBe(true);

    // 3. 枠を選択してモーダルを開く
    const res3 = await execMcp('最初の利用可能な枠の「予約する」ボタンをクリック');
    expect(res3.ok).toBe(true);

    // 4. モーダルの内容を確認
    const res4 = await execMcp('予約確認モーダルの内容を確認');
    expect(res4.ok).toBe(true);
    expect(res4.data?.hasDate).toBe(true);
    expect(res4.data?.hasTime).toBe(true);
    expect(res4.data?.hasMentor).toBe(true);
    expect(res4.data?.hasPrice).toBe(true);

    // 5. 決済に進む
    const res5 = await execMcp('「決済に進む」ボタンをクリック');
    expect(res5.ok).toBe(true);

    // 6. Stripe チェックアウトページに遷移
    const res6 = await execMcp('Stripe チェックアウトページに遷移したことを確認');
    expect(res6.ok).toBe(true);
    expect(res6.data?.isStripeCheckout).toBe(true);
  });

  test('予約済みの枠は選択できない', async () => {
    // 1. 予約ページに移動
    const res1 = await execMcp('予約ページに移動');
    expect(res1.ok).toBe(true);

    // 2. 予約済みの枠を探す
    const res2 = await execMcp('予約済みのレッスン枠を探す');
    expect(res2.ok).toBe(true);
    expect(res2.data?.found).toBe(true);

    // 3. 予約済み枠のボタンが無効化されていることを確認
    const res3 = await execMcp('予約済み枠の「予約する」ボタンが無効化されていることを確認');
    expect(res3.ok).toBe(true);
    expect(res3.data?.isDisabled).toBe(true);
  });

  test('モーダルでキャンセルできる', async () => {
    // 1. 予約ページに移動
    const res1 = await execMcp('予約ページに移動');
    expect(res1.ok).toBe(true);

    // 2. 利用可能な枠を探す
    const res2 = await execMcp('利用可能なレッスン枠を探す');
    expect(res2.ok).toBe(true);

    // 3. 枠を選択してモーダルを開く
    const res3 = await execMcp('最初の利用可能な枠の「予約する」ボタンをクリック');
    expect(res3.ok).toBe(true);

    // 4. キャンセルボタンをクリック
    const res4 = await execMcp('「キャンセル」ボタンをクリック');
    expect(res4.ok).toBe(true);

    // 5. モーダルが閉じたことを確認
    const res5 = await execMcp('予約確認モーダルが閉じたことを確認');
    expect(res5.ok).toBe(true);
    expect(res5.data?.isModalClosed).toBe(true);
  });

  test('エラーケース: 予約ページにアクセスできない', async () => {
    // 1. 未ログイン状態で予約ページにアクセス
    const res = await execMcp('未ログイン状態で予約ページにアクセス');
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/ログインが必要です/);
  });

  test('要素が見つからない場合は適切なエラー', async () => {
    // 存在しない要素を探す
    const res = await execMcp('存在しない要素を探す');
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/指定された要素が見つかりませんでした/);
  });

  test('タイムアウトの場合は適切なエラー', async () => {
    // タイムアウトを発生させる
    const res = await execMcp('無限に待機する要素を待つ');
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/操作がタイムアウトしました/);
  });
}); 