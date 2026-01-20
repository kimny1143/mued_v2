import Stripe from 'stripe';
import { z } from 'zod';
import { validateStripeConfig } from '@/lib/utils/env';
import { withAuth } from '@/lib/middleware/with-auth';
import { apiSuccess, apiValidationError, apiServerError, apiNotFound } from '@/lib/api-response';
import { subscriptionRepository } from '@/lib/repositories/subscriptions.repository';
import { logger } from '@/lib/utils/logger';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/subscription/cancel
 *
 * Cancel an active subscription at period end
 */

const stripeConfig = validateStripeConfig();
const stripe = new Stripe(stripeConfig.secretKey, {
  apiVersion: '2025-08-27.basil',
});

const cancelSchema = z.object({
  reason: z.string().optional(),
  comment: z.string().optional(),
});

export const POST = withAuth(async ({ userId: clerkUserId, request }) => {
  try {
    logger.debug('[Cancel] ClerkUserId:', clerkUserId);

    // Parse request body
    const body = await request.json();
    const validation = cancelSchema.safeParse(body);
    if (!validation.success) {
      return apiValidationError('Invalid request', validation.error.errors);
    }

    const { reason, comment } = validation.data;

    // Get user from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkUserId))
      .limit(1);

    if (!user) {
      return apiNotFound('User not found');
    }

    // Get active subscription
    const subscription = await subscriptionRepository.findActiveByUserId(user.id);
    if (!subscription) {
      return apiNotFound('No active subscription found');
    }

    let periodEnd: number | undefined;

    // Cancel via Stripe if subscription ID exists
    if (subscription.stripeSubscriptionId) {
      const stripeSubscription = await stripe.subscriptions.update(
        subscription.stripeSubscriptionId,
        {
          cancel_at_period_end: true,
          metadata: {
            cancelReason: reason || 'not_specified',
            cancelComment: comment || '',
            canceledAt: new Date().toISOString(),
          },
        }
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      periodEnd = (stripeSubscription as any).current_period_end as number | undefined;
    } else {
      // No Stripe ID - just update database (dev/test scenario)
      logger.warn('[Cancel] No Stripe subscription ID, updating DB only', {
        subscriptionId: subscription.id,
      });
    }

    // Update database
    await subscriptionRepository.update(subscription.id, {
      cancelAtPeriodEnd: true,
    });

    // Log cancellation for analytics
    logger.info('[Cancel] Subscription cancelled', {
      userId: user.id,
      subscriptionId: subscription.id,
      reason,
      comment,
      cancelAt: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    });

    return apiSuccess({
      cancelAt: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : subscription.currentPeriodEnd?.toISOString() ?? null,
    });
  } catch (error) {
    console.error('Subscription cancel error:', error);
    return apiServerError(
      error instanceof Error ? error : new Error('Subscription cancellation failed')
    );
  }
});
