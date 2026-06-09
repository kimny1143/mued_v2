/**
 * MUEDial Comp (free redo) — admin-only grant.
 * POST /api/dial/admin/comp  { sessionId, reason? }
 *
 * Grants ONE free retake cycle on a session (exceptional support remedy — NOT a default freebie).
 * Gated by the Clerk `isAdmin` role (the strong operator gate — same level as the checkout admin
 * bypass that creates paid sessions), which is separate from the read-only dial-admin allow-list
 * (read / grant separation). Bounded server-side: per-session lifetime-1 + admin daily cap
 * (3 / rolling 24h). Every grant is audited in dial_comp_ledger. Tier 3 (credit/cost).
 */
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { apiSuccess, apiValidationError, apiError, apiServerError } from '@/lib/api-response';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { isAdmin } from '@/lib/middleware/admin';
import { resolveRequesterEmail } from '@/lib/dial/admin-access';
import { grantComp, CompGrantError } from '@/lib/dial/comp';

const compSchema = z.object({
  sessionId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limit (privileged mutation that consumes RoEx cost).
    const rateLimitResponse = await rateLimit(request, 'strict');
    if (rateLimitResponse) return rateLimitResponse;

    const { userId } = await auth();
    if (!userId) {
      return apiError('Sign in required.', { code: 'NOT_SIGNED_IN', status: 401 });
    }
    // Strong operator gate (Clerk role), not the read-only dial-admin allow-list.
    if (!(await isAdmin(userId))) {
      return apiError('Admin role required.', { code: 'FORBIDDEN', status: 403 });
    }

    const body = await request.json();
    const parsed = compSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError('Invalid request', parsed.error.errors);
    }

    const adminEmail = (await resolveRequesterEmail(userId)) ?? 'unknown';

    try {
      const ledger = await grantComp({
        adminUserId: userId,
        adminEmail,
        sessionId: parsed.data.sessionId,
        reason: parsed.data.reason ?? null,
      });
      return apiSuccess({
        compId: ledger.id,
        sessionId: ledger.sessionId,
        estimatedCr: ledger.estimatedCr,
        grantedAt: ledger.grantedAt,
      });
    } catch (err) {
      if (err instanceof CompGrantError) {
        const status = err.reason === 'session_not_found' ? 404 : 409;
        const message =
          err.reason === 'session_not_found' ? 'Session not found.'
            : err.reason === 'already_comped' ? 'This session has already received a comp.'
              : 'Daily comp cap reached.';
        return apiError(message, { code: `COMP_${err.reason.toUpperCase()}`, status, details: err.detail });
      }
      throw err;
    }
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Comp grant failed');
  }
}
