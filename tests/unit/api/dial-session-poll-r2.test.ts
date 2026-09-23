/**
 * Unit — GET /api/dial/session: when the inline poll completes a deliverable, its R2 copy is
 * actually recorded on the task.
 *
 * ## Why this file exists
 *
 * The session GET polls RoEx for every processing task. When it is the path that completes a final
 * (final_basic / final_advanced / mix_check) or a mastering task, it copies the file to R2 so the
 * download keeps working after RoEx's GCS URL expires. The copy used to be fire-and-forget:
 *
 *   copyToR2({...}).then((r2Result) => { if (r2Result) { db.update(...).set(...).where(...) } })
 *
 * ★The update inside `.then` was never awaited or returned. A Drizzle query is a lazy thenable —
 * `QueryPromise.then()` is what calls `execute()` — so building the chain without awaiting it runs
 * nothing. `r2_final_url` was never written on this path, and nothing failed.
 *
 * ★This path is not rare: on a fresh page load the client calls the session GET before its 5s poll
 * loop ever calls `/api/dial/final`. A user who leaves during an 8–34 minute render and comes back
 * completes their final here. Once RoEx purges the task (days), the download of a paid final has
 * no R2 copy to fall back on and returns 410.
 *
 * ## The fake db models the laziness
 *
 * `db.update().set().where()` returns an object that records the write only when `.then` is
 * called (i.e. when it is awaited), exactly like Drizzle. A plain `vi.fn()` chain would record the
 * call on construction and could not tell an awaited write from a dropped one. The first test pins
 * that the fake really is lazy — without it, a green here would say nothing.
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
vi.mock('@/lib/middleware/dial-ownership', () => ({
  verifyDialSessionOwnership: vi.fn(),
  verifyDialSessionReadAccess: vi.fn(),
}));
vi.mock('@/lib/roex', () => ({
  createRoExClient: vi.fn(),
  isRoExDevKey: vi.fn(),
  pollMixPreview: vi.fn(),
  pollMixFinal: vi.fn(),
  pollMasterPreview: vi.fn(),
  masterFinal: vi.fn(),
}));
vi.mock('@/lib/dial/r2-storage', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/dial/r2-storage')>()),
  copyToR2: vi.fn(),
}));
vi.mock('@/lib/dial/task-timeout', () => ({
  markDialTaskFailedWithReconcile: vi.fn(),
  isUnchargedMasteringReservation: vi.fn(),
}));
vi.mock('@/db', () => ({
  db: {
    update: vi.fn(),
    query: {
      dialSessions: { findFirst: vi.fn(), findMany: vi.fn() },
      dialTracks: { findMany: vi.fn() },
    },
  },
}));

import { after } from 'next/server';
import { GET, maxDuration } from '@/app/api/dial/session/route';
import { db } from '@/db';
import { verifyDialSessionReadAccess } from '@/lib/middleware/dial-ownership';
import { isRoExDevKey, pollMixFinal, masterFinal } from '@/lib/roex';
import { ROEX_POLL_TIMEOUT_MS } from '@/lib/roex/client';
import { copyToR2, COPY_TIMEOUT_MS } from '@/lib/dial/r2-storage';
import { isUnchargedMasteringReservation } from '@/lib/dial/task-timeout';

const R2 = { r2Url: 'https://r2.example/download/sessions/s1/final.wav', expiresAt: new Date('2026-10-23T00:00:00Z') };

function session(taskType: string) {
  return {
    id: 's1',
    isFreeCampaign: false,
    masteringMode: null,
    tracks: [],
    messages: [],
    tasks: [{ id: 't1', sessionId: 's1', taskType, status: 'processing', roexTaskId: 'rx1', createdAt: new Date() }],
  };
}

/** Let every queued promise callback run, then run what the route handed to after(). */
async function settle() {
  await new Promise((r) => setTimeout(r, 0));
  for (const cb of afterCallbacks.splice(0)) await cb();
  await new Promise((r) => setTimeout(r, 0));
}

const r2Writes = () => executed.filter((w) => 'r2FinalUrl' in w.values);

