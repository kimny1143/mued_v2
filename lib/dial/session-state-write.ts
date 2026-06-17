/**
 * DB write helper for the MUEDial session state machine (Tier3 Phase 1b — write-side).
 *
 * Kept out of lib/dial/session-state.ts (which is pure / DB-free) so the transition graph stays
 * unit-testable. Route lifecycle points (preview / mix_check / final / mastering render) call
 * advanceDialSessionState to keep `dial_sessions.state` current as rendering progresses.
 *
 * Forward-only & atomic: the `dial_session_state` enum is defined in workflow order
 * (uploading < previewing < mix_review < mix_final < mastering_review < mastered_final < settling
 * < delivered), so the Postgres enum comparison `state < $to` IS the "is this a forward move?"
 * check. A single conditional UPDATE advances the state iff `$to` is strictly forward — a late or
 * duplicate task event (e.g. a webhook arriving after the user already advanced) is a no-op and
 * can never regress the state. Backward moves (rollback) and the settle/deliver branch are
 * decision-driven (Phase 2/3), not lifecycle writes.
 */
import { and, eq, sql } from 'drizzle-orm';
import { dialSessions } from '@/db/schema';
import type { DialState } from './session-state';

/** Drizzle transaction or db handle. */
type DbLike = {
  update: typeof import('@/db').db.update;
};

/**
 * Advance dial_sessions.state to `to` iff that is strictly forward of the current state (atomic,
 * forward-only). Returns nothing; a non-forward target is a silent no-op by design (idempotent
 * under retries / out-of-order task events).
 */
export async function advanceDialSessionState(
  tx: DbLike,
  sessionId: string,
  to: DialState,
): Promise<void> {
  await tx
    .update(dialSessions)
    .set({ state: to, updatedAt: new Date() })
    .where(
      and(
        eq(dialSessions.id, sessionId),
        sql`${dialSessions.state} < ${to}::dial_session_state`,
      ),
    );
}
