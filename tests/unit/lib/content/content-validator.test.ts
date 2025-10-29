/**
 * Content Validator Unit Tests
 *
 * Tests for content validation and quality score calculation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContentValidator } from '@/lib/content/content-validator';
import type { UnifiedContent } from '@/types/unified-content';

// Mock DI decorators
vi.mock('@/lib/di', () => ({
  Injectable: () => (target: any) => target,
  Inject: () => () => {},
  TYPES: {
    PluginRegistry: Symbol('PluginRegistry'),
  },
}));

describe('ContentValidator', () => {
  let validator: ContentValidator;

  // Base valid content for testing
  const validContent: UnifiedContent = {
    id: 'test-123',
    source: 'internal',
    type: 'lesson',
    title: 'Test Content',
    description: 'This is a test content with a detailed description that is longer than 50 characters',
    url: 'https://example.com/content',
    category: 'beginner',
    tags: ['piano', 'jazz', 'theory'],
    difficulty: 'beginner',
    publishedAt: new Date('2024-01-15'),
    viewCount: 500,
    likeCount: 50,
    bookmarkCount: 20,
  };

  beforeEach(() => {
    validator = new ContentValidator();
  });

  describe('validate()', () => {
    it('should validate correct content without errors', async () => {
      const result = await validator.validate(validContent);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    describe('Required fields validation', () => {
      it('should return error for missing id', async () => {
        const content = { ...validContent, id: '' };
        const result = await validator.validate(content);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing required field: id');
      });

      it('should return error for missing source', async () => {
        const content = { ...validContent, source: '' as any };
        const result = await validator.validate(content);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing required field: source');
      });

      it('should return error for missing type', async () => {
        const content = { ...validContent, type: '' as any };
        const result = await validator.validate(content);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing required field: type');
      });

      it('should return error for missing or empty title', async () => {
        let result = await validator.validate({ ...validContent, title: '' });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing or empty required field: title');

        result = await validator.validate({ ...validContent, title: '   ' });
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing or empty required field: title');
      });

      it('should return error for missing publishedAt', async () => {
        const content = { ...validContent, publishedAt: undefined as any };
        const result = await validator.validate(content);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing required field: publishedAt');
      });
    });

    describe('Content validation', () => {
      it('should return error if both url and content are missing', async () => {
        const content = { ...validContent, url: undefined, content: undefined };
        const result = await validator.validate(content);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Either url or content must be provided');
      });

      it('should pass if only content is provided', async () => {
        const content = { ...validContent, url: undefined, content: 'ABC notation here' };
        const result = await validator.validate(content);

        expect(result.valid).toBe(true);
        expect(result.errors).not.toContain('Either url or content must be provided');
      });
    });

    describe('Warnings', () => {
      it('should return warning for missing description', async () => {
        const content = { ...validContent, description: '' };
        const result = await validator.validate(content);

        expect(result.valid).toBe(true);
        expect(result.warnings).toContain('Missing or empty description');
      });

      it('should return warning for missing category', async () => {
        const content = { ...validContent, category: '' };
        const result = await validator.validate(content);

        expect(result.valid).toBe(true);
        expect(result.warnings).toContain('Missing category');
      });

      it('should return warning for missing tags', async () => {
        const content = { ...validContent, tags: [] };
        const result = await validator.validate(content);

        expect(result.valid).toBe(true);
        expect(result.warnings).toContain('No tags provided');
      });

      it('should return warning for future publishedAt date', async () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        const content = { ...validContent, publishedAt: futureDate };
        const result = await validator.validate(content);

        expect(result.valid).toBe(true);
        expect(result.warnings).toContain('publishedAt is in the future');
      });
    });

    describe('AI metadata validation', () => {
      const aiContent: UnifiedContent = {
        ...validContent,
        source: 'ai_generated',
        aiMetadata: {
          generatedBy: 'gpt-4',
          generatedAt: new Date('2024-01-15'),
          qualityScore: {
            playability: 8.5,
            learningValue: 9.0,
            accuracy: 8.0,
          },
          humanReview: {
            reviewed: true,
            reviewedBy: 'teacher-123',
            reviewedAt: new Date('2024-01-16'),
            approved: true,
          },
        },
      };

      it('should validate AI content with proper metadata', async () => {
        const result = await validator.validate(aiContent);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should return error for AI content without metadata', async () => {
        const content = { ...aiContent, aiMetadata: undefined };
        const result = await validator.validate(content);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('AI-generated content must have aiMetadata');
      });

      it('should return error for missing generatedBy', async () => {
        const content = {
          ...aiContent,
          aiMetadata: { ...aiContent.aiMetadata!, generatedBy: '' },
        };
        const result = await validator.validate(content);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('aiMetadata.generatedBy is required');
      });

      it('should return error for missing qualityScore', async () => {
        const content = {
          ...aiContent,
          aiMetadata: { ...aiContent.aiMetadata!, qualityScore: undefined as any },
        };
        const result = await validator.validate(content);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('aiMetadata.qualityScore is required');
      });

      it('should validate quality score ranges', async () => {
        const content = {
          ...aiContent,
          aiMetadata: {
            ...aiContent.aiMetadata!,
            qualityScore: {
              playability: 11,
              learningValue: -1,
              accuracy: 15,
            },
          },
        };
        const result = await validator.validate(content);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('playability score must be between 0 and 10');
        expect(result.errors).toContain('learningValue score must be between 0 and 10');
        expect(result.errors).toContain('accuracy score must be between 0 and 10');
      });
    });

    describe('Score validations', () => {
      it('should validate qualityScore range', async () => {
        let content = { ...validContent, qualityScore: 11 };
        let result = await validator.validate(content);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('qualityScore must be between 0 and 10');

        content = { ...validContent, qualityScore: -1 };
        result = await validator.validate(content);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('qualityScore must be between 0 and 10');
      });

      it('should validate relevanceScore range', async () => {
        let content = { ...validContent, relevanceScore: 1.5 };
        let result = await validator.validate(content);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('relevanceScore must be between 0 and 1');

        content = { ...validContent, relevanceScore: -0.1 };
        result = await validator.validate(content);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('relevanceScore must be between 0 and 1');
      });
    });
  });

  describe('calculateQualityScore()', () => {
    it('should calculate base score of 5.0', () => {
      const minimalContent: UnifiedContent = {
        ...validContent,
        description: '',
        tags: [],
        category: '',
        difficulty: undefined,
        source: 'external',
        viewCount: 0,
        likeCount: 0,
        bookmarkCount: 0,
        publishedAt: new Date('2020-01-01'), // Old content
      };

      const score = validator.calculateQualityScore(minimalContent);
      expect(score).toBeLessThanOrEqual(5.0);
    });

    it('should add points for content completeness', () => {
      const completeContent: UnifiedContent = {
        ...validContent,
        description: 'A very detailed description that is definitely longer than 50 characters for testing',
        tags: ['piano', 'jazz', 'theory', 'advanced'],
        category: 'advanced',
        difficulty: 'advanced',
        source: 'external',
        viewCount: 0,
        likeCount: 0,
        bookmarkCount: 0,
      };

      const score = validator.calculateQualityScore(completeContent);
      expect(score).toBeGreaterThan(5.0);
    });

    it('should add points for source credibility', () => {
      const internalScore = validator.calculateQualityScore({ ...validContent, source: 'internal' });
      const partnerScore = validator.calculateQualityScore({ ...validContent, source: 'partner' });
      const noteScore = validator.calculateQualityScore({ ...validContent, source: 'note' });
      const externalScore = validator.calculateQualityScore({ ...validContent, source: 'external' });

      expect(internalScore).toBeGreaterThan(partnerScore);
      expect(partnerScore).toBeGreaterThan(noteScore);
      expect(noteScore).toBeGreaterThan(externalScore);
    });

    it('should calculate AI content score based on quality metrics', () => {
      const aiContent: UnifiedContent = {
        ...validContent,
        source: 'ai_generated',
        aiMetadata: {
          generatedBy: 'gpt-4',
          generatedAt: new Date(),
          qualityScore: {
            playability: 9.0,
            learningValue: 8.5,
            accuracy: 9.5,
          },
        },
      };

      const score = validator.calculateQualityScore(aiContent);
      expect(score).toBeGreaterThan(5.0);
    });

    it('should add points for engagement metrics', () => {
      const highEngagement: UnifiedContent = {
        ...validContent,
        viewCount: 2000,
        likeCount: 200,
        bookmarkCount: 100,
      };

      const lowEngagement: UnifiedContent = {
        ...validContent,
        viewCount: 10,
        likeCount: 1,
        bookmarkCount: 0,
      };

      const highScore = validator.calculateQualityScore(highEngagement);
      const lowScore = validator.calculateQualityScore(lowEngagement);

      expect(highScore).toBeGreaterThan(lowScore);
    });

    it('should consider content freshness', () => {
      const recentContent: UnifiedContent = {
        ...validContent,
        publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      };

      const oldContent: UnifiedContent = {
        ...validContent,
        publishedAt: new Date('2020-01-01'), // Very old
      };

      const recentScore = validator.calculateQualityScore(recentContent);
      const oldScore = validator.calculateQualityScore(oldContent);

      expect(recentScore).toBeGreaterThan(oldScore);
    });

    it('should cap score at 10.0', () => {
      const perfectContent: UnifiedContent = {
        ...validContent,
        description: 'An incredibly detailed description that provides comprehensive information about the content',
        tags: ['piano', 'jazz', 'theory', 'advanced', 'masterclass'],
        category: 'masterclass',
        difficulty: 'advanced',
        source: 'internal',
        viewCount: 10000,
        likeCount: 1000,
        bookmarkCount: 500,
        publishedAt: new Date(), // Just published
      };

      const score = validator.calculateQualityScore(perfectContent);
      expect(score).toBeLessThanOrEqual(10.0);
    });

    it('should not go below 0.0', () => {
      const worstContent: UnifiedContent = {
        ...validContent,
        description: '',
        tags: [],
        category: '',
        difficulty: undefined,
        source: 'external',
        viewCount: 0,
        likeCount: 0,
        bookmarkCount: 0,
        publishedAt: new Date('2015-01-01'), // Very old
      };

      const score = validator.calculateQualityScore(worstContent);
      expect(score).toBeGreaterThanOrEqual(0.0);
    });
  });
});