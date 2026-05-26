/**
 * MUEDial Subscription Status API
 * GET /api/dial/subscription/status
 *
 * Returns whether the authenticated user has an active Hoo Pass subscription.
 * Used by the pricing page to conditionally show the subscribe button.
 *
 * Returns 200 { subscribed: false } for unauthenticated requests (no 401),
 * so the pricing page can use this endpoint unconditionally without
 * needing to handle auth errors in UI.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { dialRepository } from '@/lib/repositories/dial.repository';

export async function GET(_request: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ subscribed: false });
  }

  const activeSub = await dialRepository.findActiveSubscriptionByUserId(userId);

  return NextResponse.json({ subscribed: activeSub !== null });
}
