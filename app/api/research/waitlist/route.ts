import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/api-response';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { putWaitlistEntry, checkWaitlistEmailExists, putWaitlistIndex, type WaitlistEntry } from '@/lib/storage/waitlist-blob';
import { emailService } from '@/lib/services/email.service';
import { logger } from '@/lib/utils/logger';
import { calcReadinessScore } from '@/lib/research/readiness-score';

const schema = z.object({
  email: z.string().email().transform((e) => e.toLowerCase().trim()),
  locale: z.enum(['ja', 'en']).default('ja'),
  source: z.string().default('lp'),
  dtm_years: z.enum(['under_1y', '1_3y', '3_5y', 'over_5y']).nullable().optional(),
  challenge: z.string().max(500).nullable().optional(),
  launches_within_30d: z.boolean().optional(),
  has_stems: z.boolean().optional(),
  vocal_ready: z.boolean().optional(),
  product_intent: z.string().nullable().optional(),
  utm_source: z.string().nullable().optional(),
  utm_medium: z.string().nullable().optional(),
  utm_campaign: z.string().nullable().optional(),
  utm_content: z.string().nullable().optional(),
});

export async function POST(request: NextRequest) {
  const rateLimitResponse = await rateLimit(request, 'research');
  if (rateLimitResponse) return rateLimitResponse;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiValidationError('Invalid JSON');
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError('Validation failed', parsed.error.flatten());
  }

  const input = parsed.data;
  const { score, qualified, launch_ready_recent } = calcReadinessScore(input);

  // Per-email dedup: return success without re-saving if already registered
  try {
    const isDuplicate = await checkWaitlistEmailExists(input.email);
    if (isDuplicate) {
      return apiSuccess({ qualified_waitlist: qualified, readiness_score: score, already_registered: true });
    }
  } catch (err) {
    // Blob list failure is non-blocking — proceed with save (occasional duplicate acceptable)
    logger.error('[research/waitlist] Blob dedup check failed', { error: err, email: input.email });
  }

  const entry: WaitlistEntry = {
    email: input.email,
    submitted_at: new Date().toISOString(),
    readiness_score: score,
    qualified_waitlist: qualified,
    launch_ready_recent,
    dtm_years: input.dtm_years ?? null,
    challenge: input.challenge ?? null,
    locale: input.locale,
    utm_source: input.utm_source ?? null,
    utm_medium: input.utm_medium ?? null,
    utm_campaign: input.utm_campaign ?? null,
    utm_content: input.utm_content ?? null,
    source: input.source,
  };

  let savedPathname: string;
  try {
    const saved = await putWaitlistEntry(entry);
    savedPathname = saved.pathname;
  } catch (err) {
    logger.error('[research/waitlist] Blob write failed', { error: err, email: entry.email });
    return apiServerError('Failed to save registration');
  }

  // Create index marker for dedup (fail-open: occasional race condition acceptable)
  putWaitlistIndex(input.email, savedPathname).catch((err) =>
    logger.error('[research/waitlist] Index write failed', { error: err, email: entry.email })
  );

  // Send welcome email — fail-open
  if (emailService.isConfigured()) {
    emailService
      .sendResearchWaitlistWelcome({ email: input.email }, { locale: input.locale })
      .catch((err) =>
        logger.error('[research/waitlist] Welcome email failed', { error: err, email: input.email })
      );
  }

  return apiSuccess({ qualified_waitlist: qualified, readiness_score: score });
}
