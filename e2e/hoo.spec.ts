import { test, expect } from '@playwright/test';

/**
 * Hoo AI Chat E2E Tests
 *
 * Test scenarios:
 * 1. Chat UI displays correctly
 * 2. Usage banner displays
 * 3. Message send and AI response
 * 4. Navigate to history page
 * 5. Resume conversation from history
 */

test.describe('Hoo AI Chat', () => {
  test.beforeEach(async () => {
    // Authentication may be required
    // TODO: Setup Clerk auth if needed
  });

  test('should display chat interface', async ({ page }) => {
    await page.goto('/dashboard/muednote/hoo');

    // Verify chat UI elements are visible
    await expect(
      page.getByRole('heading', { name: /Hoo|思考整理/ })
    ).toBeVisible();
    await expect(
      page.getByPlaceholder(/メッセージを入力|Type your message/)
    ).toBeVisible();

    // Verify send button is visible
    const sendButton = page.locator('button[type="submit"]');
    await expect(sendButton).toBeVisible();
  });

  test('should display usage banner', async ({ page }) => {
    await page.goto('/dashboard/muednote/hoo');

    // Wait for usage info to load
    await page.waitForTimeout(1000);

    // Verify usage banner is visible
    await expect(
      page.getByText(/今月の利用|Monthly usage/)
    ).toBeVisible();
  });

  test('should display quick prompt buttons', async ({ page }) => {
    await page.goto('/dashboard/muednote/hoo');

    // Verify quick prompts are visible in empty state
    await expect(
      page.getByRole('button', { name: /思考整理|Organize thoughts/ })
    ).toBeVisible();
  });

  test('should navigate to history page', async ({ page }) => {
    await page.goto('/dashboard/muednote/hoo');

    // Click history button
    const historyButton = page.getByRole('link', { name: /履歴|History/ });
    await expect(historyButton).toBeVisible();
    await historyButton.click();

    // Verify we're on the history page
    await expect(page).toHaveURL(/\/dashboard\/muednote\/hoo\/history/);
    await expect(
      page.getByRole('heading', { name: /会話履歴|Conversation History/ })
    ).toBeVisible();
  });

  test('should send message and display user message', async ({ page }) => {
    await page.goto('/dashboard/muednote/hoo');

    const testMessage = 'Test message for E2E testing';

    // Type message
    const textarea = page.getByPlaceholder(/メッセージを入力|Type your message/);
    await textarea.fill(testMessage);

    // Click send button
    const sendButton = page.locator('button[type="submit"]');
    await sendButton.click();

    // Verify user message is displayed
    await expect(page.getByText(testMessage)).toBeVisible();

    // Verify loading indicator appears
    await expect(page.locator('.animate-spin')).toBeVisible();
  });

  test('should handle Enter key to send message', async ({ page }) => {
    await page.goto('/dashboard/muednote/hoo');

    const testMessage = 'Enter key test message';

    // Type message and press Enter
    const textarea = page.getByPlaceholder(/メッセージを入力|Type your message/);
    await textarea.fill(testMessage);
    await textarea.press('Enter');

    // Verify message was sent
    await expect(page.getByText(testMessage)).toBeVisible();
  });

  test('should handle Shift+Enter for new line', async ({ page }) => {
    await page.goto('/dashboard/muednote/hoo');

    const textarea = page.getByPlaceholder(/メッセージを入力|Type your message/);
    await textarea.fill('Line 1');
    await textarea.press('Shift+Enter');

    // Verify newline was added (not sent)
    const value = await textarea.inputValue();
    expect(value).toContain('\n');
  });

  test('should show New button after starting conversation', async ({ page }) => {
    await page.goto('/dashboard/muednote/hoo');

    const testMessage = 'Starting a new conversation';
    const textarea = page.getByPlaceholder(/メッセージを入力|Type your message/);
    await textarea.fill(testMessage);
    await textarea.press('Enter');

    // Wait for message to be sent
    await expect(page.getByText(testMessage)).toBeVisible();

    // Verify New/Reset button appears
    await expect(
      page.getByRole('button', { name: /新規|New/ })
    ).toBeVisible();
  });

  test('should reset conversation when clicking New button', async ({ page }) => {
    await page.goto('/dashboard/muednote/hoo');

    // Send a message
    const testMessage = 'Message to be cleared';
    const textarea = page.getByPlaceholder(/メッセージを入力|Type your message/);
    await textarea.fill(testMessage);
    await textarea.press('Enter');

    await expect(page.getByText(testMessage)).toBeVisible();

    // Click New button
    const newButton = page.getByRole('button', { name: /新規|New/ });
    await newButton.click();

    // Verify conversation was reset (message should be gone)
    await expect(page.getByText(testMessage)).not.toBeVisible();

    // Verify empty state is shown again
    await expect(
      page.getByText(/Hooに話しかけてみましょう|Start talking with Hoo/)
    ).toBeVisible();
  });
});

