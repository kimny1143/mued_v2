/**
 * Merge gate for the MUEDial v2 player decode/playback stop-bleed (Yuu incident 2026-06-11).
 *
 * Reproduces the failure class and asserts the fix:
 *  - Default active take = newest processed (MIXED), decoded lazily — the heavy RAW WAVs do NOT
 *    load up front (root cause: all-takes-all-stems parallel decode of ~419MB RAW).
 *  - A failed / hung / expired take never freezes the transport (isReady is derived from the
 *    ACTIVE take, not a single fixed gating take). It becomes a per-take error, not an infinite spinner.
 *  - Decode concurrency is bounded.
 *  - Telemetry fires on decode failure / timeout (detection layer — prior failures were all
 *    user-reported).
 *
 * @see project-dial-v2-player-decode-hang
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

// ── Telemetry spy ───────────────────────────────────────────────────────────
const trackDialPlaybackIssue = vi.fn();
vi.mock('@/lib/analytics/gtag', () => ({
  trackDialPlaybackIssue: (...args: unknown[]) => trackDialPlaybackIssue(...args),
}));

import { useMultiTakePlayer, type TakeDef } from '@/hooks/use-multi-take-player';

// ── Web Audio + fetch mocks ───────────────────────────────────────────────────

/** Per-URL fetch behaviour: 'ok' resolves audio, 'fail' = HTTP 403, 'hang' never settles. */
type FetchBehavior = 'ok' | 'fail' | 'hang';
let fetchPlan: (url: string) => FetchBehavior;
let concurrentFetches = 0;
let maxConcurrentFetches = 0;

function makeNode(extra: Record<string, unknown> = {}) {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: { value: 1, setValueAtTime: vi.fn() },
    pan: { value: 0 },
    fftSize: 0,
    smoothingTimeConstant: 0,
    ...extra,
  };
}

class MockAudioContext {
  currentTime = 0;
  sampleRate = 44100;
  state = 'running';
  destination = makeNode();
  audioWorklet = { addModule: vi.fn().mockResolvedValue(undefined) };
  createGain() { return makeNode(); }
  createAnalyser() { return makeNode(); }
  createStereoPanner() { return makeNode(); }
  createChannelSplitter() { return makeNode(); }
  createBufferSource() { return makeNode({ buffer: null, start: vi.fn(), stop: vi.fn() }); }
  decodeAudioData() { return Promise.resolve({ duration: 12, length: 1, sampleRate: 44100, numberOfChannels: 2 }); }
  resume() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
}

class MockAudioWorkletNode {
  port = { onmessage: null as ((e: MessageEvent) => void) | null, postMessage: vi.fn() };
  connect = vi.fn();
  disconnect = vi.fn();
}

function mockFetch(url: string): Promise<Response> {
  const behavior = fetchPlan(url);
  concurrentFetches++;
  maxConcurrentFetches = Math.max(maxConcurrentFetches, concurrentFetches);
  const done = () => { concurrentFetches = Math.max(0, concurrentFetches - 1); };
  if (behavior === 'hang') {
    // Never settles — the hook's timeout guard must abort it.
    return new Promise<Response>(() => { /* never */ });
  }
  if (behavior === 'fail') {
    done();
    return Promise.resolve({ ok: false, status: 403, statusText: 'Forbidden' } as Response);
  }
  done();
  return Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  } as unknown as Response);
}

/** Flush pending microtasks (fetch → arrayBuffer → decodeAudioData chains). */
async function flush(times = 6) {
  for (let i = 0; i < times; i++) {
    await act(async () => { await Promise.resolve(); });
  }
}

