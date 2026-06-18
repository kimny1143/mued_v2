import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/with-auth';
import { listUserDialSessions } from '@/lib/dial/list-user-dial-sessions';

/**
 * GET /api/dial/sessions — list the signed-in user's MUEDial sessions (newest first)
 * for the dial-scoped history view (/dial/sessions).
 *
 * Auth: withAuth (Clerk Bearer JWT or cookie). Guests get 401 — this is the
 * signed-in/returning-user surface; guests reach their single session via their link.
 * Read-only. SECURITY: the user id is taken only from the verified token (withAuth),
 * never from a client-supplied parameter → enumeration-safe.
 */
export const GET = withAuth(async ({ userId }) => {
  const sessions = await listUserDialSessions(userId);
  return NextResponse.json({ sessions });
});
