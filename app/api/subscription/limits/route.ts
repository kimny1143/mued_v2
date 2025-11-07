import { withAuth } from '@/lib/middleware/with-auth';
import { getUserUsageLimits } from '@/lib/middleware/usage-limiter';
import { apiSuccess, apiServerError } from '@/lib/api-response';

/**
 * GET /api/subscription/limits
 *
 * Get user's subscription limits and usage
 */
export const GET = withAuth(async ({ userId: clerkUserId }) => {
  try {
    const limits = await getUserUsageLimits(clerkUserId);

    return apiSuccess({ limits });
  } catch (error) {
    console.error('Get limits error:', error);
    return apiServerError(
      error instanceof Error ? error : new Error('Failed to get limits')
    );
  }
});
