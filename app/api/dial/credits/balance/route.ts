/**
 * MUEDial Credit Balance API
 * GET /api/dial/credits/balance
 *
 * Returns the user's current credit balance from:
 * 1. Subscription grants (with expiry dates, FIFO)
 * 2. Credit pack purchases (no expiry, no rollover)
 *
 * Requires Clerk authentication.
 */

import { and, eq, gt, or, isNull, inArray } from 'drizzle-orm';
import { withAuth } from '@/lib/middleware/with-auth';
import { apiSuccess, apiServerError } from '@/lib/api-response';
import { db } from '@/db';
import { dialSubscriptions, dialCreditExpiry, dialCreditPacks } from '@/db/schema/dial';

export const GET = withAuth(async ({ userId }) => {
  try {
    const now = new Date();

    // 1. Get active subscription
    const [subscription] = await db
      .select()
      .from(dialSubscriptions)
      .where(and(
        eq(dialSubscriptions.userId, userId),
        inArray(dialSubscriptions.status, ['active', 'trialing']),
      ))
      .limit(1);

    // 2. Get valid credit grants (subscription credits)
    //    expiresAt IS NULL = no expiry (active subscriber rollover)
    const creditGrants = subscription
      ? await db
          .select()
          .from(dialCreditExpiry)
          .where(and(
            eq(dialCreditExpiry.subscriptionId, subscription.id),
            gt(dialCreditExpiry.creditsRemaining, 0),
            or(isNull(dialCreditExpiry.expiresAt), gt(dialCreditExpiry.expiresAt, now)),
          ))
          .orderBy(dialCreditExpiry.expiresAt) // FIFO — earliest expiry first (nulls last)
      : [];

    const subscriptionCredits = creditGrants.reduce(
      (sum, g) => sum + g.creditsRemaining, 0
    );

    // 3. Get credit pack balances (completed, with remaining credits, not expired)
    const packs = await db
      .select()
      .from(dialCreditPacks)
      .where(and(
        eq(dialCreditPacks.userId, userId),
        eq(dialCreditPacks.status, 'completed'),
        gt(dialCreditPacks.creditsRemaining, 0),
        or(isNull(dialCreditPacks.expiresAt), gt(dialCreditPacks.expiresAt, now)),
      ));

    const packCredits = packs.reduce(
      (sum, p) => sum + p.creditsRemaining, 0
    );

    return apiSuccess({
      totalCredits: subscriptionCredits + packCredits,
      subscriptionCredits,
      packCredits,
      subscription: subscription ? {
        tier: subscription.tier,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      } : null,
      grants: creditGrants.map(g => ({
        id: g.id,
        credits: g.credits,
        creditsRemaining: g.creditsRemaining,
        grantedAt: g.grantedAt,
        expiresAt: g.expiresAt,
      })),
      packs: packs.map(p => ({
        id: p.id,
        credits: p.credits,
        creditsRemaining: p.creditsRemaining,
        packSize: p.packSize,
        completedAt: p.completedAt,
        expiresAt: p.expiresAt,
      })),
    });
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Failed to fetch credit balance');
  }
});
