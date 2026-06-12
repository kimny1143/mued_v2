/**
 * Marketing consent API — the signed-in opt-in / withdrawal surface for the self-owned list
 * (product課 handoff Step 3).
 *
 *   GET  /api/marketing/consent   → { status: 'granted' | 'withdrawn' | null }  (current de-normalized value)
 *   POST /api/marketing/consent   { status: 'granted' | 'withdrawn', locale }   → records consent
 *
 * Auth-guarded (signed-in only). POST resolves the INTERNAL users.id (marketing_consents.user_id is a
 * FK to users.id, NOT the Clerk id) before recording. recordConsent writes the append-only ledger +
 * the de-normalized users.marketing_consent, then fires a best-effort Audience sync (no-op until the
 * Resend Audience is configured). Withdrawal is always available (GDPR/APPI revocation ease).
 */
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { apiSuccess, apiError, apiValidationError, apiServerError } from '@/lib/api-response';
import { getUserIdFromClerkId } from '@/lib/utils/auth-helpers';
import { recordConsent } from '@/lib/marketing/consent';

const postSchema = z.object({
  status: z.enum(['granted', 'withdrawn']),
  locale: z.enum(['ja', 'en']).optional(),
});

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return apiError('Sign in required.', { code: 'NOT_SIGNED_IN', status: 401 });
    }

    const [rec] = await db
      .select({ marketingConsent: users.marketingConsent })
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);

    // null = never shown/decided; true = granted; false = declined/withdrawn.
    const status = rec?.marketingConsent == null ? null : rec.marketingConsent ? 'granted' : 'withdrawn';
    return apiSuccess({ status });
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Failed to read consent');
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return apiError('Sign in required.', { code: 'NOT_SIGNED_IN', status: 401 });
    }

    const body = await request.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError('Invalid request', parsed.error.errors);
    }

    // marketing_consents.user_id FKs to the internal users.id — resolve (auto-creates if missing).
    const internalUserId = await getUserIdFromClerkId(userId);

    await recordConsent({
      userId: internalUserId,
      status: parsed.data.status,
      source: 'settings',
      locale: parsed.data.locale ?? 'ja',
    });

    return apiSuccess({ status: parsed.data.status });
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Failed to record consent');
  }
}
