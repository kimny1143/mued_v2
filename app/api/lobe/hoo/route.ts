/**
 * GET /api/lobe/hoo
 * Get Hoo configuration based on cognitive profile
 */

import { withAuthResolved } from '@/lib/middleware/with-auth';
import { apiSuccess, apiServerError } from '@/lib/api-response';
import { cognitiveProfileRepository } from '@/lib/repositories/cognitive-profiles.repository';
import type { HooPromptConfig } from '@/types/muedlobe';

export const GET = withAuthResolved(async ({ clerkUserId }) => {
  try {
    const profile = await cognitiveProfileRepository.findByUserId(clerkUserId);

    if (!profile) {
      return apiSuccess<HooPromptConfig>({
        prompt: '',
        variables: {},
        patterns: [],
        specialInstructions: [],
        activeSnippets: [],
        version: 0,
        lastUpdated: new Date().toISOString(),
      });
    }

    const config: HooPromptConfig = {
      prompt: '',
      variables: {
        wm_score: profile.wmScore ?? 50,
        ps_score: profile.psScore ?? 50,
        vc_score: profile.vcScore ?? 50,
        pr_score: profile.prScore ?? 50,
        att_score: profile.attScore ?? 50,
      },
      patterns: (profile.significantPatterns ?? []) as HooPromptConfig['patterns'],
      specialInstructions: [],
      activeSnippets: [],
      version: profile.version ?? 1,
      lastUpdated: profile.measuredAt?.toISOString() ?? new Date().toISOString(),
    };

    // Merge with custom Hoo configuration if exists
    const hooConfig = await cognitiveProfileRepository.findHooConfig(clerkUserId);
    if (hooConfig) {
      config.prompt = hooConfig.customPrompt ?? '';
      config.specialInstructions = hooConfig.specialInstructions ?? [];
      config.activeSnippets = hooConfig.snippets ?? [];
    }

    return apiSuccess(config);
  } catch (error) {
    return apiServerError(error instanceof Error ? error.message : 'Unknown error');
  }
});
