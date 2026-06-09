/**
 * RoEx Mixing Module Unit Tests
 *
 * Tests parseMixResponse (data transformation), buildTrackData (defaults),
 * and API methods with mock RoExClient.
 */

import { describe, it, expect, vi } from 'vitest';

// Mock the client module
vi.mock('@/lib/roex/client', () => ({
  getRoExWebhookUrl: vi.fn().mockReturnValue('https://test.webhook.url/roex'),
  RoExClient: vi.fn(),
}));

import {
  mixPreview,
  pollMixPreview,
  mixFinalBasic,
  mixFinalAdvanced,
  pollMixFinal,
} from '@/lib/roex/mixing';
import type { RoExClient } from '@/lib/roex/client';

// ========================================
// Mock Client
// ========================================

function createMockClient(response: unknown): RoExClient {
  return {
    post: vi.fn().mockResolvedValue(response),
    get: vi.fn(),
    apiKey: 'test-key',
    baseUrl: 'https://test.roex.com',
  } as unknown as RoExClient;
}

// ========================================
// Tests
// ========================================

describe('mixPreview', () => {
  it('sends correct track data with defaults', async () => {
    const client = createMockClient({
      previewMixTaskResults: {
        multitrack_task_id: 'task-123',
        status: 'processing',
      },
    });

    await mixPreview(client, {
      tracks: [
        {
          trackUrl: 'https://example.com/vocal.wav',
          instrumentGroup: 'VOCAL_GROUP',
        },
        {
          trackUrl: 'https://example.com/drums.wav',
          instrumentGroup: 'DRUMS_GROUP',
          presenceSetting: 'LEAD',
          panPreference: 'LEFT',
          reverbPreference: 'MEDIUM',
        },
      ],
      musicalStyle: 'POP',
    });

    const postCall = vi.mocked(client.post).mock.calls[0];
    expect(postCall[0]).toBe('/mixpreview');

    const body = postCall[1] as any;
    const tracks = body.multitrackData.trackData;

    // First track: defaults applied
    expect(tracks[0]).toEqual({
      trackURL: 'https://example.com/vocal.wav',
      instrumentGroup: 'VOCAL_GROUP',
      presenceSetting: 'NORMAL',
      panPreference: 'NO_PREFERENCE',
      reverbPreference: 'NONE',
    });

    // Second track: explicit values preserved
    expect(tracks[1].presenceSetting).toBe('LEAD');
    expect(tracks[1].panPreference).toBe('LEFT');
    expect(tracks[1].reverbPreference).toBe('MEDIUM');
  });

  it('parses nested previewMixTaskResults response', async () => {
    const client = createMockClient({
      previewMixTaskResults: {
        multitrack_task_id: 'task-abc',
        status: 'completed',
        download_url_preview_mixed: 'https://cdn.roex.com/preview.mp3',
        stems: { vocal: 'https://cdn.roex.com/vocal.wav' },
      },
    });

    const result = await mixPreview(client, {
      tracks: [{ trackUrl: 'https://ex.com/t.wav', instrumentGroup: 'VOCAL_GROUP' }],
      musicalStyle: 'ROCK_INDIE',
    });

    expect(result.taskId).toBe('task-abc');
    expect(result.status).toBe('completed');
    expect(result.previewUrl).toBe('https://cdn.roex.com/preview.mp3');
    expect(result.stemsUrl).toEqual({ vocal: 'https://cdn.roex.com/vocal.wav' });
  });

  it('parses flat response (no nesting)', async () => {
    const client = createMockClient({
      multitrack_task_id: 'task-flat',
      status: 'processing',
    });

    const result = await mixPreview(client, {
      tracks: [{ trackUrl: 'https://ex.com/t.wav', instrumentGroup: 'BASS_GROUP' }],
      musicalStyle: 'ELECTRONIC',
    });

    expect(result.taskId).toBe('task-flat');
    expect(result.status).toBe('processing');
  });
});

