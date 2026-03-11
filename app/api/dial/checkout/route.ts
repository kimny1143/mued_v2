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

const MIX_PRICES: Record<string, { amountCents: number; label: string }> = {
  omakase: { amountCents: 1200, label: 'MUEDial Omakase Mix' },
  dialogue: { amountCents: 3500, label: 'MUEDial Dialogue Mix' },
};

const MASTERING_PRICES: Record<string, { amountCents: number; label: string }> = {
  omakase: { amountCents: 500, label: 'MUEDial Mastering' },
};

const FALLBACK_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://mued.jp';

// ─── Validation ─────────────────────────────────────────────────────────────

const checkoutSchema = z.object({
  mixType: z.enum(['omakase', 'dialogue']).nullable().optional(),
  masteringType: z.enum(['omakase']).nullable().optional(),
  email: z.string().email(),
  musicalStyle: z.string().optional(),
  title: z.string().optional(),
}).refine(
  (d) => d.mixType || d.masteringType,
  'At least one service must be selected',
);

// ─── POST Handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError('Invalid request', parsed.error.errors);
    }

    const { mixType, masteringType, email, musicalStyle, title } = parsed.data;

    // Try to resolve Clerk user (optional — not required)
    const clerkUserId = await resolveClerkUserId(request).catch(() => null);

    // Derive session mode: null when mastering-only (no mix purchased)
    const sessionMode = mixType ?? null;

    // Generate guest token (always — link to account later if logged in)
    const guestToken = randomBytes(32).toString('hex');
    const guestTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // ── Dev bypass: skip Stripe for allowed accounts ──
    const DEV_BYPASS_EMAILS = (process.env.DIAL_DEV_BYPASS_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean);
    if (DEV_BYPASS_EMAILS.includes(email)) {
      const [session] = await db.insert(dialSessions).values({
        userId: clerkUserId ?? undefined,
        mode: sessionMode ?? undefined,
        masteringMode: masteringType ?? undefined,
        musicalStyle: musicalStyle ?? 'other',
        title,
        guestEmail: email,
        guestToken,
        guestTokenExpiresAt,
        paymentStatus: 'paid',
        ...(sessionMode === 'omakase' ? {
          baseCycleLimit: 1,
          additionalCycleLimit: 0,
        } : {}),
      }).returning();

      const origin = request.headers.get('origin')
        || `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`
        || FALLBACK_URL;

      return apiSuccess({
        url: `${origin}/dial/session/${session.id}?payment=success`,
        sessionId: session.id,
        guestToken,
      });
    }

    // Build Stripe line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    if (mixType) {
      const mp = MIX_PRICES[mixType];
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: { name: mp.label, description: `MUEDial mixing service — ${mixType}` },
          unit_amount: mp.amountCents,
        },
        quantity: 1,
      });
    }
    if (masteringType) {
      const mp = MASTERING_PRICES[masteringType];
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: { name: mp.label, description: 'MUEDial mastering service' },
          unit_amount: mp.amountCents,
        },
        quantity: 1,
      });
    }

    const totalCents = lineItems.reduce((sum, li) => sum + (li.price_data?.unit_amount ?? 0), 0);

    // Create dial session + purchase(s) in a transaction
    const result = await db.transaction(async (tx) => {
      const [session] = await tx.insert(dialSessions).values({
        userId: clerkUserId ?? undefined,
        mode: sessionMode ?? undefined,
        masteringMode: masteringType ?? undefined,
        musicalStyle: musicalStyle ?? 'other',
        title,
        guestEmail: email,
        guestToken,
        guestTokenExpiresAt,
        paymentStatus: 'pending',
        ...(sessionMode === 'omakase' ? {
          baseCycleLimit: 1,
          additionalCycleLimit: 0,
        } : {}),
      }).returning();

      // Create separate purchase records for mix and mastering
      const purchases = [];
      if (mixType) {
        const [p] = await tx.insert(dialPurchases).values({
          sessionId: session.id,
          userId: clerkUserId ?? undefined,
          guestEmail: email,
          purchaseType: mixType,
          amountCents: MIX_PRICES[mixType].amountCents,
          currency: 'usd',
        }).returning();
        purchases.push(p);
      }
      if (masteringType) {
        const masteringPurchaseType = 'omakase_mastering';
        const [p] = await tx.insert(dialPurchases).values({
          sessionId: session.id,
          userId: clerkUserId ?? undefined,
          guestEmail: email,
          purchaseType: masteringPurchaseType as 'omakase_mastering' | 'mastering_dialogue',
          amountCents: MASTERING_PRICES[masteringType].amountCents,
          currency: 'usd',
        }).returning();
        purchases.push(p);
      }

      return { session, purchases };
    });

    // Derive base URL from request origin (preserves subdomain for localStorage)
    const origin = request.headers.get('origin')
      || `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`
      || FALLBACK_URL;

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      line_items: lineItems,
      metadata: {
        service: 'dial',
        mixType: mixType ?? '',
        masteringType: masteringType ?? '',
        dialSessionId: result.session.id,
        purchaseIds: result.purchases.map((p) => p.id).join(','),
        guestToken,
        totalCents: String(totalCents),
      },
      success_url: `${origin}/dial/session/${result.session.id}?payment=success`,
      cancel_url: `${origin}/dial?payment=cancelled`,
    });

    // Update session + purchases with Stripe checkout ID
    await db.transaction(async (tx) => {
      await tx.update(dialSessions)
        .set({ stripeCheckoutSessionId: checkoutSession.id })
        .where(eq(dialSessions.id, result.session.id));
      for (const p of result.purchases) {
        await tx.update(dialPurchases)
          .set({ stripeCheckoutSessionId: checkoutSession.id })
          .where(eq(dialPurchases.id, p.id));
      }
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
