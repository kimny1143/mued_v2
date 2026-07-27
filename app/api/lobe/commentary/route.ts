/**
 * GET /api/lobe/commentary
 * Generate AI commentary for the user's cognitive profile
 *
 * Available to all tiers (MUEDnote free-ified 2026-03-27)
 */

import { withAuthResolved } from '@/lib/middleware/with-auth';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/api-response';
import { cognitiveProfileRepository } from '@/lib/repositories/cognitive-profiles.repository';
import { generateCommentary } from '@/lib/muedlobe/scoring/commentaryGenerator';
import { getPreferredLocale } from '@/lib/i18n/config';
import type { Scores, SignificantPattern } from '@/types/muedlobe';

export const GET = withAuthResolved(async ({ clerkUserId, request }) => {
  // Every call reaches Claude (generateCommentary -> sendClaudeChat) and nothing here is cached,
  // so a signed-in user re-opening this tab spends money each time. `hoo/chat` has carried the
  // same 'ai' limiter since it shipped; this route reached the same provider without one.
  // The limiter only caps the rate — it does not decide who may use the feature, so it does not
  // pre-empt whatever entitlement model gets chosen later.
  const rateLimitResponse = await rateLimit(request, 'ai');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Generate commentary (use clerkUserId for profile lookup)
    const profile = await cognitiveProfileRepository.findByUserId(clerkUserId);

    if (!profile) {
      return apiNotFound('Cognitive profile not found');
    }

    const scores: Scores = {
      wm: profile.wmScore ?? 0,
      ps: profile.psScore ?? 0,
      vc: profile.vcScore ?? 0,
      pr: profile.prScore ?? 0,
      att: profile.attScore ?? 0,
    };

    const patterns = (profile.significantPatterns as SignificantPattern[] | null) ?? [];

    // Determine locale from cookie or Accept-Language header
    const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
    const locale = cookieLocale === 'ja' || cookieLocale === 'en'
      ? cookieLocale
      : getPreferredLocale(request.headers.get('accept-language'));

    const commentary = await generateCommentary(scores, patterns, locale);

    return apiSuccess({ commentary });
  } catch (error) {
    console.error('[Commentary API] Error:', error);
    return apiServerError(
      error instanceof Error ? error.message : 'Failed to generate commentary'
    );
  }
});
