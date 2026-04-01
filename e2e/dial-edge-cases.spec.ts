import { expect, test } from '@playwright/test';
import {
  DialMockServer,
  buildSession,
  buildTask,
  buildTrack,
  seedDialGuestSession,
} from './fixtures/dial-mocks';

test.describe('MUEDial Edge Cases', () => {
  test('shows a long-running preview estimate for large uploads', async ({ page }) => {
    const session = buildSession({
      id: 'long-preview-estimate',
      mode: 'dialogue',
      tracks: Array.from({ length: 10 }, (_, index) => buildTrack(`track-${index + 1}.wav`, 'OTHER')),
      tasks: [
        buildTask('preview', {
          status: 'processing',
          previewUrl: null,
        }),
      ],
      status: 'previewing',
    });
    const server = new DialMockServer(page, { session });

    await server.install();
    await seedDialGuestSession(page, session.id);
    await page.goto(`/dial/session/${session.id}`);

    await expect(page.getByTestId('dial-processing-banner')).toContainText('Generating preview');
    await expect(page.getByTestId('dial-processing-banner')).toContainText(/5.*20 min/);
  });

  test('surfaces an expired stem URL with a re-upload message', async ({ page }) => {
    const session = buildSession({
      id: 'expired-url-preview',
      mode: 'dialogue',
      tracks: [buildTrack('vocals.wav', 'VOCAL')],
    });
    const server = new DialMockServer(page, {
      session,
      onPreview() {
        return {
          success: false,
          error: 'Stem URL expired and no R2 fallback for "vocals.wav". Please re-upload your stems.',
        };
      },
    });

    await server.install();
    await seedDialGuestSession(page, session.id);
    await page.goto(`/dial/session/${session.id}`);

    await page.getByTestId('dial-generate-preview').click();
    await expect(page.getByTestId('dial-session-error')).toContainText('Please re-upload your stems');
    await expect(page.getByTestId('dial-file-input')).toBeAttached();
  });

  test('keeps the flow alive when final generation times out but background processing continues', async ({ page }) => {
    const previewTask = buildTask('preview');
    const session = buildSession({
      id: 'timeout-then-complete',
      mode: 'dialogue',
      masteringMode: null,
      tracks: [buildTrack('vocals.wav', 'VOCAL')],
      tasks: [previewTask],
      previewCount: 1,
    });

    const server = new DialMockServer(page, {
      session,
      onChat(message) {
        if (message.includes('Print final')) {
          return {
            content: 'Submitting the final render now.',
            action: 'request_final',
            parameterChanges: [
              {
                track: 'vocals',
                changes: { gainDb: 1.4, compRatio: 2.2 },
                reason: 'Keep the lead stable in the final print.',
              },
            ],
          };
        }

        return { content: 'Ready for the final render.' };
      },
      onFinal(body, mockServer) {
        return mockServer.forceTimedOutFinalThenCompleteOnPoll(body);
      },
    });

    await server.install();
    await seedDialGuestSession(page, session.id);
    await page.goto(`/dial/session/${session.id}`);

    await page.getByTestId('dial-chat-input').fill('Print final');
    await page.getByTestId('dial-chat-send').click();
    await expect(page.getByTestId('dial-chat-generate-final')).toBeVisible();
    await page.getByTestId('dial-chat-generate-final').click();

    await expect(page.getByTestId('dial-processing-banner')).toContainText('Generating final mix');
    await expect(page.getByTestId('dial-session-error')).toHaveCount(0);

    await page.waitForTimeout(5500);
    await expect(page.getByTestId('dial-download-final-mix')).toBeVisible();
  });

  test('warns before leaving when stems have not been downloaded yet', async ({ page }) => {
    const finalTask = buildTask('final_advanced');
    const session = buildSession({
      id: 'download-wait-guard',
      mode: 'dialogue',
      masteringMode: null,
      tracks: [buildTrack('vocals.wav', 'VOCAL'), buildTrack('drums.wav', 'DRUMS')],
      tasks: [finalTask],
      previewCount: 1,
    });
    const server = new DialMockServer(page, { session });

    await server.install();
    await seedDialGuestSession(page, session.id);
    await page.goto(`/dial/session/${session.id}`);

    const startNewSessionLink = page.getByRole('link', { name: 'Start New Session' });
    await expect(startNewSessionLink).toBeVisible();

    let dialogMessage = '';
    page.once('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    await Promise.all([
      page.waitForURL(/\/dial$/),
      startNewSessionLink.click(),
    ]);

    expect(dialogMessage).toContain('ステムファイルがまだダウンロードされていません');
  });
});
