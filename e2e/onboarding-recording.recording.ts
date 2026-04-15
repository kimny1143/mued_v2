/**
 * MUEDial Onboarding Recording Script
 *
 * Records the full happy-path flow for promo/SNS video production.
 * Uses mocked API responses — no real payment or RoEx credit consumption.
 *
 * Run:
 *   npm run dev                    # start dev server first
 *   npx playwright test --config=playwright.recording.config.ts
 *
 * NOTE: Named .recording.ts (not .spec.ts) to exclude from CI testMatch.
 * Only runs when explicitly targeting playwright.recording.config.ts.
 *
 * Output:
 *   recordings/onboarding/<test-name>/ — 1920x1080 .webm video
 *
 * Flow (Omakase, ~50s):
 *   LP → service select → checkout → upload → preview → chat → final → download
 *
 * Doubles as UI regression test: selector failures indicate UI breaking changes.
 */

import { expect, test } from '@playwright/test';
import { DialMockServer, buildSession } from './fixtures/dial-mocks';

test('MUEDial Omakase onboarding — LP to download', async ({ page }) => {
  // ── Mock Setup ──────────────────────────────────────────────────────────
  const server = new DialMockServer(page, {
    session: buildSession({
      id: 'onboarding-omakase-demo',
      mode: 'omakase',
      masteringMode: null,
      title: '夏のロック MIX',
    }),
    onChat(message) {
      if (message.includes('アップロード') || message.includes('upload')) {
        return {
          content: 'ファイルを受け取りました。どんな仕上がりをイメージしていますか？ジャンルや雰囲気を教えてください。',
        };
      }
      if (message.includes('ロック') || message.includes('rock') || message.includes('元気')) {
        return {
          content: 'ロック系ですね。エネルギッシュで抜けの良いミックスを目指します。プレビューを生成してみましょう。',
          action: 'adjust_preview',
        };
      }
      if (message.includes('低音') || message.includes('bass') || message.includes('もっと')) {
        return {
          content: '低域をもう少し前に出して、パンチを加えます。ファイナルミックスを生成します。',
          action: 'request_final',
          parameterChanges: [
            {
              track: '2mix',
              changes: { gainDb: 0.5, eqBands: [{ freq: 80, gainDb: 2.0, q: 0.7 }] },
              reason: '低域のパンチを強調',
            },
          ],
        };
      }
      return { content: 'どうぞ、続けてください。' };
    },
  });

  await server.install();

  // ── Scene 1: Landing Page ────────────────────────────────────────────────
  await page.goto('/dial');
  await expect(page.locator('body')).toBeVisible();
  await page.waitForTimeout(3000); // viewer absorbs LP

  // ── Scene 2: Select Omakase ──────────────────────────────────────────────
  const omakaseOption = page.getByTestId('dial-mix-option-omakase');
  await expect(omakaseOption).toBeVisible();
  await omakaseOption.click();
  await page.waitForTimeout(1500);

  // ── Scene 3: Checkout ────────────────────────────────────────────────────
  const emailInput = page.getByTestId('dial-checkout-email');
  await expect(emailInput).toBeVisible();
  await emailInput.fill('artist@example.com');
  await page.waitForTimeout(1000);

  const submitBtn = page.getByTestId('dial-checkout-submit');
  await expect(submitBtn).toBeVisible();
  await submitBtn.click();

  // Mock redirects to session page
  await expect(page).toHaveURL(/\/dial\/session\/onboarding-omakase-demo/);
  await page.waitForTimeout(2500); // session page loads

  // ── Scene 4: File Upload ─────────────────────────────────────────────────
  const fileInput = page.getByTestId('dial-file-input');
  await expect(fileInput).toBeVisible();
  await fileInput.setInputFiles({
    name: '夏のロック_2mix.wav',
    mimeType: 'audio/wav',
    // Minimal WAV header (44 bytes) so the file is recognizable
    buffer: Buffer.from([
      0x52,0x49,0x46,0x46, 0x24,0x00,0x00,0x00,
      0x57,0x41,0x56,0x45, 0x66,0x6d,0x74,0x20,
      0x10,0x00,0x00,0x00, 0x01,0x00,0x02,0x00,
      0xf4,0x01,0x00,0x00, 0xd0,0x07,0x00,0x00,
      0x04,0x00,0x10,0x00, 0x64,0x61,0x74,0x61,
      0x00,0x00,0x00,0x00,
    ]),
  });

  await expect(page.getByText('夏のロック_2mix.wav')).toBeVisible();
  await page.waitForTimeout(1500);

  const uploadBtn = page.getByTestId('dial-upload-all');
  await expect(uploadBtn).toBeVisible();
  await uploadBtn.click();
  await page.waitForTimeout(2000); // upload processing

  // ── Scene 5: Hoo Conversation — Genre Input ──────────────────────────────
  const chatInput = page.getByTestId('dial-chat-input');
  await expect(chatInput).toBeVisible();
  await chatInput.fill('元気なロック系で、ギターが前に出るイメージです');
  await page.waitForTimeout(1000);

  await page.getByTestId('dial-chat-send').click();
  await page.waitForTimeout(2500); // Hoo response + user reads

  // ── Scene 6: Generate Preview ────────────────────────────────────────────
  const previewBtn = page.getByTestId('dial-generate-preview');
  await expect(previewBtn).toBeVisible();
  await previewBtn.click();

  await expect(page.getByRole('button', { name: /Take 1/i })).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(3000); // viewer hears/sees Take 1

  // ── Scene 7: Feedback → Final ────────────────────────────────────────────
  await chatInput.fill('低音をもう少し前に出してほしい');
  await page.waitForTimeout(800);
  await page.getByTestId('dial-chat-send').click();

  await expect(page.getByTestId('dial-chat-generate-final')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(2000); // Hoo explains the plan

  await page.getByTestId('dial-chat-generate-final').click();
  await expect(page.getByTestId('dial-download-final')).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(3000); // final mix appears

  // ── Scene 8: Download ────────────────────────────────────────────────────
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('dial-download-final').click(),
  ]);

  expect(download.suggestedFilename()).toBeTruthy();
  await page.waitForTimeout(2000); // end card
});
