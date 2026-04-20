/**
 * GET /api/dial/session/chat-export?sessionId={id}
 *
 * Returns conversation history as a Markdown file download.
 */

import { NextResponse } from 'next/server';
import { eq, asc } from 'drizzle-orm';
import { withDialAuth } from '@/lib/middleware/with-dial-auth';
import { verifyDialSessionOwnership } from '@/lib/middleware/dial-ownership';
import { apiValidationError, apiNotFound } from '@/lib/api-response';
import { db } from '@/db';
import { dialMessages } from '@/db/schema';

export const GET = withDialAuth(async (auth) => {
  const { searchParams } = new URL(auth.request.url);
  const sessionId = searchParams.get('sessionId');
  if (!sessionId) {
    return apiValidationError('sessionId is required');
  }

  const session = await verifyDialSessionOwnership(sessionId, auth);
  if (!session) {
    return apiNotFound('Session not found');
  }

  const messages = await db.query.dialMessages.findMany({
    where: eq(dialMessages.sessionId, sessionId),
    orderBy: [asc(dialMessages.createdAt)],
  });

  const date = new Date(session.createdAt).toISOString().slice(0, 10);
  const shortId = sessionId.slice(0, 8);

  const lines: string[] = [
    `# MUEDial Conversation Log`,
    ``,
    `- **Session**: ${sessionId}`,
    `- **Date**: ${date}`,
    `- **Mode**: ${session.mode ?? session.masteringMode ?? 'unknown'}`,
    `- **Genre**: ${session.musicalStyle ?? '—'}`,
    `- **Tracks**: ${(session as { tracks?: unknown[] }).tracks?.length ?? '—'}`,
    ``,
    `---`,
    ``,
  ];

  for (const msg of messages) {
    if (msg.role === 'tool_use' || msg.role === 'tool_result') continue;

    const ts = new Date(msg.createdAt).toISOString().replace('T', ' ').slice(0, 19);
    const speaker = msg.role === 'user' ? '**You**' : '**Hoo**';

    lines.push(`${speaker} *(${ts} UTC)*`);
    lines.push(``);
    lines.push(msg.content ?? '');

    if (msg.parameterChanges && Array.isArray(msg.parameterChanges) && msg.parameterChanges.length > 0) {
      const changes = (msg.parameterChanges as Array<{ track: string; changes: Record<string, unknown> }>)
        .map((c) => `${c.track}: ${JSON.stringify(c.changes)}`)
        .join(', ');
      lines.push(``);
      lines.push(`*Parameter changes: ${changes}*`);
    }

    if (msg.action) {
      lines.push(``);
      lines.push(`*Action: ${msg.action}*`);
    }

    lines.push(``);
    lines.push(`---`);
    lines.push(``);
  }

  const markdown = lines.join('\n');
  const filename = `conversation_${date}_${shortId}.md`;

  return new NextResponse(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});
