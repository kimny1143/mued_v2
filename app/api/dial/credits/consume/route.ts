/**
 * MUEDial Credit Consume API
 * POST /api/dial/credits/consume
 *
 * Deducts credits for a dial operation.
 * Consumption order:
 *   1. Subscription grants — FIFO by expiry date (earliest first)
 *   2. Credit packs — FIFO by purchase date (earliest first)
 *
 * Requires Clerk authentication.
 */

import { z } from 'zod';
import { and, eq, gt, asc } from 'drizzle-orm';
import { withAuth } from '@/lib/middleware/with-auth';
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/api-response';
import { db } from '@/db';
import { dialCreditExpiry, dialCreditPacks, dialSubscriptions } from '@/db/schema/dial';
import { DIAL_CREDIT_COSTS, type DialCreditOperation } from '@/lib/dial/pricing';

const consumeSchema = z.object({
  operation: z.enum([
    'mix_diagnosis', 'audio_cleanup', 'omakase',
    'mastering', 'dialogue', 'dialogue_mastering',
  ] as const),
  sessionId: z.string().uuid().optional(), // For audit trail
});

export const POST = withAuth(async ({ userId, request }) => {
  try {
    const body = await request.json();
    const parsed = consumeSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError('Invalid request', parsed.error.errors);
    }

    const { operation } = parsed.data;
    const cost = DIAL_CREDIT_COSTS[operation as DialCreditOperation];
    const now = new Date();
    let remaining = cost;

    // Use a transaction to ensure atomicity
    const result = await db.transaction(async (tx) => {
      // 1. Get active subscription
      const [subscription] = await tx
        .select({ id: dialSubscriptions.id })
        .from(dialSubscriptions)
        .where(and(
          eq(dialSubscriptions.userId, userId),
          eq(dialSubscriptions.status, 'active'),
        ))
        .limit(1);

      // 2. Consume from subscription grants (FIFO by expiry)
      if (subscription && remaining > 0) {
        const grants = await tx
          .select()
          .from(dialCreditExpiry)
          .where(and(
            eq(dialCreditExpiry.subscriptionId, subscription.id),
            gt(dialCreditExpiry.creditsRemaining, 0),
            gt(dialCreditExpiry.expiresAt, now),
          ))
          .orderBy(asc(dialCreditExpiry.expiresAt));

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

      // 3. Consume from credit packs (FIFO by purchase date)
      if (remaining > 0) {
        const packs = await tx
          .select()
          .from(dialCreditPacks)
          .where(and(
            eq(dialCreditPacks.userId, userId),
            eq(dialCreditPacks.status, 'completed'),
            gt(dialCreditPacks.creditsRemaining, 0),
          ))
          .orderBy(asc(dialCreditPacks.completedAt));

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

      if (remaining > 0) {
        return { success: false, shortfall: remaining };
      }

      // 4. Update subscription's aggregate counter
      if (subscription) {
        const totalSubCredits = await tx
          .select()
          .from(dialCreditExpiry)
          .where(and(
            eq(dialCreditExpiry.subscriptionId, subscription.id),
            gt(dialCreditExpiry.creditsRemaining, 0),
            gt(dialCreditExpiry.expiresAt, now),
          ));

        const newRemaining = totalSubCredits.reduce(
          (sum, g) => sum + g.creditsRemaining, 0
        );

        await tx
          .update(dialSubscriptions)
          .set({
            mixCreditsRemaining: newRemaining,
            updatedAt: now,
          })
          .where(eq(dialSubscriptions.id, subscription.id));
      }

      return { success: true, shortfall: 0 };
    });

    if (!result.success) {
      return apiValidationError(
        `Insufficient credits. Need ${cost}cr, short by ${result.shortfall}cr.`,
        [{ path: ['credits'], message: `Insufficient credits` }]
      );
    }

    return apiSuccess({
      operation,
      creditsConsumed: cost,
    });
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Failed to consume credits');
  }
});
