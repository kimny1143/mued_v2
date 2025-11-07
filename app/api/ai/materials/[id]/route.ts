import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  getMaterialById,
  deleteMaterial,
  getUserIdFromClerkId,
} from '@/lib/services/ai-material.service';
import { db } from '@/db';
import { materials } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/ai/materials/[id]
 *
 * Get specific material by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get internal user UUID from Clerk ID (with auto-creation fallback)
    const userId = await getUserIdFromClerkId(clerkUserId);

    const material = await getMaterialById(id);

    if (!material) {
      return NextResponse.json(
        { success: false, error: 'Material not found' },
        { status: 404 }
      );
    }

    // Check access permissions
    // In development, allow access to all materials for testing
    const isDevelopment = process.env.NODE_ENV === 'development';
    const disableAccessCheck = process.env.DISABLE_MATERIAL_ACCESS_CHECK === 'true';

    if (!isDevelopment && !disableAccessCheck) {
      // Production: Check if user owns this material (compare internal UUIDs)
      if (material.creatorId !== userId) {
        return NextResponse.json(
          { success: false, error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    // Parse content JSON
    let parsedContent;
    try {
      parsedContent =
        typeof material.content === 'string'
          ? JSON.parse(material.content)
          : material.content;
    } catch {
      parsedContent = material.content;
    }

    return NextResponse.json({
      success: true,
      material: {
        id: material.id,
        title: material.title,
        description: material.description,
        content: parsedContent,
        type: material.type,
        difficulty: material.difficulty,
        isPublic: material.isPublic,
        metadata: material.metadata,
        createdAt: material.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Get material error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/ai/materials/[id]
 *
 * Update material
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await getUserIdFromClerkId(clerkUserId);
    const body = await request.json();

    // Check ownership
    const existingMaterial = await getMaterialById(id);
    if (!existingMaterial) {
      return NextResponse.json(
        { success: false, error: 'Material not found' },
        { status: 404 }
      );
    }

    // Check access (development mode bypasses this)
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (!isDevelopment && existingMaterial.creatorId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Update material
    await db
      .update(materials)
      .set({
        title: body.title,
        description: body.description,
        difficulty: body.difficulty,
        content: body.content,
        isPublic: body.isPublic !== undefined ? body.isPublic : undefined,
        updatedAt: new Date(),
      })
      .where(eq(materials.id, id));

    console.log('[Material Update] Successfully updated:', {
      id,
      title: body.title,
    });

    return NextResponse.json({
      success: true,
      message: 'Material updated successfully',
    });
  } catch (error) {
    console.error('Update material error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/ai/materials/[id]
 *
 * Delete material
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await deleteMaterial(id, clerkUserId);

    return NextResponse.json({
      success: true,
      message: 'Material deleted successfully',
    });
  } catch (error) {
    console.error('Delete material error:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
