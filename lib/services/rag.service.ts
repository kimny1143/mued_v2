/**
 * RAG Service - Core Implementation
 *
 * Retrieval-Augmented Generation service for semantic search and embedding management.
 * Integrates OpenAI Embeddings API (text-embedding-3-small) with pgvector database.
 *
 * Features:
 * - Text embedding generation with OpenAI SDK
 * - Vector similarity search using pgvector
 * - Embedding caching for performance
 * - Rate limiting and retry logic
 * - Comprehensive error handling
 *
 * @module lib/services/rag.service
 */

import OpenAI from 'openai';
import { db } from '@/db';
import {
  ragEmbeddings,
  questionTemplates,
  type InterviewFocus,
  type InterviewDepth,
} from '@/db/schema';
import { sql, eq, and, desc } from 'drizzle-orm';
import { logger } from '@/lib/utils/logger';
import { calculateRAGMetrics, type RAGMetrics } from '@/lib/utils/rag-metrics';
import { z } from 'zod';
import { createHash } from 'crypto';

// ========================================
// Type Definitions & Validation Schemas
// ========================================

/**
 * Database row types for query results
 */
interface SimilaritySearchRow {
  logId: string;
  sessionId?: string;
  content?: string;
  similarity: number | string;
  metadata?: unknown;
}

interface EmbeddingStatsRow {
  source_type: string;
  count: number | string;
}

interface ExplainPlanRow {
  'QUERY PLAN': unknown;
}

/**
 * Question template with priority
 */
export interface QuestionTemplate {
  id: string;
  text: string;
  focus: InterviewFocus;
  depth: InterviewDepth;
  variables: Record<string, unknown>;
}

/**
 * Embedding metadata structure
 */
export interface EmbeddingMetadata {
  focusArea?: string;
  sessionId?: string;
  content?: string;
  confidence?: number;
  timestamp?: string;
  [key: string]: unknown;
}

/**
 * Input schema for generating embeddings
 */
export const GenerateEmbeddingInputSchema = z.object({
  text: z.string().min(1, 'Text cannot be empty').max(8000, 'Text exceeds OpenAI limit of 8000 characters'),
  model: z.string().default('text-embedding-3-small'),
});

/**
 * Similar log result schema
 */
export const SimilarLogSchema = z.object({
  logId: z.string().uuid(),
  sessionId: z.string().uuid(),
  content: z.string(),
  similarity: z.number().min(0).max(1),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Input validation schemas
 */
export const FindSimilarLogsInputSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty'),
  limit: z.number().int().min(1).max(20).default(5),
  threshold: z.number().min(0).max(1).default(0.7),
});

const UpsertEmbeddingInputSchema = z.object({
  sourceType: z.enum(['session', 'template', 'log_entry']),
  sourceId: z.string().uuid(),
  embedding: z.array(z.number()).length(1536),
  metadata: z.record(z.unknown()).optional(),
});

const EmbedSessionInputSchema = z.object({
  sessionId: z.string().uuid(),
  content: z.string().min(1).max(10000),
});

// ========================================
// Type Exports
// ========================================

export type GenerateEmbeddingInput = z.infer<typeof GenerateEmbeddingInputSchema>;
export type SimilarLog = z.infer<typeof SimilarLogSchema>;
export type FindSimilarLogsInput = z.infer<typeof FindSimilarLogsInputSchema>;

// ========================================
// RAG Service Class
// ========================================

class RAGService {
  private readonly EMBEDDING_MODEL = 'text-embedding-3-small';
  private readonly EMBEDDING_DIMENSIONS = 1536;
  private readonly RATE_LIMIT_DELAY = 1200; // 1.2s to stay under 50 req/min
  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_BACKOFF_MS = 1000;

  private openai: OpenAI;
  private embeddingCache: Map<string, number[]>;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    this.openai = new OpenAI({
      apiKey,
    });

    this.embeddingCache = new Map();

