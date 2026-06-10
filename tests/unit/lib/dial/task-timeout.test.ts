/**
 * MUEDial backstop + failure-reconcile unit tests.
 * Guards the generous wall-clock backstops (zero-false-fail) and the race-safe failure
 * reconcile (never clobbers a completed task; reconciles session.status + previewCount).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock db + schema + drizzle so the pure functions and the reconcile helper run off a real DB.
vi.mock('@/db', () => ({
  db: {
    update: vi.fn(),
    query: {
      dialSessions: { findFirst: vi.fn() },
      dialTasks: { findMany: vi.fn(), findFirst: vi.fn() },
    },
  },
}));
vi.mock('@/db/schema', () => ({
  dialTasks: { id: 'id', taskType: 'task_type', sessionId: 'session_id', status: 'status', finalUrl: 'final_url' },
  dialSessions: { id: 'id', previewCount: 'preview_count', status: 'status' },
}));
vi.mock('drizzle-orm', () => ({
  and: (...a: unknown[]) => ({ and: a }),
  eq: (a: unknown, b: unknown) => ({ eq: [a, b] }),
  ne: (a: unknown, b: unknown) => ({ ne: [a, b] }),
  inArray: (a: unknown, b: unknown) => ({ inArray: [a, b] }),
  sql: (strings: TemplateStringsArray) => ({ sql: strings.join('?') }),
}));

import {
  DIAL_BACKSTOP_MS,
  getDialBackstopMs,
  isDialTaskPastBackstop,
  deriveRevertSessionStatus,
  markDialTaskFailedWithReconcile,
  isUnchargedMasteringReservation,
} from '@/lib/dial/task-timeout';
import { db } from '@/db';
import { dialTasks } from '@/db/schema';

describe('DIAL_BACKSTOP_MS — generous, above observed prod max', () => {
  it('every backstop sits well above the observed completion max', () => {
    // Observed prod max (min): preview 19.0, final_advanced 33.9, mastering_preview 15.2.
    expect(DIAL_BACKSTOP_MS.preview).toBeGreaterThan(19 * 60_000);
    expect(DIAL_BACKSTOP_MS.final_advanced).toBeGreaterThan(34 * 60_000);
    expect(DIAL_BACKSTOP_MS.final_basic).toBeGreaterThan(34 * 60_000);
    expect(DIAL_BACKSTOP_MS.mastering_preview).toBeGreaterThan(15.2 * 60_000);
  });
});

describe('getDialBackstopMs', () => {
  it('returns the per-type backstop', () => {
    expect(getDialBackstopMs('preview')).toBe(DIAL_BACKSTOP_MS.preview);
    expect(getDialBackstopMs('mastering')).toBe(DIAL_BACKSTOP_MS.mastering);
  });
  it('falls back to a generous default for unknown types', () => {
    expect(getDialBackstopMs('nope')).toBeGreaterThanOrEqual(60 * 60_000);
  });
});

describe('isDialTaskPastBackstop', () => {
  const now = 1_700_000_000_000;
  it('a healthy 18-min preview is NOT past the 60-min backstop (no false fail)', () => {
    expect(isDialTaskPastBackstop(new Date(now - 18 * 60_000), 'preview', now)).toBe(false);
  });
  it('a 70-min preview IS past the 60-min backstop', () => {
    expect(isDialTaskPastBackstop(new Date(now - 70 * 60_000), 'preview', now)).toBe(true);
  });
  it('a 30-min final is NOT past the 120-min backstop (heavy-final margin)', () => {
    expect(isDialTaskPastBackstop(new Date(now - 30 * 60_000), 'final_advanced', now)).toBe(false);
  });
  it('accepts an ISO string', () => {
    expect(isDialTaskPastBackstop(new Date(now - 70 * 60_000).toISOString(), 'preview', now)).toBe(true);
  });
});

describe('deriveRevertSessionStatus', () => {
  it('preview-fail → uploading (no prior preview) / previewing (has one)', () => {
    expect(deriveRevertSessionStatus('preview', [])).toBe('uploading');
    expect(deriveRevertSessionStatus('preview', [{ taskType: 'preview', status: 'completed', hasFinal: false }])).toBe('previewing');
  });
  it('final/mix_check-fail → previewing', () => {
    expect(deriveRevertSessionStatus('final_basic', [])).toBe('previewing');
    expect(deriveRevertSessionStatus('final_advanced', [])).toBe('previewing');
    expect(deriveRevertSessionStatus('mix_check', [])).toBe('previewing');
  });
  it('mastering-fail keeps a delivered mix completed (no downgrade)', () => {
    const withFinal = [{ taskType: 'final_basic', status: 'completed', hasFinal: true }];
    expect(deriveRevertSessionStatus('mastering', withFinal)).toBe('completed');
    expect(deriveRevertSessionStatus('mastering_preview', withFinal)).toBe('completed');
  });
  it('mastering-fail with no final → previewing (has preview) / uploading', () => {
    expect(deriveRevertSessionStatus('mastering', [{ taskType: 'preview', status: 'completed', hasFinal: false }])).toBe('previewing');
    expect(deriveRevertSessionStatus('mastering', [])).toBe('uploading');
  });
});

describe('isUnchargedMasteringReservation — poll/webhook paths must skip reserved rows', () => {
  it('is true for a mastering row with empty roexTaskId (reserved, pre-charge)', () => {
    expect(isUnchargedMasteringReservation({ taskType: 'mastering', roexTaskId: '' })).toBe(true);
  });

  it('is true for a mastering row with null roexTaskId', () => {
    expect(isUnchargedMasteringReservation({ taskType: 'mastering', roexTaskId: null })).toBe(true);
  });

  it('is false once the charge wrote a real roexTaskId (now pollable)', () => {
    expect(isUnchargedMasteringReservation({ taskType: 'mastering', roexTaskId: 'roex-master-123' })).toBe(false);
  });

  it('is false for non-mastering tasks even with empty roexTaskId (final never uses the sentinel)', () => {
    expect(isUnchargedMasteringReservation({ taskType: 'final_advanced', roexTaskId: '' })).toBe(false);
    expect(isUnchargedMasteringReservation({ taskType: 'preview', roexTaskId: '' })).toBe(false);
  });
});

describe('markDialTaskFailedWithReconcile', () => {
  const returning = vi.fn();
  const sessionWhere = vi.fn().mockResolvedValue(undefined);
  let sessionSetArg: Record<string, unknown> | null;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionSetArg = null;
    sessionWhere.mockResolvedValue(undefined);
    // db.update(dialTasks) → ...returning(); db.update(dialSessions) → captures set() then where().
    vi.mocked(db.update).mockImplementation((table: unknown) => {
      if (table === dialTasks) {
        return { set: () => ({ where: () => ({ returning }) }) } as never;
      }
      return {
        set: (arg: Record<string, unknown>) => { sessionSetArg = arg; return { where: sessionWhere }; },
      } as never;
    });
  });

  it('0-row guard: an already-completed task is NOT failed and touches nothing else', async () => {
    returning.mockResolvedValue([]); // active-flip matched nothing
    vi.mocked(db.query.dialTasks.findFirst).mockResolvedValue({ id: 't1', status: 'completed', taskType: 'preview', sessionId: 's1' } as never);
    const res = await markDialTaskFailedWithReconcile('t1', 'late');
    expect(res).toEqual({ failed: false });
    expect(db.query.dialSessions.findFirst).not.toHaveBeenCalled();
    expect(sessionWhere).not.toHaveBeenCalled();
    expect(sessionSetArg).toBeNull();
  });

  it('re-runnable: an already-FAILED task re-reconciles the session WITHOUT a 2nd previewCount refund', async () => {
    returning.mockResolvedValue([]); // active-flip matched nothing (already failed)
    vi.mocked(db.query.dialTasks.findFirst).mockResolvedValue({ id: 't9', status: 'failed', taskType: 'preview', sessionId: 's9' } as never);
    vi.mocked(db.query.dialSessions.findFirst).mockResolvedValue({ id: 's9', status: 'previewing', mode: 'omakase', previewCount: 1 } as never);
    vi.mocked(db.query.dialTasks.findMany).mockResolvedValue([] as never);

    const res = await markDialTaskFailedWithReconcile('t9');
    expect(res).toEqual({ failed: true });
    expect(sessionWhere).toHaveBeenCalledTimes(1); // session reconcile re-ran
    expect(sessionSetArg?.status).toBe('uploading'); // revert applied
    expect(sessionSetArg?.previewCount).toBeUndefined(); // NO second refund on a re-run
  });

  it('flips a preview, reverts session, and restores an omakase preview slot', async () => {
    returning.mockResolvedValue([{ id: 't1', taskType: 'preview', sessionId: 's1' }]);
    vi.mocked(db.query.dialSessions.findFirst).mockResolvedValue({ id: 's1', status: 'previewing', mode: 'omakase', previewCount: 4 } as never);
    vi.mocked(db.query.dialTasks.findMany).mockResolvedValue([] as never);

    const res = await markDialTaskFailedWithReconcile('t1', 'timeout');
    expect(res).toEqual({ failed: true });
    expect(sessionWhere).toHaveBeenCalledTimes(1);
    // preview fail, no prior completed preview → revert to 'uploading'
    expect(sessionSetArg?.status).toBe('uploading');
    // omakase preview slot restored (GREATEST sql expression present)
    expect(sessionSetArg?.previewCount).toBeDefined();
  });

  it('does NOT restore previewCount for a dialogue preview fail', async () => {
    returning.mockResolvedValue([{ id: 't2', taskType: 'preview', sessionId: 's2' }]);
    vi.mocked(db.query.dialSessions.findFirst).mockResolvedValue({ id: 's2', status: 'previewing', mode: 'dialogue', previewCount: 2 } as never);
    vi.mocked(db.query.dialTasks.findMany).mockResolvedValue([] as never);
    const res = await markDialTaskFailedWithReconcile('t2');
    expect(res).toEqual({ failed: true });
    expect(sessionSetArg?.previewCount).toBeUndefined();
  });

  it('does not downgrade an already-completed session (mastering fail with delivered mix)', async () => {
    returning.mockResolvedValue([{ id: 't3', taskType: 'mastering', sessionId: 's3' }]);
    vi.mocked(db.query.dialSessions.findFirst).mockResolvedValue({ id: 's3', status: 'completed', mode: 'omakase', previewCount: 1 } as never);
    vi.mocked(db.query.dialTasks.findMany).mockResolvedValue([{ taskType: 'final_basic', status: 'completed', finalUrl: 'x' }] as never);
    const res = await markDialTaskFailedWithReconcile('t3');
    expect(res).toEqual({ failed: true });
    // session already 'completed' → status NOT changed (no downgrade)
    expect(sessionSetArg?.status).toBeUndefined();
  });
});
