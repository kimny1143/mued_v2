/**
 * Atomic omakase preview-slot reservation for the MUEDial preview route.
 *
 * The preview POST used to (1) read `session.previewCount`, (2) check `< 5`, (3) submit to RoEx,
 * (4) write `previewCount + 1` from the STALE read. Two concurrent POSTs could both read 4, both
 * pass `< 5`, and both submit — a lost-update that bypasses the omakase 5-preview cap. Preview
 * submit is 0cr (free at RoEx), so the bypass costs no credits, but it lets a session exceed its
 * product limit (extra free previews).
 *
 * reservePreviewSlot folds the check+increment into ONE conditional UPDATE: Postgres serializes
 * concurrent UPDATEs on the same row, so the cap holds exactly (two POSTs at previewCount=4 → one
 * updates to 5, the other now sees 5, fails `< 5`, and matches 0 rows → reject). This mirrors the
 * reserve-before-charge pattern already proven for the paid cycle in app/api/dial/final/route.ts.
 *
 * Kept DB-bound but isolated here (not inline in the route) so the reserve/refund logic is
 * unit-testable, like advanceDialSessionState in session-state-write.ts.
 */
import { and, eq, sql } from 'drizzle-orm';
import { dialSessions } from '@/db/schema';

/** Drizzle transaction or db handle (mirrors session-state-write.ts DbLike). */
type DbLike = {
  update: typeof import('@/db').db.update;
};

/** The omakase product cap: 5 previews per session. Dialogue / mastering-only have no preview cap. */
export const OMAKASE_PREVIEW_CAP = 5;

/**
 * Atomically reserve a preview slot. ONE conditional UPDATE enforces the omakase cap AND consumes
 * the slot. Returns the NEW previewCount when reserved, or `null` when the omakase cap already
 * blocked it (the caller MUST reject without submitting to RoEx). Non-omakase modes (dialogue, or
 * NULL mode = mastering-only) have no preview cap and always reserve — `IS DISTINCT FROM` keeps the
 * NULL-mode case un-capped, matching the prior `session.mode === 'omakase'` JS check.
 *
 * Touches ONLY previewCount — session.status is set separately by the caller after a successful
 * submit, so a reject (0 rows) or a refund never has to unwind a status change.
 */
export async function reservePreviewSlot(tx: DbLike, sessionId: string): Promise<number | null> {
  const reserved = await tx
    .update(dialSessions)
    .set({ previewCount: sql`${dialSessions.previewCount} + 1`, updatedAt: new Date() })
    .where(
      and(
        eq(dialSessions.id, sessionId),
        sql`(${dialSessions.mode} IS DISTINCT FROM 'omakase' OR ${dialSessions.previewCount} < ${OMAKASE_PREVIEW_CAP})`,
      ),
    )
    .returning({ previewCount: dialSessions.previewCount });
  return reserved.length > 0 ? reserved[0].previewCount : null;
}

/**
 * Refund a reserved preview slot — atomic decrement floored at 0. Called when the RoEx submit
 * fails AFTER reservePreviewSlot succeeded. Preview submit is 0cr, so (unlike a paid final, which
 * KEEPS its cycle to avoid a re-submit double-charge) refunding is correct here: there is no charge
 * to double, and NOT refunding would wrongly burn a free preview and mis-report the cap. GREATEST
 * floors at 0 so a double-refund or a concurrent reconcile can never drive previewCount negative.
 */
export async function refundPreviewSlot(tx: DbLike, sessionId: string): Promise<void> {
  await tx
    .update(dialSessions)
    .set({ previewCount: sql`GREATEST(${dialSessions.previewCount} - 1, 0)`, updatedAt: new Date() })
    .where(eq(dialSessions.id, sessionId));
}

/**
 * Run the (0cr) preview submit with a slot already reserved; refund the slot if it throws. Keeps
 * the reserve→submit→refund-on-failure ordering in one unit-testable place — a submit failure must
 * give the free slot back (it was never charged), and the original error still propagates so the
 * route reports the failure to the user.
 */
export async function submitWithPreviewSlotRefund<T>(
  tx: DbLike,
  sessionId: string,
  submit: () => Promise<T>,
): Promise<T> {
  try {
    return await submit();
  } catch (err) {
    await refundPreviewSlot(tx, sessionId);
    throw err;
  }
}
