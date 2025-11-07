/**
 * AI Generated Material Content Fetcher
 * AI生成教材コンテンツフェッチャー
 *
 * Fetches AI-generated materials from the materials table
 */

import { db } from '@/db';
import { materials, users } from '@/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import type { IContentFetcher } from '@/lib/content/content-fetcher.interface';
import type { ContentFetchParams, ContentFetchResult, UnifiedContent } from '@/types/unified-content';

export class AIGeneratedMaterialFetcher implements IContentFetcher {
  readonly id = 'ai-material-fetcher';
  readonly name = 'AI Generated Material Fetcher';
  supportedSources = ['ai_generated'] as const;

  async fetch(params: ContentFetchParams): Promise<ContentFetchResult> {
    try {
      const {
        search,
        type,
        difficulty,
        tags,
        limit = 20,
        offset = 0,
      } = params;

      // Build query conditions
      const conditions = [];

      if (type) {
        conditions.push(eq(materials.type, type));
      }

      if (difficulty) {
        conditions.push(eq(materials.difficulty, difficulty));
      }

      if (search) {
        conditions.push(
          sql`(
            ${materials.title} ILIKE ${`%${search}%`} OR
            ${materials.description} ILIKE ${`%${search}%`}
          )`
        );
      }

      // Fetch materials
      const materialsQuery = db
        .select({
          material: materials,
          creator: users,
        })
        .from(materials)
        .leftJoin(users, eq(materials.creatorId, users.id))
        .orderBy(desc(materials.createdAt))
        .limit(limit)
        .offset(offset);

      if (conditions.length > 0) {
        materialsQuery.where(and(...conditions));
      }

      const results = await materialsQuery;

      // Convert to UnifiedContent
      const content: UnifiedContent[] = results
        .filter(({ material }) => material !== null)
        .map(({ material, creator }) => {
          // Safely handle metadata (can be null for manually created materials)
          const typedMetadata = (material.metadata as {
            model?: string;
            tokens?: number;
            generationCost?: number;
            tags?: string[];
          } | null) || {};

          return {
            id: `material-${material.id}`,
            source: 'ai_generated' as const,
            type: mapMaterialTypeToContentType(material.type),
            title: material.title,
            description: material.description || '',
            content: JSON.stringify(material.content),
            category: 'practice',
            difficulty: material.difficulty as 'beginner' | 'intermediate' | 'advanced',
            tags: extractTags(material),
            publishedAt: material.createdAt,
            updatedAt: material.updatedAt || material.createdAt,
            url: `/dashboard/materials/${material.id}`, // Direct link to material detail page
            author: creator
              ? {
                  id: creator.clerkId,
                  name: creator.name || 'Unknown',
                  email: creator.email,
                }
              : {
                  id: 'system',
                  name: 'AI System',
                  email: 'ai@system.local',
                },
            aiMetadata: {
              generatedBy: {
                model: typedMetadata.model || 'gpt-4o-mini',
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
                articleId: material.id,
                articleTitle: material.title,
                url: `/dashboard/materials/${material.id}`,
              },
            },
            qualityScore: 8.5,
            relevanceScore: 1.0,
          };
        });

      // Get total count
      const totalQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(materials);

      if (conditions.length > 0) {
        totalQuery.where(and(...conditions));
      }

      const [{ count: total }] = await totalQuery;

      return {
        success: true,
        content,
        total,
        sources: {
          ai_generated: content.length,
          note: 0,
          youtube: 0,
          internal: 0,
          partner: 0,
        },
      };
    } catch (error) {
      console.error('[AIGeneratedMaterialFetcher] Fetch error:', error);
      return {
        success: false,
        content: [],
        total: 0,
        sources: {
          ai_generated: 0,
          note: 0,
          youtube: 0,
          internal: 0,
          partner: 0,
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    try {
      // Try to query materials table
      await db.select().from(materials).limit(1);

      return {
        healthy: true,
        message: 'AI Material fetcher is operational',
      };
    } catch (error) {
      return {
        healthy: false,
        message: error instanceof Error ? error.message : 'Database connection failed',
      };
    }
  }
}

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
    case 'music':
      return 'interactive';
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

  // Extract from metadata if available (safely handle null)
  const metadata = (material.metadata as { tags?: string[]; instrument?: string } | null) || {};

  if (metadata.tags && Array.isArray(metadata.tags)) {
    tags.push(...metadata.tags);
  }

  // Add instrument if available
  if (metadata.instrument) {
    tags.push(metadata.instrument);
  }

  return [...new Set(tags)]; // Remove duplicates
}
