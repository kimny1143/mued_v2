/**
 * Profile Import API
 *
 * POST /api/muednote/profile/import — Import external AI conversation history
 *
 * Accepts text from Claude/ChatGPT/Gemini conversations.
 * Extracts musical profile data and merges into the user's profile.
 * "Give Hoo your AI conversations so it can understand you better."
 */

import { withAuthResolved } from '@/lib/middleware/with-auth';
import { apiSuccess, apiServerError, apiValidationError } from '@/lib/api-response';
import { userProfileRepository } from '@/lib/repositories/user-profiles.repository';
import { profileGeneratorService } from '@/lib/services/profile-generator.service';
import { logger } from '@/lib/utils/logger';
import { z } from 'zod';

// ========================================
// Validation
// ========================================

const importSchema = z.object({
  /** Raw conversation text (plain text, markdown, or JSON) */
  text: z.string().min(50, 'Conversation text too short').max(100000, 'Text exceeds 100K character limit'),
  /** Source of the conversation */
  source: z.enum(['claude', 'chatgpt', 'gemini', 'other']).optional().default('other'),
});

// ========================================
// POST — Import conversation history
// ========================================

export const POST = withAuthResolved(async ({ internalUserId, clerkUserId, request }) => {
  try {
    const body = await request.json();
    const validation = importSchema.safeParse(body);

    if (!validation.success) {
      return apiValidationError('Invalid import data', validation.error.errors);
    }

    const { text, source } = validation.data;

    // Ensure profile exists
    let profile = await userProfileRepository.findByUserId(internalUserId);
    if (!profile) {
      await profileGeneratorService.generateFullProfile(clerkUserId, internalUserId);
      profile = await userProfileRepository.findByUserId(internalUserId);
    }

    // Extract profile data from imported text
    const extracted = await profileGeneratorService.extractFromExternalConversation(
      internalUserId,
      text,
      source
    );

    if (!extracted) {
      return apiSuccess({
        updated: false,
        message: 'No new profile information found in the conversation.',
      });
    }

    return apiSuccess({
      updated: true,
      profile: extracted,
      message: 'Profile updated with information from your conversation.',
    });
  } catch (error) {
    logger.error('[POST /api/muednote/profile/import] Error', { error });
    return apiServerError(error instanceof Error ? error : new Error('Failed to import conversation'));
  }
});
