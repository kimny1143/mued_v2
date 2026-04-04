/**
 * RoEx Mastering Module Unit Tests
 *
 * Tests parseMasteringResponse (data transformation) and API methods.
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/roex/client', () => ({
  getRoExWebhookUrl: vi.fn().mockReturnValue('https://test.webhook.url/roex'),
  RoExClient: vi.fn(),
}));

import {
  masterPreview,
  pollMasterPreview,
  masterFinal,
} from '@/lib/roex/mastering';
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

describe('masterPreview', () => {
  it('sends correct request with defaults', async () => {
    const client = createMockClient({
      previewMasterTaskResults: {
        mastering_task_id: 'master-123',
        status: 'processing',
      },
    });

    await masterPreview(client, {
      trackUrl: 'https://example.com/mix.wav',
      musicalStyle: 'POP',
    });

    const body = vi.mocked(client.post).mock.calls[0][1] as any;
    expect(body.masteringData.trackData[0].trackURL).toBe('https://example.com/mix.wav');
    expect(body.masteringData.musicalStyle).toBe('POP');
    expect(body.masteringData.desiredLoudness).toBe('MEDIUM');
    expect(body.masteringData.sampleRate).toBe('44100');
  });

  it('uses explicit loudness and sample rate', async () => {
    const client = createMockClient({
      previewMasterTaskResults: {
        mastering_task_id: 'master-456',
        status: 'processing',
      },
    });

    await masterPreview(client, {
      trackUrl: 'https://example.com/mix.wav',
      musicalStyle: 'METAL',
      desiredLoudness: 'HIGH',
      sampleRate: '48000',
    });

    const body = vi.mocked(client.post).mock.calls[0][1] as any;
    expect(body.masteringData.desiredLoudness).toBe('HIGH');
    expect(body.masteringData.sampleRate).toBe('48000');
  });

  it('parses nested previewMasterTaskResults', async () => {
    const client = createMockClient({
      previewMasterTaskResults: {
        mastering_task_id: 'master-789',
        status: 'completed',
        download_url_mastered_preview: 'https://cdn.roex.com/master-preview.mp3',
      },
    });

    const result = await masterPreview(client, {
      trackUrl: 'https://ex.com/mix.wav',
      musicalStyle: 'ACOUSTIC',
    });

    expect(result.taskId).toBe('master-789');
    expect(result.status).toBe('completed');
    expect(result.previewUrl).toBe('https://cdn.roex.com/master-preview.mp3');
  });
});

describe('pollMasterPreview', () => {
  it('sends correct poll request', async () => {
    const client = createMockClient({
      previewMasterTaskResults: {
        mastering_task_id: 'master-123',
        status: 'completed',
        download_url_mastered_preview: 'https://cdn.roex.com/master-preview.mp3',
      },
    });

    const result = await pollMasterPreview(client, 'master-123');

    const body = vi.mocked(client.post).mock.calls[0][1] as any;
    expect(body.masteringData.masteringTaskId).toBe('master-123');
    expect(result.status).toBe('completed');
    expect(result.previewUrl).toBe('https://cdn.roex.com/master-preview.mp3');
  });

  it('handles processing status', async () => {
    const client = createMockClient({
      previewMasterTaskResults: {
        mastering_task_id: 'master-123',
        status: 'processing',
      },
    });

    const result = await pollMasterPreview(client, 'master-123');
    expect(result.status).toBe('processing');
    expect(result.previewUrl).toBeUndefined();
  });
});

describe('masterFinal', () => {
  it('sends correct request', async () => {
    const client = createMockClient({
      finalMasterTaskResults: {
        mastering_task_id: 'master-final',
        status: 'completed',
        download_url_mastered: 'https://cdn.roex.com/mastered.wav',
      },
    });

    const result = await masterFinal(client, 'master-123');

    const body = vi.mocked(client.post).mock.calls[0][1] as any;
    expect(body.masteringData.masteringTaskId).toBe('master-123');
    expect(result.finalUrl).toBe('https://cdn.roex.com/mastered.wav');
  });
});

describe('parseMasteringResponse edge cases', () => {
  it('handles string response (direct URL)', async () => {
    const client = createMockClient('https://cdn.roex.com/direct.wav');

    const result = await masterFinal(client, 'master-123');

    expect(result.taskId).toBe('');
    expect(result.status).toBe('completed');
    expect(result.finalUrl).toBe('https://cdn.roex.com/direct.wav');
  });

  it('handles flat response (no nesting)', async () => {
    const client = createMockClient({
      mastering_task_id: 'flat-master',
      status: 'completed',
      download_url_mastered: 'https://cdn.roex.com/flat.wav',
    });

    const result = await masterFinal(client, 'flat-master');
    expect(result.taskId).toBe('flat-master');
    expect(result.finalUrl).toBe('https://cdn.roex.com/flat.wav');
  });

  it('returns empty strings for missing fields', async () => {
    const client = createMockClient({});

    const result = await masterPreview(client, {
      trackUrl: 'https://ex.com/mix.wav',
      musicalStyle: 'OTHER',
    });

    expect(result.taskId).toBe('');
    expect(result.status).toBe('');
    expect(result.previewUrl).toBeUndefined();
    expect(result.finalUrl).toBeUndefined();
  });
});

describe('RoExClient usage', () => {
  it('calls correct endpoint for preview', async () => {
    const client = createMockClient({ status: 'processing' });

    await masterPreview(client, {
      trackUrl: 'https://ex.com/mix.wav',
      musicalStyle: 'ELECTRONIC',
    });

    expect(client.post).toHaveBeenCalledWith('/masteringpreview', expect.any(Object));
  });

  it('calls correct endpoint for poll', async () => {
    const client = createMockClient({ status: 'processing' });
    await pollMasterPreview(client, 'task-123');
    expect(client.post).toHaveBeenCalledWith('/retrievepreviewmaster', expect.any(Object));
  });

  it('calls correct endpoint for final', async () => {
    const client = createMockClient({ status: 'processing' });
    await masterFinal(client, 'task-123');
    expect(client.post).toHaveBeenCalledWith('/retrievefinalmaster', expect.any(Object));
  });
});
