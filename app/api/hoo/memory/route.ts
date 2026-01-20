/**
 * Hoo Memory API
 * GET /api/hoo/memory - Get memory settings
 * POST /api/hoo/memory - Update custom instructions
 */

import { z } from 'zod';
import { withAuthResolved } from '@/lib/middleware/with-auth';
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/api-response';
import { hooMemoriesRepository } from '@/lib/repositories/hoo-memories.repository';
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

export const GET = withAuthResolved(async ({ internalUserId }) => {
  try {
    const settings = await hooMemoriesRepository.getMemorySettings(internalUserId);

    logger.info('[GET /api/hoo/memory] Retrieved settings', {
      userId: internalUserId,
      hasSettings: !!settings,
    });

    return apiSuccess({
      customInstructions: settings?.customInstructions ?? null,
      customInstructionsEnabled: settings?.customInstructionsEnabled ?? true,
      autoMemoryEnabled: settings?.autoMemoryEnabled ?? true,
      autoMemoriesCount: settings?.autoMemories?.length ?? 0,
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
