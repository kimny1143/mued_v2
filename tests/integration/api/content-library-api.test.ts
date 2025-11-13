/**
 * Content Library API Integration Tests
 *
 * Tests for the unified content fetching endpoint that powers the Library feature,
 * including content filtering, sorting, and pagination.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/content/route';
import type { ContentFetchParams, UnifiedContent } from '@/types/unified-content';

// Mock DI container and registry
const mockRegister = vi.fn();
const mockFetch = vi.fn();
const mockFetchAll = vi.fn();
const mockListSources = vi.fn();
const mockHealthCheckAll = vi.fn();

const mockContentFetcherRegistry = {
  register: mockRegister,
  fetch: mockFetch,
  fetchAll: mockFetchAll,
  listSources: mockListSources,
  healthCheckAll: mockHealthCheckAll,
};

const mockContainer = {
  get: vi.fn(() => mockContentFetcherRegistry),
};

vi.mock('@/lib/di', () => ({
  getContainer: () => mockContainer,
  TYPES: {
    ContentFetcherRegistry: Symbol('ContentFetcherRegistry'),
  },
}));

// Mock note content fetcher
vi.mock('@/lib/plugins/note/note-content-fetcher', () => ({
  NoteContentFetcher: vi.fn().mockImplementation(() => ({
    fetch: vi.fn(),
  })),
}));

// Mock Clerk authentication
const mockAuth = vi.fn();

vi.mock('@clerk/nextjs/server', async () => {
  const actual = await vi.importActual('@clerk/nextjs/server');
  return {
    ...actual,
    auth: () => mockAuth(),
  };
});

// Mock authentication (legacy)
const mockGetAuthenticatedUserWithE2E = vi.fn();
const mockIsE2ETestMode = vi.fn();

vi.mock('@/lib/auth', () => ({
  getAuthenticatedUserWithE2E: mockGetAuthenticatedUserWithE2E,
  isE2ETestMode: mockIsE2ETestMode,
}));

describe('Content Library API', () => {
  const sampleContent: UnifiedContent[] = [
    {
      id: 'content-1',
      title: 'Jazz Piano Basics',
      description: 'Learn the fundamentals of jazz piano',
      type: 'material',
      source: 'note',
      difficulty: 'beginner',
      category: 'piano',
      tags: ['jazz', 'piano', 'beginner'],
      author: 'John Doe',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
      url: 'https://note.com/user/n/jazz-piano-basics',
      thumbnailUrl: 'https://example.com/thumbnail1.jpg',
      metadata: {
        duration: 30,
        level: 'beginner',
        instrument: 'piano',
        genre: 'jazz',
      },
    },
    {
      id: 'content-2',
      title: 'Advanced Guitar Techniques',
      description: 'Master advanced guitar playing techniques',
      type: 'material',
      source: 'note',
      difficulty: 'advanced',
      category: 'guitar',
      tags: ['guitar', 'advanced', 'technique'],
      author: 'Jane Smith',
      createdAt: new Date('2024-01-14'),
      updatedAt: new Date('2024-01-14'),
      url: 'https://note.com/user/n/advanced-guitar',
      thumbnailUrl: 'https://example.com/thumbnail2.jpg',
      metadata: {
        duration: 45,
        level: 'advanced',
        instrument: 'guitar',
        genre: 'rock',
      },
    },
    {
      id: 'content-3',
      title: 'Music Theory Fundamentals',
      description: 'Understanding basic music theory concepts',
      type: 'note_article',
      source: 'note',
      difficulty: 'beginner',
      category: 'theory',
      tags: ['theory', 'beginner', 'fundamentals'],
      author: 'Dr. Music',
      createdAt: new Date('2024-01-13'),
      updatedAt: new Date('2024-01-13'),
      url: 'https://note.com/user/n/music-theory',
      metadata: {
        readTime: 15,
        level: 'beginner',
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup Clerk auth mock - must match withAuth's auth() structure
    mockAuth.mockReturnValue({
      userId: 'user-123',
    });

    // Setup default auth (legacy)
    mockIsE2ETestMode.mockReturnValue(false);
    mockGetAuthenticatedUserWithE2E.mockResolvedValue({
      id: 'user-123',
      clerkId: 'clerk-123',
      email: 'test@example.com',
      role: 'student',
    });

    // Setup default registry responses
    mockFetchAll.mockResolvedValue({
      contents: sampleContent,
      total: sampleContent.length,
      hasMore: false,
    });

    mockFetch.mockResolvedValue({
      contents: sampleContent,
      total: sampleContent.length,
      hasMore: false,
    });

    mockListSources.mockReturnValue(['note', 'youtube', 'spotify']);

    mockHealthCheckAll.mockResolvedValue({
      note: { status: 'healthy', latencyMs: 50 },
      youtube: { status: 'healthy', latencyMs: 100 },
      spotify: { status: 'error', error: 'API key not configured' },
    });
  });

  describe('GET /api/content', () => {
    it('should fetch all content for authenticated users', async () => {
      const request = new NextRequest('http://localhost:3000/api/content', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.contents).toHaveLength(3);
      expect(data.data.total).toBe(3);
      expect(data.data.hasMore).toBe(false);
    });

    it('should filter content by source', async () => {
      const filteredContent = sampleContent.filter(c => c.source === 'note');
      mockFetch.mockResolvedValueOnce({
        contents: filteredContent,
        total: filteredContent.length,
        hasMore: false,
      });

      const request = new NextRequest('http://localhost:3000/api/content?source=note', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith('note', expect.any(Object));
      expect(data.data.contents).toHaveLength(3);
    });

    it('should filter content by type', async () => {
      const filteredContent = sampleContent.filter(c => c.type === 'material');
      mockFetchAll.mockResolvedValueOnce({
        contents: filteredContent,
        total: filteredContent.length,
        hasMore: false,
      });

      const request = new NextRequest('http://localhost:3000/api/content?type=material', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockFetchAll).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'material',
        })
      );
    });

    it('should filter content by difficulty', async () => {
      const filteredContent = sampleContent.filter(c => c.difficulty === 'beginner');
      mockFetchAll.mockResolvedValueOnce({
        contents: filteredContent,
        total: filteredContent.length,
        hasMore: false,
      });

      const request = new NextRequest('http://localhost:3000/api/content?difficulty=beginner', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockFetchAll).toHaveBeenCalledWith(
        expect.objectContaining({
          difficulty: 'beginner',
        })
      );
    });

    it('should filter content by category', async () => {
      const filteredContent = sampleContent.filter(c => c.category === 'piano');
      mockFetchAll.mockResolvedValueOnce({
        contents: filteredContent,
        total: filteredContent.length,
        hasMore: false,
      });

      const request = new NextRequest('http://localhost:3000/api/content?category=piano', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockFetchAll).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'piano',
        })
      );
    });

    it('should filter content by tags', async () => {
      const filteredContent = sampleContent.filter(c =>
        c.tags?.some(tag => ['jazz', 'piano'].includes(tag))
      );
      mockFetchAll.mockResolvedValueOnce({
        contents: filteredContent,
        total: filteredContent.length,
        hasMore: false,
      });

      const request = new NextRequest('http://localhost:3000/api/content?tags=jazz,piano', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockFetchAll).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ['jazz', 'piano'],
        })
      );
    });

    it('should support search queries', async () => {
      const searchResults = sampleContent.filter(c =>
        c.title.toLowerCase().includes('piano') ||
        c.description?.toLowerCase().includes('piano')
      );
      mockFetchAll.mockResolvedValueOnce({
        contents: searchResults,
        total: searchResults.length,
        hasMore: false,
      });

      const request = new NextRequest('http://localhost:3000/api/content?search=piano', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockFetchAll).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'piano',
        })
      );
    });

    it('should sort content by date (default)', async () => {
      const sortedContent = [...sampleContent].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
      mockFetchAll.mockResolvedValueOnce({
        contents: sortedContent,
        total: sortedContent.length,
        hasMore: false,
      });

      const request = new NextRequest('http://localhost:3000/api/content?sortBy=date&sortOrder=desc', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockFetchAll).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'date',
          sortOrder: 'desc',
        })
      );
    });

    it('should sort content by title', async () => {
      const sortedContent = [...sampleContent].sort(
        (a, b) => a.title.localeCompare(b.title)
      );
      mockFetchAll.mockResolvedValueOnce({
        contents: sortedContent,
        total: sortedContent.length,
        hasMore: false,
      });

      const request = new NextRequest('http://localhost:3000/api/content?sortBy=title&sortOrder=asc', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockFetchAll).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'title',
          sortOrder: 'asc',
        })
      );
    });

    it('should support pagination with limit and offset', async () => {
      const paginatedContent = sampleContent.slice(1, 3);
      mockFetchAll.mockResolvedValueOnce({
        contents: paginatedContent,
        total: sampleContent.length,
        hasMore: true,
      });

      const request = new NextRequest('http://localhost:3000/api/content?limit=2&offset=1', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockFetchAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 2,
          offset: 1,
        })
      );
      expect(data.data.contents).toHaveLength(2);
      expect(data.data.hasMore).toBe(true);
    });

    it('should handle multiple filters simultaneously', async () => {
      const filteredContent = sampleContent.filter(
        c => c.type === 'material' &&
             c.difficulty === 'beginner' &&
             c.category === 'piano'
      );
      mockFetchAll.mockResolvedValueOnce({
        contents: filteredContent,
        total: filteredContent.length,
        hasMore: false,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/content?type=material&difficulty=beginner&category=piano',
        {
          method: 'GET',
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockFetchAll).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'material',
          difficulty: 'beginner',
          category: 'piano',
        })
      );
    });

    it('should return 401 for unauthenticated requests', async () => {
      // Mock unauthenticated state
      mockAuth.mockReturnValue({ userId: null });

      const request = new NextRequest('http://localhost:3000/api/content', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Unauthorized');
    });

    it('should handle empty results gracefully', async () => {
      mockFetchAll.mockResolvedValueOnce({
        contents: [],
        total: 0,
        hasMore: false,
      });

      const request = new NextRequest('http://localhost:3000/api/content?search=nonexistent', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.contents).toHaveLength(0);
      expect(data.data.total).toBe(0);
      expect(data.data.hasMore).toBe(false);
    });

    it('should handle fetcher errors gracefully', async () => {
      mockFetchAll.mockRejectedValueOnce(new Error('External API error'));

      const request = new NextRequest('http://localhost:3000/api/content', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('External API error');
    });
  });

  describe('POST /api/content', () => {
    it('should list available content sources', async () => {
      const request = new NextRequest('http://localhost:3000/api/content', {
        method: 'POST',
        body: JSON.stringify({ action: 'list-sources' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.sources).toEqual(['note', 'youtube', 'spotify']);
    });

    it('should perform health check on all sources', async () => {
      const request = new NextRequest('http://localhost:3000/api/content', {
        method: 'POST',
        body: JSON.stringify({ action: 'health-check' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.health).toHaveProperty('note');
      expect(data.data.health).toHaveProperty('youtube');
      expect(data.data.health).toHaveProperty('spotify');
      expect(data.data.health.note.status).toBe('healthy');
      expect(data.data.health.spotify.status).toBe('error');
    });

    it('should reject unknown actions', async () => {
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

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/content', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should return 401 for unauthenticated POST requests', async () => {
      // Mock unauthenticated state
      mockAuth.mockReturnValue({ userId: null });

      const request = new NextRequest('http://localhost:3000/api/content', {
        method: 'POST',
        body: JSON.stringify({ action: 'list-sources' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Unauthorized');
    });
  });

  describe('Content filtering combinations', () => {
    it('should handle instrument-specific material filtering', async () => {
      const pianoMaterials = sampleContent.filter(
        c => c.metadata?.instrument === 'piano' && c.type === 'material'
      );
      mockFetchAll.mockResolvedValueOnce({
        contents: pianoMaterials,
        total: pianoMaterials.length,
        hasMore: false,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/content?type=material&category=piano',
        {
          method: 'GET',
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.contents.every((c: UnifiedContent) =>
        c.metadata?.instrument === 'piano' || c.category === 'piano'
      )).toBe(true);
    });

    it('should handle genre-specific filtering', async () => {
      const jazzContent = sampleContent.filter(
        c => c.metadata?.genre === 'jazz' || c.tags?.includes('jazz')
      );
      mockFetchAll.mockResolvedValueOnce({
        contents: jazzContent,
        total: jazzContent.length,
        hasMore: false,
      });

      const request = new NextRequest('http://localhost:3000/api/content?tags=jazz', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.contents.some((c: UnifiedContent) =>
        c.metadata?.genre === 'jazz' || c.tags?.includes('jazz')
      )).toBe(true);
    });

    it('should handle difficulty progression queries', async () => {
      const beginnerContent = sampleContent.filter(c => c.difficulty === 'beginner');
      mockFetchAll.mockResolvedValueOnce({
        contents: beginnerContent,
        total: beginnerContent.length,
        hasMore: false,
      });

      const request = new NextRequest(
        'http://localhost:3000/api/content?difficulty=beginner&sortBy=date',
        {
          method: 'GET',
        }
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.contents.every((c: UnifiedContent) =>
        c.difficulty === 'beginner'
      )).toBe(true);
    });
  });

  describe('Error recovery and resilience', () => {
    it('should continue working if one source fails', async () => {
      // Simulate partial failure
      mockFetchAll.mockImplementation(async () => {
        // Return only content from working sources
        return {
          contents: sampleContent.filter(c => c.source === 'note'),
          total: sampleContent.filter(c => c.source === 'note').length,
          hasMore: false,
          errors: ['youtube: API error', 'spotify: Rate limited'],
        };
      });

      const request = new NextRequest('http://localhost:3000/api/content', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.contents.length).toBeGreaterThan(0);
    });

    it('should handle plugin initialization failures', async () => {
      // Force plugin initialization to fail
      mockContainer.get.mockImplementationOnce(() => {
        throw new Error('Plugin initialization failed');
      });

      const request = new NextRequest('http://localhost:3000/api/content', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it('should handle timeout scenarios gracefully', async () => {
      mockFetchAll.mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      const request = new NextRequest('http://localhost:3000/api/content', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Timeout');
    });
  });
});