/**
 * Hoo Session Context API
 * GET /api/hoo/sessions/context
 *
 * Returns recent session context for Hoo AI conversations.
 * Used to provide Hoo with awareness of user's recent music production sessions.
 */

import { z } from 'zod';
import { withAuthResolved } from '@/lib/middleware/with-auth';
import { apiSuccess, apiValidationError, apiServerError } from '@/lib/api-response';
import { sessionRepository, type SessionContextForHoo } from '@/lib/repositories/sessions.repository';
import { logger } from '@/lib/utils/logger';

// ========================================
// Request Validation Schema
// ========================================

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(10).optional().default(3),
});

// ========================================
// Response Type
// ========================================

interface SessionContextApiResponse extends SessionContextForHoo {
  summary?: string;
}

// ========================================
// GET Handler
// ========================================

export const GET = withAuthResolved(async ({ clerkUserId, request }) => {
  try {
    // Parse query parameters
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');

    const validationResult = querySchema.safeParse({
      limit: limitParam ? parseInt(limitParam, 10) : undefined,
    });

    if (!validationResult.success) {
      return apiValidationError('Invalid query parameters', validationResult.error.errors);
    }

    const { limit } = validationResult.data;

    // Get session context using Clerk user ID (mobile sessions use Clerk ID)
    const context = await sessionRepository.getSessionContextForHoo(clerkUserId, limit);

    logger.info('[GET /api/hoo/sessions/context] Context retrieved', {
      clerkUserId,
      hasContext: context.hasContext,
      sessionCount: context.recentSessions.length,
    });

    // Build summary if context exists
    let summary: string | undefined;
    if (context.hasContext && context.recentSessions.length > 0) {
      const sessionTitles = context.recentSessions
        .slice(0, 3)
        .map(s => `"${s.title}"`)
        .join(', ');
      summary = sessionTitles;
    }

    const response: SessionContextApiResponse = {
      ...context,
      summary,
    };

    return apiSuccess(response);
  } catch (error) {
    logger.error('[GET /api/hoo/sessions/context] Error', {
      error,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return apiServerError(
      error instanceof Error ? error : new Error('Internal server error')
    );
  }
});
