/**
 * MUEDial Subscription Checkout API
 * POST /api/dial/checkout/subscription
 *
 * Creates a Stripe Checkout Session for a monthly credit subscription.
 * Requires Clerk authentication (login required for subscriptions).
 */

import { z } from 'zod';
import Stripe from 'stripe';
import { withAuth } from '@/lib/middleware/with-auth';
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/api-response';
import { validateStripeConfig } from '@/lib/utils/env';
import { DIAL_SUB_PLANS, type DialSubTier } from '@/lib/dial/pricing';

const stripeConfig = validateStripeConfig();
const stripe = new Stripe(stripeConfig.secretKey, {
  apiVersion: '2025-08-27.basil',
});

const FALLBACK_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://mued.jp';

// Stripe Price IDs (configured in Stripe Dashboard)
const DIAL_SUB_PRICE_IDS: Record<DialSubTier, string> = {
  basic: process.env.STRIPE_DIAL_BASIC_PRICE_ID || '',
  pro: process.env.STRIPE_DIAL_PRO_PRICE_ID || '',
  studio: process.env.STRIPE_DIAL_STUDIO_PRICE_ID || '',
};

const subscriptionSchema = z.object({
  tier: z.enum(['basic', 'pro', 'studio']),
});

export const POST = withAuth(async ({ userId, request }) => {
  try {
    const body = await request.json();
    const parsed = subscriptionSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError('Invalid request', parsed.error.errors);
    }

    const { tier } = parsed.data;
    const plan = DIAL_SUB_PLANS[tier];
    const priceId = DIAL_SUB_PRICE_IDS[tier];

    if (!priceId) {
      return apiServerError('Subscription pricing not configured');
    }

    // Derive base URL from request origin (preserves subdomain for localStorage)
    const origin = request.headers.get('origin')
      || `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`
      || FALLBACK_URL;

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      metadata: {
        service: 'dial',
        purchaseType: 'subscription',
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
      // Collect address for tax classification (JP = domestic = tax-inclusive)
      billing_address_collection: 'required',
      success_url: `${origin}/dashboard?subscription=success`,
      cancel_url: `${origin}/dial/pricing?subscription=cancelled`,
    });

    return apiSuccess({ url: checkoutSession.url });
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Subscription checkout failed');
  }
});
