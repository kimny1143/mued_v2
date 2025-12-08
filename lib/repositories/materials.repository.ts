/**
 * MaterialRepository - Data access layer for Educational Materials
 *
 * This repository provides type-safe CRUD operations for:
 * - materials (AI-generated and user-created content)
 * - learning_metrics (practice progress tracking)
 */

import { db } from '@/db/edge';
import { materials, learningMetrics, users } from '@/db/schema';
import { desc, eq, and, like, sql, or, gte, lte } from 'drizzle-orm';

// ========================================
// Type Definitions
// ========================================

export type MaterialType = 'video' | 'pdf' | 'text' | 'interactive' | 'quiz' | 'music';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type QualityStatus = 'pending' | 'draft' | 'approved';

export interface AbcAnalysis {
  isValid: boolean;
  title?: string;
  key?: string;
  meter?: string;
  tempo?: number;
  measures?: number;
  notes?: string[];
  errors?: string[];
}

/**
 * Material creation input
 */
export interface CreateMaterialInput {
  creatorId: string;
  title: string;
  description?: string;
  content?: string;
  type: MaterialType;
  url?: string;
  tags?: string[];
  difficulty?: DifficultyLevel;
  isPublic?: boolean;
  metadata?: Record<string, unknown>;
  playabilityScore?: number;
  learningValueScore?: number;
  qualityStatus?: QualityStatus;
  abcAnalysis?: AbcAnalysis;
}

/**
 * Material update input
 */
export interface UpdateMaterialInput {
  title?: string;
  description?: string;
  content?: string;
  type?: MaterialType;
  url?: string;
  tags?: string[];
  difficulty?: DifficultyLevel;
  isPublic?: boolean;
  metadata?: Record<string, unknown>;
  playabilityScore?: number;
  learningValueScore?: number;
  qualityStatus?: QualityStatus;
  abcAnalysis?: AbcAnalysis;
}

/**
 * Material filter options
 */
export interface MaterialFilters {
  creatorId?: string;
  type?: MaterialType;
  difficulty?: DifficultyLevel;
  isPublic?: boolean;
  qualityStatus?: QualityStatus;
  search?: string;
  tags?: string[];
  minPlayabilityScore?: number;
  minLearningValueScore?: number;
  limit?: number;
  offset?: number;
}

/**
 * Learning metrics input
 */
export interface CreateLearningMetricsInput {
  userId: string;
  materialId: string;
  targetTempo: number;
  instrument?: string;
}

export interface UpdateLearningMetricsInput {
  sectionsCompleted?: number;
  sectionsTotal?: number;
  achievementRate?: string;
  repetitionCount?: number;
  repetitionIndex?: string;
  achievedTempo?: number;
  tempoAchievement?: string;
  weakSpots?: Array<{
    startBar: number;
    endBar: number;
    loopCount: number;
    lastPracticedAt: string;
  }>;
  totalPracticeTime?: number;
  lastPracticedAt?: Date;
  sessionCount?: number;
}

// ========================================
// MaterialRepository Class
// ========================================

export class MaterialRepository {
  // ========================================
  // Materials CRUD
  // ========================================

  /**
   * Create a new material
   */
  async create(input: CreateMaterialInput) {
    const [material] = await db
      .insert(materials)
      .values({
        creatorId: input.creatorId,
        title: input.title,
        description: input.description,
        content: input.content,
        type: input.type,
        url: input.url,
        tags: input.tags,
        difficulty: input.difficulty,
        isPublic: input.isPublic ?? false,
        metadata: input.metadata,
        playabilityScore: input.playabilityScore?.toString(),
        learningValueScore: input.learningValueScore?.toString(),
        qualityStatus: input.qualityStatus ?? 'pending',
        abcAnalysis: input.abcAnalysis,
      })
      .returning();

    return material;
  }

  /**
   * Get material by ID
   */
  async findById(materialId: string) {
    const [material] = await db
      .select()
      .from(materials)
      .where(eq(materials.id, materialId))
      .limit(1);

    return material ?? null;
  }

