/**
 * Atomic advisory-slot claim for the free 60-min 壁打ち booking.
 *
 * A booking must claim one curated `advisory_slots` row without ever letting two concurrent
 * bookings take the same slot. claimAdvisorySlot folds the check ("is this slot still open?") and
 * the write ("mark it booked by this inquiry") into ONE conditional UPDATE: Postgres serializes
 * concurrent UPDATEs on the same row, so at most one booking matches `status='open'` and the loser
 * matches 0 rows → the route rejects it (slot just taken). This mirrors the proven
 * reserve-before-charge / preview-reservation pattern (lib/dial/preview-reservation.ts), kept in an
 * isolated, unit-testable module rather than inline in the route.
 *
 * There is no capacity counter (each slot is a single 1:1 session), so the guard is simply the
 * status transition open → booked.
 */
import { and, eq } from "drizzle-orm";
import { advisorySlots } from "@/db/schema";

/** Drizzle transaction or db handle (mirrors preview-reservation.ts DbLike). */
type DbLike = {
  update: typeof import("@/db").db.update;
};

/**
 * Atomically claim `slotId` for `inquiryId`. ONE conditional UPDATE flips the slot open → booked
 * only if it is still open. Returns `true` when this booking won the slot, or `false` when the slot
 * was already booked/closed (0 rows matched → the caller MUST reject the booking, e.g. roll back the
 * inquiry row in the same transaction). No capacity math: a slot is a single session.
 */
export async function claimAdvisorySlot(
  tx: DbLike,
  slotId: string,
  inquiryId: string,
): Promise<boolean> {
  const claimed = await tx
    .update(advisorySlots)
    .set({ status: "booked", inquiryId, updatedAt: new Date() })
    .where(and(eq(advisorySlots.id, slotId), eq(advisorySlots.status, "open")))
    .returning({ id: advisorySlots.id });
  return claimed.length > 0;
}

/**
 * Release a claimed slot back to open (cancellation, or rollback if a later step in the booking
 * fails outside the DB transaction). Only re-opens a slot that is currently booked BY this inquiry,
 * so a stale/duplicate release can never re-open a slot another booking already holds.
 */
export async function releaseAdvisorySlot(
  tx: DbLike,
  slotId: string,
  inquiryId: string,
): Promise<void> {
  await tx
    .update(advisorySlots)
    .set({ status: "open", inquiryId: null, updatedAt: new Date() })
    .where(
      and(
        eq(advisorySlots.id, slotId),
        eq(advisorySlots.status, "booked"),
        eq(advisorySlots.inquiryId, inquiryId),
      ),
    );
}
