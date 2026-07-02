/**
 * Advisory #8 — atomic slot claim for the free 60-min 壁打ち booking.
 *
 * Guards the two subtle parts:
 *  - RACE: the claim is ONE conditional UPDATE (status='open' predicate in the WHERE + RETURNING),
 *    so Postgres serializes concurrent bookings — exactly one flips open→booked, the other matches
 *    0 rows → reject (slot just taken). No stale read-then-write.
 *  - RELEASE: re-opens a slot ONLY when it is still booked by THIS inquiry (id + status + inquiry_id
 *    in the WHERE), so a stale/duplicate release can never steal a slot another booking now holds.
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("@/db/schema", () => ({
  advisorySlots: { id: "id", status: "status", inquiryId: "inquiry_id" },
}));
vi.mock("drizzle-orm", () => ({
  and: (...a: unknown[]) => ({ and: a }),
  eq: (a: unknown, b: unknown) => ({ eq: [a, b] }),
}));

import { claimAdvisorySlot, releaseAdvisorySlot } from "@/lib/advisory/slot-reservation";

/** A claim-style tx whose .returning() resolves to a queue of row-arrays (one per call). */
function makeClaimTx(rowQueue: Array<Array<{ id: string }>>) {
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

/** A release-style tx whose .where() resolves (no .returning). */
function makeReleaseTx() {
  const captured: { setArg?: Record<string, unknown>; whereArg?: { and: unknown[] } } = {};
  const whereMock = vi.fn((warg: { and: unknown[] }) => {
    captured.whereArg = warg;
    return Promise.resolve(undefined);
  });
  const tx = {
    update: vi.fn(() => ({
      set: (arg: Record<string, unknown>) => {
        captured.setArg = arg;
        return { where: whereMock };
      },
    })),
  };
  return { tx, captured };
}

describe("claimAdvisorySlot — atomic open→booked", () => {
  it("returns true when the conditional UPDATE matched the open slot", async () => {
    const { tx } = makeClaimTx([[{ id: "slot-1" }]]);
    expect(await claimAdvisorySlot(tx as never, "slot-1", "inq-1")).toBe(true);
  });

  it("returns false when 0 rows matched (slot already booked/closed → reject the booking)", async () => {
    const { tx } = makeClaimTx([[]]);
    expect(await claimAdvisorySlot(tx as never, "slot-1", "inq-1")).toBe(false);
  });

  it("race: two concurrent claims on one open slot → exactly one wins, the other 0-row rejects", async () => {
    // Postgres serializes the two UPDATEs on the row: the first matches status='open' and books it;
    // the second now sees status='booked', matches 0 rows.
    const { tx } = makeClaimTx([[{ id: "slot-1" }], []]);
    expect(await claimAdvisorySlot(tx as never, "slot-1", "inq-1")).toBe(true); // winner
    expect(await claimAdvisorySlot(tx as never, "slot-1", "inq-2")).toBe(false); // loser, no double-book
  });

  it("is a SINGLE conditional UPDATE: the open-guard lives in the WHERE, and SET marks it booked by this inquiry", async () => {
    const { tx, captured } = makeClaimTx([[{ id: "slot-1" }]]);
    await claimAdvisorySlot(tx as never, "slot-1", "inq-1");
    expect(tx.update).toHaveBeenCalledTimes(1);
    expect(captured.setArg?.status).toBe("booked");
    expect(captured.setArg?.inquiryId).toBe("inq-1");
    // WHERE = and(eq(id, slot), eq(status, 'open')) — the open predicate is the race guard.
    const guards = captured.whereArg?.and as Array<{ eq: unknown[] }>;
    expect(guards.some((g) => g.eq?.[1] === "open")).toBe(true);
  });
});

describe("releaseAdvisorySlot — re-open only if still booked by this inquiry", () => {
  it("scopes the WHERE to id + status='booked' + this inquiry_id (can't steal another booking's slot)", async () => {
    const { tx, captured } = makeReleaseTx();
    await releaseAdvisorySlot(tx as never, "slot-1", "inq-1");
    expect(tx.update).toHaveBeenCalledTimes(1);
    expect(captured.setArg?.status).toBe("open");
    expect(captured.setArg?.inquiryId).toBeNull();
    const guards = captured.whereArg?.and as Array<{ eq: unknown[] }>;
    expect(guards.some((g) => g.eq?.[1] === "booked")).toBe(true); // only re-open a booked slot
    expect(guards.some((g) => g.eq?.[1] === "inq-1")).toBe(true); // owned by this inquiry
  });
});
