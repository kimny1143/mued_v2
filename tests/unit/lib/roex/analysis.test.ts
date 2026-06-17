import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/roex/client', () => ({
  RoExClient: vi.fn(),
  isRoExDevKey: vi.fn().mockReturnValue(false),
  getRoExWebhookUrl: vi.fn().mockReturnValue('https://test.webhook.url/roex'),
}));

import { analyzeMix } from '@/lib/roex/analysis';
import type { RoExClient } from '@/lib/roex/client';

function mockClient(response: unknown): RoExClient {
  return {
    post: vi.fn().mockResolvedValue(response),
    get: vi.fn(),
  } as unknown as RoExClient;
}

const ok = (extra: Record<string, unknown> = {}) => ({
  mixDiagnosisResults: {
    payload: {
      integrated_loudness_lufs: -11.2,
      peak_loudness_dbfs: -1.0,
      stereo_field: 'WIDE',
      ...extra,
    },
  },
});

describe('analyzeMix core-measurement validation', () => {
  it('parses a well-formed response', async () => {
    const r = await analyzeMix(mockClient(ok()), { audioUrl: 'https://x/a.wav', musicalStyle: 'POP' });
    expect(r.loudnessLufs).toBe(-11.2);
    expect(r.peakDbfs).toBe(-1.0);
    expect(r.stereoField).toBe('WIDE');
  });

  it('throws (does NOT coerce to 0) when loudness is missing — RoEx payload-shape change', async () => {
    const bad = { mixDiagnosisResults: { payload: { peak_loudness_dbfs: -1.0 } } };
    await expect(
      analyzeMix(mockClient(bad), { audioUrl: 'https://x/a.wav', musicalStyle: 'POP' }),
    ).rejects.toThrow(/no usable loudness\/peak/i);
  });

  it('throws when a core measurement is non-finite', async () => {
    await expect(
      analyzeMix(mockClient(ok({ peak_loudness_dbfs: null })), {
        audioUrl: 'https://x/a.wav',
        musicalStyle: 'POP',
      }),
    ).rejects.toThrow(/no usable loudness\/peak/i);
  });
});
