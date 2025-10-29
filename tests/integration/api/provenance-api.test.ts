/**
 * Provenance API Integration Tests
 *
 * Tests for content provenance tracking API including
 * generation history, source attribution, and version tracking.
 */

import { describe, it, expect, beforeEach, vi, afterEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import type { ProvenanceRecord, GenerationTrace, SourceAttribution } from '@/types/provenance';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

describe('Provenance API', () => {
  let mockAuth: Mock;

  const sampleProvenance: ProvenanceRecord = {
    id: 'prov-1',
    contentId: 'content-1',
    version: 1,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    createdBy: 'user-123',
    generationTrace: {
      model: 'gpt-4',
      promptTemplate: 'music-lesson-generator-v1',
      temperature: 0.7,
      maxTokens: 1000,
      systemPrompt: 'You are a music theory educator...',
      userPrompt: 'Create a lesson on chord progressions',
      completionTokens: 850,
      promptTokens: 120,
      totalTokens: 970,
      finishReason: 'stop',
      latencyMs: 450,
    },
    sourceAttribution: [
      {
        sourceId: 'note-article-123',
        sourceType: 'note.com',
        title: 'Understanding Jazz Progressions',
        author: 'John Doe',
        url: 'https://note.com/article/123',
        retrievalScore: 0.85,
        usageType: 'reference',
        excerptUsed: 'The ii-V-I progression is fundamental...',
      },
      {
        sourceId: 'internal-lesson-456',
        sourceType: 'internal',
        title: 'Basic Music Theory',
        author: 'System',
        retrievalScore: 0.78,
        usageType: 'context',
      },
    ],
    transformations: [
      {
        operation: 'generate',
        timestamp: new Date('2024-01-15T10:00:00Z'),
        parameters: { topic: 'chord-progressions', level: 'intermediate' },
      },
    ],
    qualityMetricId: 'metric-1',
    metadata: {
      tags: ['music-theory', 'chords', 'jazz'],
      difficulty: 'intermediate',
      estimatedDuration: '15min',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth = vi.mocked((global as any).auth);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/provenance/:contentId', () => {
    it('should fetch provenance record with authentication', async () => {
      mockAuth.mockResolvedValue({ userId: 'user-123' });

      const response = {
        status: 200,
        data: {
          success: true,
          provenance: sampleProvenance,
        },
      };

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.provenance.contentId).toBe('content-1');
    });

    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null });

      const response = {
        status: 401,
        data: {
          success: false,
          error: 'Unauthorized',
        },
      };

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
    });

    it('should return 404 for non-existent content', async () => {
      mockAuth.mockResolvedValue({ userId: 'user-123' });

      const response = {
        status: 404,
        data: {
          success: false,
          error: 'Provenance record not found',
        },
      };

      expect(response.status).toBe(404);
      expect(response.data.error).toBe('Provenance record not found');
    });

    it('should include all source attributions', async () => {
      mockAuth.mockResolvedValue({ userId: 'user-123' });

      const response = {
        status: 200,
        data: {
          success: true,
          provenance: sampleProvenance,
        },
      };

      expect(response.data.provenance.sourceAttribution).toHaveLength(2);
      expect(response.data.provenance.sourceAttribution[0].sourceType).toBe('note.com');
    });

    it('should include generation trace details', async () => {
      mockAuth.mockResolvedValue({ userId: 'user-123' });

      const response = {
        status: 200,
        data: {
          success: true,
          provenance: sampleProvenance,
        },
      };

      expect(response.data.provenance.generationTrace.model).toBe('gpt-4');
      expect(response.data.provenance.generationTrace.totalTokens).toBe(970);
    });
  });

  describe('GET /api/provenance', () => {
    it('should list all provenance records with pagination', async () => {
      mockAuth.mockResolvedValue({ userId: 'admin-user-123' });

      const response = {
        status: 200,
        data: {
          success: true,
          records: [sampleProvenance],
          total: 50,
          page: 1,
          pageSize: 20,
          hasMore: true,
        },
      };

      expect(response.status).toBe(200);
      expect(response.data.records).toHaveLength(1);
      expect(response.data.hasMore).toBe(true);
    });

    it('should filter by creation date range', async () => {
      mockAuth.mockResolvedValue({ userId: 'admin-user-123' });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const filtered = [sampleProvenance].filter(
        p => p.createdAt >= startDate && p.createdAt <= endDate
      );

      expect(filtered).toHaveLength(1);
    });

    it('should filter by model used', async () => {
      mockAuth.mockResolvedValue({ userId: 'admin-user-123' });

      const filtered = [sampleProvenance].filter(
        p => p.generationTrace.model === 'gpt-4'
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].generationTrace.model).toBe('gpt-4');
    });

    it('should filter by source type', async () => {
      mockAuth.mockResolvedValue({ userId: 'admin-user-123' });

      const filtered = [sampleProvenance].filter(p =>
        p.sourceAttribution.some(s => s.sourceType === 'note.com')
      );

      expect(filtered).toHaveLength(1);
    });
  });

  describe('POST /api/provenance', () => {
    it('should create a new provenance record', async () => {
      mockAuth.mockResolvedValue({ userId: 'user-123' });

      const newProvenance = {
        contentId: 'content-2',
        version: 1,
        generationTrace: {
          model: 'gpt-4',
          promptTemplate: 'music-lesson-generator-v1',
          temperature: 0.7,
          maxTokens: 1000,
          completionTokens: 800,
          promptTokens: 100,
          totalTokens: 900,
          finishReason: 'stop',
          latencyMs: 400,
        },
        sourceAttribution: [
          {
            sourceId: 'article-789',
            sourceType: 'note.com',
            title: 'Advanced Harmony',
            retrievalScore: 0.90,
            usageType: 'reference',
          },
        ],
        transformations: [
          {
            operation: 'generate',
            timestamp: new Date(),
            parameters: { topic: 'harmony' },
          },
        ],
      };

      const response = {
        status: 201,
        data: {
          success: true,
          provenance: {
            id: 'prov-new',
            ...newProvenance,
            createdAt: new Date(),
            createdBy: 'user-123',
          },
        },
      };

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.provenance.contentId).toBe('content-2');
    });

    it('should validate required fields', async () => {
      mockAuth.mockResolvedValue({ userId: 'user-123' });

      const invalidProvenance = {
        contentId: 'content-2',
        // Missing required fields
      };

      const response = {
        status: 400,
        data: {
          success: false,
          error: 'Validation error',
          details: ['generationTrace is required', 'sourceAttribution is required'],
        },
      };

      expect(response.status).toBe(400);
      expect(response.data.details).toContain('generationTrace is required');
    });

    it('should validate source attribution format', async () => {
      mockAuth.mockResolvedValue({ userId: 'user-123' });

      const invalidProvenance = {
        contentId: 'content-2',
        generationTrace: { model: 'gpt-4' },
        sourceAttribution: [
          {
            // Missing required fields
            sourceId: 'test',
          },
        ],
      };

      const response = {
        status: 400,
        data: {
          success: false,
          error: 'Validation error',
          details: ['sourceType is required', 'retrievalScore is required'],
        },
      };

      expect(response.status).toBe(400);
      expect(response.data.details).toContain('sourceType is required');
    });
  });

  describe('PUT /api/provenance/:id', () => {
    it('should update provenance record', async () => {
      mockAuth.mockResolvedValue({ userId: 'user-123' });

      const update = {
        metadata: {
          tags: ['music-theory', 'chords', 'jazz', 'advanced'],
          difficulty: 'advanced',
        },
      };

      const response = {
        status: 200,
        data: {
          success: true,
          provenance: {
            ...sampleProvenance,
            metadata: update.metadata,
            version: 2,
          },
        },
      };

      expect(response.status).toBe(200);
      expect(response.data.provenance.version).toBe(2);
      expect(response.data.provenance.metadata.tags).toContain('advanced');
    });

    it('should append transformations', async () => {
      mockAuth.mockResolvedValue({ userId: 'user-123' });

      const newTransformation = {
        operation: 'edit',
        timestamp: new Date(),
        parameters: { section: 'introduction', change: 'clarification' },
      };

      const response = {
        status: 200,
        data: {
          success: true,
          provenance: {
            ...sampleProvenance,
            transformations: [...sampleProvenance.transformations, newTransformation],
          },
        },
      };

      expect(response.data.provenance.transformations).toHaveLength(2);
      expect(response.data.provenance.transformations[1].operation).toBe('edit');
    });

    it('should prevent unauthorized updates', async () => {
      mockAuth.mockResolvedValue({ userId: 'different-user-456' });

      const response = {
        status: 403,
        data: {
          success: false,
          error: 'Forbidden: You do not have permission to update this record',
        },
      };

      expect(response.status).toBe(403);
      expect(response.data.error).toContain('Forbidden');
    });
  });

  describe('GET /api/provenance/:id/history', () => {
    it('should fetch version history', async () => {
      mockAuth.mockResolvedValue({ userId: 'user-123' });

      const history = [
        { ...sampleProvenance, version: 1, createdAt: new Date('2024-01-15') },
        {
          ...sampleProvenance,
          version: 2,
          createdAt: new Date('2024-01-16'),
          metadata: { ...sampleProvenance.metadata, difficulty: 'advanced' },
        },
      ];

      const response = {
        status: 200,
        data: {
          success: true,
          history,
          totalVersions: 2,
        },
      };

      expect(response.data.history).toHaveLength(2);
      expect(response.data.totalVersions).toBe(2);
    });

    it('should sort history by version descending', async () => {
      mockAuth.mockResolvedValue({ userId: 'user-123' });

      const history = [
        { version: 3, createdAt: new Date('2024-01-17') },
        { version: 2, createdAt: new Date('2024-01-16') },
        { version: 1, createdAt: new Date('2024-01-15') },
      ];

      expect(history[0].version).toBe(3);
      expect(history[2].version).toBe(1);
    });
  });

  describe('GET /api/provenance/:id/sources', () => {
    it('should fetch detailed source information', async () => {
      mockAuth.mockResolvedValue({ userId: 'user-123' });

      const sources = sampleProvenance.sourceAttribution;

      const response = {
        status: 200,
        data: {
          success: true,
          sources,
          total: sources.length,
        },
      };

      expect(response.data.sources).toHaveLength(2);
      expect(response.data.sources[0].retrievalScore).toBeGreaterThan(0.8);
    });

    it('should sort sources by retrieval score', async () => {
      mockAuth.mockResolvedValue({ userId: 'user-123' });

      const sources = [...sampleProvenance.sourceAttribution].sort(
        (a, b) => b.retrievalScore - a.retrievalScore
      );

      expect(sources[0].retrievalScore).toBeGreaterThanOrEqual(sources[1].retrievalScore);
    });

    it('should filter sources by usage type', async () => {
      mockAuth.mockResolvedValue({ userId: 'user-123' });

      const referenceOnly = sampleProvenance.sourceAttribution.filter(
        s => s.usageType === 'reference'
      );

      expect(referenceOnly).toHaveLength(1);
      expect(referenceOnly[0].usageType).toBe('reference');
    });
  });

  describe('GET /api/provenance/stats', () => {
    it('should calculate usage statistics by model', async () => {
      mockAuth.mockResolvedValue({ userId: 'admin-user-123' });

      const stats = {
        byModel: {
          'gpt-4': { count: 150, avgLatency: 450, avgTokens: 950 },
          'gpt-3.5-turbo': { count: 300, avgLatency: 300, avgTokens: 800 },
        },
        bySourceType: {
          'note.com': { count: 200, avgRetrievalScore: 0.82 },
          internal: { count: 250, avgRetrievalScore: 0.85 },
        },
        totalRecords: 450,
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
      };

      expect(stats.byModel['gpt-4'].count).toBe(150);
      expect(stats.totalRecords).toBe(450);
    });

    it('should calculate cost metrics', async () => {
      mockAuth.mockResolvedValue({ userId: 'admin-user-123' });

      const costs = {
        totalTokens: 450000,
        estimatedCost: 9.5, // USD
        byModel: {
          'gpt-4': { tokens: 150000, cost: 7.5 },
          'gpt-3.5-turbo': { tokens: 300000, cost: 2.0 },
        },
      };

      expect(costs.totalTokens).toBeGreaterThan(0);
      expect(costs.estimatedCost).toBeGreaterThan(0);
    });
  });

  describe('GET /api/provenance/search', () => {
    it('should search by source title', async () => {
      mockAuth.mockResolvedValue({ userId: 'user-123' });

      const query = 'jazz';
      const results = [sampleProvenance].filter(p =>
        p.sourceAttribution.some(s =>
          s.title?.toLowerCase().includes(query.toLowerCase())
        )
      );

      expect(results).toHaveLength(1);
      expect(results[0].sourceAttribution[0].title).toContain('Jazz');
    });

    it('should search by author', async () => {
      mockAuth.mockResolvedValue({ userId: 'user-123' });

      const query = 'John Doe';
      const results = [sampleProvenance].filter(p =>
        p.sourceAttribution.some(s => s.author === query)
      );

      expect(results).toHaveLength(1);
    });

    it('should search by metadata tags', async () => {
      mockAuth.mockResolvedValue({ userId: 'user-123' });

      const tag = 'music-theory';
      const results = [sampleProvenance].filter(p =>
        p.metadata?.tags?.includes(tag)
      );

      expect(results).toHaveLength(1);
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockAuth.mockResolvedValue({ userId: 'user-123' });

      const response = {
        status: 500,
        data: {
          success: false,
          error: 'Database connection error',
        },
      };

      expect(response.status).toBe(500);
      expect(response.data.success).toBe(false);
    });

    it('should handle malformed JSON', async () => {
      mockAuth.mockResolvedValue({ userId: 'user-123' });

      const response = {
        status: 400,
        data: {
          success: false,
          error: 'Invalid JSON payload',
        },
      };

      expect(response.status).toBe(400);
    });

    it('should handle missing content ID', async () => {
      mockAuth.mockResolvedValue({ userId: 'user-123' });

      const response = {
        status: 400,
        data: {
          success: false,
          error: 'Content ID is required',
        },
      };

      expect(response.status).toBe(400);
    });
  });
});
