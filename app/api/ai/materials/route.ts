import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import {
  generateMaterial,
  getUserMaterials,
  checkMaterialQuota,
  materialGenerationSchema,
} from '@/lib/services/ai-material.service';

/**
 * GET /api/ai/materials
 *
 * Get user's generated materials
 */
export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's materials from database
    const materials = await getUserMaterials(clerkUserId);

    // Also get quota info
    const quota = await checkMaterialQuota(clerkUserId);

    return NextResponse.json({
      success: true,
      materials: materials.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        type: m.type,
        difficulty: m.difficulty,
        createdAt: m.createdAt.toISOString(),
      })),
      quota: {
        tier: quota.tier,
        used: quota.limit === -1 ? 0 : quota.limit - quota.remaining,
        limit: quota.limit,
        remaining: quota.remaining,
      },
    });
  } catch (error) {
    console.error('Get materials error:', error);
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
 * POST /api/ai/materials
 *
 * Generate new AI material
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const generationRequest = materialGenerationSchema.parse({
      ...body,
      userId: clerkUserId,
    });

    // Generate material
    const result = await generateMaterial(generationRequest);

    return NextResponse.json({
      success: true,
      materialId: result.materialId,
      material: result.material,
      cost: result.cost,
      qualityStatus: result.qualityStatus,
      qualityMetadata: result.qualityMetadata,
      message: result.qualityStatus === 'approved'
        ? 'Material generated successfully and passed quality gate'
        : result.qualityStatus === 'draft'
          ? 'Material generated but needs improvement'
          : 'Material generated and requires manual review',
    });
  } catch (error) {
    console.error('Generate material error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    // Check if it's a quota error
    if (error instanceof Error && error.message.includes('limit reached')) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          upgradeRequired: true,
        },
        { status: 403 }
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
