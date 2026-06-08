/**
 * MUEDial First-Run Free Campaign — monitoring stats (admin-only).
 * GET /api/dial/campaign/stats
 *
 * Single read for CFO/conductor monitoring (Phase 0): how many free grants issued,
 * how many remaining under the cap, and how many PAID sessions exist (the
 * is_free_campaign flag is the free↔paid discriminator). estMaxPoolCr is an upper
 * bound (every grant completing a full journey); the authoritative RoEx pool balance
 * is read from the RoEx dashboard (no balance API exists).
 */
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { dialSessions } from '@/db/schema';
import { isAdmin } from '@/lib/middleware/admin';
import { getFreeCampaignCap, isFreeCampaignEnabled, getFreeCampaignAudience, FREE_CAMPAIGN_SESSION } from '@/lib/dial/free-campaign';

export async function GET() {
  const { userId } = await auth();
  if (!userId || !(await isAdmin(userId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [free] = await db
    .select({ count: sql<number>`count(*)` })
    .from(dialSessions)
    .where(eq(dialSessions.isFreeCampaign, true));

  const [paid] = await db
    .select({ count: sql<number>`count(*)` })
    .from(dialSessions)
    .where(and(eq(dialSessions.isFreeCampaign, false), eq(dialSessions.paymentStatus, 'paid')));

  const cap = getFreeCampaignCap();
  const freeGrants = Number(free?.count ?? 0);

  return NextResponse.json({
    enabled: isFreeCampaignEnabled(),
    audience: getFreeCampaignAudience(),
    cap,
    freeGrants,
    remaining: Math.max(0, cap - freeGrants),
    paidSessions: Number(paid?.count ?? 0),
    estMaxPoolCr: freeGrants * FREE_CAMPAIGN_SESSION.roexCrEstimate,
    note: 'Authoritative RoEx pool balance is dashboard-only (no balance API). estMaxPoolCr assumes every grant completes a full journey.',
  });
}
