/**
 * Content API Integration Tests
 *
 * Tests for the unified content API endpoint
 */

import { describe, it, expect, beforeEach, vi, afterEach, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/content/route';
import { getContainer } from '@/lib/di';
import type { ContentFetcherRegistry } from '@/lib/content';
import type { PluginLoader } from '@/lib/plugins';
import type { UnifiedContent } from '@/types/unified-content';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock the DI container
vi.mock('@/lib/di', () => ({
  getContainer: vi.fn(),
  TYPES: {
    ContentFetcherRegistry: Symbol('ContentFetcherRegistry'),
    PluginLoader: Symbol('PluginLoader'),
  },
}));

describe('Content API', () => {
  let mockAuth: Mock;
  let mockContainer: any;
  let mockFetcherRegistry: any;
  let mockPluginLoader: any;

  const sampleContent: UnifiedContent[] = [
    {
      id: 'content-1',
      source: 'note',
      type: 'article',
      title: 'Test Article 1',
      description: 'Description 1',
      url: 'https://note.com/test1',
      category: 'beginner',
      tags: ['piano', 'theory'],
      difficulty: 'beginner',
      publishedAt: new Date('2024-01-15'),
      author: {
        name: 'Author 1',
      },
      qualityScore: 8.5,
      relevanceScore: 0.9,
      viewCount: 100,
      likeCount: 20,
      bookmarkCount: 5,
    },
    {
      id: 'content-2',
      source: 'internal',
      type: 'lesson',
      title: 'Test Lesson 1',
      description: 'Description 2',
      content: 'ABC notation here',
      category: 'intermediate',
      tags: ['jazz', 'improvisation'],
      difficulty: 'intermediate',
      publishedAt: new Date('2024-01-10'),
      author: {
        name: 'Author 2',
      },
      qualityScore: 9.0,
      relevanceScore: 0.95,
      viewCount: 500,
      likeCount: 100,
      bookmarkCount: 30,
    },
  ];

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup auth mock
    mockAuth = vi.mocked((await import('@clerk/nextjs/server')).auth);
    mockAuth.mockResolvedValue({ userId: 'test-user-123' });

    // Setup mock fetcher registry
    mockFetcherRegistry = {
      register: vi.fn(),
      fetch: vi.fn().mockResolvedValue({
        success: true,
        data: sampleContent.filter(c => c.source === 'note'),
        total: 1,
      }),
      fetchAll: vi.fn().mockResolvedValue({
        success: true,
        data: sampleContent,
        total: 2,
      }),
      listSources: vi.fn().mockReturnValue(['note', 'internal', 'ai_generated']),
      healthCheckAll: vi.fn().mockResolvedValue({
        note: { healthy: true, latency: 100 },
        internal: { healthy: true, latency: 50 },
        ai_generated: { healthy: true, latency: 200 },
      }),
    };

    // Setup mock plugin loader
    mockPluginLoader = {
      load: vi.fn().mockResolvedValue({
        fetcher: {
          fetch: vi.fn(),
        },
        adapter: {},
      }),
    };

    // Setup mock container
    mockContainer = {
      get: vi.fn((type: symbol) => {
        if (type === Symbol.for('ContentFetcherRegistry')) {
          return mockFetcherRegistry;
        }
        if (type === Symbol.for('PluginLoader')) {
          return mockPluginLoader;
        }
        return null;
      }),
    };

    vi.mocked(getContainer).mockReturnValue(mockContainer);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/content', () => {
    it('should fetch content successfully with authentication', async () => {
      const request = new NextRequest('http://localhost:3000/api/content');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(sampleContent);
      expect(data.total).toBe(2);
    });

    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null });

      const request = new NextRequest('http://localhost:3000/api/content');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized');
    });

    it('should filter by source', async () => {
      const request = new NextRequest('http://localhost:3000/api/content?source=note');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockFetcherRegistry.fetch).toHaveBeenCalledWith('note', expect.any(Object));
      expect(data.data).toHaveLength(1);
      expect(data.data[0].source).toBe('note');
    });

    it('should handle query parameters correctly', async () => {
      const url = 'http://localhost:3000/api/content' +
        '?type=article' +
        '&category=beginner' +
        '&difficulty=beginner' +
        '&tags=piano,theory' +
        '&search=test' +
        '&sortBy=quality' +
        '&sortOrder=asc' +
        '&limit=10' +
        '&offset=5';

      const request = new NextRequest(url);
      await GET(request);

      expect(mockFetcherRegistry.fetchAll).toHaveBeenCalledWith({
        source: 'all',
        type: 'article',
        category: 'beginner',
        difficulty: 'beginner',
        tags: ['piano', 'theory'],
        search: 'test',
        sortBy: 'quality',
        sortOrder: 'asc',
        limit: 10,
        offset: 5,
      });
    });

    it('should use default values for missing parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/content');
      await GET(request);

      expect(mockFetcherRegistry.fetchAll).toHaveBeenCalledWith({
        source: 'all',
        type: null,
        category: undefined,
        difficulty: null,
        tags: undefined,
        search: undefined,
        sortBy: 'date',
        sortOrder: 'desc',
        limit: 20,
        offset: 0,
      });
    });

    it('should handle errors gracefully', async () => {
      mockFetcherRegistry.fetchAll.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/content');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database error');
    });

    it('should initialize plugins on first request', async () => {
      const request = new NextRequest('http://localhost:3000/api/content');
      await GET(request);

      expect(mockPluginLoader.load).toHaveBeenCalledWith('@/lib/plugins/note');
      expect(mockFetcherRegistry.register).toHaveBeenCalledWith('note', expect.any(Object));
    });

    it('should not reinitialize plugins on subsequent requests', async () => {
      const request1 = new NextRequest('http://localhost:3000/api/content');
      await GET(request1);

      const request2 = new NextRequest('http://localhost:3000/api/content');
      await GET(request2);

      // Plugin loader should only be called once
      expect(mockPluginLoader.load).toHaveBeenCalledTimes(1);
      expect(mockFetcherRegistry.register).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /api/content', () => {
    describe('list-sources action', () => {
      it('should list available content sources', async () => {
        const request = new NextRequest('http://localhost:3000/api/content', {
          method: 'POST',
          body: JSON.stringify({ action: 'list-sources' }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.sources).toEqual(['note', 'internal', 'ai_generated']);
      });

      it('should return 401 when not authenticated', async () => {
        mockAuth.mockResolvedValue({ userId: null });

        const request = new NextRequest('http://localhost:3000/api/content', {
          method: 'POST',
          body: JSON.stringify({ action: 'list-sources' }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Unauthorized');
      });
    });

    describe('health-check action', () => {
      it('should return health status of all sources', async () => {
        const request = new NextRequest('http://localhost:3000/api/content', {
          method: 'POST',
          body: JSON.stringify({ action: 'health-check' }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.health).toEqual({
          note: { healthy: true, latency: 100 },
          internal: { healthy: true, latency: 50 },
          ai_generated: { healthy: true, latency: 200 },
        });
      });

      it('should handle health check errors', async () => {
        mockFetcherRegistry.healthCheckAll.mockRejectedValue(new Error('Network error'));

        const request = new NextRequest('http://localhost:3000/api/content', {
          method: 'POST',
          body: JSON.stringify({ action: 'health-check' }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Network error');
      });
    });

    describe('unknown action', () => {
      it('should return 400 for unknown action', async () => {
        const request = new NextRequest('http://localhost:3000/api/content', {
          method: 'POST',
          body: JSON.stringify({ action: 'unknown-action' }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBe('Unknown action');
      });
    });
  });
});