import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { neon } from '@neondatabase/serverless';
import { z } from 'zod';

// Schema validation
const CreateProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(50).optional(),
});

const UpdateProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(50).optional(),
  isActive: z.boolean().optional(),
});

// Database client
const sql = neon(process.env.DATABASE_URL!);

/**
 * GET /api/muednote/projects
 * Retrieve projects for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const { userId: clerkUserId } = await auth();

    // Allow dev token for development
    const authHeader = req.headers.get('authorization');
    const isDev = authHeader?.startsWith('Bearer dev_token_');

    if (!clerkUserId && !isDev) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user from database
    let userId: string;

    if (clerkUserId) {
      const users = await sql`
        SELECT id FROM users WHERE clerk_id = ${clerkUserId}
      `;

      if (users.length === 0) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      userId = users[0].id;
    } else {
      // Dev mode - use dev account
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

    // Get projects with fragment count
    const projects = await sql`
      SELECT
        p.*,
        COUNT(DISTINCT f.id) as fragment_count
      FROM muednote_v3.projects p
      LEFT JOIN muednote_v3.fragments f ON p.id = f.project_id
      WHERE p.user_id = ${userId}
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;

    return NextResponse.json({ projects });

  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/muednote/projects
 * Create a new project
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const { userId: clerkUserId } = await auth();

    // Allow dev token for development
    const authHeader = req.headers.get('authorization');
    const isDev = authHeader?.startsWith('Bearer dev_token_');

    if (!clerkUserId && !isDev) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validationResult = CreateProjectSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { name, description, color, icon } = validationResult.data;

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
      // Dev mode
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

    // Create project
    const project = await sql`
      INSERT INTO muednote_v3.projects (
        user_id,
        name,
        description,
        color,
        icon,
        is_active
      ) VALUES (
        ${userId},
        ${name},
        ${description || null},
        ${color || null},
        ${icon || null},
        true
      ) RETURNING *
    `;

    return NextResponse.json({
      project: project[0],
      message: 'Project created successfully',
    });

  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/muednote/projects
 * Update an existing project
 */
export async function PATCH(req: NextRequest) {
  try {
    // Check authentication
    const { userId: clerkUserId } = await auth();

    const authHeader = req.headers.get('authorization');
    const isDev = authHeader?.startsWith('Bearer dev_token_');

    if (!clerkUserId && !isDev) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validationResult = UpdateProjectSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { id, name, description, color, icon, isActive } = validationResult.data;

    // Get user from database
    let userId: string;

    if (clerkUserId) {
      const users = await sql`
        SELECT id FROM users WHERE clerk_id = ${clerkUserId}
      `;

      if (users.length === 0) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      userId = users[0].id;
    } else {
      // Dev mode
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

    // Check if project belongs to user
    const projectCheck = await sql`
      SELECT id FROM muednote_v3.projects
      WHERE id = ${id} AND user_id = ${userId}
    `;

    if (projectCheck.length === 0) {
      return NextResponse.json(
        { error: 'Project not found or unauthorized' },
        { status: 404 }
      );
    }

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      params.push(name);
      paramIndex++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      params.push(description);
      paramIndex++;
    }

    if (color !== undefined) {
      updates.push(`color = $${paramIndex}`);
      params.push(color);
      paramIndex++;
    }

    if (icon !== undefined) {
      updates.push(`icon = $${paramIndex}`);
      params.push(icon);
      paramIndex++;
    }

    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      params.push(isActive);
      paramIndex++;
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
      UPDATE muednote_v3.projects
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const updatedProject = await sql.query(updateQuery, params);

    return NextResponse.json({
      project: updatedProject[0],
      message: 'Project updated successfully',
    });

  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/muednote/projects
 * Delete a project
 */
export async function DELETE(req: NextRequest) {
  try {
    // Check authentication
    const { userId: clerkUserId } = await auth();

    const authHeader = req.headers.get('authorization');
    const isDev = authHeader?.startsWith('Bearer dev_token_');

    if (!clerkUserId && !isDev) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get project ID from query params
    const searchParams = req.nextUrl.searchParams;
    const projectId = searchParams.get('id');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Get user from database
    let userId: string;

    if (clerkUserId) {
      const users = await sql`
        SELECT id FROM users WHERE clerk_id = ${clerkUserId}
      `;

      if (users.length === 0) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      userId = users[0].id;
    } else {
      // Dev mode
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

    // Delete project (fragments will have project_id set to null due to SET NULL)
    const deleteResult = await sql`
      DELETE FROM muednote_v3.projects
      WHERE id = ${projectId} AND user_id = ${userId}
      RETURNING id
    `;

    if (deleteResult.length === 0) {
      return NextResponse.json(
        { error: 'Project not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Project deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}