test.describe('Hoo Conversation History', () => {
  test('should display history page', async ({ page }) => {
    await page.goto('/dashboard/muednote/hoo/history');

    // Verify history page elements
    await expect(
      page.getByRole('heading', { name: /会話履歴|Conversation History/ })
    ).toBeVisible();
  });

  test('should navigate back to chat from history', async ({ page }) => {
    await page.goto('/dashboard/muednote/hoo/history');

    // Click back to chat button
    const backButton = page.getByRole('link', { name: /チャットに戻る|Back to Chat/ });
    await expect(backButton).toBeVisible();
    await backButton.click();

    // Verify we're back on chat page
    await expect(page).toHaveURL(/\/dashboard\/muednote\/hoo$/);
  });

  test('should show empty state when no conversations', async ({ page }) => {
    await page.goto('/dashboard/muednote/hoo/history');

    // Either show conversations or empty state
    const hasConversations = await page.locator('[data-testid="conversation-item"]').count() > 0;

    if (!hasConversations) {
      await expect(
        page.getByText(/まだ会話がありません|No conversations yet/)
      ).toBeVisible();
    }
  });
});

test.describe('Hoo Conversation Resume', () => {
  test('should load conversation from URL parameter', async ({ page }) => {
    // First, we need to create a conversation
    await page.goto('/dashboard/muednote/hoo');

    const testMessage = 'Creating conversation for resume test';
    const textarea = page.getByPlaceholder(/メッセージを入力|Type your message/);
    await textarea.fill(testMessage);
    await textarea.press('Enter');

    // Wait for AI response (or timeout)
    await page.waitForTimeout(5000);

    // Go to history
    await page.goto('/dashboard/muednote/hoo/history');
    await page.waitForTimeout(1000);

    // Check if there are any conversations
    const conversationLinks = page.locator('a[href*="/dashboard/muednote/hoo?id="]');
    const count = await conversationLinks.count();

    if (count > 0) {
      // Click the first conversation
      const firstConversation = conversationLinks.first();
      await firstConversation.click();

      // Verify we're on the chat page with id parameter
      await expect(page).toHaveURL(/\/dashboard\/muednote\/hoo\?id=/);

      // Wait for conversation to load
      await page.waitForTimeout(2000);

      // Verify the conversation messages are loaded
      // (The test message should be visible if it was saved)
      // Note: Message visibility depends on whether the conversation was saved
      await expect(page.locator('.whitespace-pre-wrap')).toBeVisible();
    }
  });
});

test.describe('Hoo Quick Prompts', () => {
  test('should send quick prompt when clicked', async ({ page }) => {
    await page.goto('/dashboard/muednote/hoo');

    // Click on a quick prompt button
    const quickPromptButton = page
      .getByRole('button', { name: /思考整理|Organize thoughts/ });

    await expect(quickPromptButton).toBeVisible();
    await quickPromptButton.click();

    // Wait for the message to be sent
    await page.waitForTimeout(1000);

    // Verify loading indicator or user message appears
    const isLoading = await page.locator('.animate-spin').isVisible();
    // Quick prompt should trigger a send, so either loading or message should be visible
    expect(isLoading).toBeTruthy();
  });
});
