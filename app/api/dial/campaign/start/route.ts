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
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { users, dialSessions } from '@/db/schema';
import { apiSuccess, apiValidationError, apiError, apiServerError } from '@/lib/api-response';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { evaluateFreeCampaignEligibility, FREE_CAMPAIGN_SESSION } from '@/lib/dial/free-campaign';
import { markFreeCampaignGrantUsed } from '@/lib/storage/dial-free-campaign-grant';
import { recordDialEvent } from '@/lib/analytics/dial-events';
import { logger } from '@/lib/utils/logger';

const startSchema = z.object({
  // Genre is chosen in-session (Hoo sets it via chat); default 'other' like /checkout.
  musicalStyle: z.string().min(1).max(40).optional(),
  title: z.string().max(200).optional(),
});

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

    // Server-side re-check: kill-switch / cap / audience / lifetime-1(email Blob).
    const elig = await evaluateFreeCampaignEligibility({ signedIn: true, email });
    if (!elig.eligible) {
      return apiError('Not eligible for the free campaign.', {
        code: `INELIGIBLE_${elig.reason.toUpperCase()}`,
        status: 403,
        details: { reason: elig.reason, remaining: elig.remaining },
      });
    }

    // Authoritative lifetime-1 by userId (strongest for signed-in users).
    const existing = await db
      .select({ id: dialSessions.id })
      .from(dialSessions)
      .where(and(eq(dialSessions.userId, userId), eq(dialSessions.isFreeCampaign, true)))
      .limit(1);
    if (existing.length > 0) {
      return apiError('Free campaign already claimed.', {
        code: 'INELIGIBLE_ALREADY_GRANTED',
        status: 403,
        details: { reason: 'already_granted', remaining: elig.remaining },
      });
    }

    const guestToken = randomBytes(32).toString('hex');
    const [session] = await db.insert(dialSessions).values({
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
