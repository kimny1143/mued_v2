import Stripe from 'stripe';
import { validateStripeConfig } from '@/lib/utils/env';
import { withAuth } from '@/lib/middleware/with-auth';
import { apiSuccess, apiServerError, apiNotFound, apiError } from '@/lib/api-response';
import { subscriptionRepository } from '@/lib/repositories/subscriptions.repository';
import { logger } from '@/lib/utils/logger';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/subscription/reactivate
 *
 * Reactivate a subscription that was scheduled to cancel
 */

const stripeConfig = validateStripeConfig();
const stripe = new Stripe(stripeConfig.secretKey, {
  apiVersion: '2025-08-27.basil',
});

export const POST = withAuth(async ({ userId: clerkUserId }) => {
  try {
    logger.debug('[Reactivate] ClerkUserId:', clerkUserId);

    // Get user from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkUserId))
      .limit(1);

    if (!user) {
      return apiNotFound('User not found');
    }

    // Get subscription (even if scheduled to cancel)
    const subscription = await subscriptionRepository.findByUserId(user.id);
    if (!subscription) {
      return apiNotFound('No subscription found');
    }

    if (subscription.status !== 'active') {
      return apiError('Subscription is not active', { status: 400 });
    }

    if (!subscription.cancelAtPeriodEnd) {
      return apiError('Subscription is not scheduled for cancellation', { status: 400 });
    }

    // Reactivate via Stripe if subscription ID exists
    if (subscription.stripeSubscriptionId) {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: false,
      });
    } else {
      // No Stripe ID - just update database (dev/test scenario)
      logger.warn('[Reactivate] No Stripe subscription ID, updating DB only', {
        subscriptionId: subscription.id,
      });
    }

    // Update database
    await subscriptionRepository.reactivate(subscription.id);

    logger.info('[Reactivate] Subscription reactivated', {
      userId: user.id,
      subscriptionId: subscription.id,
    });

    return apiSuccess({ reactivated: true });
  } catch (error) {
    console.error('Subscription reactivate error:', error);
    return apiServerError(
      error instanceof Error ? error : new Error('Subscription reactivation failed')
    );
  }
});
