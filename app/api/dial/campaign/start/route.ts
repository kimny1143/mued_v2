/**
 * MUEDial First-Run Free Campaign — claim a grant.
 * POST /api/dial/campaign/start  { musicalStyle, title? }
 *
 * Creates a Stripe-bypass `paymentStatus: 'paid'` dialogue+mastering session for an
 * eligible signed-in user (mirrors the admin-bypass in /api/dial/checkout). The
 * session is RoEx-pool funded and bounded by baseCycleLimit=1 + is_free_campaign
 * (reference-track disabled, stems-off). Server-side re-checks all eligibility —
 * never trusts the client.
 *
 * Lifetime-1 is enforced two ways: an authoritative DB check (this userId already has
 * an is_free_campaign session) plus the email-keyed Blob flag (kept for status display
 * + cross-session consistency). The grant count cap is the global ceiling.
 *
 * Kill-switch DEFAULT OFF — when DIAL_FREE_CAMPAIGN_ENABLED is not 'true', start 403s.
 */
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { users, dialSessions } from '@/db/schema';
import { apiSuccess, apiValidationError, apiError, apiServerError } from '@/lib/api-response';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { evaluateFreeCampaignEligibility, FREE_CAMPAIGN_SESSION, getFreeCampaignCap } from '@/lib/dial/free-campaign';
import { markFreeCampaignGrantUsed } from '@/lib/storage/dial-free-campaign-grant';
import { recordDialEvent } from '@/lib/analytics/dial-events';
import { logger } from '@/lib/utils/logger';

const startSchema = z.object({
  // Genre is chosen in-session (Hoo sets it via chat); default 'other' like /checkout.
  musicalStyle: z.string().min(1).max(40).optional(),
  title: z.string().max(200).optional(),
});

// Stable key for pg_advisory_xact_lock — serializes all concurrent grant attempts so the
// cap check and lifetime-1 check are atomic (the lock is released at transaction end).
const FREE_CAMPAIGN_LOCK_KEY = 4926081;

/** Distinguishes the two race-loser outcomes inside the grant transaction. */
class CampaignGrantError extends Error {
  constructor(public reason: 'cap_reached' | 'already_granted', public remaining: number) {
    super(reason);
  }
}

/** Postgres unique_violation (23505) — the partial unique index tripped on a concurrent claim. */
function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const code = (err as { code?: string }).code;
  const causeCode = (err as { cause?: { code?: string } }).cause?.code;
  return code === '23505' || causeCode === '23505'
    || (err instanceof Error && /duplicate key value|unique constraint/i.test(err.message));
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit (mutation, creates a session)
    const rateLimitResponse = await rateLimit(request, 'strict');
    if (rateLimitResponse) return rateLimitResponse;

    const { userId } = await auth();
    if (!userId) {
      return apiError('Sign in required to claim the free campaign.', { code: 'NOT_SIGNED_IN', status: 401 });
    }

    const body = await request.json();
    const parsed = startSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError('Invalid request', parsed.error.errors);
    }

    const [rec] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);
    const email = rec?.email ?? null;

    // Pre-check (fast fail, non-atomic): kill-switch / signed-in / email / audience /
    // email-Blob lifetime-1 / cap-for-display. The authoritative cap + userId lifetime-1
    // are re-checked atomically under an advisory lock below.
    const elig = await evaluateFreeCampaignEligibility({ signedIn: true, email });
    if (!elig.eligible) {
      return apiError('Not eligible for the free campaign.', {
        code: `INELIGIBLE_${elig.reason.toUpperCase()}`,
        status: 403,
        details: { reason: elig.reason, remaining: elig.remaining },
      });
    }

    const cap = getFreeCampaignCap();
    const guestToken = randomBytes(32).toString('hex');

    // Atomic grant: advisory lock serializes concurrent claims so cap is never exceeded
    // and a single user can never get two grants (partial unique index is the final backstop).
    let session: typeof dialSessions.$inferSelect;
    try {
      session = await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(${FREE_CAMPAIGN_LOCK_KEY})`);

        const [capRow] = await tx
          .select({ count: sql<number>`count(*)` })
          .from(dialSessions)
          .where(eq(dialSessions.isFreeCampaign, true));
        const used = Number(capRow?.count ?? 0);
        if (used >= cap) {
          throw new CampaignGrantError('cap_reached', 0);
        }

        const existing = await tx
          .select({ id: dialSessions.id })
          .from(dialSessions)
          .where(and(eq(dialSessions.userId, userId), eq(dialSessions.isFreeCampaign, true)))
          .limit(1);
        if (existing.length > 0) {
          throw new CampaignGrantError('already_granted', Math.max(0, cap - used));
        }

        try {
          const [row] = await tx.insert(dialSessions).values({
            userId,
            mode: FREE_CAMPAIGN_SESSION.mode,
            masteringMode: FREE_CAMPAIGN_SESSION.masteringMode,
            musicalStyle: parsed.data.musicalStyle ?? 'other',
            title: parsed.data.title,
            guestEmail: email ?? undefined,
            guestToken,
            guestTokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            paymentStatus: 'paid',
            baseCycleLimit: FREE_CAMPAIGN_SESSION.baseCycleLimit,
            additionalCycleLimit: FREE_CAMPAIGN_SESSION.additionalCycleLimit,
            isFreeCampaign: true,
          }).returning();
          return row;
        } catch (insErr) {
          if (isUniqueViolation(insErr)) {
            throw new CampaignGrantError('already_granted', Math.max(0, cap - used));
          }
          throw insErr;
        }
      });
    } catch (txErr) {
      if (txErr instanceof CampaignGrantError) {
        return apiError(
          txErr.reason === 'cap_reached' ? 'Free campaign is full.' : 'Free campaign already claimed.',
          { code: `INELIGIBLE_${txErr.reason.toUpperCase()}`, status: 403, details: { reason: txErr.reason, remaining: txErr.remaining } },
        );
      }
      throw txErr;
    }

    // Durably mark the email-keyed lifetime-1 flag (await so re-claim probes see it).
    if (email) {
      try {
        await markFreeCampaignGrantUsed(email);
      } catch (err) {
        // Non-fatal: the is_free_campaign session row + userId guard already enforce lifetime-1.
        logger.error('[campaign/start] grant mark failed', { error: err, userId });
      }
    }

    recordDialEvent({
      sessionId: session.id,
      eventType: 'free_campaign_start',
      userId,
      guestToken,
      mode: FREE_CAMPAIGN_SESSION.mode,
      metadata: { remaining_before: elig.remaining },
    });

    return apiSuccess({ sessionId: session.id, guestToken });
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Failed to start free campaign session');
  }
}
