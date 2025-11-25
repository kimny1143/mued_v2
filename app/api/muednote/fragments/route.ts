import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { neon } from '@neondatabase/serverless';
import { z } from 'zod';

// Schema validation
const CreateFragmentSchema = z.object({
  content: z.string().min(1).max(10000),
  projectId: z.string().uuid().optional(),
  importance: z.enum(['low', 'medium', 'high', 'critical']).optional(),
});

const UpdateFragmentSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1).max(10000).optional(),
  projectId: z.string().uuid().nullable().optional(),
  importance: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'archived']).optional(),
});

// Database client
const sql = neon(process.env.DATABASE_URL!);

/**
 * GET /api/muednote/fragments
 * Retrieve fragments for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user from database
    const users = await sql`
      SELECT id FROM users WHERE clerk_id = ${clerkUserId}
    `;

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = users[0].id;

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = `
      SELECT
        f.id,
        f.content,
        f.processed_content,
        f.project_id,
        f.status,
        f.importance,
        f.ai_summary,
        f.sentiment_score,
        f.emotions,
        f.technical_terms,
        f.key_concepts,
        f.action_items,
        f.captured_at,
        f.processed_at,
        f.archived_at,
        f.created_at,
        f.updated_at,
        p.name as project_name,
        p.color as project_color,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', t.id,
              'name', t.name,
              'color', t.color
            )
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'::json
        ) as tags
      FROM muednote_v3.fragments f
      LEFT JOIN muednote_v3.projects p ON f.project_id = p.id
      LEFT JOIN muednote_v3.fragment_tags ft ON f.id = ft.fragment_id
      LEFT JOIN muednote_v3.tags t ON ft.tag_id = t.id
      WHERE f.user_id = $1
    `;

    const params: any[] = [userId];
    let paramIndex = 2;

    if (projectId) {
      query += ` AND f.project_id = $${paramIndex}`;
      params.push(projectId);
      paramIndex++;
    }

    if (status) {
      query += ` AND f.status = $${paramIndex}::muednote_v3.fragment_status`;
      params.push(status);
      paramIndex++;
    }

    query += `
      GROUP BY f.id, p.name, p.color
      ORDER BY f.captured_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    // Execute query
    const fragments = await sql.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM muednote_v3.fragments f
      WHERE f.user_id = $1
    `;

    const countParams: any[] = [userId];
    let countParamIndex = 2;

    if (projectId) {
      countQuery += ` AND f.project_id = $${countParamIndex}`;
      countParams.push(projectId);
      countParamIndex++;
    }

    if (status) {
      countQuery += ` AND f.status = $${countParamIndex}::muednote_v3.fragment_status`;
      countParams.push(status);
    }

    const countResult = await sql.query(countQuery, countParams);
    const total = parseInt(countResult[0].total);

    return NextResponse.json({
      fragments,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });

  } catch (error) {
    console.error('Error fetching fragments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/muednote/fragments
 * Create a new fragment
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      // Check for development token
      const authHeader = req.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer dev_token_')) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // Parse and validate request body
    const body = await req.json();
    const validationResult = CreateFragmentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { content, projectId, importance } = validationResult.data;

    // Get user from database
    let userId: string;

    if (clerkUserId) {
      const users = await sql`
        SELECT id FROM users WHERE clerk_id = ${clerkUserId}
      `;

      if (users.length === 0) {
        // Create user if not exists
        const newUser = await sql`
          INSERT INTO users (clerk_id, email, role)
          VALUES (${clerkUserId}, ${clerkUserId + '@temp.com'}, 'student')
          RETURNING id
        `;
        userId = newUser[0].id;
      } else {
        userId = users[0].id;
      }
    } else {
      // Development mode - use dev user
      const devUsers = await sql`
        SELECT id FROM users WHERE email = 'kimny1143@gmail.com'
      `;

      if (devUsers.length === 0) {
        return NextResponse.json(
          { error: 'Development user not found' },
          { status: 404 }
        );
      }

      userId = devUsers[0].id;
    }

    // Create fragment
    const fragment = await sql`
      INSERT INTO muednote_v3.fragments (
        user_id,
        content,
        project_id,
        importance,
        status
      ) VALUES (
        ${userId},
        ${content},
        ${projectId || null},
        ${importance || 'medium'}::muednote_v3.fragment_importance,
        'pending'::muednote_v3.fragment_status
      ) RETURNING *
    `;

    // Trigger async processing (will be implemented in the processing service)
    // For now, just mark as needing processing

    return NextResponse.json({
      fragment: fragment[0],
      message: 'Fragment created successfully',
    });

  } catch (error) {
    console.error('Error creating fragment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/muednote/fragments
 * Update an existing fragment
 */
export async function PATCH(req: NextRequest) {
  try {
    // Check authentication
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validationResult = UpdateFragmentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { id, content, projectId, importance, status } = validationResult.data;

    // Get user from database
    const users = await sql`
      SELECT id FROM users WHERE clerk_id = ${clerkUserId}
    `;

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = users[0].id;

    // Check if fragment belongs to user
    const fragmentCheck = await sql`
      SELECT id FROM muednote_v3.fragments
      WHERE id = ${id} AND user_id = ${userId}
    `;

    if (fragmentCheck.length === 0) {
      return NextResponse.json(
        { error: 'Fragment not found or unauthorized' },
        { status: 404 }
      );
    }

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (content !== undefined) {
      updates.push(`content = $${paramIndex}`);
      params.push(content);
      paramIndex++;
    }

    if (projectId !== undefined) {
      updates.push(`project_id = $${paramIndex}`);
      params.push(projectId);
      paramIndex++;
    }

    if (importance !== undefined) {
      updates.push(`importance = $${paramIndex}::muednote_v3.fragment_importance`);
      params.push(importance);
      paramIndex++;
    }

    if (status !== undefined) {
      updates.push(`status = $${paramIndex}::muednote_v3.fragment_status`);
      params.push(status);
      paramIndex++;

      // Set archived_at if status is archived
      if (status === 'archived') {
        updates.push(`archived_at = CURRENT_TIMESTAMP`);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Add id and execute update
    params.push(id);
    const updateQuery = `
      UPDATE muednote_v3.fragments
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const updatedFragment = await sql.query(updateQuery, params);

    return NextResponse.json({
      fragment: updatedFragment[0],
      message: 'Fragment updated successfully',
    });

  } catch (error) {
    console.error('Error updating fragment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/muednote/fragments
 * Delete a fragment
 */
export async function DELETE(req: NextRequest) {
  try {
    // Check authentication
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get fragment ID from query params
    const searchParams = req.nextUrl.searchParams;
    const fragmentId = searchParams.get('id');

    if (!fragmentId) {
      return NextResponse.json(
        { error: 'Fragment ID is required' },
        { status: 400 }
      );
    }

    // Get user from database
    const users = await sql`
      SELECT id FROM users WHERE clerk_id = ${clerkUserId}
    `;

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = users[0].id;

    // Delete fragment (will cascade to related tables)
    const deleteResult = await sql`
      DELETE FROM muednote_v3.fragments
      WHERE id = ${fragmentId} AND user_id = ${userId}
      RETURNING id
    `;

    if (deleteResult.length === 0) {
      return NextResponse.json(
        { error: 'Fragment not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Fragment deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting fragment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}