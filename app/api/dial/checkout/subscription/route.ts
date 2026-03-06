/**
 * MUEDial Subscription Checkout API
 * POST /api/dial/checkout/subscription
 *
 * Creates a Stripe Checkout Session for a monthly mix credit pack.
 * Requires Clerk authentication (login required for subscriptions).
 */

import { z } from 'zod';
import Stripe from 'stripe';
import { withAuth } from '@/lib/middleware/with-auth';
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/api-response';
import { validateStripeConfig } from '@/lib/utils/env';

const stripeConfig = validateStripeConfig();
const stripe = new Stripe(stripeConfig.secretKey, {
  apiVersion: '2025-08-27.basil',
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://mued.jp';

// Stripe Price IDs (configured in Stripe Dashboard)
const DIAL_SUB_PRICES: Record<string, { priceId: string; label: string; credits: number }> = {
  monthly_5: {
    priceId: process.env.STRIPE_DIAL_MONTHLY_5_PRICE_ID || '',
    label: 'MUEDial Monthly 5 Mix Pack',
    credits: 5,
  },
  studio_15: {
    priceId: process.env.STRIPE_DIAL_STUDIO_15_PRICE_ID || '',
    label: 'MUEDial Studio 15 Mix Pack',
    credits: 15,
  },
};

const subscriptionSchema = z.object({
  tier: z.enum(['monthly_5', 'studio_15']),
});

export const POST = withAuth(async ({ userId, request }) => {
  try {
    const body = await request.json();
    const parsed = subscriptionSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError('Invalid request', parsed.error.errors);
    }

    const { tier } = parsed.data;
    const plan = DIAL_SUB_PRICES[tier];

    if (!plan.priceId) {
      return apiServerError('Subscription pricing not configured');
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{
        price: plan.priceId,
        quantity: 1,
      }],
      metadata: {
        service: 'dial',
        tier,
        userId,
        credits: plan.credits.toString(),
      },
      subscription_data: {
        metadata: {
          service: 'dial',
          tier,
          userId,
          credits: plan.credits.toString(),
        },
      },
      success_url: `${APP_URL}/dial/dashboard?subscription=success`,
      cancel_url: `${APP_URL}/dial/pricing?subscription=cancelled`,
    });

    return apiSuccess({ url: checkoutSession.url });
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Subscription checkout failed');
  }
});
