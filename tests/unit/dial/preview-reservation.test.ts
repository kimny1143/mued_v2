/**
 * R4 (concurrency atomicity) — omakase preview-slot reservation.
 *
 * Guards the two subtle parts the conductor flagged:
 *  - RACE / cap boundary: the reserve is ONE conditional UPDATE (cap predicate in the WHERE +
 *    RETURNING), so Postgres serializes concurrent POSTs — at previewCount=4 exactly one reserve
 *    succeeds and the over-cap one matches 0 rows → reject. (No more stale read-then-write.)
 *  - REFUND on failure: a 0cr submit that throws AFTER the slot was reserved must give the slot
 *    back (GREATEST floors at 0 → idempotent / never negative), and the error must still propagate.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/db/schema', () => ({
  dialSessions: { id: 'id', previewCount: 'preview_count', mode: 'mode' },
}));
vi.mock('drizzle-orm', () => ({
  and: (...a: unknown[]) => ({ and: a }),
  eq: (a: unknown, b: unknown) => ({ eq: [a, b] }),
  sql: (strings: TemplateStringsArray) => ({ sql: strings.join('?') }),
}));

import {
  OMAKASE_PREVIEW_CAP,
  reservePreviewSlot,
  refundPreviewSlot,
  submitWithPreviewSlotRefund,
} from '@/lib/dial/preview-reservation';

// ── Mock tx (DbLike) ──────────────────────────────────────────────────────────
// reserve  path: update(t).set(s).where(w).returning(c)  → resolves rows[]
// refund   path: update(t).set(s).where(w)               → awaited (no .returning)

/** A reserve-style tx whose .returning() resolves to a queue of row-arrays (one per call). */
function makeReserveTx(rowQueue: Array<Array<{ previewCount: number }>>) {
  const captured: { setArg?: Record<string, unknown>; whereArg?: { and: unknown[] } } = {};
  let i = 0;
  const tx = {
    update: vi.fn(() => ({
      set: (arg: Record<string, unknown>) => {
        captured.setArg = arg;
        return {
          where: (warg: { and: unknown[] }) => {
            captured.whereArg = warg;
            return { returning: vi.fn(() => Promise.resolve(rowQueue[i++] ?? [])) };
          },
        };
      },
    })),
  };
  return { tx, captured };
}

/** A refund-style tx whose .where() resolves (no .returning). */
function makeRefundTx() {
  const captured: { setArg?: Record<string, unknown> } = {};
  const whereMock = vi.fn(() => Promise.resolve(undefined));
  const tx = {
    update: vi.fn(() => ({
      set: (arg: Record<string, unknown>) => {
        captured.setArg = arg;
        return { where: whereMock };
      },
    })),
  };
  return { tx, captured, whereMock };
}

describe('reservePreviewSlot — atomic cap + increment', () => {
  it('returns the new previewCount when the conditional UPDATE matched a row', async () => {
    const { tx } = makeReserveTx([[{ previewCount: 3 }]]);
    expect(await reservePreviewSlot(tx as never, 's1')).toBe(3);
  });

  it('returns null when 0 rows matched (omakase cap already reached → reject without submitting)', async () => {
    const { tx } = makeReserveTx([[]]);
    expect(await reservePreviewSlot(tx as never, 's1')).toBeNull();
  });

  it('cap boundary: two concurrent reserves at previewCount=4 → exactly one passes, the other 0-row rejects', async () => {
    // Simulates Postgres serializing the two UPDATEs on the row: the first matches `< 5` and
    // increments to 5; the second now sees 5, fails `< 5`, and matches 0 rows.
    const { tx } = makeReserveTx([[{ previewCount: 5 }], []]);
    expect(await reservePreviewSlot(tx as never, 's1')).toBe(5);   // winner
    expect(await reservePreviewSlot(tx as never, 's1')).toBeNull(); // over-cap loser, no bypass
  });

  it('is a SINGLE conditional UPDATE: cap predicate lives in the WHERE (not a read-then-write)', async () => {
    const { tx, captured } = makeReserveTx([[{ previewCount: 1 }]]);
    await reservePreviewSlot(tx as never, 's1');
    expect(tx.update).toHaveBeenCalledTimes(1);
    // increment in the SET, omakase cap predicate in the WHERE (NULL-safe IS DISTINCT FROM).
    expect((captured.setArg?.previewCount as { sql: string }).sql).toContain('+ 1');
    const pred = captured.whereArg?.and?.[1] as { sql: string };
    expect(pred.sql).toContain("IS DISTINCT FROM 'omakase'");
    expect(pred.sql).toContain('<');
    expect(OMAKASE_PREVIEW_CAP).toBe(5);
  });
});

describe('refundPreviewSlot — atomic decrement, floored at 0', () => {
  it('decrements via GREATEST(previewCount - 1, 0) so it can never go negative', async () => {
    const { tx, captured } = makeRefundTx();
    await refundPreviewSlot(tx as never, 's1');
    expect(tx.update).toHaveBeenCalledTimes(1);
    expect((captured.setArg?.previewCount as { sql: string }).sql).toContain('GREATEST');
    expect((captured.setArg?.previewCount as { sql: string }).sql).toContain('- 1, 0');
  });

  it('is idempotent: a second refund is just another floored decrement (no negative)', async () => {
    const { tx } = makeRefundTx();
    await refundPreviewSlot(tx as never, 's1');
    await refundPreviewSlot(tx as never, 's1');
    expect(tx.update).toHaveBeenCalledTimes(2); // GREATEST floor guarantees non-negative each time
  });
});

describe('submitWithPreviewSlotRefund — refund only on submit failure', () => {
  beforeEach(() => vi.clearAllMocks());

  it('submit succeeds → returns the result and does NOT refund', async () => {
    const { tx } = makeRefundTx();
    const result = await submitWithPreviewSlotRefund(tx as never, 's1', async () => ({ taskId: 'rx1' }));
    expect(result).toEqual({ taskId: 'rx1' });
    expect(tx.update).not.toHaveBeenCalled(); // no refund on success
  });

  it('submit throws → refunds the slot once and re-throws the original error', async () => {
    const { tx } = makeRefundTx();
    const boom = new Error('RoEx 500');
    await expect(
      submitWithPreviewSlotRefund(tx as never, 's1', async () => { throw boom; }),
    ).rejects.toBe(boom);
    expect(tx.update).toHaveBeenCalledTimes(1); // refund issued exactly once
  });
});
