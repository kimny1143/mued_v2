import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import Stripe from 'stripe';
import { z } from 'zod';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * POST /api/subscription/checkout
 *
 * Create a Stripe Checkout session for subscription purchase
 */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

const checkoutSchema = z.object({
  priceId: z.string().min(1),
  tier: z.enum(['starter', 'basic', 'premium']),
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId: clerkUserId } = await auth();
    console.log('[Checkout] ClerkUserId:', clerkUserId);

    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request
    const body = await request.json();
    console.log('[Checkout] Request body:', body);

    const { priceId, tier } = checkoutSchema.parse(body);
    console.log('[Checkout] Parsed:', { priceId, tier });

    // Get user from database
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkUserId))
      .limit(1);

    console.log('[Checkout] User found:', user ? `ID: ${user.id}` : 'NOT FOUND');

    // If user doesn't exist, create them
    if (!user) {
      console.log('[Checkout] Creating user in database...');

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
        console.log('[Checkout] User created:', user.id);
      } catch (createError) {
        console.error('[Checkout] Error creating user:', createError);
        return NextResponse.json({
          success: false,
          error: 'Failed to create user in database',
        }, { status: 500 });
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
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription?canceled=true`,
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

    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Subscription checkout error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
