import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserUsageLimits } from '@/lib/middleware/usage-limiter';

/**
 * GET /api/subscription/limits
 *
 * Get user's subscription limits and usage
 */
export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limits = await getUserUsageLimits(clerkUserId);

    return NextResponse.json({
      success: true,
      limits,
    });
  } catch (error) {
    console.error('Get limits error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
