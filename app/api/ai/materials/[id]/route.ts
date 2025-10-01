import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  getMaterialById,
  deleteMaterial,
} from '@/lib/services/ai-material.service';

/**
 * GET /api/ai/materials/[id]
 *
 * Get specific material by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const material = await getMaterialById(params.id);

    if (!material) {
      return NextResponse.json(
        { success: false, error: 'Material not found' },
        { status: 404 }
      );
    }

    // Check if user owns this material
    if (material.creatorId !== clerkUserId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
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
 * DELETE /api/ai/materials/[id]
 *
 * Delete material
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await deleteMaterial(params.id, clerkUserId);

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
