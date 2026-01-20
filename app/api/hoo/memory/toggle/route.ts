/**
 * Hoo Memory Toggle API
 * PATCH /api/hoo/memory/toggle - Toggle custom instructions enabled/disabled
 */

import { z } from 'zod';
import { withAuthResolved } from '@/lib/middleware/with-auth';
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/api-response';
import { hooMemoriesRepository } from '@/lib/repositories/hoo-memories.repository';
import { logger } from '@/lib/utils/logger';

// ========================================
// Request Validation Schema
// ========================================

const toggleSchema = z.object({
  enabled: z.boolean(),
});

// ========================================
// PATCH Handler - Toggle custom instructions
// ========================================

export const PATCH = withAuthResolved(async ({ internalUserId, request }) => {
  try {
    const body = await request.json();
    const validationResult = toggleSchema.safeParse(body);

    if (!validationResult.success) {
      logger.error('[PATCH /api/hoo/memory/toggle] Validation failed', {
        errors: validationResult.error.errors,
      });
      return apiValidationError('Invalid request format', validationResult.error.errors);
    }

    const { enabled } = validationResult.data;

    const updated = await hooMemoriesRepository.toggleCustomInstructions({
      userId: internalUserId,
      enabled,
    });

    logger.info('[PATCH /api/hoo/memory/toggle] Toggled custom instructions', {
      userId: internalUserId,
      enabled,
    });

    return apiSuccess({
      customInstructions: updated.customInstructions,
      customInstructionsEnabled: updated.customInstructionsEnabled,
      autoMemoryEnabled: updated.autoMemoryEnabled,
      autoMemoriesCount: updated.autoMemories?.length ?? 0,
    });
  } catch (error) {
    logger.error('[PATCH /api/hoo/memory/toggle] Error', {
      error,
      userId: internalUserId,
    });
    return apiServerError(error instanceof Error ? error : new Error('Internal server error'));
  }
});
