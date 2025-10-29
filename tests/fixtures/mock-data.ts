/**
 * Mock Data Fixtures
 *
 * Common test data for unit and integration tests
 */

import type { UnifiedContent } from '@/types/unified-content';
import type { PluginManifest, LoadedPlugin } from '@/types/plugin-system';

/**
 * Sample UnifiedContent fixtures
 */
export const mockUnifiedContent: {
  valid: UnifiedContent;
  aiGenerated: UnifiedContent;
  noteContent: UnifiedContent;
  minimal: UnifiedContent;
} = {
  valid: {
    id: 'test-content-123',
    source: 'internal',
    type: 'article',
    title: 'Introduction to Jazz Piano',
    description: 'Learn the fundamentals of jazz piano including chord progressions, scales, and improvisation techniques.',
    url: 'https://example.com/lessons/jazz-piano-intro',
    category: 'jazz',
    tags: ['piano', 'jazz', 'beginner', 'theory'],
    difficulty: 'beginner',
    publishedAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-20T15:30:00Z'),
    author: {
      id: 'author-123',
      name: 'John Doe',
      email: 'john@example.com',
      avatar: 'https://example.com/avatars/john.jpg',
    },
    thumbnail: 'https://example.com/thumbnails/jazz-piano.jpg',
    qualityScore: 8.5,
    relevanceScore: 0.92,
    viewCount: 1500,
    likeCount: 250,
    bookmarkCount: 85,
  },

  aiGenerated: {
    id: 'ai-content-456',
    source: 'ai_generated',
    type: 'practice',
    title: 'Scale Exercises for Beginners',
    description: 'AI-generated scale exercises tailored for beginner piano students.',
    content: 'C major scale: C D E F G A B C\nPractice with metronome at 60 BPM',
    category: 'technique',
    tags: ['scales', 'technique', 'beginner', 'ai-generated'],
    difficulty: 'beginner',
    publishedAt: new Date('2024-02-01T08:00:00Z'),
    author: {
      name: 'AI Assistant',
    },
    aiMetadata: {
      generatedBy: {
        model: 'gpt-4o-mini',
        provider: 'OpenAI',
        version: '2024-07-18',
        timestamp: new Date('2024-02-01T08:00:00Z'),
      },
      qualityScore: {
        playability: 8.5,
        learningValue: 9.0,
        accuracy: 9.5,
        overallStatus: 'approved',
      },
      humanReview: {
        reviewed: true,
        reviewedBy: 'teacher-789',
        reviewedAt: new Date('2024-02-02T10:00:00Z'),
        approved: true,
        comments: 'Excellent exercises for beginners',
      },
      regenerationCount: 1,
      sourceContext: {
        articleId: 'material-original-123',
        articleTitle: 'Piano Basics',
        url: '/dashboard/materials/material-original-123',
      },
    },
    qualityScore: 8.7,
    relevanceScore: 0.95,
    viewCount: 500,
    likeCount: 100,
    bookmarkCount: 30,
  },

  noteContent: {
    id: 'note-n789xyz',
    source: 'note',
    type: 'article',
    title: '初級ピアノレッスン：音楽理論の基礎',
    description: 'ピアノ初級者向けの基礎的な音楽理論について解説します。',
    url: 'https://note.com/mued_glasswerks/n/n789xyz',
    category: '音楽教育',
    tags: ['ピアノ', '初級', '理論'],
    difficulty: 'beginner',
    publishedAt: new Date('2024-01-10T09:00:00Z'),
    author: {
      name: 'MUED Glasswerks',
    },
    qualityScore: 8.0,
    relevanceScore: 1.0,
    viewCount: 0,
    likeCount: 0,
    bookmarkCount: 0,
  },

  minimal: {
    id: 'minimal-123',
    source: 'external',
    type: 'video',
    title: 'Quick Piano Tip',
    description: '',
    url: 'https://example.com/video',
    publishedAt: new Date('2024-03-01'),
  },
};

/**
 * Sample RSS Feed items
 */
