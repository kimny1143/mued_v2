import { clerkClient } from '@clerk/nextjs/server';
import Stripe from 'stripe';
import { z } from 'zod';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { validateStripeConfig } from '@/lib/utils/env';
import { withAuth } from '@/lib/middleware/with-auth';
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/api-response';
import { logger } from '@/lib/utils/logger';

/**
 * POST /api/subscription/checkout
 *
 * Create a Stripe Checkout session for subscription purchase.
 * Accepts either { priceId, tier } (Web) or { tier } (iOS).
 * When priceId is omitted, it is resolved from NEXT_PUBLIC_STRIPE_PRICE_* env vars.
 */

// 環境変数の検証
const stripeConfig = validateStripeConfig();
const stripe = new Stripe(stripeConfig.secretKey, {
  apiVersion: '2025-08-27.basil',
});

// Tier → Stripe Price ID mapping (server-side resolution for mobile clients)
const TIER_PRICE_MAP: Record<string, string | undefined> = {
  basic: process.env.NEXT_PUBLIC_STRIPE_PRICE_BASIC,
  premium: process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM,
};

const checkoutSchema = z.object({
  priceId: z.string().min(1).optional(),
  tier: z.enum(['basic', 'premium']),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export const POST = withAuth(async ({ userId: clerkUserId, request }) => {
  try {
    logger.debug('[Checkout] ClerkUserId:', clerkUserId);

    // Parse and validate request
    const body = await request.json();
    logger.debug('[Checkout] Request body:', body);

    const validation = checkoutSchema.safeParse(body);
    if (!validation.success) {
      return apiValidationError('Invalid request', validation.error.errors);
    }

    const { tier, successUrl, cancelUrl } = validation.data;

    // Resolve priceId: use provided value or look up from tier
    const priceId = validation.data.priceId || TIER_PRICE_MAP[tier];
    if (!priceId) {
      logger.error('[Checkout] No priceId for tier:', tier);
      return apiValidationError(
        `Stripe price not configured for tier: ${tier}. Set NEXT_PUBLIC_STRIPE_PRICE_${tier.toUpperCase()} env var.`,
        []
      );
    }
    logger.debug('[Checkout] Parsed:', { priceId, tier, source: validation.data.priceId ? 'client' : 'server' });

    // Get user from database
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkUserId))
      .limit(1);

    logger.debug('[Checkout] User found:', user ? `ID: ${user.id}` : 'NOT FOUND');

    // If user doesn't exist, create them
    if (!user) {
      logger.debug('[Checkout] Creating user in database...');

      try {
        const client = await clerkClient();
        const clerkUser = await client.users.getUser(clerkUserId);

        const [newUser] = await db.insert(users).values({
          clerkId: clerkUserId,
          email: clerkUser.emailAddresses?.[0]?.emailAddress || clerkUser.username || 'unknown',
          name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || clerkUser.username || 'Unknown',
          profileImageUrl: clerkUser.imageUrl,
          role: 'student',
        }).returning();

        user = newUser;
        logger.debug('[Checkout] User created:', user.id);
      } catch (createError) {
        console.error('[Checkout] Error creating user:', createError);
        return apiServerError(
          createError instanceof Error ? createError : new Error('Failed to create user in database')
        );
      }
    }

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: user.name ?? undefined,
        metadata: {
          clerkId: clerkUserId,
          userId: user.id,
        },
      });

      customerId = customer.id;

      // Save customer ID to database
      await db
        .update(users)
        .set({ stripeCustomerId: customerId })
        .where(eq(users.id, user.id));
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription/success?tier=${tier}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription?canceled=true`,
      metadata: {
        clerkId: clerkUserId,
        userId: user.id,
        tier,
      },
      subscription_data: {
        metadata: {
          clerkId: clerkUserId,
          userId: user.id,
          tier,
        },
      },
    });

    return apiSuccess({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Subscription checkout error:', error);
    return apiServerError(
      error instanceof Error ? error : new Error('Subscription checkout failed')
    );
  }
});
