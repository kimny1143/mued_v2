/**
 * MUEDial comp (free redo) — admin grants ONE free retake cycle on a session.
 *
 * Exceptional support remedy (not a default freebie). The grant:
 *   - additionalCyclesPurchased +1 — the field the cycle gate actually reads
 *     (totalCycleLimit = baseCycleLimit + additionalCyclesPurchased, see
 *     app/api/dial/final/route.ts), so the user gets one more USABLE paid cycle for free.
 *   - additionalCycleLimit +1 — so the free comp does NOT eat the user's paid-purchase headroom
 *     (additionalCycleLimit only caps how many extra cycles may be PURCHASED).
 * (Granting additionalCycleLimit alone would unlock nothing usable — only raise the purchase cap.)
 *
 * Bounded SERVER-SIDE: per-session lifetime-1 (dial_comp_ledger unique index) + admin daily cap
 * (COMP_DAILY_CAP in a rolling 24h window). Every grant is recorded in dial_comp_ledger for audit
 * (admin, session, estimated RoEx cr, reason). Tier 3 — credit/cost surface, admin-only.
 */
import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from '@/db';
import { dialSessions, dialCompLedger } from '@/db/schema';
import { DIAL_CREDIT_COSTS } from './pricing';

/** Max comps a single admin may grant per rolling 24h window (kimny gate 2026-06-09). */
export const COMP_DAILY_CAP = 3;
export const COMP_TYPE = 'retake_cycle';

// Stable key for pg_advisory_xact_lock — serializes concurrent comp grants so the daily-cap and
// per-session checks are atomic (the lock is released at transaction end).
const COMP_LOCK_KEY = 4926082;

export type CompGrantReason = 'session_not_found' | 'already_comped' | 'daily_cap_reached';

export class CompGrantError extends Error {
  constructor(public reason: CompGrantReason, public detail?: Record<string, unknown>) {
    super(reason);
    this.name = 'CompGrantError';
  }
}

/**
 * Estimate the RoEx cr cost of one comped retake cycle, for audit/ledger visibility (NOT a billing
 * figure). A retake re-runs the paid final (+ mastering if the session masters). Ranges ≈220–530cr;
 * cf. free-campaign roexCrEstimate ≈ 480.
 */
export function estimateCompCr(session: { mode: string | null; masteringMode: string | null }): number {
  // dialogue final ≈ 250cr (final_advanced); omakase final = DIAL_CREDIT_COSTS.omakase (300cr).
  const finalCr = session.mode === 'dialogue' ? 250 : session.mode === 'omakase' ? DIAL_CREDIT_COSTS.omakase : 0;
  const masterCr = session.masteringMode ? DIAL_CREDIT_COSTS.mastering : 0; // 220cr
  // Fallback to mastering cost for mastering-only sessions (no mix mode).
  return finalCr + masterCr || DIAL_CREDIT_COSTS.mastering;
}

/** Postgres unique_violation (23505) — the per-session unique index tripped on a concurrent grant. */
function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const code = (err as { code?: string }).code;
  const causeCode = (err as { cause?: { code?: string } }).cause?.code;
  return code === '23505' || causeCode === '23505'
    || (err instanceof Error && /duplicate key value|unique constraint/i.test(err.message));
}

export interface CompGrantInput {
  adminUserId: string;
  adminEmail: string;
  sessionId: string;
  reason?: string | null;
}

/**
 * Atomically grant one free retake cycle on `sessionId`. Throws CompGrantError on
 * session-not-found / already-comped / daily-cap-reached. Returns the ledger row on success.
 */
export async function grantComp(input: CompGrantInput): Promise<typeof dialCompLedger.$inferSelect> {
  return db.transaction(async (tx) => {
    // Serialize concurrent grants so the cap + per-session checks are atomic.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${COMP_LOCK_KEY})`);

    const session = await tx.query.dialSessions.findFirst({
      where: eq(dialSessions.id, input.sessionId),
    });
    if (!session) {
      throw new CompGrantError('session_not_found');
    }

    // Per-session lifetime-1 (the unique index is the final backstop below).
    const existing = await tx
      .select({ id: dialCompLedger.id })
      .from(dialCompLedger)
      .where(eq(dialCompLedger.sessionId, input.sessionId))
      .limit(1);
    if (existing.length > 0) {
      throw new CompGrantError('already_comped');
    }

    // Admin daily cap (rolling 24h window — strict reading of "3/day", timezone-agnostic).
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [capRow] = await tx
      .select({ count: sql<number>`count(*)` })
      .from(dialCompLedger)
      .where(and(eq(dialCompLedger.adminUserId, input.adminUserId), gte(dialCompLedger.grantedAt, since)));
    const usedToday = Number(capRow?.count ?? 0);
    if (usedToday >= COMP_DAILY_CAP) {
      throw new CompGrantError('daily_cap_reached', { usedToday, cap: COMP_DAILY_CAP });
    }

    // Grant one free USABLE retake cycle (see file header for why both fields are bumped).
    await tx
      .update(dialSessions)
      .set({
        additionalCyclesPurchased: sql`${dialSessions.additionalCyclesPurchased} + 1`,
        additionalCycleLimit: sql`${dialSessions.additionalCycleLimit} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(dialSessions.id, input.sessionId));

    const estimatedCr = estimateCompCr(session);
    try {
      const [row] = await tx
        .insert(dialCompLedger)
        .values({
          adminUserId: input.adminUserId,
          adminEmail: input.adminEmail,
          sessionId: input.sessionId,
          compType: COMP_TYPE,
          estimatedCr,
          reason: input.reason ?? null,
        })
        .returning();
      return row;
    } catch (insErr) {
      if (isUniqueViolation(insErr)) {
        // Lost the race on the per-session unique index — treat as already comped.
        throw new CompGrantError('already_comped');
      }
      throw insErr;
    }
  });
}