describe('pollMixPreview', () => {
  it('sends correct poll request', async () => {
    const client = createMockClient({
      previewMixTaskResults: {
        multitrack_task_id: 'task-123',
        status: 'completed',
        download_url_preview_mixed: 'https://cdn.roex.com/preview.mp3',
      },
    });

    const result = await pollMixPreview(client, 'task-123');

    const body = vi.mocked(client.post).mock.calls[0][1] as any;
    expect(body.multitrackData.multitrackTaskId).toBe('task-123');
    expect(body.multitrackData.retrieveFXSettings).toBe(false);
    expect(result.status).toBe('completed');
  });

  it('requests FX settings when specified', async () => {
    const client = createMockClient({
      previewMixTaskResults: {
        multitrack_task_id: 'task-123',
        status: 'completed',
        mix_output_settings: { track1: { fxChain: [] } },
      },
    });

    const result = await pollMixPreview(client, 'task-123', { retrieveFxSettings: true });

    const body = vi.mocked(client.post).mock.calls[0][1] as any;
    expect(body.multitrackData.retrieveFXSettings).toBe(true);
    expect(result.fxSettings).toBeDefined();
  });
});

describe('mixFinalBasic', () => {
  it('sends gain adjustments', async () => {
    const client = createMockClient({
      applyAudioEffectsResults: {
        multitrack_task_id: 'task-final',
        status: 'processing',
      },
    });

    await mixFinalBasic(client, {
      taskId: 'task-123',
      trackData: [
        { trackUrl: 'https://ex.com/vocal.wav', gainDb: 2.5 },
        { trackUrl: 'https://ex.com/drums.wav', gainDb: -1.0 },
      ],
    });

    const body = vi.mocked(client.post).mock.calls[0][1] as any;
    expect(body.applyAudioEffectsData.multitrackTaskId).toBe('task-123');
    expect(body.applyAudioEffectsData.trackData[0].gainDb).toBe(2.5);
    expect(body.applyAudioEffectsData.trackData[1].gainDb).toBe(-1.0);
  });

  it('parses applyAudioEffectsResults response', async () => {
    const client = createMockClient({
      applyAudioEffectsResults: {
        multitrack_task_id: 'task-final',
        status: 'completed',
        download_url_mixed: 'https://cdn.roex.com/final.wav',
      },
    });

    const result = await mixFinalBasic(client, {
      taskId: 'task-123',
      trackData: [{ trackUrl: 'https://ex.com/t.wav', gainDb: 0 }],
    });

    expect(result.finalUrl).toBe('https://cdn.roex.com/final.wav');
  });
});

describe('mixFinalAdvanced', () => {
  it('sends EQ, compressor, and pan settings', async () => {
    const client = createMockClient({
      applyAudioEffectsResults: {
        multitrack_task_id: 'task-adv',
        status: 'processing',
      },
    });

    await mixFinalAdvanced(client, {
      taskId: 'task-123',
      trackData: [
        {
          trackUrl: 'https://ex.com/vocal.wav',
          gainDb: 1.5,
          eqBands: [
            { frequency: 1000, gain: 3, q: 1.5 },
            { frequency: 4000, gain: -2, q: 2.0 },
          ],
          compressor: { attack: 10, release: 100, threshold: -20, ratio: 4 },
          panAngleDegrees: -30,
        },
      ],
    });

    const body = vi.mocked(client.post).mock.calls[0][1] as any;
    const track = body.applyAudioEffectsData.trackData[0];

    // EQ bands
    expect(track.eq_settings.band_1).toEqual({ centre_freq: 1000, gain: 3, q: 1.5 });
    expect(track.eq_settings.band_2).toEqual({ centre_freq: 4000, gain: -2, q: 2.0 });

    // Compressor
    expect(track.compression_settings).toEqual({
      attack_ms: 10,
      release_ms: 100,
      threshold: -20,
      ratio: 4,
    });

    // Pan
    expect(track.panning_settings).toEqual({ panning_angle: -30 });
  });

  it('omits optional settings when not provided', async () => {
    const client = createMockClient({
      applyAudioEffectsResults: { status: 'processing' },
    });

    await mixFinalAdvanced(client, {
      taskId: 'task-123',
      trackData: [{ trackUrl: 'https://ex.com/t.wav', gainDb: 0 }],
    });

    const body = vi.mocked(client.post).mock.calls[0][1] as any;
    const track = body.applyAudioEffectsData.trackData[0];

    expect(track.eq_settings).toBeUndefined();
    expect(track.compression_settings).toBeUndefined();
    expect(track.panning_settings).toBeUndefined();
  });

  it('limits EQ bands to 6', async () => {
    const client = createMockClient({
      applyAudioEffectsResults: { status: 'processing' },
    });

    const eqBands = Array.from({ length: 10 }, (_, i) => ({
      frequency: 100 * (i + 1),
      gain: i,
      q: 1,
    }));

    await mixFinalAdvanced(client, {
      taskId: 'task-123',
      trackData: [{ trackUrl: 'https://ex.com/t.wav', gainDb: 0, eqBands }],
    });

    const body = vi.mocked(client.post).mock.calls[0][1] as any;
    const eqKeys = Object.keys(body.applyAudioEffectsData.trackData[0].eq_settings);
    expect(eqKeys).toHaveLength(6);
    expect(eqKeys).toContain('band_6');
    expect(eqKeys).not.toContain('band_7');
  });
});

