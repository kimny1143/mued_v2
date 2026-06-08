/**
 * MUEDial First-Run Free Campaign — eligibility status.
 * GET /api/dial/credits/../campaign/status
 *
 * Read-only eligibility probe for the /dial landing CTA. Mirrors the
 * GET /api/dial/credits/free-status contract: always 200 (no 401) with a safe
 * default so the landing can fetch unconditionally; fail-closed on any error;
 * only ever exposes the *requester's own* eligibility (email auth-resolved).
 *
 * Does NOT consume the grant — that happens in POST /api/dial/campaign/start.
 * When the kill-switch (DIAL_FREE_CAMPAIGN_ENABLED) is OFF, eligible is always false.
 *
 * Response: { enabled, signedIn, eligible, remaining, reason }
 */
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import {
  evaluateFreeCampaignEligibility,
  isFreeCampaignEnabled,
  getFreeCampaignCap,
} from '@/lib/dial/free-campaign';
import { logger } from '@/lib/utils/logger';

export async function GET() {
  const enabled = isFreeCampaignEnabled();
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({
      enabled,
      signedIn: false,
      eligible: false,
      remaining: enabled ? getFreeCampaignCap() : 0,
      reason: enabled ? 'not_signed_in' : 'disabled',
    });
  }

  try {
    const [rec] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);
    const email = rec?.email ?? null;

    const elig = await evaluateFreeCampaignEligibility({ signedIn: true, email });
    return NextResponse.json({
      enabled,
      signedIn: true,
      eligible: elig.eligible,
      remaining: elig.remaining,
      reason: elig.reason,
    });
  } catch (err) {
    // Fail-closed: never 500, never fail-open (no wrongly-granted free session).
    logger.error('[campaign/status] eligibility check failed', { error: err, userId });
    return NextResponse.json({ enabled, signedIn: true, eligible: false, remaining: 0, reason: 'error' });
  }
}
