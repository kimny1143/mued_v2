/**
 * MUEDnote Mobile Account API
 * DELETE /api/muednote/mobile/account - Delete user account
 *
 * App Store Guideline 5.1.1(v): Account deletion requirement
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { verifyToken } from '@clerk/backend';
import { createClerkClient } from '@clerk/backend';

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

async function getAuthUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');

  // JWT token auth (mobile app)
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!,
      });
      if (payload?.sub) {
        return payload.sub;
      }
    } catch (error) {
      console.error('[Auth] JWT verification failed:', error);
    }
  }

  // Cookie-based auth (Web)
  const session = await auth();
  return session?.userId || null;
}

export async function DELETE(req: Request) {
  try {
    const userId = await getAuthUserId(req);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete user via Clerk Backend API
    // This triggers the user.deleted webhook which handles DB cleanup
    await clerkClient.users.deleteUser(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/muednote/mobile/account] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
