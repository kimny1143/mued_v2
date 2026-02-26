/**
 * Hoo Memory API
 * GET /api/hoo/memory - Get memory settings
 * POST /api/hoo/memory - Update custom instructions
 */

import { z } from 'zod';
import { withAuthResolved } from '@/lib/middleware/with-auth';
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/api-response';
import { hooMemoriesRepository } from '@/lib/repositories/hoo-memories.repository';
import { cognitiveProfileRepository } from '@/lib/repositories/cognitive-profiles.repository';
import { subscriptionRepository } from '@/lib/repositories/subscriptions.repository';
import { logger } from '@/lib/utils/logger';

// ========================================
// Request Validation Schema
// ========================================

const updateCustomInstructionsSchema = z.object({
  customInstructions: z.string().max(2000).nullable(),
});

// ========================================
// GET Handler - Get memory settings
// ========================================

export const GET = withAuthResolved(async ({ internalUserId, clerkUserId }) => {
  try {
    const settings = await hooMemoriesRepository.getMemorySettings(internalUserId);

    // Fetch MUEDlobe profile instructions for Premium users
    let muedlobeInstructions: string[] | null = null;
    let hasMuedlobeProfile = false;
    try {
      const usageLimits = await subscriptionRepository.getHooUsageLimits(internalUserId);
      if (usageLimits.tier === 'premium') {
        const hooConfig = await cognitiveProfileRepository.findHooConfig(clerkUserId);
        if (hooConfig?.specialInstructions) {
          muedlobeInstructions = hooConfig.specialInstructions as string[];
          hasMuedlobeProfile = true;
        }
      }
    } catch (err) {
      logger.warn('[GET /api/hoo/memory] MUEDlobe config fetch failed', { err });
    }

    logger.info('[GET /api/hoo/memory] Retrieved settings', {
      userId: internalUserId,
      hasSettings: !!settings,
      hasMuedlobeProfile,
    });

    return apiSuccess({
      customInstructions: settings?.customInstructions ?? null,
      customInstructionsEnabled: settings?.customInstructionsEnabled ?? true,
      autoMemoryEnabled: settings?.autoMemoryEnabled ?? true,
      autoMemoriesCount: settings?.autoMemories?.length ?? 0,
      muedlobeInstructions,
      hasMuedlobeProfile,
    });
  } catch (error) {
    logger.error('[GET /api/hoo/memory] Error', {
      error,
      userId: internalUserId,
    });
    return apiServerError(error instanceof Error ? error : new Error('Internal server error'));
  }
});

// ========================================
// POST Handler - Update custom instructions
// ========================================

export const POST = withAuthResolved(async ({ internalUserId, request }) => {
  try {
    const body = await request.json();
    const validationResult = updateCustomInstructionsSchema.safeParse(body);

    if (!validationResult.success) {
      logger.error('[POST /api/hoo/memory] Validation failed', {
        errors: validationResult.error.errors,
      });
      return apiValidationError('Invalid request format', validationResult.error.errors);
    }

    const { customInstructions } = validationResult.data;

    const updated = await hooMemoriesRepository.updateCustomInstructions({
      userId: internalUserId,
      customInstructions,
    });

    logger.info('[POST /api/hoo/memory] Updated custom instructions', {
      userId: internalUserId,
      hasInstructions: !!customInstructions,
      instructionsLength: customInstructions?.length ?? 0,
    });

    return apiSuccess({
      customInstructions: updated.customInstructions,
      customInstructionsEnabled: updated.customInstructionsEnabled,
      autoMemoryEnabled: updated.autoMemoryEnabled,
      autoMemoriesCount: updated.autoMemories?.length ?? 0,
    });
  } catch (error) {
    logger.error('[POST /api/hoo/memory] Error', {
      error,
      userId: internalUserId,
    });
    return apiServerError(error instanceof Error ? error : new Error('Internal server error'));
  }
});
