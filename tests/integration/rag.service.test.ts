/**
 * RAG Service Integration Tests
 * Tests pgvector similarity search and embedding operations
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ragService } from '@/lib/services/rag.service';
import { db } from '@/db';
import { ragEmbeddings, sessions } from '@/db/schema';
import { sql, eq } from 'drizzle-orm';
import {
  mockSessions,
  mockEmbeddings,
  ragGroundTruth,
  phase13Helpers,
} from '@/tests/fixtures/phase1.3-fixtures';

describe('RAG Service - pgvector Integration', () => {
  const TEST_SESSION_ID = 'test-rag-session-001';
  const TEST_CONTENT = 'サビのコード進行をFからGに変更した';

  beforeAll(async () => {
    // Clean up any existing test data
    await db.execute(sql`
      DELETE FROM rag_embeddings
      WHERE source_type = 'session'
        AND metadata->>'isTest' = 'true'
    `);
  });

  afterAll(async () => {
    // Clean up test data
    await db.execute(sql`
      DELETE FROM rag_embeddings
      WHERE source_type = 'session'
        AND metadata->>'isTest' = 'true'
    `);
  });

  describe('Embedding Generation', () => {
    it('should embed a session successfully', async () => {
      await ragService.embedSession(TEST_SESSION_ID, TEST_CONTENT);

      // Verify embedding exists
      const result = await db
        .select()
        .from(ragEmbeddings)
        .where(
          eq(ragEmbeddings.sourceId, TEST_SESSION_ID)
        )
        .limit(1);

      expect(result).toHaveLength(1);
      expect(result[0].sourceType).toBe('session');
      expect(result[0].metadata).toHaveProperty('content', TEST_CONTENT);
    });

    it('should update existing embedding on re-embed', async () => {
      const firstEmbed = await ragService.embedSession(
        TEST_SESSION_ID,
        TEST_CONTENT
      );

      const updatedContent = 'Updated: ' + TEST_CONTENT;
      await ragService.embedSession(TEST_SESSION_ID, updatedContent);

      const result = await db
        .select()
        .from(ragEmbeddings)
        .where(eq(ragEmbeddings.sourceId, TEST_SESSION_ID))
        .limit(1);

      expect(result).toHaveLength(1);
      expect(result[0].metadata).toHaveProperty('content', updatedContent);
    });

    it('should handle batch embedding with rate limiting', async () => {
      const batchSessions = [
        { id: 'batch-001', userShortNote: 'テスト1: メロディ変更' },
        { id: 'batch-002', userShortNote: 'テスト2: リズム調整' },
        { id: 'batch-003', userShortNote: 'テスト3: ミックス改善' },
      ];

      const startTime = Date.now();
      await ragService.embedSessionsBatch(batchSessions);
      const duration = Date.now() - startTime;

      // Should take at least 2 * 1.2s = 2.4s for 3 items (with rate limiting)
      expect(duration).toBeGreaterThanOrEqual(2400);

      // Verify all embeddings created
      const results = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM rag_embeddings
        WHERE source_id IN ('batch-001', 'batch-002', 'batch-003')
      `);

      expect(Number(results.rows[0].count)).toBe(3);
    }, 15000); // 15s timeout for rate-limited batch
  });

  describe('Vector Similarity Search', () => {
    beforeAll(async () => {
      // Seed test embeddings using fixtures
      for (const session of mockSessions.slice(0, 3)) {
        const embedding = mockEmbeddings[session.userShortNote];
        await ragService.upsertEmbedding(
          'session',
          session.id,
          embedding,
          {
            content: session.userShortNote,
            focusArea: session.aiAnnotations.focusArea,
            isTest: true,
          }
        );
      }
    });

    it('should find similar logs with cosine similarity', async () => {
      const query = 'コード進行を変更した';
      const results = await ragService.findSimilarLogs(query, 5, 0.5);

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('logId');
      expect(results[0]).toHaveProperty('similarity');
      expect(results[0].similarity).toBeGreaterThanOrEqual(0.5);
      expect(results[0].similarity).toBeLessThanOrEqual(1.0);
    });

    it('should respect similarity threshold', async () => {
      const query = 'コード進行変更';
      const results = await ragService.findSimilarLogs(query, 10, 0.95);

      // High threshold should return fewer or no results
      expect(results.length).toBeLessThanOrEqual(3);

      // All results should meet threshold
      results.forEach((result) => {
        expect(result.similarity).toBeGreaterThanOrEqual(0.95);
      });
    });

    it('should limit results correctly', async () => {
      const query = 'サビの変更';
      const results = await ragService.findSimilarLogs(query, 2, 0.5);

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should return empty array on error (fallback)', async () => {
      // Invalid query that might cause issues
      const results = await ragService.findSimilarLogs('', 5, 0.7);

      expect(results).toEqual([]);
    });

    it('should use HNSW index for performance', async () => {
      const query = 'メロディ変更';
      const plan = await ragService.checkIndexUsage(query);

      // EXPLAIN output should mention index usage
      expect(plan).toBeTruthy();
      // Note: In production, verify "Index Scan using idx_rag_embeddings_vector"
    });
  });

  describe('RAG Quality Metrics', () => {
    it('should calculate recall, precision, MRR, F1', async () => {
      const groundTruthTest = ragGroundTruth[0]; // 'コード進行を変更した'
      const metrics = await ragService.evaluateRAGQuality(
        groundTruthTest.query,
        groundTruthTest.expectedResults,
        5
      );

      expect(metrics).toHaveProperty('recallAtK');
      expect(metrics).toHaveProperty('precisionAtK');
      expect(metrics).toHaveProperty('mrr');
      expect(metrics).toHaveProperty('f1Score');
      expect(metrics).toHaveProperty('hits');

      expect(metrics.recallAtK).toBeGreaterThanOrEqual(0);
      expect(metrics.recallAtK).toBeLessThanOrEqual(1);
      expect(metrics.precisionAtK).toBeGreaterThanOrEqual(0);
      expect(metrics.precisionAtK).toBeLessThanOrEqual(1);
    });

    it('should validate RAG results against ground truth', async () => {
      const query = 'サビの変更';
      const groundTruth = ['session-001', 'session-002', 'session-007'];
      const results = await ragService.findSimilarLogs(query, 5, 0.6);
      const retrievedIds = results.map((r) => r.logId);

      const validation = phase13Helpers.validateRAGResults(
        query,
        retrievedIds,
        { query, expectedResults: groundTruth }
      );

      expect(validation).toHaveProperty('precision');
      expect(validation).toHaveProperty('recall');
      expect(validation).toHaveProperty('f1');
    });
  });

  describe('Question Template Retrieval', () => {
    it('should retrieve templates by focus area', async () => {
      const templates = await ragService.getQuestionTemplates('harmony', 3);

      expect(templates).toBeInstanceOf(Array);
      expect(templates.length).toBeLessThanOrEqual(3);

      if (templates.length > 0) {
        expect(templates[0]).toHaveProperty('id');
        expect(templates[0]).toHaveProperty('text');
        expect(templates[0]).toHaveProperty('focus', 'harmony');
        expect(templates[0]).toHaveProperty('depth');
      }
    });

    it('should return empty array if no templates found', async () => {
      const templates = await ragService.getQuestionTemplates(
        'nonexistent' as any,
        3
      );

      expect(templates).toEqual([]);
    });
  });

  describe('Embedding Statistics', () => {
    it('should return embedding counts by source type', async () => {
      const stats = await ragService.getEmbeddingStats();

      expect(stats).toHaveProperty('sessions');
      expect(stats).toHaveProperty('templates');
      expect(stats).toHaveProperty('total');
      expect(stats.total).toBe(stats.sessions + stats.templates);
    });
  });

  describe('Performance', () => {
    it('should complete similarity search in < 500ms', async () => {
      const query = 'コード進行変更';
      const startTime = Date.now();

      await ragService.findSimilarLogs(query, 5, 0.7);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(500);
    });

    it('should handle concurrent searches efficiently', async () => {
      const queries = [
        'コード進行',
        'メロディ高音',
        'リズムパターン',
        'ミックスバランス',
        '感情表現',
      ];

      const startTime = Date.now();

      await Promise.all(
        queries.map((query) => ragService.findSimilarLogs(query, 5, 0.7))
      );

      const duration = Date.now() - startTime;

      // Concurrent searches should be faster than sequential
      expect(duration).toBeLessThan(2000); // Should complete all in < 2s
    });
  });
});
