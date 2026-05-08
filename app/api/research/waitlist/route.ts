import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/api-response';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { putWaitlistEntry, type WaitlistEntry } from '@/lib/storage/waitlist-blob';
import { emailService } from '@/lib/services/email.service';
import { logger } from '@/lib/utils/logger';

const schema = z.object({
  email: z.string().email().transform((e) => e.toLowerCase().trim()),
  locale: z.enum(['ja', 'en']).default('ja'),
  source: z.string().default('lp'),
  // Waitlist-only fields
  dtm_years: z.enum(['under_1y', '1_3y', '3_5y', 'over_5y']).nullable().optional(),
  challenge: z.string().max(500).nullable().optional(),
  // Readiness fields (optional — sent when coming from /readiness)
  launches_within_30d: z.boolean().optional(),
  has_stems: z.boolean().optional(),
  vocal_ready: z.boolean().optional(),
  product_intent: z.string().nullable().optional(),
  // UTM
  utm_source: z.string().nullable().optional(),
  utm_medium: z.string().nullable().optional(),
  utm_campaign: z.string().nullable().optional(),
  utm_content: z.string().nullable().optional(),
});

function calcReadinessScore(input: z.infer<typeof schema>): {
  score: number;
  qualified: boolean;
  launch_ready_recent: boolean;
} {
  let score = 0;
  if (input.launches_within_30d === true) score++;
  if (input.has_stems === true) score++;
  if (input.vocal_ready === true) score++;
  if (input.product_intent && input.product_intent !== 'unknown') score++;
  return {
    score,
    qualified: score >= 3,
    launch_ready_recent: input.launches_within_30d === true,
  };
}

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

  try {
    await putWaitlistEntry(entry);
  } catch (err) {
    logger.error('[research/waitlist] Blob write failed', { error: err, email: entry.email });
    return apiServerError('Failed to save registration');
  }

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
