/**
 * GET /api/lobe/commentary
 * Generate AI commentary for the user's cognitive profile
 *
 * Tier gating:
 * - Free (trial not started): auto-start trial, then generate
 * - Free (trial active): generate
 * - Free (trial expired): 403 COMMENTARY_LOCKED
 * - Basic/Premium: generate
 *
 * Commentary does NOT consume trial turns (one-time output, not conversation).
 */

import { withAuthResolved } from '@/lib/middleware/with-auth';
import { apiSuccess, apiNotFound, apiServerError, apiError } from '@/lib/api-response';
import { cognitiveProfileRepository } from '@/lib/repositories/cognitive-profiles.repository';
import { generateCommentary } from '@/lib/muedlobe/scoring/commentaryGenerator';
import { getPreferredLocale } from '@/lib/i18n/config';
import { trialService } from '@/lib/services/trial.service';
import type { Scores, SignificantPattern } from '@/types/muedlobe';

export const GET = withAuthResolved(async ({ clerkUserId, internalUserId, request }) => {
  try {
    // 1. Check effective tier
    const effectiveTier = await trialService.getEffectiveTier(internalUserId);

    if (effectiveTier === 'free') {
      const trialStatus = await trialService.getTrialStatus(internalUserId);
      if (!trialStatus.hasTrialStarted) {
        // Auto-start trial on first commentary request
        await trialService.startTrial(internalUserId);
        // Proceed to generate (trial just started)
      } else {
        // Trial expired/exhausted
        return apiError('Upgrade to Basic for AI commentary', {
          code: 'COMMENTARY_LOCKED',
          status: 403,
        });
      }
    }

    // 2. Generate commentary (use clerkUserId for profile lookup)
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