export const mockRSSItems = {
  complete: {
    title: 'Complete RSS Article',
    link: 'https://note.com/user/n/nabc123',
    pubDate: 'Mon, 15 Jan 2024 10:00:00 GMT',
    content: '<p>This is the complete article content with <strong>HTML</strong> formatting.</p>',
    contentSnippet: 'This is the complete article content with HTML formatting.',
    guid: 'https://note.com/user/n/nabc123',
    categories: ['Music', 'Piano', 'Beginner'],
    creator: 'Test Author',
    isoDate: '2024-01-15T10:00:00.000Z',
  },

  minimal: {
    title: 'Minimal RSS Item',
    link: 'https://note.com/test/n/nxyz789',
  },

  japanese: {
    title: 'ジャズピアノ入門',
    link: 'https://note.com/jp/n/njp123',
    categories: ['音楽', '初級', 'ジャズ'],
    creator: '山田太郎',
    contentSnippet: 'ジャズピアノの基本的なコード進行とスケールについて解説します。',
  },
};

/**
 * Sample Plugin Manifests
 */
export const mockPluginManifests: {
  valid: PluginManifest;
  minimal: PluginManifest;
  invalid: Partial<PluginManifest>;
} = {
  valid: {
    id: 'test-plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    description: 'A plugin for testing purposes',
    author: 'Test Author',
    license: 'MIT',
    runtime: {
      minNodeVersion: '18.0.0',
      requiredEnvVars: ['API_KEY'],
      dependencies: {
        'rss-parser': '^3.13.0',
      },
    },
    capabilities: {
      supportsSearch: true,
      supportsFiltering: true,
      requiresAuth: false,
      cacheDuration: 3600,
      rateLimit: {
        requests: 100,
        period: 3600,
      },
    },
    entry: {
      fetcher: './fetcher.js',
      adapter: './adapter.js',
      validator: './validator.js',
    },
    configSchema: {
      type: 'object',
      properties: {
        apiUrl: { type: 'string' },
        timeout: { type: 'number' },
      },
    },
    permissions: {
      network: ['https://api.example.com'],
      fileSystem: 'read',
      env: ['API_KEY', 'API_SECRET'],
    },
  },

  minimal: {
    id: 'minimal-plugin',
    name: 'Minimal Plugin',
    version: '0.1.0',
    description: 'Minimal plugin configuration',
    author: 'Author',
    license: 'ISC',
    runtime: {},
    capabilities: {
      supportsSearch: false,
      supportsFiltering: false,
      requiresAuth: false,
      cacheDuration: 0,
    },
    entry: {
      fetcher: './index.js',
      adapter: './index.js',
    },
    permissions: {},
  },

  invalid: {
    // Missing required fields
    name: 'Invalid Plugin',
    version: '1.0.0',
    capabilities: {
      supportsSearch: 'yes' as any, // Invalid type
    },
  },
};

/**
 * Sample LoadedPlugin
 */
export const mockLoadedPlugin: LoadedPlugin = {
  manifest: mockPluginManifests.valid,
  fetcher: {
    fetch: vi.fn().mockResolvedValue({
      success: true,
      data: [mockUnifiedContent.noteContent],
      total: 1,
    }),
  },
  adapter: {
    adapt: vi.fn().mockReturnValue(mockUnifiedContent.noteContent),
    canAdapt: vi.fn().mockReturnValue(true),
  },
  validator: {
    validate: vi.fn().mockResolvedValue({
      valid: true,
      errors: [],
      warnings: [],
    }),
  },
  loadedAt: new Date('2024-01-01T00:00:00Z'),
  isActive: true,
};

/**
 * Sample API responses
 */
export const mockAPIResponses = {
  contentList: {
    success: true,
    data: [
      mockUnifiedContent.valid,
      mockUnifiedContent.aiGenerated,
      mockUnifiedContent.noteContent,
    ],
    total: 3,
    page: 1,
    pageSize: 20,
  },

  sourcesList: {
    success: true,
    sources: ['internal', 'ai_generated', 'note', 'external'],
  },

  healthCheck: {
    success: true,
    health: {
      internal: { healthy: true, latency: 50 },
      ai_generated: { healthy: true, latency: 200 },
      note: { healthy: true, latency: 150 },
      external: { healthy: false, latency: -1, error: 'Connection timeout' },
    },
  },

  shareSuccess: {
    success: true,
    contentId: 'material-shared-123',
    message: 'Material shared to Library successfully',
  },

  error: {
    success: false,
    error: 'Internal server error',
  },
};