/**
 * MUEDial Credit Pack Checkout API
 * POST /api/dial/checkout/credit-pack
 *
 * Creates a Stripe Checkout Session for a one-time credit pack purchase.
 * Overage credits are consumed immediately and do not roll over.
 * Requires Clerk authentication.
 */

import { z } from 'zod';
import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { withAuth } from '@/lib/middleware/with-auth';
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/api-response';
import { validateStripeConfig } from '@/lib/utils/env';
import { DIAL_CREDIT_PACKS, type DialCreditPackSize } from '@/lib/dial/pricing';
import { db } from '@/db';
import { dialCreditPacks } from '@/db/schema/dial';

const stripeConfig = validateStripeConfig();
const stripe = new Stripe(stripeConfig.secretKey, {
  apiVersion: '2025-08-27.basil',
});

const FALLBACK_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://mued.jp';

const CREDIT_PACK_PRICE_IDS: Record<DialCreditPackSize, string> = {
  small: (process.env.STRIPE_DIAL_CREDIT_SMALL_PRICE_ID || '').trim(),
  large: (process.env.STRIPE_DIAL_CREDIT_LARGE_PRICE_ID || '').trim(),
};

const creditPackSchema = z.object({
  packSize: z.enum(['small', 'large']),
  utmSource: z.string().max(50).optional(),
  utmMedium: z.string().max(50).optional(),
  utmCampaign: z.string().max(100).optional(),
});

export const POST = withAuth(async ({ userId, request }) => {
  try {
    const body = await request.json();
    const parsed = creditPackSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError('Invalid request', parsed.error.errors);
    }

    const { packSize, utmSource, utmMedium, utmCampaign } = parsed.data;
    const pack = DIAL_CREDIT_PACKS[packSize];
    const priceId = CREDIT_PACK_PRICE_IDS[packSize];

    if (!priceId) {
      return apiServerError('Credit pack pricing not configured');
    }

    // Create DB record first (status: pending)
    const [creditPack] = await db
      .insert(dialCreditPacks)
      .values({
        userId,
        packSize,
        credits: pack.credits,
        creditsRemaining: pack.credits,
        amountCents: pack.priceUsdCents,
        currency: 'usd',
        status: 'pending',
      })
      .returning({ id: dialCreditPacks.id });

    const origin = request.headers.get('origin')
      || `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`
      || FALLBACK_URL;

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      metadata: {
        service: 'dial',
        purchaseType: 'credit_pack',
        packSize,
        creditPackId: creditPack.id,
        userId,
        credits: pack.credits.toString(),
        ...(utmSource && { utm_source: utmSource }),
        ...(utmMedium && { utm_medium: utmMedium }),
        ...(utmCampaign && { utm_campaign: utmCampaign }),
      },
      billing_address_collection: 'required',
      success_url: `${origin}/dashboard?credit_pack=success`,
      cancel_url: `${origin}/dial/pricing?credit_pack=cancelled`,
    });

    // Store Stripe session ID
    await db
      .update(dialCreditPacks)
      .set({ stripeCheckoutSessionId: checkoutSession.id })
      .where(eq(dialCreditPacks.id, creditPack.id));

    return apiSuccess({ url: checkoutSession.url, creditPackId: creditPack.id });
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Credit pack checkout failed');
  }
});
