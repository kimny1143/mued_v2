/**
 * GET /api/lobe/profile
 * Retrieve user's cognitive profile
 *
 * Returns MUEDlobe scores, patterns, prompt parameters,
 * and measurement metadata for display in native apps.
 */

import { withAuth } from '@/lib/middleware/with-auth';
import { apiSuccess, apiServerError } from '@/lib/api-response';
import { cognitiveProfileRepository } from '@/lib/repositories/cognitive-profiles.repository';

export const GET = withAuth(async ({ userId }) => {
  try {
    const profile = await cognitiveProfileRepository.findByUserId(userId);

    if (!profile) {
      return apiSuccess({
        hasProfile: false,
        profile: null,
      });
    }

    return apiSuccess({
      hasProfile: true,
      profile: {
        scores: {
          wm: profile.wmScore ?? 0,
          ps: profile.psScore ?? 0,
          vc: profile.vcScore ?? 0,
          pr: profile.prScore ?? 0,
          att: profile.attScore ?? 0,
        },
        vcPrBalance: profile.vcPrBalance ? Number(profile.vcPrBalance) : null,
        significantPatterns: profile.significantPatterns ?? [],
        promptParams: profile.promptParams,
        measuredAt: profile.measuredAt?.toISOString() ?? null,
        version: profile.version ?? 1,
      },
    });
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Unknown error');
  }
});
