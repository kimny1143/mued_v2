import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/edge';
import { logEntries } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * Get all tags used by the user with counts
 *
 * GET /api/muednote/tags
 *
 * Returns:
 * {
 *   tags: Array<{ name: string; count: number }>
 * }
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // PostgreSQL JSONB array aggregation
    // Extract all tags from all log entries, count occurrences
    const result = await db.execute<{ tag: string; count: string }>(sql`
      SELECT
        tag,
        COUNT(*) as count
      FROM (
        SELECT DISTINCT jsonb_array_elements_text(tags) as tag
        FROM ${logEntries}
        WHERE user_id = ${session.userId}
      ) t
      GROUP BY tag
      ORDER BY count DESC, tag ASC
    `);

    return NextResponse.json({
      tags: result.rows.map((row) => ({
        name: row.tag,
        count: parseInt(row.count, 10),
      })),
    });
  } catch (error) {
    console.error('Failed to fetch tags:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}
