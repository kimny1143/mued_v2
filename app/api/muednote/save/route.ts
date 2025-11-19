import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/edge'; // Edge Runtime用DB接続
import { logEntries } from '@/db/schema';
import type { AISummary } from '@/db/schema/log-entries';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * Save MUEDnote chat entry to database
 *
 * POST /api/muednote/save
 * Body: {
 *   userMessage: string;
 *   aiResponse: string;
 *   formatted?: string;
 *   tags?: string[];
 *   comment?: string;
 * }
 */
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { userMessage, aiResponse, formatted, tags, comment } = body;

    if (!userMessage || !aiResponse) {
      return NextResponse.json(
        { error: 'userMessage and aiResponse are required' },
        { status: 400 }
      );
    }

    // Prepare AI summary from the formatted response
    const aiSummary: AISummary = {
      formatted: formatted || aiResponse,
      tags: tags || [],
      comment: comment || '',
    };

    // Save to database
    const [logEntry] = await db
      .insert(logEntries)
      .values({
        userId: session.userId,
        type: 'creation', // Default to creation type for now
        content: userMessage, // Original user input
        aiSummary,
        tags: tags || [],
        isPublic: false,
        shareWithMentor: true,
      })
      .returning();

    return NextResponse.json({
      success: true,
      logEntry: {
        id: logEntry.id,
        createdAt: logEntry.createdAt,
      },
    });
  } catch (error) {
    console.error('Failed to save MUEDnote entry:', error);
    return NextResponse.json(
      { error: 'Failed to save entry' },
      { status: 500 }
    );
  }
}