  /**
   * Get material with creator info
   */
  async findByIdWithCreator(materialId: string) {
    const result = await db
      .select({
        material: materials,
        creator: {
          id: users.id,
          name: users.name,
          email: users.email,
          profileImageUrl: users.profileImageUrl,
        },
      })
      .from(materials)
      .leftJoin(users, eq(materials.creatorId, users.id))
      .where(eq(materials.id, materialId))
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Get materials with filters
   */
  async findMany(filters: MaterialFilters = {}) {
    let query = db.select().from(materials);

    const conditions = [];

    if (filters.creatorId) {
      conditions.push(eq(materials.creatorId, filters.creatorId));
    }

    if (filters.type) {
      conditions.push(eq(materials.type, filters.type));
    }

    if (filters.difficulty) {
      conditions.push(eq(materials.difficulty, filters.difficulty));
    }

    if (filters.isPublic !== undefined) {
      conditions.push(eq(materials.isPublic, filters.isPublic));
    }

    if (filters.qualityStatus) {
      conditions.push(eq(materials.qualityStatus, filters.qualityStatus));
    }

    if (filters.search) {
      const searchPattern = `%${filters.search}%`;
      conditions.push(
        or(
          like(materials.title, searchPattern),
          like(materials.description, searchPattern)
        )
      );
    }

    if (filters.minPlayabilityScore !== undefined) {
      conditions.push(
        gte(materials.playabilityScore, filters.minPlayabilityScore.toString())
      );
    }

    if (filters.minLearningValueScore !== undefined) {
      conditions.push(
        gte(materials.learningValueScore, filters.minLearningValueScore.toString())
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    query = query.orderBy(desc(materials.createdAt)) as typeof query;

    if (filters.limit) {
      query = query.limit(filters.limit) as typeof query;
    }

    if (filters.offset) {
      query = query.offset(filters.offset) as typeof query;
    }

    return await query;
  }

  /**
   * Get public materials (library)
   */
  async findPublic(filters: Omit<MaterialFilters, 'isPublic'> = {}) {
    return this.findMany({ ...filters, isPublic: true, qualityStatus: 'approved' });
  }

  /**
   * Get materials by creator
   */
  async findByCreator(creatorId: string, limit?: number) {
    return this.findMany({ creatorId, limit });
  }

  /**
   * Update material
   */
  async update(materialId: string, input: UpdateMaterialInput) {
    const updateData: Record<string, unknown> = {
      ...input,
      updatedAt: new Date(),
    };

    // Convert numbers to strings for decimal fields
    if (input.playabilityScore !== undefined) {
      updateData.playabilityScore = input.playabilityScore.toString();
    }
    if (input.learningValueScore !== undefined) {
      updateData.learningValueScore = input.learningValueScore.toString();
    }

    const [updated] = await db
      .update(materials)
      .set(updateData)
      .where(eq(materials.id, materialId))
      .returning();

    return updated ?? null;
  }

  /**
   * Delete material
   */
  async delete(materialId: string) {
    const [deleted] = await db
      .delete(materials)
      .where(eq(materials.id, materialId))
      .returning();

    return deleted ?? null;
  }

  /**
   * Increment view count
   */
  async incrementViewCount(materialId: string) {
    const [updated] = await db
      .update(materials)
      .set({
        viewCount: sql`${materials.viewCount} + 1`,
      })
      .where(eq(materials.id, materialId))
      .returning();

    return updated ?? null;
  }

  /**
   * Approve material (update quality status)
   */
  async approve(materialId: string) {
    return this.update(materialId, { qualityStatus: 'approved' });
  }

  // ========================================
  // Learning Metrics
  // ========================================

  /**
   * Create learning metrics for a user-material pair
   */
  async createLearningMetrics(input: CreateLearningMetricsInput) {
    const [metrics] = await db
      .insert(learningMetrics)
      .values({
        userId: input.userId,
        materialId: input.materialId,
        targetTempo: input.targetTempo,
        instrument: input.instrument,
      })
      .returning();

    return metrics;
  }

  /**
   * Get learning metrics by user and material
   */
  async findLearningMetrics(userId: string, materialId: string) {
    const [metrics] = await db
      .select()
      .from(learningMetrics)
      .where(
        and(
          eq(learningMetrics.userId, userId),
          eq(learningMetrics.materialId, materialId)
        )
      )
      .limit(1);

    return metrics ?? null;
  }

  /**
   * Get all learning metrics for a user
   */
  async findUserLearningMetrics(userId: string, limit?: number) {
    let query = db
      .select()
      .from(learningMetrics)
      .where(eq(learningMetrics.userId, userId))
      .orderBy(desc(learningMetrics.lastPracticedAt));

    if (limit) {
      query = query.limit(limit) as typeof query;
    }

    return await query;
  }

  /**
   * Update learning metrics
   */
  async updateLearningMetrics(
    userId: string,
    materialId: string,
    input: UpdateLearningMetricsInput
  ) {
    const [updated] = await db
      .update(learningMetrics)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(learningMetrics.userId, userId),
          eq(learningMetrics.materialId, materialId)
        )
      )
      .returning();

    return updated ?? null;
  }

  /**
   * Upsert learning metrics (create or update)
   */
  async upsertLearningMetrics(
    input: CreateLearningMetricsInput,
    updateInput?: UpdateLearningMetricsInput
  ) {
    const existing = await this.findLearningMetrics(input.userId, input.materialId);

    if (existing && updateInput) {
      return this.updateLearningMetrics(input.userId, input.materialId, updateInput);
    }

    if (!existing) {
      return this.createLearningMetrics(input);
    }

    return existing;
  }

  // ========================================
  // Statistics
  // ========================================

  /**
   * Get material count by creator
   */
  async countByCreator(creatorId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(materials)
      .where(eq(materials.creatorId, creatorId));

    return Number(result[0]?.count);
  }

  /**
   * Get public material count
   */
  async countPublic(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(materials)
      .where(
        and(
          eq(materials.isPublic, true),
          eq(materials.qualityStatus, 'approved')
        )
      );

    return Number(result[0]?.count);
  }

  /**
   * Get creator statistics
   */
  async getCreatorStats(creatorId: string) {
    const result = await db
      .select({
        totalMaterials: sql<number>`count(*)`,
        publicMaterials: sql<number>`count(*) filter (where ${materials.isPublic} = true)`,
        totalViews: sql<number>`coalesce(sum(${materials.viewCount}), 0)`,
        avgPlayability: sql<number>`avg(${materials.playabilityScore}::numeric)`,
        avgLearningValue: sql<number>`avg(${materials.learningValueScore}::numeric)`,
      })
      .from(materials)
      .where(eq(materials.creatorId, creatorId));

    return result[0];
  }
}

// ========================================
// Singleton Instance
// ========================================

/**
 * Singleton repository instance
 * Use this for all material-related database operations
 */
export const materialRepository = new MaterialRepository();
