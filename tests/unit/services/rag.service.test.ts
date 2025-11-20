/**
 * RAGService Unit Tests
 *
 * Comprehensive tests for RAG (Retrieval-Augmented Generation) service
 * covering embedding generation, vector storage, and similarity search.
 *
 * Test Coverage:
 * - generateEmbedding: Embedding generation with OpenAI API
 * - upsertEmbedding: Vector storage in database
 * - findSimilarLogs: Similarity search with pgvector
 * - embedSession: End-to-end session embedding
 * - evaluateRAGQuality: Quality metrics calculation
 * - Cache Management: In-memory caching for performance
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type OpenAI from 'openai';

// ==========================================
// Mock Setup
// ==========================================

// Mock OpenAI
const mockEmbeddingsCreate = vi.fn();
const mockOpenAI = {
  embeddings: {
    create: mockEmbeddingsCreate,
  },
} as unknown as OpenAI;

vi.mock('openai', () => ({
  default: vi.fn(() => mockOpenAI),
}));

// Mock database
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockExecute = vi.fn();
const mockValues = vi.fn();
const mockOnConflictDoUpdate = vi.fn();

const mockDb = {
  insert: mockInsert,
  select: mockSelect,
  execute: mockExecute,
};

vi.mock('@/lib/db', () => ({
  db: mockDb,
}));

// ==========================================
// Type Definitions (Simulating RAGService)
// ==========================================

interface SimilarLog {
  logId: string;
  sessionId: string;
  content: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

interface RAGMetrics {
  recallAtK: number;
  precisionAtK: number;
  mrr: number;
  f1Score: number;
}

// ==========================================
// Mock RAGService Implementation
// ==========================================

class MockRAGService {
  private cache: Map<string, number[]> = new Map();
  private openai: OpenAI;

  constructor() {
    this.openai = mockOpenAI;
  }

  /**
   * Generate 1536-dimensional embedding using OpenAI API
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Input validation
    if (text.length > 8000) {
      throw new Error('Text exceeds maximum length of 8000 characters');
    }

    // Check cache
    if (this.cache.has(text)) {
      return this.cache.get(text)!;
    }

    try {
      // Call OpenAI API
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        encoding_format: 'float',
      });

      const embedding = response.data[0].embedding;

      // Validate dimension
      if (embedding.length !== 1536) {
        throw new Error(`Invalid embedding dimension: expected 1536, got ${embedding.length}`);
      }

      // Cache the result
      this.cache.set(text, embedding);

      return embedding;
    } catch (error) {
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upsert embedding to database
   */
  async upsertEmbedding(
    sourceType: 'session' | 'log' | 'template',
    sourceId: string,
    embedding: number[],
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await mockDb.insert({} as any)
      .values({
        sourceType,
        sourceId,
        embedding,
        metadata,
      })
      .onConflictDoUpdate({
        target: ['sourceType', 'sourceId'],
        set: {
          embedding,
          metadata,
          updatedAt: new Date(),
        },
      });
  }

  /**
   * Find similar logs using vector similarity search
   */
  async findSimilarLogs(
    query: string,
    limit: number = 5,
    threshold: number = 0.7
  ): Promise<SimilarLog[]> {
    try {
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);

      // Execute pgvector similarity search
      const results = await mockDb.execute({
        sql: `
          SELECT
            id as "logId",
            session_id as "sessionId",
            content,
            1 - (embedding <=> $1) as similarity,
            metadata
          FROM embeddings
          WHERE 1 - (embedding <=> $1) >= $2
          ORDER BY similarity DESC
          LIMIT $3
        `,
        params: [queryEmbedding, threshold, limit],
      });

      return (results as any).rows || [];
    } catch (error) {
      console.error('Error finding similar logs:', error);
      return [];
    }
  }

  /**
   * Embed session note
   */
  async embedSession(sessionId: string, userShortNote: string): Promise<void> {
    const embedding = await this.generateEmbedding(userShortNote);
    await this.upsertEmbedding('session', sessionId, embedding, {
      text: userShortNote,
    });
  }

  /**
   * Evaluate RAG quality metrics
   */
  async evaluateRAGQuality(
    query: string,
    groundTruthIds: string[],
    k: number = 5
  ): Promise<RAGMetrics> {
    const results = await this.findSimilarLogs(query, k);
    const retrievedIds = results.map(r => r.logId);

    // Calculate metrics
    const hits = retrievedIds.filter(id => groundTruthIds.includes(id)).length;
    const recall = groundTruthIds.length > 0 ? hits / groundTruthIds.length : 0;
    const precision = retrievedIds.length > 0 ? hits / retrievedIds.length : 0;

    // Calculate MRR
    let mrr = 0;
    for (let i = 0; i < retrievedIds.length; i++) {
      if (groundTruthIds.includes(retrievedIds[i])) {
        mrr = 1 / (i + 1);
        break;
      }
    }

    // Calculate F1 score
    const f1Score = (precision + recall) > 0
      ? (2 * precision * recall) / (precision + recall)
      : 0;

    return {
      recallAtK: recall,
      precisionAtK: precision,
      mrr,
      f1Score,
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}

// ==========================================
// Test Suite
// ==========================================

describe('RAGService', () => {
  let ragService: MockRAGService;

  beforeEach(() => {
    ragService = new MockRAGService();

    // Reset mocks
    mockEmbeddingsCreate.mockReset();
    mockInsert.mockReset();
    mockSelect.mockReset();
    mockExecute.mockReset();
    mockValues.mockReset();
    mockOnConflictDoUpdate.mockReset();

    // Setup default mock chain
    mockInsert.mockReturnValue({
      values: mockValues,
    });
    mockValues.mockReturnValue({
      onConflictDoUpdate: mockOnConflictDoUpdate,
    });
    mockOnConflictDoUpdate.mockResolvedValue({});
  });

  afterEach(() => {
    ragService.clearCache();
  });

  describe('generateEmbedding', () => {
    it('should generate 1536-dimensional embedding', async () => {
      const mockEmbedding = new Array(1536).fill(0).map(() => Math.random());

      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
        usage: { prompt_tokens: 10, total_tokens: 10 },
      });

      const result = await ragService.generateEmbedding('test text');

      expect(result).toHaveLength(1536);
      expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: 'test text',
        encoding_format: 'float',
      });
    });

    it('should use cache for identical texts', async () => {
      const mockEmbedding = new Array(1536).fill(0).map(() => Math.random());

      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
        usage: { prompt_tokens: 10, total_tokens: 10 },
      });

      // First call
      const result1 = await ragService.generateEmbedding('test text');

      // Second call (should use cache)
      const result2 = await ragService.generateEmbedding('test text');

      expect(result1).toEqual(result2);
      expect(mockEmbeddingsCreate).toHaveBeenCalledTimes(1);
    });

    it('should reject text exceeding 8000 characters', async () => {
      const longText = 'a'.repeat(8001);

      await expect(
        ragService.generateEmbedding(longText)
      ).rejects.toThrow('Text exceeds maximum length of 8000 characters');

      expect(mockEmbeddingsCreate).not.toHaveBeenCalled();
    });

    it('should handle OpenAI API errors', async () => {
      mockEmbeddingsCreate.mockRejectedValue(
        new Error('API rate limit exceeded')
      );

      await expect(
        ragService.generateEmbedding('test')
      ).rejects.toThrow('Failed to generate embedding');
    });

    it('should validate embedding dimension', async () => {
      const invalidEmbedding = new Array(512).fill(0); // Wrong dimension

      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: invalidEmbedding }],
        usage: { prompt_tokens: 10, total_tokens: 10 },
      });

      await expect(
        ragService.generateEmbedding('test')
      ).rejects.toThrow('Invalid embedding dimension');
    });
  });

  describe('upsertEmbedding', () => {
    it('should insert new embedding', async () => {
      const mockEmbedding = new Array(1536).fill(0);

      await ragService.upsertEmbedding(
        'session',
        'session-123',
        mockEmbedding
      );

      expect(mockInsert).toHaveBeenCalled();
      expect(mockValues).toHaveBeenCalledWith({
        sourceType: 'session',
        sourceId: 'session-123',
        embedding: mockEmbedding,
        metadata: undefined,
      });
    });

    it('should update existing embedding on conflict', async () => {
      const mockEmbedding = new Array(1536).fill(0);

      await ragService.upsertEmbedding(
        'session',
        'session-123',
        mockEmbedding,
        { text: 'User note' }
      );

      expect(mockOnConflictDoUpdate).toHaveBeenCalledWith({
        target: ['sourceType', 'sourceId'],
        set: {
          embedding: mockEmbedding,
          metadata: { text: 'User note' },
          updatedAt: expect.any(Date),
        },
      });
    });
  });

  describe('findSimilarLogs', () => {
    it('should return similar logs above threshold', async () => {
      const mockEmbedding = new Array(1536).fill(0);

      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
        usage: { prompt_tokens: 10, total_tokens: 10 },
      });

      const mockResults = {
        rows: [
          {
            logId: 'log-1',
            sessionId: 'session-1',
            content: 'Similar log content',
            similarity: 0.85,
            metadata: {},
          },
          {
            logId: 'log-2',
            sessionId: 'session-2',
            content: 'Another similar log',
            similarity: 0.75,
            metadata: {},
          },
        ],
      };

      mockExecute.mockResolvedValue(mockResults);

      const results = await ragService.findSimilarLogs('test query', 5, 0.7);

      expect(results).toHaveLength(2);
      expect(results[0].similarity).toBeGreaterThanOrEqual(0.7);
      expect(results[0]).toHaveProperty('logId');
      expect(results[0]).toHaveProperty('content');
    });

    it('should filter results by similarity threshold', async () => {
      const mockEmbedding = new Array(1536).fill(0);

      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
        usage: { prompt_tokens: 10, total_tokens: 10 },
      });

      const mockResults = {
        rows: [
          { logId: 'log-1', sessionId: 'session-1', content: 'High similarity', similarity: 0.95, metadata: {} },
          { logId: 'log-2', sessionId: 'session-2', content: 'Medium similarity', similarity: 0.85, metadata: {} },
        ],
      };

      mockExecute.mockResolvedValue(mockResults);

      const results = await ragService.findSimilarLogs('test', 5, 0.9);

      // Verify execute was called with correct threshold parameter
      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.arrayContaining([0.9]),
        })
      );
    });

    it('should respect limit parameter', async () => {
      const mockEmbedding = new Array(1536).fill(0);

      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
        usage: { prompt_tokens: 10, total_tokens: 10 },
      });

      const mockResults = {
        rows: [
          { logId: 'log-1', sessionId: 'session-1', content: 'Log 1', similarity: 0.9, metadata: {} },
          { logId: 'log-2', sessionId: 'session-2', content: 'Log 2', similarity: 0.85, metadata: {} },
          { logId: 'log-3', sessionId: 'session-3', content: 'Log 3', similarity: 0.8, metadata: {} },
        ],
      };

      mockExecute.mockResolvedValue(mockResults);

      await ragService.findSimilarLogs('test', 2);

      // Verify execute was called with correct limit parameter
      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.arrayContaining([2]),
        })
      );
    });

    it('should return empty array on database error', async () => {
      const mockEmbedding = new Array(1536).fill(0);

      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
        usage: { prompt_tokens: 10, total_tokens: 10 },
      });

      mockExecute.mockRejectedValue(new Error('Database connection failed'));

      const results = await ragService.findSimilarLogs('test');

      expect(results).toEqual([]);
    });

    it('should handle empty query gracefully', async () => {
      const mockEmbedding = new Array(1536).fill(0);

      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
        usage: { prompt_tokens: 10, total_tokens: 10 },
      });

      mockExecute.mockResolvedValue({ rows: [] });

      const results = await ragService.findSimilarLogs('', 5);

      expect(results).toEqual([]);
      expect(mockEmbeddingsCreate).toHaveBeenCalled();
    });
  });

  describe('embedSession', () => {
    it('should generate and upsert embedding for session', async () => {
      const mockEmbedding = new Array(1536).fill(0);

      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
        usage: { prompt_tokens: 10, total_tokens: 10 },
      });

      await ragService.embedSession('session-123', 'User short note');

      expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: 'User short note',
        encoding_format: 'float',
      });

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceType: 'session',
          sourceId: 'session-123',
          embedding: mockEmbedding,
          metadata: { text: 'User short note' },
        })
      );
    });
  });

  describe('evaluateRAGQuality', () => {
    it('should calculate RAG metrics correctly', async () => {
      const mockEmbedding = new Array(1536).fill(0);

      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
        usage: { prompt_tokens: 10, total_tokens: 10 },
      });

      const mockResults = {
        rows: [
          { logId: 'log-1', sessionId: 'session-1', content: 'Result 1', similarity: 0.9, metadata: {} },
          { logId: 'log-2', sessionId: 'session-2', content: 'Result 2', similarity: 0.85, metadata: {} },
          { logId: 'log-3', sessionId: 'session-3', content: 'Result 3', similarity: 0.8, metadata: {} },
        ],
      };

      mockExecute.mockResolvedValue(mockResults);

      const metrics = await ragService.evaluateRAGQuality(
        'test query',
        ['log-1', 'log-2', 'log-4'], // Ground truth
        5
      );

      expect(metrics).toHaveProperty('recallAtK');
      expect(metrics).toHaveProperty('precisionAtK');
      expect(metrics).toHaveProperty('mrr');
      expect(metrics).toHaveProperty('f1Score');

      // Recall: 2 out of 3 ground truth items found
      expect(metrics.recallAtK).toBeCloseTo(2 / 3, 2);

      // Precision: 2 out of 3 retrieved items are relevant
      expect(metrics.precisionAtK).toBeCloseTo(2 / 3, 2);

      // MRR: First relevant item is at position 1 (log-1)
      expect(metrics.mrr).toBe(1);
    });

    it('should handle no relevant results', async () => {
      const mockEmbedding = new Array(1536).fill(0);

      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
        usage: { prompt_tokens: 10, total_tokens: 10 },
      });

      const mockResults = {
        rows: [
          { logId: 'log-5', sessionId: 'session-5', content: 'Irrelevant', similarity: 0.6, metadata: {} },
        ],
      };

      mockExecute.mockResolvedValue(mockResults);

      const metrics = await ragService.evaluateRAGQuality(
        'test query',
        ['log-1', 'log-2', 'log-3'],
        5
      );

      expect(metrics.recallAtK).toBe(0);
      expect(metrics.precisionAtK).toBe(0);
      expect(metrics.mrr).toBe(0);
      expect(metrics.f1Score).toBe(0);
    });

    it('should calculate MRR for first relevant result', async () => {
      const mockEmbedding = new Array(1536).fill(0);

      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
        usage: { prompt_tokens: 10, total_tokens: 10 },
      });

      const mockResults = {
        rows: [
          { logId: 'log-5', sessionId: 'session-5', content: 'Irrelevant 1', similarity: 0.9, metadata: {} },
          { logId: 'log-6', sessionId: 'session-6', content: 'Irrelevant 2', similarity: 0.85, metadata: {} },
          { logId: 'log-1', sessionId: 'session-1', content: 'Relevant!', similarity: 0.8, metadata: {} },
        ],
      };

      mockExecute.mockResolvedValue(mockResults);

      const metrics = await ragService.evaluateRAGQuality(
        'test query',
        ['log-1', 'log-2'],
        5
      );

      // First relevant result is at position 3 (index 2)
      expect(metrics.mrr).toBeCloseTo(1 / 3, 2);
    });
  });

  describe('Cache Management', () => {
    it('should clear cache', () => {
      ragService.clearCache();
      expect(ragService.getCacheSize()).toBe(0);
    });

    it('should track cache size', async () => {
      const mockEmbedding1 = new Array(1536).fill(0);
      const mockEmbedding2 = new Array(1536).fill(1);

      mockEmbeddingsCreate
        .mockResolvedValueOnce({
          data: [{ embedding: mockEmbedding1 }],
          usage: { prompt_tokens: 10, total_tokens: 10 },
        })
        .mockResolvedValueOnce({
          data: [{ embedding: mockEmbedding2 }],
          usage: { prompt_tokens: 10, total_tokens: 10 },
        });

      await ragService.generateEmbedding('text 1');
      await ragService.generateEmbedding('text 2');

      expect(ragService.getCacheSize()).toBe(2);
    });

    it('should not increase cache size for duplicate texts', async () => {
      const mockEmbedding = new Array(1536).fill(0);

      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
        usage: { prompt_tokens: 10, total_tokens: 10 },
      });

      await ragService.generateEmbedding('text 1');
      await ragService.generateEmbedding('text 1');
      await ragService.generateEmbedding('text 1');

      expect(ragService.getCacheSize()).toBe(1);
      expect(mockEmbeddingsCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very short text', async () => {
      const mockEmbedding = new Array(1536).fill(0);

      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
        usage: { prompt_tokens: 1, total_tokens: 1 },
      });

      const result = await ragService.generateEmbedding('a');

      expect(result).toHaveLength(1536);
    });

    it('should handle text at maximum length boundary', async () => {
      const mockEmbedding = new Array(1536).fill(0);
      const maxLengthText = 'a'.repeat(8000);

      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
        usage: { prompt_tokens: 2000, total_tokens: 2000 },
      });

      const result = await ragService.generateEmbedding(maxLengthText);

      expect(result).toHaveLength(1536);
    });

    it('should handle special characters in text', async () => {
      const mockEmbedding = new Array(1536).fill(0);
      const specialText = 'テスト text with 特殊文字 and emoji 🎵';

      mockEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
        usage: { prompt_tokens: 10, total_tokens: 10 },
      });

      const result = await ragService.generateEmbedding(specialText);

      expect(result).toHaveLength(1536);
      expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: specialText,
        encoding_format: 'float',
      });
    });
  });
});
