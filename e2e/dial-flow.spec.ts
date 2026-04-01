import { expect, test } from '@playwright/test';
import { DialMockServer, buildSession } from './fixtures/dial-mocks';

test.describe('MUEDial Flow', () => {
  test('completes the mocked checkout -> upload -> preview -> dialogue -> final -> mastering flow', async ({ page }) => {
    const server = new DialMockServer(page, {
      session: buildSession({
        id: 'dial-flow-session',
        mode: 'dialogue',
        masteringMode: 'omakase',
        title: 'Flow Test Session',
      }),
      onChat(message) {
        if (message.includes('アップロードしました') && !message.includes('マスタリング')) {
          return {
            content: 'The stems are in. Generate a preview, then tell me what still feels off.',
          };
        }

        if (message.includes('Make the chorus wider')) {
          return {
            content: 'I mapped that into a final pass with wider imaging and a brighter lead.',
            action: 'request_final',
            parameterChanges: [
              {
                track: 'vocals',
                changes: {
                  gainDb: 1.5,
                  panAngleDegrees: 0,
                  eqBands: [{ freq: 4000, gainDb: 1.2, q: 0.8 }],
                },
                reason: 'Push the lead vocal forward in the chorus.',
              },
            ],
          };
        }

        if (message.includes('ミックスが完了しました')) {
          return {
            content: 'I set up a medium-loud mastering preview so we can check the finish.',
            action: 'set_mastering_params',
            desiredLoudness: 'MEDIUM',
          };
        }

        if (message.includes('Ship the master')) {
          return {
            content: 'Looks ready. I am locking the mastered file now.',
            action: 'request_mastering_final',
          };
        }

        return { content: 'Tell me what you want to change next.' };
      },
    });

    await server.install();

    await page.goto('/dial');

    await page.getByTestId('dial-mix-option-dialogue').click();
    await page.getByTestId('dial-mastering-addon').click();
    await page.getByTestId('dial-checkout-email').fill('artist@example.com');
    await page.getByTestId('dial-checkout-submit').click();

    await expect(page).toHaveURL(/\/dial\/session\/dial-flow-session\?payment=success/);

    await page.getByTestId('dial-file-input').setInputFiles([
      {
        name: 'vocals.wav',
        mimeType: 'audio/wav',
        buffer: Buffer.from('vocals'),
      },
      {
        name: 'drums.wav',
        mimeType: 'audio/wav',
        buffer: Buffer.from('drums'),
      },
      {
        name: 'bass.wav',
        mimeType: 'audio/wav',
        buffer: Buffer.from('bass'),
      },
    ]);

    await page.getByTestId('dial-upload-all').click();
    await expect(page.getByText('vocals.wav')).toBeVisible();
    await expect(page.getByText('drums.wav')).toBeVisible();

    await page.getByTestId('dial-generate-preview').click();
    await expect(page.getByRole('button', { name: /Take 1/i })).toBeVisible();

    await page.getByTestId('dial-chat-input').fill('Make the chorus wider');
    await page.getByTestId('dial-chat-send').click();
    await expect(page.getByTestId('dial-chat-generate-final')).toBeVisible();

    await page.getByTestId('dial-chat-generate-final').click();
    await expect(page.getByText('Mix complete! Mastering phase')).toBeVisible();

    await expect(page.getByRole('button', { name: /Master Preview/i })).toBeVisible();

    await page.getByTestId('dial-chat-input').fill('Ship the master');
    await page.getByTestId('dial-chat-send').click();
    await expect(page.getByTestId('dial-chat-generate-mastering-final')).toBeVisible();

    await page.getByTestId('dial-chat-generate-mastering-final').click();
    await expect(page.getByTestId('dial-download-mastered')).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('dial-download-mastered').click(),
    ]);

    expect(download.suggestedFilename()).toBeTruthy();
  });
});
