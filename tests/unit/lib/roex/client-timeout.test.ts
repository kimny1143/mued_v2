/**
 * RoExClient comm-timeout — the primary hang protection. A hung HTTP call must abort and
 * throw RoExCommTimeoutError (caller treats it as transient) rather than hang the function;
 * a normal fast response must be unaffected and clear its timer.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RoExClient, RoExCommTimeoutError } from '@/lib/roex/client';

describe('RoExClient comm-timeout', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('throws RoExCommTimeoutError when a request exceeds the timeout', async () => {
    // fetch never resolves on its own; it rejects only when the abort signal fires.
    global.fetch = vi.fn((_url: unknown, init: { signal: AbortSignal }) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(new Error('aborted')));
      }),
    ) as never;

    const client = new RoExClient({ apiKey: 'k' });
    // Timeout only applies when opted in (poll calls). Submit calls pass no timeoutMs.
    const p = client.post('/slow', {}, { timeoutMs: 45_000 });
    const assertion = expect(p).rejects.toBeInstanceOf(RoExCommTimeoutError);
    await vi.advanceTimersByTimeAsync(46_000);
    await assertion;
  });

  it('a fast response is unaffected and clears its timeout', async () => {
    const clearSpy = vi.spyOn(global, 'clearTimeout');
    global.fetch = vi.fn(async () => new Response(JSON.stringify({ ok: 1 }), { status: 200 })) as never;

    const client = new RoExClient({ apiKey: 'k' });
    const result = await client.post<{ ok: number }>('/fast', {}, { timeoutMs: 45_000 });
    expect(result).toEqual({ ok: 1 });
    expect(clearSpy).toHaveBeenCalled();
  });

  it('a SUBMIT call (no timeoutMs) is never aborted', async () => {
    // A submit/charge call passes no timeoutMs → plain fetch, no AbortController, no abort.
    let sawSignal = false;
    global.fetch = vi.fn(async (_url: unknown, init?: { signal?: AbortSignal }) => {
      sawSignal = !!init?.signal;
      return new Response(JSON.stringify({ ok: 1 }), { status: 200 });
    }) as never;
    const client = new RoExClient({ apiKey: 'k' });
    await client.post('/submit', {});
    expect(sawSignal).toBe(false);
  });
});
