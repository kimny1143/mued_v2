/**
 * GET /api/lobe/commentary
 * Generate AI commentary for the user's cognitive profile
 */

import { withAuth } from '@/lib/middleware/with-auth';
import { apiSuccess, apiNotFound, apiServerError } from '@/lib/api-response';
import { cognitiveProfileRepository } from '@/lib/repositories/cognitive-profiles.repository';
import { generateCommentary } from '@/lib/muedlobe/scoring/commentaryGenerator';
import { getPreferredLocale } from '@/lib/i18n/config';
import type { Scores, SignificantPattern } from '@/types/muedlobe';

export const GET = withAuth(async ({ userId, request }) => {
  try {
    const profile = await cognitiveProfileRepository.findByUserId(userId);

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
