import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  savePendingResult,
  getPendingResults,
  clearPendingResults,
  syncPendingResults,
} from '@/lib/muedlobe/offline-sync';

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Mock fetch
const fetchMock = vi.fn();
Object.defineProperty(globalThis, 'fetch', { value: fetchMock, writable: true });

beforeEach(() => {
  Object.keys(store).forEach(k => delete store[k]);
  vi.clearAllMocks();
});

describe('savePendingResult', () => {
  it('saves a result to localStorage', () => {
    savePendingResult('tone-sequence', { score: 10 }, { score: 10 });
    const pending = getPendingResults();
    expect(pending).toHaveLength(1);
    expect(pending[0].gameType).toBe('tone-sequence');
    expect(pending[0].rawData).toEqual({ score: 10 });
    expect(pending[0].savedAt).toBeTruthy();
  });

  it('appends multiple results', () => {
    savePendingResult('tone-sequence', { s: 1 }, { s: 1 });
    savePendingResult('mental-math', { s: 2 }, { s: 2 });
    savePendingResult('focus-flow', { s: 3 }, { s: 3 });
    expect(getPendingResults()).toHaveLength(3);
  });

  it('enforces max queue size (50), dropping oldest', () => {
    for (let i = 0; i < 50; i++) {
      savePendingResult('tone-sequence', { i }, { i });
    }
    expect(getPendingResults()).toHaveLength(50);

    // Adding 51st should drop the first
    savePendingResult('mental-math', { i: 50 }, { i: 50 });
    const pending = getPendingResults();
    expect(pending).toHaveLength(50);
    expect(pending[0].rawData).toEqual({ i: 1 }); // oldest (i=0) dropped
    expect(pending[49].gameType).toBe('mental-math');
  });
});

describe('getPendingResults', () => {
  it('returns empty array when nothing stored', () => {
    expect(getPendingResults()).toEqual([]);
  });

  it('returns empty array on corrupted data', () => {
    store['muedlobe_pending_results'] = 'not-json!!!';
    expect(getPendingResults()).toEqual([]);
  });
});

describe('clearPendingResults', () => {
  it('removes all pending results', () => {
    savePendingResult('tone-sequence', { s: 1 }, { s: 1 });
    expect(getPendingResults()).toHaveLength(1);
    clearPendingResults();
    expect(getPendingResults()).toEqual([]);
  });
});

describe('syncPendingResults', () => {
  it('returns 0 when no pending results', async () => {
    const synced = await syncPendingResults();
    expect(synced).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('syncs all results and clears queue on success', async () => {
    savePendingResult('tone-sequence', { s: 1 }, { s: 1 });
    savePendingResult('mental-math', { s: 2 }, { s: 2 });
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    const synced = await syncPendingResults();
    expect(synced).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(getPendingResults()).toEqual([]);
  });

  it('keeps failed results in queue (server error)', async () => {
    savePendingResult('tone-sequence', { s: 1 }, { s: 1 });
    savePendingResult('mental-math', { s: 2 }, { s: 2 });
    fetchMock
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: false, status: 500 });

    const synced = await syncPendingResults();
    expect(synced).toBe(1);
    const remaining = getPendingResults();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].gameType).toBe('mental-math');
  });

  it('keeps results in queue on 401 (auth expired)', async () => {
    savePendingResult('tone-sequence', { s: 1 }, { s: 1 });
    fetchMock.mockResolvedValue({ ok: false, status: 401 });

    const synced = await syncPendingResults();
    expect(synced).toBe(0);
    expect(getPendingResults()).toHaveLength(1);
  });

  it('keeps results in queue on network error', async () => {
    savePendingResult('tone-sequence', { s: 1 }, { s: 1 });
    fetchMock.mockRejectedValue(new Error('Network error'));

    const synced = await syncPendingResults();
    expect(synced).toBe(0);
    expect(getPendingResults()).toHaveLength(1);
  });

  it('sends correct payload to API', async () => {
    savePendingResult('symbol-match', { raw: 42 }, { calc: 85 });
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    await syncPendingResults();
    expect(fetchMock).toHaveBeenCalledWith('/api/lobe/measurement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameType: 'symbol-match',
        rawData: { raw: 42 },
        calculatedScore: { calc: 85 },
      }),
    });
  });
});
