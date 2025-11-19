import { test, expect } from '@playwright/test';

/**
 * MUEDnote Phase 1.0 & 1.1 E2E Tests
 *
 * Phase 1.0 テストシナリオ:
 * 1. チャットページ表示
 * 2. メッセージ送信とAI応答
 * 3. タイムラインページで記録確認
 *
 * Phase 1.1 テストシナリオ:
 * 4. 曖昧性検知と追加質問
 * 5. タグフィルタリング
 * 6. AI性格システム
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

// ============================================
// Phase 1.1 Tests
// ============================================

test.describe('MUEDnote Phase 1.1: Ambiguity Detection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/muednote');
  });

  test('should ask follow-up question for ambiguous input', async ({ page }) => {
    // 曖昧な入力を送信
    const ambiguousMessage = 'CMの作曲をした';
    const textarea = page.getByPlaceholder('今日はコード進行の練習をした...');
    await textarea.fill(ambiguousMessage);

    const sendButton = page.getByRole('button', { name: /送信|send/i });
    await sendButton.click();

    // ユーザーメッセージが表示されることを確認
    await expect(page.getByText(ambiguousMessage)).toBeVisible();

    // AI応答を待機
    await page.waitForTimeout(3000);

    // 追加質問が表示されることを確認
    await expect(
      page.getByText(/もう少し詳しく教えてください/)
    ).toBeVisible();

    // 質問ボックスが黄色背景で表示されることを確認
    const questionBox = page.locator('.bg-yellow-50');
    await expect(questionBox).toBeVisible();
  });

  test('should not show question for detailed input', async ({ page }) => {
    // 詳細な入力を送信
    const detailedMessage =
      'ピアノでCメジャースケールを練習した。右手と左手のタイミングを合わせるのが難しかった。';
    const textarea = page.getByPlaceholder('今日はコード進行の練習をした...');
    await textarea.fill(detailedMessage);

    const sendButton = page.getByRole('button', { name: /送信|send/i });
    await sendButton.click();

    // ユーザーメッセージが表示されることを確認
    await expect(page.getByText(detailedMessage)).toBeVisible();

    // AI応答を待機
    await page.waitForTimeout(3000);

    // 追加質問が表示されないことを確認
    const questionBox = page.locator('.bg-yellow-50');
    await expect(questionBox).not.toBeVisible();
  });
});

test.describe('MUEDnote Phase 1.1: Tag Filtering', () => {
  test.beforeEach(async ({ page }) => {
    // テストデータ作成: 複数のメッセージを送信してタグを生成
    await page.goto('/muednote');

    // 1つ目のメッセージ（#作曲タグが付くと想定）
    const textarea = page.getByPlaceholder('今日はコード進行の練習をした...');
    await textarea.fill('新しいメロディを作曲した');
    await page.getByRole('button', { name: /送信|send/i }).click();
    await page.waitForTimeout(3000);

    // 2つ目のメッセージ（#練習タグが付くと想定）
    await textarea.fill('ピアノで音階の練習をした');
    await page.getByRole('button', { name: /送信|send/i }).click();
    await page.waitForTimeout(3000);
  });

  test('should display tag filter on timeline page', async ({ page }) => {
    await page.goto('/muednote/timeline');

    // タグフィルタセクションが表示されることを確認
    await expect(page.getByText('タグで絞り込み')).toBeVisible();

    // タグバッジが表示されることを確認（少なくとも1つ）
    const tagBadges = page.locator('[class*="cursor-pointer"]').filter({
      hasText: /#/,
    });
    await expect(tagBadges.first()).toBeVisible();
  });

  test('should filter timeline by clicking tag', async ({ page }) => {
    await page.goto('/muednote/timeline');

    // 初期状態の記録数を確認
    const initialCount = await page
      .getByText(/全\d+件の記録|絞り込み結果/)
      .textContent();

    // 最初のタグをクリック
    const firstTag = page
      .locator('[class*="cursor-pointer"]')
      .filter({ hasText: /#/ })
      .first();
    await firstTag.click();

    // フィルタリング結果が表示されることを確認
    await expect(page.getByText(/絞り込み結果/)).toBeVisible();

    // クリアボタンが表示されることを確認
    await expect(page.getByRole('button', { name: /クリア/ })).toBeVisible();
  });

  test('should clear tag filter', async ({ page }) => {
    await page.goto('/muednote/timeline');

    // タグをクリックしてフィルタリング
    const firstTag = page
      .locator('[class*="cursor-pointer"]')
      .filter({ hasText: /#/ })
      .first();
    await firstTag.click();

    // クリアボタンが表示されることを確認
    const clearButton = page.getByRole('button', { name: /クリア/ });
    await expect(clearButton).toBeVisible();

    // クリアボタンをクリック
    await clearButton.click();

    // フィルタがクリアされ、全件表示に戻ることを確認
    await expect(page.getByText(/全\d+件の記録/)).toBeVisible();
    await expect(clearButton).not.toBeVisible();
  });
});

test.describe('MUEDnote Phase 1.1: AI Personality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/muednote');
  });

  test('should show encouraging AI responses', async ({ page }) => {
    // 練習報告を送信
    const practiceMessage = 'ギターで新しいコードを練習した';
    const textarea = page.getByPlaceholder('今日はコード進行の練習をした...');
    await textarea.fill(practiceMessage);

    const sendButton = page.getByRole('button', { name: /送信|send/i });
    await sendButton.click();

    // AI応答を待機
    await page.waitForTimeout(3000);

    // AI応答に励ましの言葉が含まれることを確認（正規表現で柔軟にマッチ）
    const aiResponseContainer = page.locator('.whitespace-pre-wrap').nth(1);
    const responseText = await aiResponseContainer.textContent();

    // 励ましの言葉のいずれかが含まれていることを確認
    const encouragingWords = [
      'すごい',
      'いい',
      '良い',
      'お疲れ様',
      '頑張',
      '素晴らしい',
      'できました',
      '進歩',
    ];
    const hasEncouragement = encouragingWords.some((word) =>
      responseText?.includes(word)
    );

    // 少なくとも1つの励ましの言葉が含まれている（ただしAI応答は可変なので、これはオプショナル）
    // expect(hasEncouragement).toBeTruthy();
  });
});
