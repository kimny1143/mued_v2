/**
 * MUEDial Additional Cycle Purchase API
 * POST /api/dial/checkout/additional
 *
 * Purchases one additional retake cycle ($10) for an existing session.
 * Requires session ownership (withDialAuth).
 *
 * Flow:
 *   1. Client → POST { sessionId }
 *   2. Server → verifies ownership + additional limit not exceeded
 *   3. Server → creates dial_purchase (additional_cycle, pending)
 *   4. Server → creates Stripe Checkout Session (mode: payment)
 *   5. Returns { url }
 *   6. Stripe webhook → increments additionalCyclesPurchased
 */

import { z } from 'zod';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';
import { withDialAuth } from '@/lib/middleware/with-dial-auth';
import { verifyDialSessionOwnership } from '@/lib/middleware/dial-ownership';
import { apiSuccess, apiValidationError, apiServerError, apiNotFound, apiError } from '@/lib/api-response';
import { validateStripeConfig } from '@/lib/utils/env';
import { db } from '@/db';
import { dialPurchases } from '@/db/schema';

const stripeConfig = validateStripeConfig();
const stripe = new Stripe(stripeConfig.secretKey, {
  apiVersion: '2025-08-27.basil',
});

const FALLBACK_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://mued.jp';

const ADDITIONAL_CYCLE_CENTS = 1000; // $10

const additionalSchema = z.object({
  sessionId: z.string().uuid(),
});

export const POST = withDialAuth(async (auth) => {
  try {
    const body = await auth.request.json();
    const parsed = additionalSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError('Invalid request', parsed.error.errors);
    }

    const { sessionId } = parsed.data;

    // Verify session ownership
    const session = await verifyDialSessionOwnership(sessionId, auth);
    if (!session) {
      return apiNotFound('Session not found');
    }

    // Check additional cycle limit
    if (session.additionalCyclesPurchased >= session.additionalCycleLimit) {
      return apiError('Additional cycle limit reached', {
        code: 'ADDITIONAL_CYCLE_LIMIT',
        status: 400,
        details: {
          additionalCyclesPurchased: session.additionalCyclesPurchased,
          additionalCycleLimit: session.additionalCycleLimit,
        },
      });
    }

    // Create purchase record
    const [purchase] = await db.insert(dialPurchases).values({
      sessionId,
      userId: auth.userId ?? undefined,
      guestEmail: session.guestEmail,
      purchaseType: 'additional_cycle',
      amountCents: ADDITIONAL_CYCLE_CENTS,
      currency: 'usd',
    }).returning();

    // Derive base URL from request origin (preserves subdomain for localStorage)
    const origin = auth.request.headers.get('origin')
      || `${auth.request.headers.get('x-forwarded-proto') || 'https'}://${auth.request.headers.get('host')}`
      || FALLBACK_URL;

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: session.guestEmail ?? undefined,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'MUEDial Additional Retake Cycle',
            description: 'One additional mix adjustment cycle',
          },
          unit_amount: ADDITIONAL_CYCLE_CENTS,
        },
        quantity: 1,
      }],
      metadata: {
        service: 'dial',
        purchaseType: 'additional_cycle',
        dialSessionId: sessionId,
        purchaseId: purchase.id,
      },
      success_url: `${origin}/dial/session/${sessionId}?additional=success`,
      cancel_url: `${origin}/dial/session/${sessionId}?additional=cancelled`,
    });

    // Save Stripe checkout ID on purchase
    await db.update(dialPurchases)
      .set({ stripeCheckoutSessionId: checkoutSession.id })
      .where(eq(dialPurchases.id, purchase.id));

    return apiSuccess({ url: checkoutSession.url });
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Additional cycle checkout failed');
  }
});