    logger.info('[RAGService] Initialized with OpenAI Embeddings API', {
      model: this.EMBEDDING_MODEL,
      dimensions: this.EMBEDDING_DIMENSIONS,
    });
  }

  /**
   * Generate embedding vector using OpenAI SDK
   * @param text - Input text to embed
   * @returns 1536-dimensional embedding vector
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Input validation
    const validated = GenerateEmbeddingInputSchema.parse({ text });

    // Check cache
    const cacheKey = this.getCacheKey(validated.text);
    if (this.embeddingCache.has(cacheKey)) {
      logger.debug('[RAGService] Cache hit for embedding', { cacheKey });
      return this.embeddingCache.get(cacheKey)!;
    }

    try {
      // Call OpenAI Embeddings API with retry logic
      const response = await this.retryWithBackoff(async () => {
        logger.debug('[RAGService] Calling OpenAI Embeddings API', {
          textLength: validated.text.length,
          model: this.EMBEDDING_MODEL,
        });

        return await this.openai.embeddings.create({
          model: this.EMBEDDING_MODEL,
          input: validated.text,
          encoding_format: 'float',
        });
      });

      const embedding = response.data[0].embedding;

      // Validate dimension
      if (embedding.length !== this.EMBEDDING_DIMENSIONS) {
        throw new Error(
          `Invalid embedding dimension: expected ${this.EMBEDDING_DIMENSIONS}, got ${embedding.length}`
        );
      }

      // Cache result
      this.embeddingCache.set(cacheKey, embedding);

      logger.info('[RAGService] Embedding generated successfully', {
        textLength: validated.text.length,
        dimension: embedding.length,
        usage: response.usage,
        model: this.EMBEDDING_MODEL,
      });

      return embedding;
    } catch (error) {
      logger.error('[RAGService] Embedding generation failed', { error });
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate SHA256 hash of input text for deduplication
   */
  private calculateHash(text: string): string {
    return createHash('sha256').update(text, 'utf8').digest('hex');
  }

  /**
   * Generate cache key for text (simple hash)
   * @param text - Input text
   * @returns Cache key
   */
  private getCacheKey(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `emb_${hash}_${text.length}`;
  }

  /**
   * Retry function with exponential backoff
   * @param fn - Async function to retry
   * @param maxRetries - Maximum number of retries
   * @returns Result from function
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = this.MAX_RETRIES
  ): Promise<T> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: unknown) {
        const isLastAttempt = attempt === maxRetries - 1;
        const isRateLimitError =
          typeof error === 'object' &&
          error !== null &&
          'status' in error &&
          error.status === 429;

        if (isRateLimitError && !isLastAttempt) {
          const delay = this.INITIAL_BACKOFF_MS * Math.pow(2, attempt);
          logger.warn('[RAGService] Rate limited, retrying...', {
            attempt: attempt + 1,
            maxRetries,
            delayMs: delay,
          });
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
    throw new Error('Max retries exceeded');
  }

  /**
   * Clear embedding cache
   */
  clearCache(): void {
    this.embeddingCache.clear();
    logger.info('[RAGService] Cache cleared');
  }

  /**
   * Get current cache size
   * @returns Number of cached embeddings
   */
  getCacheSize(): number {
    return this.embeddingCache.size;
  }

  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.embeddingCache.size,
      keys: Array.from(this.embeddingCache.keys()),
    };
  }

  /**
   * Upsert embedding into rag_embeddings table
   * @param sourceType - 'session' or 'template'
   * @param sourceId - UUID of source record
   * @param embedding - 1536-dimensional vector
   * @param metadata - Optional metadata
   */
  async upsertEmbedding(
    sourceType: 'session' | 'template',
    sourceId: string,
    embedding: number[],
    metadata?: EmbeddingMetadata
  ): Promise<void> {
    const validated = UpsertEmbeddingInputSchema.parse({
      sourceType,
      sourceId,
      embedding,
      metadata,
    });

    try {
      // Check if embedding already exists
      const existing = await db
        .select()
        .from(ragEmbeddings)
        .where(
          and(
            eq(ragEmbeddings.sourceType, validated.sourceType),
            eq(ragEmbeddings.sourceId, validated.sourceId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing embedding
        await db.execute(sql`
          UPDATE rag_embeddings
          SET embedding = ${JSON.stringify(validated.embedding)}::vector,
              metadata = ${JSON.stringify(validated.metadata || {})},
              updated_at = NOW()
          WHERE source_type = ${validated.sourceType}
            AND source_id = ${validated.sourceId}
        `);

        logger.info('[RAGService] Embedding updated', {
          sourceType: validated.sourceType,
          sourceId: validated.sourceId,
        });
      } else {
        // Insert new embedding
        await db.execute(sql`
          INSERT INTO rag_embeddings (
            source_type,
            source_id,
            embedding,
            metadata,
            embedding_model
          ) VALUES (
            ${validated.sourceType},
            ${validated.sourceId},
            ${JSON.stringify(validated.embedding)}::vector,
            ${JSON.stringify(validated.metadata || {})},
            ${this.EMBEDDING_MODEL}
          )
        `);

        logger.info('[RAGService] Embedding created', {
          sourceType: validated.sourceType,
          sourceId: validated.sourceId,
        });
      }
    } catch (error) {
      logger.error('[RAGService] Embedding upsert failed', { error });
      throw error;
    }
  }

  /**
   * Embed a session's userShortNote and store in rag_embeddings
   * @param sessionId - Session UUID
   * @param content - User's short note text
   */
  async embedSession(sessionId: string, content: string): Promise<void> {
    const validated = EmbedSessionInputSchema.parse({ sessionId, content });

    try {
      // Generate embedding
      const embedding = await this.generateEmbedding(validated.content);

      // Calculate hash for deduplication
      const contentHash = this.calculateHash(validated.content);

      // Store embedding
      await this.upsertEmbedding('session', validated.sessionId, embedding, {
        content: validated.content,
        contentHash,
        timestamp: new Date().toISOString(),
      });

      logger.info('[RAGService] Session embedded successfully', {
        sessionId: validated.sessionId,
        contentLength: validated.content.length,
      });
    } catch (error) {
      logger.error('[RAGService] Session embedding failed', {
        sessionId: validated.sessionId,
        error,
      });
      throw error;
    }
  }

  /**
   * Find similar logs using pgvector cosine similarity search
   * @param query - Search query text
   * @param limit - Number of results (default: 5)
   * @param threshold - Similarity threshold 0-1 (default: 0.7)
   * @returns Array of similar logs with similarity scores
   */
  async findSimilarLogs(
    query: string,
    limit: number = 5,
    threshold: number = 0.7
  ): Promise<SimilarLog[]> {
    // Input validation
    const validated = FindSimilarLogsInputSchema.parse({
      query,
      limit,
      threshold,
    });

    try {
      // 1. Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(validated.query);

      // 2. Perform vector similarity search using pgvector
      const results = await db.execute(sql`
        SELECT
          re.source_id as "logId",
          re.metadata->>'sessionId' as "sessionId",
          re.metadata->>'content' as "content",
          1 - (re.embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity,
          re.metadata
        FROM rag_embeddings re
        WHERE re.source_type = 'session'
          AND 1 - (re.embedding <=> ${JSON.stringify(queryEmbedding)}::vector) >= ${validated.threshold}
        ORDER BY re.embedding <=> ${JSON.stringify(queryEmbedding)}::vector
        LIMIT ${validated.limit}
      `);

      // 3. Parse and validate results
      const similarLogs: SimilarLog[] = results.rows.map((row) => {
        const typedRow = row as unknown as SimilaritySearchRow;
        return {
          logId: typedRow.logId,
          sessionId: typedRow.sessionId || typedRow.logId,
          content: typedRow.content || '',
          similarity:
            typeof typedRow.similarity === 'string'
              ? parseFloat(typedRow.similarity)
              : typedRow.similarity,
          metadata: (typedRow.metadata as Record<string, unknown>) || {},
        };
      });

      logger.info('[RAGService] Similar logs found', {
        queryLength: validated.query.length,
        resultCount: similarLogs.length,
        avgSimilarity:
          similarLogs.length > 0
            ? similarLogs.reduce((sum, log) => sum + log.similarity, 0) /
              similarLogs.length
            : 0,
      });

      return similarLogs;
    } catch (error) {
      logger.error('[RAGService] Similar logs search failed', { error });
      // Fallback: return empty array instead of throwing
      return [];
    }
  }

  /**
   * Get question templates by focus area
   * @param focusArea - Focus area (harmony, melody, etc.)
   * @param limit - Maximum number of templates (default: 3)
   * @returns Question templates sorted by priority
   */
  async getQuestionTemplates(
    focusArea: InterviewFocus,
    limit: number = 3
  ): Promise<QuestionTemplate[]> {
    try {
      const templates = await db
        .select({
          id: questionTemplates.id,
          text: questionTemplates.templateText,
          focus: questionTemplates.focus,
          depth: questionTemplates.depth,
          variables: questionTemplates.variables,
        })
        .from(questionTemplates)
        .where(
          and(
            eq(questionTemplates.focus, focusArea),
            eq(questionTemplates.enabled, true)
          )
        )
        .orderBy(desc(questionTemplates.priority))
        .limit(limit);

      return templates.map((template) => ({
        id: template.id,
        text: template.text,
        focus: template.focus,
        depth: template.depth,
        variables: (template.variables as Record<string, unknown>) || {},
      }));
    } catch (error) {
      logger.error('[RAGService] Template search failed', { error });
      return [];
    }
  }

  /**
   * Evaluate RAG quality metrics
   * @param query - Search query
   * @param groundTruth - Expected relevant session IDs
   * @param k - Top-K for evaluation (default: 5)
   * @returns RAG metrics (recall, precision, MRR, F1)
   */
  async evaluateRAGQuality(
    query: string,
    groundTruth: string[],
    k: number = 5
  ): Promise<RAGMetrics> {
    const results = await this.findSimilarLogs(query, k);
    const retrievedIds = results.map((log) => log.logId);

    return calculateRAGMetrics(retrievedIds, groundTruth, k);
  }

  /**
   * Check pgvector index usage (for debugging/optimization)
   * @param query - Sample query text
   * @returns EXPLAIN ANALYZE output
   */
  async checkIndexUsage(query: string): Promise<ExplainPlanRow | null> {
    try {
      const queryEmbedding = await this.generateEmbedding(query);

      const plan = await db.execute(sql`
        EXPLAIN (FORMAT JSON)
        SELECT
          re.source_id,
          1 - (re.embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
        FROM rag_embeddings re
        ORDER BY re.embedding <=> ${JSON.stringify(queryEmbedding)}::vector
        LIMIT 5
      `);

      return plan.rows[0] as unknown as ExplainPlanRow;
    } catch (error) {
      logger.error('[RAGService] Index usage check failed', { error });
      return null;
    }
  }

  /**
   * Batch embed multiple sessions with rate limiting
   * @param sessions - Array of {id, userShortNote} objects
   */
  async embedSessionsBatch(
    sessions: Array<{ id: string; userShortNote: string }>
  ): Promise<void> {
    logger.info('[RAGService] Batch embedding started', {
      count: sessions.length,
    });

    let successCount = 0;
    let failCount = 0;

    for (const session of sessions) {
      try {
        await this.embedSession(session.id, session.userShortNote);
        successCount++;

        // Rate limit: 50 requests/min → ~1.2s interval
        await new Promise((resolve) =>
          setTimeout(resolve, this.RATE_LIMIT_DELAY)
        );
      } catch (error) {
        failCount++;
        logger.error('[RAGService] Batch embedding failed for session', {
          sessionId: session.id,
          error,
        });
        // Continue with next session
      }
    }

    logger.info('[RAGService] Batch embedding completed', {
      total: sessions.length,
      success: successCount,
      failed: failCount,
    });
  }

  /**
   * Get embedding statistics
   * @returns Count of embeddings by source type
   */
  async getEmbeddingStats(): Promise<{
    sessions: number;
    templates: number;
    total: number;
  }> {
    try {
      const stats = await db.execute(sql`
        SELECT
          source_type,
          COUNT(*) as count
        FROM rag_embeddings
        GROUP BY source_type
      `);

      const sessionRow = stats.rows.find(
        (row) => (row as unknown as EmbeddingStatsRow).source_type === 'session'
      ) as unknown as EmbeddingStatsRow | undefined;
      const templateRow = stats.rows.find(
        (row) => (row as unknown as EmbeddingStatsRow).source_type === 'template'
      ) as unknown as EmbeddingStatsRow | undefined;

      const sessionCount = sessionRow?.count || 0;
      const templateCount = templateRow?.count || 0;

      return {
        sessions: Number(sessionCount),
        templates: Number(templateCount),
        total: Number(sessionCount) + Number(templateCount),
      };
    } catch (error) {
      logger.error('[RAGService] Stats retrieval failed', { error });
      return { sessions: 0, templates: 0, total: 0 };
    }
  }
}

// ========================================
// Singleton Export
// ========================================

export const ragService = new RAGService();

// ========================================
// Named Exports
// ========================================

export { RAGService };
export type { RAGMetrics };
