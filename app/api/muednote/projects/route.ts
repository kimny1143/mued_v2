import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { neon } from '@neondatabase/serverless';
import { z } from 'zod';

// Initialize database connection
const sql = neon(process.env.DATABASE_URL!);

// Validation schemas
const CreateProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(50).optional(),
});

const UpdateProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(50).optional(),
  isActive: z.boolean().optional(),
});

// Helper to get user ID from auth or dev token
async function getUserId(req: NextRequest) {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    const authHeader = req.headers.get('authorization');

    // Check for dev token - validate against environment variable
    const expectedDevToken = process.env.DEV_AUTH_TOKEN || 'dev_token_kimny';
    if (authHeader === `Bearer ${expectedDevToken}`) {
      // In development, use the dev user
      const users = await sql`
        SELECT id FROM users WHERE email = 'kimny1143@gmail.com'
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

    // Validate request body
    const validationResult = CreateProjectSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { name, description, color, icon } = validationResult.data;

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

    // Validate request body
    const validationResult = UpdateProjectSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const { id, name, description, color, icon, isActive } = validationResult.data;

    // Check if project exists and belongs to user
    const checkProject = await sql`
      SELECT id, name as current_name, description as current_description,
             color as current_color, icon as current_icon, is_active as current_is_active
      FROM muednote_v3.projects
      WHERE id = ${id} AND user_id = ${userId}
    `;

    if (checkProject.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const current = checkProject[0];

    // Update all fields at once, using COALESCE to keep unchanged values
    const project = await sql`
      UPDATE muednote_v3.projects
      SET
        name = ${name !== undefined ? name : current.current_name},
        description = ${description !== undefined ? description : current.current_description},
        color = ${color !== undefined ? color : current.current_color},
        icon = ${icon !== undefined ? icon : current.current_icon},
        is_active = ${isActive !== undefined ? isActive : current.current_is_active},
        updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `;

    if (project.length === 0) {
      return NextResponse.json(
        { error: 'Failed to update project' },
        { status: 500 }
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