import { expect, test } from '@playwright/test';
import {
  DialMockServer,
  buildSession,
  buildTask,
  buildTrack,
  seedDialGuestSession,
} from './fixtures/dial-mocks';

test.describe('MUEDial Business Rules', () => {
  test('enforces the omakase preview cap at 5 previews', async ({ page }) => {
    const session = buildSession({
      id: 'omakase-preview-limit',
      mode: 'omakase',
      tracks: [buildTrack('mix.wav', 'OTHER')],
      previewCount: 0,
    });
    const server = new DialMockServer(page, { session });

    await server.install();
    await seedDialGuestSession(page, session.id);
    await page.goto(`/dial/session/${session.id}`);

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await page.getByTestId('dial-generate-preview').click();
      await expect(page.getByRole('button', { name: new RegExp(`Take ${attempt}`, 'i') })).toBeVisible();
    }

    await expect(page.getByText('Preview 5/5')).toBeVisible();
    await expect(page.getByText('Limit reached')).toBeVisible();

    await page.getByTestId('dial-generate-preview').click();
    await expect(page.getByTestId('dial-session-error')).toContainText('Preview limit reached');
  });

  test('blocks a third dialogue Mix Check request', async ({ page }) => {
    const previewTask = buildTask('preview');
    const session = buildSession({
      id: 'dialogue-mixcheck-limit',
      mode: 'dialogue',
      tracks: [buildTrack('vocals.wav', 'VOCAL'), buildTrack('drums.wav', 'DRUMS')],
      tasks: [previewTask],
      previewCount: 1,
    });

    const server = new DialMockServer(page, {
      session,
      onChat(message) {
        if (message.includes('Need another mix check')) {
          return {
            content: 'I prepared another Mix Check so you can confirm the direction.',
            action: 'request_mix_check',
            parameterChanges: [
              {
                track: 'vocals',
                changes: { gainDb: 1.0, compRatio: 2.5 },
                reason: 'Keep the lead stable.',
              },
            ],
          };
        }

        return { content: 'Ready for the next pass.' };
      },
    });

    await server.install();
    await seedDialGuestSession(page, session.id);
    await page.goto(`/dial/session/${session.id}`);

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      await page.getByTestId('dial-chat-input').fill(`Need another mix check ${attempt}`);
      await page.getByTestId('dial-chat-send').click();
      await expect(page.getByTestId('dial-chat-generate-mix-check')).toBeVisible();
      await page.getByTestId('dial-chat-generate-mix-check').click();
    }

    await page.getByTestId('dial-chat-input').fill('Need another mix check 3');
    await page.getByTestId('dial-chat-send').click();
    await expect(page.getByTestId('dial-chat-generate-mix-check')).toBeVisible();
    await page.getByTestId('dial-chat-generate-mix-check').click();

    await expect(page.getByTestId('dial-session-error')).toContainText('Mix check limit reached');
  });

  test('stops final generation when the paid cycle budget is exhausted', async ({ page }) => {
    const previewTask = buildTask('preview');
    const session = buildSession({
      id: 'paid-cycle-limit',
      mode: 'dialogue',
      tracks: [buildTrack('vocals.wav', 'VOCAL')],
      tasks: [previewTask],
      previewCount: 1,
      paidCycleCount: 1,
      baseCycleLimit: 1,
      additionalCyclesPurchased: 0,
    });

    const server = new DialMockServer(page, {
      session,
      onChat(message) {
        if (message.includes('Print the final')) {
          return {
            content: 'I mapped that into a final print pass.',
            action: 'request_final',
            parameterChanges: [
              {
                track: 'vocals',
                changes: { gainDb: 1.2, eqBands: [{ freq: 3000, gainDb: 1.5, q: 0.9 }] },
                reason: 'Lock the vocal tone for delivery.',
              },
            ],
          };
        }

        return { content: 'Ready for a final print.' };
      },
    });

    await server.install();
    await seedDialGuestSession(page, session.id);
    await page.goto(`/dial/session/${session.id}`);

    await page.getByTestId('dial-chat-input').fill('Print the final');
    await page.getByTestId('dial-chat-send').click();
    await expect(page.getByTestId('dial-chat-generate-final')).toBeVisible();
    await page.getByTestId('dial-chat-generate-final').click();

    await expect(page.getByTestId('dial-session-error')).toContainText('Cycle limit reached');
  });
});
