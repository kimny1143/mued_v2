import { z } from 'zod';
import {
  generateMaterial,
  getUserMaterials,
  checkMaterialQuota,
  materialGenerationSchema,
} from '@/lib/services/ai-material.service';
import { apiSuccess, apiValidationError, apiForbidden, apiServerError } from '@/lib/api-response';
import { withAuth } from '@/lib/middleware/with-auth';

/**
 * GET /api/ai/materials
 *
 * Get user's generated materials
 */
export const GET = withAuth(async ({ userId: clerkUserId }) => {
  try {
    // Get user's materials from database
    const materials = await getUserMaterials(clerkUserId);

    // Also get quota info
    const quota = await checkMaterialQuota(clerkUserId);

    return apiSuccess({
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
    return apiServerError(error instanceof Error ? error : new Error('Internal server error'));
  }
});

/**
 * POST /api/ai/materials
 *
 * Generate new AI material
 */
export const POST = withAuth(async ({ userId: clerkUserId, request }) => {
  try {
    // Parse request body
    const body = await request.json();
    const generationRequest = materialGenerationSchema.parse({
      ...body,
      userId: clerkUserId,
    });

    // Generate material
    const result = await generateMaterial(generationRequest);

    const message = result.qualityStatus === 'approved'
      ? 'Material generated successfully and passed quality gate'
      : result.qualityStatus === 'draft'
        ? 'Material generated but needs improvement'
        : 'Material generated and requires manual review';

    return apiSuccess({
      materialId: result.materialId,
      material: result.material,
      cost: result.cost,
      qualityStatus: result.qualityStatus,
      qualityMetadata: result.qualityMetadata,
    }, { message });
  } catch (error) {
    console.error('Generate material error:', error);

    if (error instanceof z.ZodError) {
      return apiValidationError('Invalid request', error.errors);
    }

    // Check if it's a quota error
    if (error instanceof Error && error.message.includes('limit reached')) {
      return apiForbidden(error.message);
    }

    return apiServerError(error instanceof Error ? error : new Error('Internal server error'));
  }
});