describe('pollMixFinal', () => {
  it('sends task ID and track URLs', async () => {
    const client = createMockClient({
      applyAudioEffectsResults: {
        multitrack_task_id: 'task-final',
        status: 'completed',
        download_url_mixed: 'https://cdn.roex.com/final.wav',
      },
    });

    const result = await pollMixFinal(client, 'task-final', [
      'https://ex.com/t1.wav',
      'https://ex.com/t2.wav',
    ]);

    const body = vi.mocked(client.post).mock.calls[0][1] as any;
    expect(body.applyAudioEffectsData.multitrackTaskId).toBe('task-final');
    expect(body.applyAudioEffectsData.trackData).toHaveLength(2);
    expect(result.finalUrl).toBe('https://cdn.roex.com/final.wav');
  });
});

describe('parseMixResponse edge cases', () => {
  it('handles alternative key names (previewMixDownloadUrl)', async () => {
    const client = createMockClient({
      previewMixTaskResults: {
        taskId: 'task-alt',
        status: 'completed',
        previewMixDownloadUrl: 'https://cdn.roex.com/alt-preview.mp3',
        stemsDownloadUrl: { vocal: 'https://cdn.roex.com/stem.wav' },
      },
    });

    const result = await mixPreview(client, {
      tracks: [{ trackUrl: 'https://ex.com/t.wav', instrumentGroup: 'VOCAL_GROUP' }],
      musicalStyle: 'POP',
    });

    expect(result.previewUrl).toBe('https://cdn.roex.com/alt-preview.mp3');
    expect(result.stemsUrl).toEqual({ vocal: 'https://cdn.roex.com/stem.wav' });
  });

  it('returns empty strings for missing fields', async () => {
    const client = createMockClient({});

    const result = await mixPreview(client, {
      tracks: [{ trackUrl: 'https://ex.com/t.wav', instrumentGroup: 'BASS_GROUP' }],
      musicalStyle: 'OTHER',
    });

    expect(result.taskId).toBe('');
    expect(result.status).toBe('');
    expect(result.previewUrl).toBeUndefined();
    expect(result.finalUrl).toBeUndefined();
  });
});

describe('parseMixResponse failure detection', () => {
  it('marks failed and populates error when results.error === true', async () => {
    const client = createMockClient({
      previewMixTaskResults: {
        multitrack_task_id: 'task-x',
        status: 'processing',
        error: true,
        message: 'stem fetch failed',
      },
    });

    const result = await pollMixPreview(client, 'task-x');
    expect(result.status).toBe('failed');
    expect(result.error).toBe('stem fetch failed');
  });

  it('does NOT mark failed when error === false (normal completion)', async () => {
    const client = createMockClient({
      previewMixTaskResults: {
        multitrack_task_id: 'task-x',
        status: 'completed',
        error: false,
        download_url_preview_mixed: 'https://cdn.roex.com/p.mp3',
      },
    });

    const result = await pollMixPreview(client, 'task-x');
    expect(result.status).toBe('completed');
    expect(result.error).toBeUndefined();
    expect(result.previewUrl).toBe('https://cdn.roex.com/p.mp3');
  });

  it('marks failed when the status string looks like a failure (FAILED / ERROR)', async () => {
    for (const status of ['FAILED', 'ERROR_PROCESSING', 'task_failed']) {
      const client = createMockClient({ previewMixTaskResults: { status } });
      const result = await pollMixPreview(client, 'task-x');
      expect(result.status).toBe('failed');
      expect(result.error).toBeDefined();
    }
  });

  it('leaves a normal processing status untouched', async () => {
    const client = createMockClient({ previewMixTaskResults: { status: 'processing' } });
    const result = await pollMixPreview(client, 'task-x');
    expect(result.status).toBe('processing');
    expect(result.error).toBeUndefined();
  });
});
