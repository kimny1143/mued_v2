/**
 * Unit — GET /api/dial/mastering/final: completing a mastering task does not wait on its R2 copy,
 * and the copy records both the stable URL and its expiry.
 *
 * ## Why this file exists
 *
 * The GET used to poll RoEx (≤ ROEX_POLL_TIMEOUT_MS), then `await copyToR2(...)` (≤ COPY_TIMEOUT_MS
 * per attempt), and only then write `status: 'completed'` — under `maxDuration = 120`. 45s + 90s is
 * 135s: a slow copy got the invocation killed before the completion write, so a paid mastering stayed
 * `processing`, was re-polled, and could run into the backstop and be marked failed. The same write
 * also set `r2FinalUrl` without `r2ExpiresAt`, unlike every other copy site.
 *
 * Now the task is completed first, and the copy + its row update run in after() through
 * persistDeliverableToR2 (the same helper as the session GET, #1096). The fake db is lazy like
 * Drizzle — a write is recorded only when awaited — so a built-but-dropped update cannot pass.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

type Write = { values: Record<string, unknown> };
const executed: Write[] = [];
const afterCallbacks: Array<() => unknown> = [];

function lazyUpdate() {
  return {
    set(values: Record<string, unknown>) {
      return {
        where() {
          // Drizzle's QueryPromise: nothing runs until .then() (await) is called.
          return {
            then(onFulfilled?: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) {
              executed.push({ values });
              return Promise.resolve(undefined).then(onFulfilled, onRejected);
            },
          };
        },
      };
    },
  };
}

vi.mock('next/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/server')>();
  return { ...actual, after: vi.fn() };
});
vi.mock('@/lib/middleware/with-dial-auth', () => ({
  withDialAuth: (handler: (ctx: unknown) => unknown) => (request: unknown) =>
    handler({ userId: 'user_1', guestToken: null, isGuest: false, request }),
}));
vi.mock('@/lib/middleware/dial-ownership', () => ({ verifyDialTaskOwnership: vi.fn() }));
vi.mock('@/lib/middleware/rate-limit', () => ({ rateLimit: vi.fn() }));
vi.mock('@/lib/roex', () => ({ createRoExClient: vi.fn(), masterFinal: vi.fn(), isRoExDevKey: vi.fn() }));
vi.mock('@/lib/dial/r2-storage', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/dial/r2-storage')>()),
  copyToR2: vi.fn(),
}));
vi.mock('@/lib/dial/task-timeout', () => ({
  getDialBackstopMs: vi.fn(),
  markDialTaskFailedWithReconcile: vi.fn(),
  isUnchargedMasteringReservation: vi.fn(),
}));
vi.mock('@/lib/dial/session-state', () => ({ sessionStateForCompletedTask: vi.fn() }));
vi.mock('@/lib/dial/session-state-write', () => ({ advanceDialSessionState: vi.fn() }));
vi.mock('@/db', () => ({
  db: { update: vi.fn(), query: { dialSessions: { findFirst: vi.fn() } } },
}));

import { after } from 'next/server';
import { GET, maxDuration } from '@/app/api/dial/mastering/final/route';
import { db } from '@/db';
import { verifyDialTaskOwnership } from '@/lib/middleware/dial-ownership';
import { isRoExDevKey, masterFinal } from '@/lib/roex';
import { ROEX_POLL_TIMEOUT_MS } from '@/lib/roex/client';
import { copyToR2, COPY_TIMEOUT_MS } from '@/lib/dial/r2-storage';
import { getDialBackstopMs, isUnchargedMasteringReservation } from '@/lib/dial/task-timeout';

const R2 = { r2Url: 'https://r2.example/download/sessions/s1/mastering_t1.wav', expiresAt: new Date('2026-10-23T00:00:00Z') };
const FINAL = 'https://gcs.example/master.wav';

/** Let every queued promise callback run, then run what the route handed to after(). */
async function settle() {
  await new Promise((r) => setTimeout(r, 0));
  for (const cb of afterCallbacks.splice(0)) await cb();
  await new Promise((r) => setTimeout(r, 0));
}

const completionIndex = () => executed.findIndex((w) => w.values.status === 'completed');
const r2Writes = () => executed.filter((w) => 'r2FinalUrl' in w.values);

async function callGet() {
  return GET(new Request('https://mued.jp/api/dial/mastering/final?taskId=t1') as never);
}

describe('GET /api/dial/mastering/final — completion first, R2 copy recorded after', () => {
  beforeEach(() => {
    executed.length = 0;
    afterCallbacks.length = 0;
    vi.mocked(after).mockImplementation((cb: unknown) => {
      afterCallbacks.push(cb as () => unknown);
    });
    vi.mocked(db.update).mockImplementation(lazyUpdate as never);
    vi.mocked(db.query.dialSessions.findFirst).mockResolvedValue({ id: 's1' } as never);
    vi.mocked(verifyDialTaskOwnership).mockResolvedValue({
      task: {
        id: 't1', sessionId: 's1', taskType: 'mastering', status: 'processing', finalUrl: null,
        roexTaskId: 'rx1', createdAt: new Date(Date.now() - 60_000),
      },
    } as never);
    vi.mocked(isRoExDevKey).mockReturnValue(false);
    vi.mocked(getDialBackstopMs).mockReturnValue(60 * 60_000);
    vi.mocked(isUnchargedMasteringReservation).mockReturnValue(false);
    vi.mocked(masterFinal).mockResolvedValue({ finalUrl: FINAL } as never);
    vi.mocked(copyToR2).mockResolvedValue(R2);
  });

  it('writes the completion before the response, without waiting on the R2 copy', async () => {
    const res = await callGet();
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual({ status: 'completed', finalUrl: FINAL });

    // Before after() runs: the task is already completed, and nothing has been copied yet.
    expect(completionIndex()).toBeGreaterThanOrEqual(0);
    expect(executed[completionIndex()].values).toMatchObject({ status: 'completed', finalUrl: FINAL });
    expect(copyToR2).not.toHaveBeenCalled();
    expect(r2Writes()).toEqual([]);
  });

  it('then copies to R2 and records both r2FinalUrl and r2ExpiresAt', async () => {
    await callGet();
    await settle();

    expect(copyToR2).toHaveBeenCalledWith(
      expect.objectContaining({ sourceUrl: FINAL, sessionId: 's1', taskId: 't1', taskType: 'mastering' }),
    );
    expect(r2Writes()).toEqual([{ values: { r2FinalUrl: R2.r2Url, r2ExpiresAt: R2.expiresAt } }]);
    expect(executed.indexOf(r2Writes()[0])).toBeGreaterThan(completionIndex());
  });

  it('a failed copy leaves the task completed and writes no r2 columns', async () => {
    vi.mocked(copyToR2).mockResolvedValue(null);
    await callGet();
    await settle();

    expect(completionIndex()).toBeGreaterThanOrEqual(0);
    expect(r2Writes()).toEqual([]);
  });

  it('maxDuration covers one poll plus one R2 copy', () => {
    // maxDuration counts from the start of the invocation: the poll runs first, then the copy.
    expect(ROEX_POLL_TIMEOUT_MS).toBeGreaterThan(0);
    expect(COPY_TIMEOUT_MS).toBeGreaterThan(0);
    expect(maxDuration * 1000).toBeGreaterThanOrEqual(ROEX_POLL_TIMEOUT_MS + COPY_TIMEOUT_MS);
  });
});
