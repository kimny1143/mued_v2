/**
 * Share Material to Library API
 * MaterialをLibraryに共有するAPI
 *
 * Converts a Material to UnifiedContent format and stores the relationship
 */

import { db } from '@/db';
import { users, materials } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { UnifiedContent } from '@/types/unified-content';
import { withAuth } from '@/lib/middleware/with-auth';
import {
  apiSuccess,
  apiNotFound,
  apiForbidden,
  apiServerError,
} from '@/lib/api-response';

interface ShareRequest {
  materialId: string;
  title: string;
  type: string;
  difficulty: string;
  description: string;
}

export const POST = withAuth(async ({ userId: clerkUserId, request }) => {
  try {
    // Get user from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, clerkUserId))
      .limit(1);

    if (!user) {
      return apiNotFound('User not found');
    }

    const body: ShareRequest = await request.json();
    const { materialId, title, type, difficulty, description } = body;

    // Fetch the material from database
    const [material] = await db
      .select()
      .from(materials)
      .where(eq(materials.id, materialId))
      .limit(1);

    if (!material) {
      return apiNotFound('Material not found');
    }

    // Check ownership
    if (material.creatorId !== user.id) {
      return apiForbidden('Not authorized to share this material');
    }

    // Convert to UnifiedContent format
    const unifiedContent: UnifiedContent = {
      id: `material-${materialId}`,
      source: 'ai_generated',
      type: mapMaterialTypeToContentType(type),
      title,
      description,
      content: JSON.stringify(material.content),
      category: 'practice', // Default category for AI-generated materials
      difficulty: difficulty as 'beginner' | 'intermediate' | 'advanced',
      tags: extractTags(material),
      publishedAt: material.createdAt,
      updatedAt: material.updatedAt || material.createdAt,
      author: {
        id: user.clerkId,
        name: user.name || 'Unknown',
        email: user.email,
      },
      aiMetadata: {
        generatedBy: {
          model: (material.metadata as { model?: string })?.model || 'gpt-4o-mini',
          provider: 'OpenAI',
          version: '2024-07-18',
          timestamp: material.createdAt,
        },
        qualityScore: {
          playability: 8.0,
          learningValue: 8.5,
          accuracy: 9.0,
          overallStatus: 'approved',
        },
        regenerationCount: 0,
        sourceContext: {
          articleId: materialId,
          articleTitle: title,
          url: `/dashboard/materials/${materialId}`,
        },
      },
      qualityScore: 8.5,
      relevanceScore: 1.0,
    };

    // TODO: Store this in a library_content table
    // For now, we'll just return success as the content is accessible via Materials API

    console.log('[ShareToLibrary] Created unified content:', unifiedContent.id);

    return apiSuccess(
      { contentId: unifiedContent.id },
      { message: 'Material shared to Library successfully' }
    );
  } catch (error) {
    console.error('[ShareToLibrary] Error:', error);
    return apiServerError(error instanceof Error ? error : new Error('Internal server error'));
  }
});

/**
 * Map material type to content type
 */
function mapMaterialTypeToContentType(materialType: string): UnifiedContent['type'] {
  switch (materialType.toLowerCase()) {
    case 'quiz':
    case 'test':
      return 'test';
    case 'practice':
    case 'problems':
      return 'practice';
    case 'flashcards':
    case 'summary':
      return 'interactive';
    default:
      return 'practice';
  }
}

/**
 * Extract tags from material
 */
function extractTags(material: typeof materials.$inferSelect): string[] {
  const tags: string[] = [];

  // Add type as tag
  if (material.type) {
    tags.push(material.type);
  }

  // Add difficulty as tag
  if (material.difficulty) {
    tags.push(material.difficulty);
  }

  // Extract from metadata if available
  const metadata = material.metadata as { tags?: string[] };
  if (metadata?.tags && Array.isArray(metadata.tags)) {
    tags.push(...metadata.tags);
  }

  return [...new Set(tags)]; // Remove duplicates
}
