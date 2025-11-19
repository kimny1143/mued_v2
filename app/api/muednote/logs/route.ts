import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/edge'; // Edge Runtime用DB接続
import { logEntries } from '@/db/schema';
import { eq, desc, count, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * Get user's MUEDnote log entries (timeline)
 *
 * GET /api/muednote/logs?limit=20&offset=0&tags=tag1,tag2
 *
 * Tag filtering uses AND logic: entries must have ALL specified tags
 */
export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const tagsParam = url.searchParams.get('tags');
    const tagFilter = tagsParam ? tagsParam.split(',').map((t) => t.trim()) : [];

    // Build base WHERE clause
    const baseCondition = eq(logEntries.userId, session.userId);

    // Build WHERE clause with tag filter (if specified)
    const whereCondition =
      tagFilter.length > 0
        ? sql`${baseCondition} AND ${logEntries.tags} @> ${JSON.stringify(tagFilter)}::jsonb`
        : baseCondition;

    // Fetch log entries for current user
    const entries = await db
      .select()
      .from(logEntries)
      .where(whereCondition)
      .orderBy(desc(logEntries.createdAt))
      .limit(Math.min(limit, 100)) // Max 100 per request
      .offset(offset);

    // Get total count with same filter
    const [{ total }] = await db
      .select({ total: count() })
      .from(logEntries)
      .where(whereCondition);

    return NextResponse.json({
      entries,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Failed to fetch log entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch entries' },
      { status: 500 }
    );
  }
}
