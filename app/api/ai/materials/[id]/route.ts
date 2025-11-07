import { z } from 'zod';
import {
  getMaterialById,
  deleteMaterial,
  getUserIdFromClerkId,
} from '@/lib/services/ai-material.service';
import { db } from '@/db';
import { materials } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { withAuthParams } from '@/lib/middleware/with-auth';
import {
  apiSuccess,
  apiNotFound,
  apiForbidden,
  apiValidationError,
  apiServerError,
} from '@/lib/api-response';

// Validation schema for PATCH request
const patchMaterialSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  content: z.record(z.unknown()).optional(), // Accept any JSON object
  isPublic: z.boolean().optional(),
});

/**
 * GET /api/ai/materials/[id]
 *
 * Get specific material by ID
 */
export const GET = withAuthParams<{ id: string }>(
  async ({ userId: clerkUserId, params }) => {
    try {
      // Get internal user UUID from Clerk ID (with auto-creation fallback)
      const userId = await getUserIdFromClerkId(clerkUserId);

      const material = await getMaterialById(params.id);

      if (!material) {
        return apiNotFound('Material not found');
      }

      // Check access permissions
      // In development, allow access to all materials for testing
      const isDevelopment = process.env.NODE_ENV === 'development';
      const disableAccessCheck = process.env.DISABLE_MATERIAL_ACCESS_CHECK === 'true';

      if (!isDevelopment && !disableAccessCheck) {
        // Production: Check if user owns this material (compare internal UUIDs)
        if (material.creatorId !== userId) {
          return apiForbidden('Access denied');
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

      return apiSuccess({
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
      return apiServerError(error instanceof Error ? error : new Error('Internal server error'));
    }
  }
);

/**
 * PATCH /api/ai/materials/[id]
 *
 * Update material
 */
export const PATCH = withAuthParams<{ id: string }>(
  async ({ userId: clerkUserId, request, params }) => {
    try {
      const userId = await getUserIdFromClerkId(clerkUserId);
      const body = await request.json();

      // Validate input
      const validatedData = patchMaterialSchema.parse(body);

      // Check ownership
      const existingMaterial = await getMaterialById(params.id);
      if (!existingMaterial) {
        return apiNotFound('Material not found');
      }

      // Check access (development mode bypasses this)
      const isDevelopment = process.env.NODE_ENV === 'development';
      if (!isDevelopment && existingMaterial.creatorId !== userId) {
        return apiForbidden('Access denied');
      }

      // Build update object with only provided fields
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (validatedData.title !== undefined) updateData.title = validatedData.title;
      if (validatedData.description !== undefined) updateData.description = validatedData.description;
      if (validatedData.difficulty !== undefined) updateData.difficulty = validatedData.difficulty;
      if (validatedData.isPublic !== undefined) updateData.isPublic = validatedData.isPublic;

      // Stringify content for text column storage
      if (validatedData.content !== undefined) {
        updateData.content = JSON.stringify(validatedData.content);
      }

      // Update material
      await db
        .update(materials)
        .set(updateData)
        .where(eq(materials.id, params.id));

      console.log('[Material Update] Successfully updated:', {
        id: params.id,
        title: body.title,
      });

      return apiSuccess(
        { message: 'Material updated successfully' }
      );
    } catch (error) {
      console.error('Update material error:', error);

      if (error instanceof z.ZodError) {
        return apiValidationError('Invalid input data', error.errors);
      }

      return apiServerError(error instanceof Error ? error : new Error('Internal server error'));
    }
  }
);

/**
 * DELETE /api/ai/materials/[id]
 *
 * Delete material
 */
export const DELETE = withAuthParams<{ id: string }>(
  async ({ userId: clerkUserId, params }) => {
    try {
      await deleteMaterial(params.id, clerkUserId);

      return apiSuccess({ message: 'Material deleted successfully' });
    } catch (error) {
      console.error('Delete material error:', error);

      if (error instanceof Error && error.message.includes('not found')) {
        return apiNotFound(error.message);
      }

      return apiServerError(error instanceof Error ? error : new Error('Internal server error'));
    }
  }
);