describe('GET /api/dial/session — R2 copy of a deliverable completed by the inline poll', () => {
  beforeEach(() => {
    executed.length = 0;
    afterCallbacks.length = 0;
    vi.mocked(after).mockImplementation((cb: unknown) => {
      afterCallbacks.push(cb as () => unknown);
    });
    vi.mocked(db.update).mockImplementation(lazyUpdate as never);
    vi.mocked(verifyDialSessionReadAccess).mockResolvedValue({ session: {}, viaAdmin: false } as never);
    vi.mocked(isRoExDevKey).mockReturnValue(false);
    vi.mocked(isUnchargedMasteringReservation).mockReturnValue(false);
    vi.mocked(db.query.dialTracks.findMany).mockResolvedValue([] as never);
    vi.mocked(copyToR2).mockResolvedValue(R2);
  });

  it('control: the fake db records a write only when it is awaited (it is as lazy as Drizzle)', async () => {
    db.update({} as never).set({ built: true }).where(undefined as never);
    expect(executed).toHaveLength(0);
    await db.update({} as never).set({ awaited: true }).where(undefined as never);
    expect(executed).toEqual([{ values: { awaited: true } }]);
  });

  it.each(['final_basic', 'final_advanced', 'mix_check'])(
    'records r2FinalUrl + r2ExpiresAt when the poll completes a %s task',
    async (taskType) => {
      vi.mocked(db.query.dialSessions.findFirst).mockResolvedValue(session(taskType) as never);
      vi.mocked(pollMixFinal).mockResolvedValue({ finalUrl: 'https://gcs.example/final.wav', stemsUrl: null } as never);

      const res = await GET(new Request('https://mued.jp/api/dial/session?id=s1') as never);
      expect(res.status).toBe(200);
      await settle();

      expect(copyToR2).toHaveBeenCalledWith(
        expect.objectContaining({ sourceUrl: 'https://gcs.example/final.wav', sessionId: 's1', taskId: 't1', taskType }),
      );
      expect(r2Writes()).toEqual([{ values: { r2FinalUrl: R2.r2Url, r2ExpiresAt: R2.expiresAt } }]);
    },
  );

  it('records r2FinalUrl + r2ExpiresAt when the poll completes a mastering task', async () => {
    vi.mocked(db.query.dialSessions.findFirst).mockResolvedValue(session('mastering') as never);
    vi.mocked(masterFinal).mockResolvedValue({ finalUrl: 'https://gcs.example/master.wav' } as never);

    const res = await GET(new Request('https://mued.jp/api/dial/session?id=s1') as never);
    expect(res.status).toBe(200);
    await settle();

    expect(copyToR2).toHaveBeenCalledWith(
      expect.objectContaining({ sourceUrl: 'https://gcs.example/master.wav', taskId: 't1', taskType: 'mastering' }),
    );
    expect(r2Writes()).toEqual([{ values: { r2FinalUrl: R2.r2Url, r2ExpiresAt: R2.expiresAt } }]);
  });

  it('maxDuration covers the inline poll that runs before after() plus one R2 copy', () => {
    // maxDuration counts from the start of the invocation, not from after(). The inline poll runs
    // first — one RoEx call per processing task, in sequence, each capped at ROEX_POLL_TIMEOUT_MS —
    // and only then does after() start the copy (one attempt capped at COPY_TIMEOUT_MS). If the
    // budget is shorter than that sum, the copy is killed mid-way and leaves no row and no log.
    // Two polls: a session can have more than one task processing at once (e.g. mix_check + mastering).
    expect(ROEX_POLL_TIMEOUT_MS).toBeGreaterThan(0);
    expect(COPY_TIMEOUT_MS).toBeGreaterThan(0);
    expect(maxDuration * 1000).toBeGreaterThanOrEqual(2 * ROEX_POLL_TIMEOUT_MS + COPY_TIMEOUT_MS);
  });

  it('writes nothing to r2 columns when the copy fails (copyToR2 returns null)', async () => {
    vi.mocked(copyToR2).mockResolvedValue(null);
    vi.mocked(db.query.dialSessions.findFirst).mockResolvedValue(session('final_advanced') as never);
    vi.mocked(pollMixFinal).mockResolvedValue({ finalUrl: 'https://gcs.example/final.wav', stemsUrl: null } as never);

    const res = await GET(new Request('https://mued.jp/api/dial/session?id=s1') as never);
    expect(res.status).toBe(200);
    await settle();

    expect(copyToR2).toHaveBeenCalledTimes(1);
    expect(r2Writes()).toEqual([]);
  });
});
