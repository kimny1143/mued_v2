import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { neon } from '@neondatabase/serverless';

// Initialize database connection
const sql = neon(process.env.DATABASE_URL!);

// Helper to get user ID from auth or dev token
async function getUserId(req: NextRequest) {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    const authHeader = req.headers.get('authorization');

    // Check for dev token
    if (authHeader?.startsWith('Bearer dev_token_')) {
      const userEmail = authHeader.replace('Bearer dev_token_', '') + '@gmail.com';

      // Get user ID from database
      const users = await sql`
        SELECT id FROM users WHERE email = ${userEmail}
      `;

      if (users.length > 0) {
        return users[0].id;
      }
    }

    return null;
  }

  // Get user ID from Clerk user
  const users = await sql`
    SELECT id FROM users WHERE clerk_id = ${clerkUserId}
  `;

  return users.length > 0 ? users[0].id : null;
}

// GET /api/muednote/projects
export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projects = await sql`
      SELECT
        p.*,
        COUNT(f.id) as fragment_count
      FROM muednote_v3.projects p
      LEFT JOIN muednote_v3.fragments f ON p.id = f.project_id AND f.status != 'archived'
      WHERE p.user_id = ${userId} AND p.is_active = true
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `;

    return NextResponse.json({
      projects: projects.map(p => ({
        ...p,
        fragmentCount: parseInt(p.fragment_count)
      }))
    });

  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

// POST /api/muednote/projects
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, color, icon } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    const project = await sql`
      INSERT INTO muednote_v3.projects (
        user_id,
        name,
        description,
        color,
        icon
      ) VALUES (
        ${userId},
        ${name},
        ${description || null},
        ${color || '#6366F1'},
        ${icon || '📁'}
      ) RETURNING *
    `;

    return NextResponse.json({
      project: project[0],
      message: 'Project created successfully'
    });

  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}

// PATCH /api/muednote/projects
export async function PATCH(req: NextRequest) {
  try {
    const userId = await getUserId(req);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, name, description, color, icon, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Check if project exists and belongs to user
    const checkProject = await sql`
      SELECT id FROM muednote_v3.projects
      WHERE id = ${id} AND user_id = ${userId}
    `;

    if (checkProject.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Update fields one by one (simpler with tagged templates)
    let project;

    if (name !== undefined) {
      project = await sql`
        UPDATE muednote_v3.projects
        SET name = ${name}, updated_at = NOW()
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING *
      `;
    } else if (description !== undefined) {
      project = await sql`
        UPDATE muednote_v3.projects
        SET description = ${description}, updated_at = NOW()
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING *
      `;
    } else if (color !== undefined) {
      project = await sql`
        UPDATE muednote_v3.projects
        SET color = ${color}, updated_at = NOW()
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING *
      `;
    } else if (icon !== undefined) {
      project = await sql`
        UPDATE muednote_v3.projects
        SET icon = ${icon}, updated_at = NOW()
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING *
      `;
    } else if (isActive !== undefined) {
      project = await sql`
        UPDATE muednote_v3.projects
        SET is_active = ${isActive}, updated_at = NOW()
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING *
      `;
    } else {
      return NextResponse.json(
        { error: 'No updates provided' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      project: project[0],
      message: 'Project updated successfully'
    });

  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

// DELETE /api/muednote/projects
export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserId(req);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Soft delete by setting is_active to false
    const result = await sql`
      UPDATE muednote_v3.projects
      SET is_active = false, updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Project deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}