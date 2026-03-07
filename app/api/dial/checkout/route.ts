/**
 * MUEDial Checkout API — One-time purchase (public endpoint)
 * POST /api/dial/checkout
 *
 * Creates a Stripe Checkout Session for a single mix purchase.
 * No authentication required — guests can purchase with email.
 *
 * Flow:
 *   1. Client → POST { purchaseType, email, musicalStyle?, title? }
 *   2. Server → creates dial_session + dial_purchase (pending)
 *   3. Server → creates Stripe Checkout Session (mode: payment)
 *   4. Returns { url, sessionId, guestToken }
 *   5. Client redirects to Stripe → Webhook completes purchase
 */

import { randomBytes } from 'crypto';
import { z } from 'zod';
import Stripe from 'stripe';
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/api-response';
import { resolveClerkUserId } from '@/lib/middleware/with-auth';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { dialSessions, dialPurchases } from '@/db/schema';
import { validateStripeConfig } from '@/lib/utils/env';
import { NextRequest } from 'next/server';

const stripeConfig = validateStripeConfig();
const stripe = new Stripe(stripeConfig.secretKey, {
  apiVersion: '2025-08-27.basil',
});

// ─── Price mapping (cents) ──────────────────────────────────────────────────

const DIAL_PRICES: Record<string, { amountCents: number; label: string }> = {
  omakase: { amountCents: 1200, label: 'MUEDial Omakase Mix' },
  dialogue: { amountCents: 3500, label: 'MUEDial Dialogue Mix' },
  dialogue_mastering: { amountCents: 4200, label: 'MUEDial Dialogue + Mastering' },
  fx_sheet: { amountCents: 500, label: 'MUEDial FX Sheet' },
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://mued.jp';

// ─── Validation ─────────────────────────────────────────────────────────────

const checkoutSchema = z.object({
  purchaseType: z.enum(['omakase', 'dialogue', 'dialogue_mastering', 'fx_sheet']),
  email: z.string().email(),
  musicalStyle: z.string().optional(),
  title: z.string().optional(),
  mode: z.enum(['omakase', 'dialogue']).optional(),
});

// ─── POST Handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError('Invalid request', parsed.error.errors);
    }

    const { purchaseType, email, musicalStyle, title, mode } = parsed.data;
    const price = DIAL_PRICES[purchaseType];

    // Try to resolve Clerk user (optional — not required)
    const clerkUserId = await resolveClerkUserId(request).catch(() => null);

    // Derive session mode from purchaseType if not explicitly provided
    const sessionMode = mode ?? (purchaseType === 'omakase' ? 'omakase' : 'dialogue');

    // Generate guest token (always — link to account later if logged in)
    const guestToken = randomBytes(32).toString('hex');
    const guestTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Create dial session + purchase in a transaction
    const result = await db.transaction(async (tx) => {
      const [session] = await tx.insert(dialSessions).values({
        userId: clerkUserId ?? undefined,
        mode: sessionMode,
        musicalStyle: musicalStyle ?? 'pop',
        title,
        guestEmail: email,
        guestToken,
        guestTokenExpiresAt,
        paymentStatus: 'pending',
      }).returning();

      const [purchase] = await tx.insert(dialPurchases).values({
        sessionId: session.id,
        userId: clerkUserId ?? undefined,
        guestEmail: email,
        purchaseType,
        amountCents: price.amountCents,
        currency: 'usd',
      }).returning();

      return { session, purchase };
    });

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: price.label,
            description: `MUEDial mixing service — ${purchaseType}`,
          },
          unit_amount: price.amountCents,
        },
        quantity: 1,
      }],
      metadata: {
        service: 'dial',
        purchaseType,
        dialSessionId: result.session.id,
        purchaseId: result.purchase.id,
        guestToken,
      },
      success_url: `${APP_URL}/dial/session/${result.session.id}?payment=success`,
      cancel_url: `${APP_URL}/dial?payment=cancelled`,
    });

    // Update session with Stripe checkout ID
    await db.transaction(async (tx) => {
      await tx.update(dialSessions)
        .set({ stripeCheckoutSessionId: checkoutSession.id })
        .where(eq(dialSessions.id, result.session.id));
      await tx.update(dialPurchases)
        .set({ stripeCheckoutSessionId: checkoutSession.id })
        .where(eq(dialPurchases.id, result.purchase.id));
    });

    return apiSuccess({
      url: checkoutSession.url,
      sessionId: result.session.id,
      guestToken,
    });
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Checkout failed');
  }
}