beforeEach(() => {
  trackDialPlaybackIssue.mockClear();
  fetchPlan = () => 'ok';
  concurrentFetches = 0;
  maxConcurrentFetches = 0;
  vi.stubGlobal('AudioContext', MockAudioContext);
  vi.stubGlobal('AudioWorkletNode', MockAudioWorkletNode);
  vi.stubGlobal('fetch', vi.fn(mockFetch));
  // Assigned directly (not stubGlobal) so they survive unstub + Testing Library's late cleanup()
  // unmount, which calls cancelAnimationFrame after our afterEach runs.
  (globalThis as Record<string, unknown>).requestAnimationFrame = (cb: FrameRequestCallback) => { void cb; return 1; };
  (globalThis as Record<string, unknown>).cancelAnimationFrame = () => {};
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

// ── Fixtures ───────────────────────────────────────────────────────────────

const RAW_5: TakeDef = {
  id: 'raw-x',
  label: 'RAW',
  stemUrls: {
    instrument: 'https://r2/instrument.wav',
    chorus1: 'https://r2/chorus1.wav',
    chorus2: 'https://r2/chorus2.wav',
    vocal1: 'https://r2/vocal1.wav',
    vocal2: 'https://r2/vocal2.wav',
  },
};
const PREVIEW2: TakeDef = { id: 'p2', label: 'MIXED', stemUrls: { main: 'https://proxy/p2.mp3' } };
const PREVIEW1: TakeDef = { id: 'p1', label: 'MIXED', stemUrls: { main: 'https://proxy/p1.mp3' } };

describe('useMultiTakePlayer — decode/playback stop-bleed', () => {
  it('defaults to the newest MIXED take and decodes ONLY it (RAW stays lazy)', async () => {
    const { result } = renderHook(() => useMultiTakePlayer([RAW_5, PREVIEW2, PREVIEW1]));
    await flush();

    // Active = newest processed take, not RAW.
    expect(result.current.activeTakeId).toBe('p2');
    expect(result.current.isReady).toBe(true);
    expect(result.current.takeDecodeStatus.p2).toBe('ready');
    // RAW's 419MB of WAVs were never fetched (lazy) — the whole point.
    expect(result.current.takeDecodeStatus['raw-x']).toBeUndefined();
    // Only the 1 active-take stem was fetched, not RAW's 5.
    expect((globalThis.fetch as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);
  });

  it('a 403 (expired URL) on the active take → per-take error, NOT an infinite spinner', async () => {
    fetchPlan = (url) => (url.includes('p2') ? 'fail' : 'ok');
    const { result } = renderHook(() => useMultiTakePlayer([RAW_5, PREVIEW2, PREVIEW1]));
    await flush();

    expect(result.current.activeTakeStatus).toBe('error');
    expect(result.current.isReady).toBe(false);
    expect(result.current.isDecoding).toBe(false); // settled — not spinning forever
    expect(trackDialPlaybackIssue).toHaveBeenCalledWith(
      expect.objectContaining({ issue: 'decode_error' }),
    );
  });

  it('a hung stem fetch on the active take → timeout → error (never settles → settles)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    fetchPlan = (url) => (url.includes('p2') ? 'hang' : 'ok');
    const { result } = renderHook(() => useMultiTakePlayer([RAW_5, PREVIEW2, PREVIEW1]));

    await act(async () => { await vi.advanceTimersByTimeAsync(46_000); });

    expect(result.current.activeTakeStatus).toBe('error');
    expect(result.current.isReady).toBe(false);
    expect(trackDialPlaybackIssue).toHaveBeenCalledWith(
      expect.objectContaining({ issue: 'decode_timeout' }),
    );
  });

  it('selecting RAW lazily decodes it; a 7-stem RAW with one hung stem still plays (partial success)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const RAW_7: TakeDef = {
      id: 'raw-x', label: 'RAW',
      stemUrls: Object.fromEntries(
        Array.from({ length: 7 }, (_, i) => [`s${i}`, `https://r2/s${i}.wav`]),
      ),
    };
    // One RAW stem hangs; the rest are fine. previews ok.
    fetchPlan = (url) => (url.endsWith('s3.wav') ? 'hang' : 'ok');
    const { result } = renderHook(() => useMultiTakePlayer([RAW_7, PREVIEW2, PREVIEW1]));
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });

    // Newest preview ready first; RAW not yet decoded.
    expect(result.current.activeTakeId).toBe('p2');
    expect(result.current.takeDecodeStatus['raw-x']).toBeUndefined();

    // User clicks RAW → lazy decode kicks off.
    act(() => { result.current.setActiveTake('raw-x'); });
    await act(async () => { await vi.advanceTimersByTimeAsync(46_000); });

    // RAW reaches 'ready' on partial success (6/7 stems decoded), one stem timed out — and the
    // player auto-activated RAW once ready. Preview2 was never frozen by RAW.
    expect(result.current.takeDecodeStatus['raw-x']).toBe('ready');
    expect(result.current.activeTakeId).toBe('raw-x');
    expect(result.current.isReady).toBe(true);
  });

  it('bounds decode concurrency (does not fire all stems at once)', async () => {
    // Make RAW the default by giving no MIXED take → all 5 stems compete.
    fetchPlan = () => 'hang'; // hold them open so concurrency is observable
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    renderHook(() => useMultiTakePlayer([RAW_5]));
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    // 5 RAW stems requested but capped — never all 5 in flight simultaneously.
    expect(maxConcurrentFetches).toBeGreaterThan(0);
    expect(maxConcurrentFetches).toBeLessThanOrEqual(3);
  });

  it('regenerating (remount with a new preview) decodes only the new newest take', async () => {
    // Initial: RAW + Preview1.
    const first = renderHook(() => useMultiTakePlayer([RAW_5, PREVIEW1]));
    await flush();
    expect(first.result.current.activeTakeId).toBe('p1');
    first.unmount();

    // Preview2 generated → player remounts (playerKey changes) with the new take set.
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockClear();
    const second = renderHook(() => useMultiTakePlayer([RAW_5, PREVIEW2, PREVIEW1]));
    await flush();

    expect(second.result.current.activeTakeId).toBe('p2');
    expect(second.result.current.isReady).toBe(true);
    // Only the new active take decoded — not RAW, not the older preview.
    expect((globalThis.fetch as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);
  });
});
