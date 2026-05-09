/**
 * MUEDial Credit Consume API
 * POST /api/dial/credits/consume
 *
 * Deducts credits for a dial operation.
 * Consumption order:
 *   1. Subscription grants — FIFO by expiry date (earliest first)
 *   2. Credit packs — FIFO by purchase date (earliest first)
 *
 * Uses SELECT FOR UPDATE to prevent double-consumption on concurrent requests.
 * Throws inside transaction to rollback on insufficient credits.
 *
 * Requires Clerk authentication.
 */

import { z } from 'zod';
import { and, eq, gt, asc, sql, or, isNull } from 'drizzle-orm';
import { withAuth } from '@/lib/middleware/with-auth';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { apiSuccess, apiValidationError, apiServerError, apiError } from '@/lib/api-response';
import { db } from '@/db';
import { users } from '@/db/schema';
import { dialCreditExpiry, dialCreditPacks, dialSubscriptions } from '@/db/schema/dial';
import { DIAL_CREDIT_COSTS, type DialCreditOperation } from '@/lib/dial/pricing';
import { checkWaitlistEmailExists } from '@/lib/storage/waitlist-blob';
import { checkMixDiagnosisFreeUsed, markMixDiagnosisFreeUsed } from '@/lib/storage/mix-diagnosis-free';
import { logger } from '@/lib/utils/logger';

class InsufficientCreditsError extends Error {
  constructor(public cost: number, public shortfall: number) {
    super(`Insufficient credits. Need ${cost}cr, short by ${shortfall}cr.`);
  }
}

const consumeSchema = z.object({
  operation: z.enum([
    'mix_diagnosis', 'audio_cleanup', 'omakase',
    'mastering', 'dialogue', 'dialogue_mastering',
  ] as const),
  sessionId: z.string().uuid().optional(), // For audit trail
});

export const POST = withAuth(async ({ userId, request }) => {
  const rateLimitResponse = await rateLimit(request, "research");
  if (rateLimitResponse) return rateLimitResponse;

  let operation: z.infer<typeof consumeSchema>['operation'] | undefined;
  try {
    const body = await request.json();
    const parsed = consumeSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError('Invalid request', parsed.error.errors);
    }

    operation = parsed.data.operation;
    const cost = DIAL_CREDIT_COSTS[operation as DialCreditOperation];
    const now = new Date();

    // Transaction with rollback on insufficient credits
    await db.transaction(async (tx) => {
      let remaining = cost;

      // 1. Get active subscription
      const [subscription] = await tx
        .select({ id: dialSubscriptions.id })
        .from(dialSubscriptions)
        .where(and(
          eq(dialSubscriptions.userId, userId),
          eq(dialSubscriptions.status, 'active'),
        ))
        .limit(1);

      // 2. Consume from subscription grants (FIFO by expiry, with row lock)
      //    expiresAt IS NULL = no expiry (active subscriber rollover)
      if (subscription && remaining > 0) {
        const grants = await tx
          .select()
          .from(dialCreditExpiry)
          .where(and(
            eq(dialCreditExpiry.subscriptionId, subscription.id),
            gt(dialCreditExpiry.creditsRemaining, 0),
            or(isNull(dialCreditExpiry.expiresAt), gt(dialCreditExpiry.expiresAt, now)),
          ))
          .orderBy(asc(dialCreditExpiry.expiresAt))
          .for('update');

        for (const grant of grants) {
          if (remaining <= 0) break;
          const deduct = Math.min(remaining, grant.creditsRemaining);
          await tx
            .update(dialCreditExpiry)
            .set({ creditsRemaining: grant.creditsRemaining - deduct })
            .where(eq(dialCreditExpiry.id, grant.id));
          remaining -= deduct;
        }
      }

      // 3. Consume from credit packs (FIFO by purchase date, with row lock)
      //    expiresAt IS NULL = legacy pack (no expiry); non-null = 12-month expiry
      if (remaining > 0) {
        const packs = await tx
          .select()
          .from(dialCreditPacks)
          .where(and(
            eq(dialCreditPacks.userId, userId),
            eq(dialCreditPacks.status, 'completed'),
            gt(dialCreditPacks.creditsRemaining, 0),
            or(isNull(dialCreditPacks.expiresAt), gt(dialCreditPacks.expiresAt, now)),
          ))
          .orderBy(asc(dialCreditPacks.completedAt))
          .for('update');

        for (const pack of packs) {
          if (remaining <= 0) break;
          const deduct = Math.min(remaining, pack.creditsRemaining);
          await tx
            .update(dialCreditPacks)
            .set({ creditsRemaining: pack.creditsRemaining - deduct })
            .where(eq(dialCreditPacks.id, pack.id));
          remaining -= deduct;
        }
      }

      // Insufficient credits — throw to rollback entire transaction
      if (remaining > 0) {
        throw new InsufficientCreditsError(cost, remaining);
      }

      // 4. Update subscription's aggregate counter
      if (subscription) {
        const totalSubCredits = await tx
          .select({ cr: sql<number>`COALESCE(SUM(${dialCreditExpiry.creditsRemaining}), 0)` })
          .from(dialCreditExpiry)
          .where(and(
            eq(dialCreditExpiry.subscriptionId, subscription.id),
            gt(dialCreditExpiry.creditsRemaining, 0),
            or(isNull(dialCreditExpiry.expiresAt), gt(dialCreditExpiry.expiresAt, now)),
          ));

        await tx
          .update(dialSubscriptions)
          .set({
            mixCreditsRemaining: totalSubCredits[0]?.cr ?? 0,
            updatedAt: now,
          })
          .where(eq(dialSubscriptions.id, subscription.id));
      }
    });

    return apiSuccess({
      operation,
      creditsConsumed: cost,
    });
  } catch (error) {
    if (error instanceof InsufficientCreditsError && operation === 'mix_diagnosis') {
      try {
        const [userRecord] = await db
          .select({ email: users.email })
          .from(users)
          .where(eq(users.clerkId, userId))
          .limit(1);
        const email = userRecord?.email;
        if (email) {
          const isWaitlisted = await checkWaitlistEmailExists(email);
          if (!isWaitlisted) {
            return apiError('Mix diagnosis requires waitlist registration.', {
              code: 'WAITLIST_REQUIRED',
              status: 403,
            });
          }
          const freeUsed = await checkMixDiagnosisFreeUsed(email);
          if (!freeUsed) {
            markMixDiagnosisFreeUsed(email).catch((err) =>
              logger.error('[credits/consume] mix_diagnosis free trial mark failed', { error: err, email })
            );
            return apiSuccess({ operation: 'mix_diagnosis', creditsConsumed: 0, freeTrial: true });
          }
          return apiValidationError(
            'Mix diagnosis free trial already used. Please subscribe or purchase credits.',
            [{ path: ['credits'], message: 'Free trial exhausted. Subscribe to Hoo Pass or buy credits.' }]
          );
        }
      } catch (blobErr) {
        logger.error('[credits/consume] mix_diagnosis free trial check failed', { error: blobErr, userId });
      }
    }
    if (error instanceof InsufficientCreditsError) {
      return apiValidationError(
        error.message,
        [{ path: ['credits'], message: `Need ${error.cost}cr, short by ${error.shortfall}cr` }]
      );
    }
    return apiServerError(error instanceof Error ? error.message : 'Failed to consume credits');
  }
});
