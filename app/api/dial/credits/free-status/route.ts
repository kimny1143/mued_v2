/**
 * MUEDial Free Mix-Diagnosis Eligibility API
 * GET /api/dial/credits/free-status
 *
 * Returns whether the authenticated user is eligible for the free mix_diagnosis
 * trial (a waitlist member who has not yet used their lifetime-1 free diagnosis).
 *
 * Read-only — does NOT consume or mark the trial. The source of truth stays in
 * POST /api/dial/credits/consume; this endpoint only reports current eligibility
 * so the /dial landing can foreground the free first-run card instead of the paid
 * omakase default (#413 activation导线, Phase 1).
 *
 * Mirrors GET /api/dial/subscription/status: returns 200 with a safe default for
 * unauthenticated requests (no 401) so the landing can call it unconditionally.
 * It only ever exposes the *requester's own* eligibility — email is auth-resolved
 * from the Clerk userId, so there is no enumeration / cross-user exposure.
 *
 * Response shape is CANONICAL (the Phase 2 client depends on it — do not change
 * field names without updating the consumer):
 *   { signedIn: boolean, isWaitlistMember: boolean, freeDiagnosisUsed: boolean, eligible: boolean }
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { checkWaitlistEmailExists } from '@/lib/storage/waitlist-blob';
import { checkMixDiagnosisFreeUsed } from '@/lib/storage/mix-diagnosis-free';
import { logger } from '@/lib/utils/logger';

const DEFAULT = {
  signedIn: false,
  isWaitlistMember: false,
  freeDiagnosisUsed: false,
  eligible: false,
} as const;

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json(DEFAULT);

  const [rec] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.clerkId, userId))
    .limit(1);
  const email = rec?.email;
  if (!email) return NextResponse.json({ ...DEFAULT, signedIn: true });

  try {
    const isWaitlistMember = await checkWaitlistEmailExists(email);
    const freeDiagnosisUsed = isWaitlistMember ? await checkMixDiagnosisFreeUsed(email) : false;
    return NextResponse.json({
      signedIn: true,
      isWaitlistMember,
      freeDiagnosisUsed,
      eligible: isWaitlistMember && !freeDiagnosisUsed,
    });
  } catch (err) {
    // Blob (list) failure → fail-closed: do not falsely promise a free trial. Log + report ineligible.
    logger.error('[credits/free-status] eligibility check failed', { error: err, userId });
    return NextResponse.json({ ...DEFAULT, signedIn: true });
  }
}
