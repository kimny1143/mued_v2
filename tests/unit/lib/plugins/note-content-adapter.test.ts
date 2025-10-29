/**
 * Note Content Adapter Unit Tests
 *
 * Tests for converting note.com RSS items to UnifiedContent
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NoteContentAdapter } from '@/lib/plugins/note/note-content-adapter';
import type { UnifiedContent } from '@/types/unified-content';

describe('NoteContentAdapter', () => {
  let adapter: NoteContentAdapter;

  // Sample RSS item for testing
  const sampleRSSItem = {
    title: 'ピアノ初級レッスン：基礎から始める音楽理論',
    link: 'https://note.com/mued_glasswerks/n/n123abc456',
    pubDate: 'Mon, 15 Jan 2024 10:00:00 GMT',
    content: '<p>この記事では、ピアノ初級者向けの基礎的な音楽理論について解説します。</p><p>音階、コード、リズムなど、重要な概念を分かりやすく説明します。</p>',
    contentSnippet: 'この記事では、ピアノ初級者向けの基礎的な音楽理論について解説します。音階、コード、リズムなど、重要な概念を分かりやすく説明します。',
    guid: 'https://note.com/mued_glasswerks/n/n123abc456',
    categories: ['音楽教育', 'ピアノ', '初級'],
    creator: '田中太郎',
    isoDate: '2024-01-15T10:00:00.000Z',
  };

  beforeEach(() => {
    adapter = new NoteContentAdapter();
  });

  describe('adapt()', () => {
    it('should convert RSS item to UnifiedContent', () => {
      const result = adapter.adapt(sampleRSSItem);

      expect(result).toBeDefined();
      expect(result.id).toBe('note-n123abc456');
      expect(result.source).toBe('note');
      expect(result.type).toBe('article');
      expect(result.title).toBe('ピアノ初級レッスン：基礎から始める音楽理論');
      expect(result.url).toBe('https://note.com/mued_glasswerks/n/n123abc456');
      expect(result.author.name).toBe('田中太郎');
      expect(result.category).toBe('音楽教育');
      expect(result.tags).toEqual(['ピアノ', '初級']);
      expect(result.publishedAt).toEqual(new Date('2024-01-15T10:00:00.000Z'));
    });

    it('should handle missing optional fields', () => {
      const minimalItem = {
        title: 'Minimal Article',
        link: 'https://note.com/user/n/nabc123',
      };

      const result = adapter.adapt(minimalItem);

      expect(result.id).toBe('note-nabc123');
      expect(result.title).toBe('Minimal Article');
      expect(result.description).toBe('');
      expect(result.author.name).toBe('MUED Glasswerks');
      expect(result.category).toBe('general');
      expect(result.tags).toEqual([]);
      expect(result.difficulty).toBe('beginner');
    });

    it('should clean HTML from description', () => {
      const itemWithHTML = {
        ...sampleRSSItem,
        contentSnippet: '<p>Some <strong>HTML</strong> content</p> with   extra    spaces',
      };

      const result = adapter.adapt(itemWithHTML);
      expect(result.description).toBe('Some HTML content with extra spaces');
    });

    it('should limit description to 300 characters', () => {
      const longDescription = 'a'.repeat(400);
      const itemWithLongDescription = {
        ...sampleRSSItem,
        contentSnippet: longDescription,
      };

      const result = adapter.adapt(itemWithLongDescription);
      expect(result.description).toHaveLength(300);
    });

    it('should use content as fallback for description', () => {
      const itemWithoutSnippet = {
        ...sampleRSSItem,
        contentSnippet: undefined,
        content: 'This is the content that should be used for description',
      };

      const result = adapter.adapt(itemWithoutSnippet);
      expect(result.description).toBe('This is the content that should be used for description');
    });

    it('should handle dates properly', () => {
      // Test with isoDate
      const withIsoDate = { ...sampleRSSItem };
      let result = adapter.adapt(withIsoDate);
      expect(result.publishedAt).toEqual(new Date('2024-01-15T10:00:00.000Z'));

      // Test with only pubDate
      const withPubDate = {
        ...sampleRSSItem,
        isoDate: undefined,
        pubDate: 'Mon, 15 Jan 2024 10:00:00 GMT',
      };
      result = adapter.adapt(withPubDate);
      expect(result.publishedAt).toBeInstanceOf(Date);

      // Test with no date (should use current date)
      const noDate = {
        ...sampleRSSItem,
        isoDate: undefined,
        pubDate: undefined,
      };
      const beforeAdapt = new Date();
      result = adapter.adapt(noDate);
      const afterAdapt = new Date();
      expect(result.publishedAt.getTime()).toBeGreaterThanOrEqual(beforeAdapt.getTime());
      expect(result.publishedAt.getTime()).toBeLessThanOrEqual(afterAdapt.getTime());
    });

    it('should set default values for metrics', () => {
      const result = adapter.adapt(sampleRSSItem);

      expect(result.relevanceScore).toBe(1.0);
      expect(result.qualityScore).toBe(8.0);
      expect(result.viewCount).toBe(0);
      expect(result.likeCount).toBe(0);
      expect(result.bookmarkCount).toBe(0);
    });
  });

  describe('canAdapt()', () => {
    it('should return true for valid RSS items', () => {
      expect(adapter.canAdapt(sampleRSSItem)).toBe(true);
    });

    it('should return true with only title and link', () => {
      const minimal = {
        title: 'Title',
        link: 'https://note.com/test',
      };
      expect(adapter.canAdapt(minimal)).toBe(true);
    });

    it('should return true with only title and guid', () => {
      const withGuid = {
        title: 'Title',
        guid: 'https://note.com/test',
      };
      expect(adapter.canAdapt(withGuid)).toBe(true);
    });

    it('should return false without title', () => {
      const noTitle = {
        link: 'https://note.com/test',
      };
      expect(adapter.canAdapt(noTitle)).toBe(false);
    });

    it('should return false without link or guid', () => {
      const noLink = {
        title: 'Title',
      };
      expect(adapter.canAdapt(noLink)).toBe(false);
    });
  });

  describe('extractId()', () => {
    it('should extract ID from note.com URL format', () => {
      // Access private method through type assertion
      const extractId = (adapter as any).extractId.bind(adapter);

      expect(extractId('https://note.com/mued_glasswerks/n/n123abc456')).toBe('note-n123abc456');
      expect(extractId('https://note.com/user/n/nxyz789')).toBe('note-nxyz789');
      expect(extractId('/n/nabcdef')).toBe('note-nabcdef');
    });

    it('should generate hash-based ID for non-standard URLs', () => {
      const extractId = (adapter as any).extractId.bind(adapter);
      const result = extractId('https://example.com/some-article');

      expect(result).toMatch(/^note-[a-z0-9]+$/);
      // Should produce consistent hash
      expect(extractId('https://example.com/some-article')).toBe(result);
    });
  });

  describe('extractDifficulty()', () => {
    it('should identify beginner level from tags', () => {
      const extractDifficulty = (adapter as any).extractDifficulty.bind(adapter);

      expect(extractDifficulty(['beginner'])).toBe('beginner');
      expect(extractDifficulty(['初級'])).toBe('beginner');
      expect(extractDifficulty(['入門'])).toBe('beginner');
      expect(extractDifficulty(['Beginner', 'Piano'])).toBe('beginner');
    });

    it('should identify intermediate level from tags', () => {
      const extractDifficulty = (adapter as any).extractDifficulty.bind(adapter);

      expect(extractDifficulty(['intermediate'])).toBe('intermediate');
      expect(extractDifficulty(['中級'])).toBe('intermediate');
      expect(extractDifficulty(['Intermediate', 'Jazz'])).toBe('intermediate');
    });

    it('should identify advanced level from tags', () => {
      const extractDifficulty = (adapter as any).extractDifficulty.bind(adapter);

      expect(extractDifficulty(['advanced'])).toBe('advanced');
      expect(extractDifficulty(['上級'])).toBe('advanced');
      expect(extractDifficulty(['応用'])).toBe('advanced');
      expect(extractDifficulty(['Advanced', 'Theory'])).toBe('advanced');
    });

    it('should default to beginner when no difficulty tag found', () => {
      const extractDifficulty = (adapter as any).extractDifficulty.bind(adapter);

      expect(extractDifficulty(['music', 'piano'])).toBe('beginner');
      expect(extractDifficulty([])).toBe('beginner');
    });

    it('should handle case-insensitive matching', () => {
      const extractDifficulty = (adapter as any).extractDifficulty.bind(adapter);

      expect(extractDifficulty(['BEGINNER'])).toBe('beginner');
      expect(extractDifficulty(['Advanced'])).toBe('advanced');
      expect(extractDifficulty(['InTeRmEdIaTe'])).toBe('intermediate');
    });
  });

  describe('cleanDescription()', () => {
    it('should remove HTML tags', () => {
      const cleanDescription = (adapter as any).cleanDescription.bind(adapter);

      expect(cleanDescription('<p>Hello</p>')).toBe('Hello');
      expect(cleanDescription('<strong>Bold</strong> text')).toBe('Bold text');
      expect(cleanDescription('No <script>alert("xss")</script> tags')).toBe('No alert("xss") tags');
    });

    it('should normalize whitespace', () => {
      const cleanDescription = (adapter as any).cleanDescription.bind(adapter);

      expect(cleanDescription('  Multiple   spaces  ')).toBe('Multiple spaces');
      expect(cleanDescription('Line\nbreaks\r\nand\ttabs')).toBe('Line breaks and tabs');
    });

    it('should limit to 300 characters', () => {
      const cleanDescription = (adapter as any).cleanDescription.bind(adapter);
      const longText = 'a'.repeat(400);

      const result = cleanDescription(longText);
      expect(result).toHaveLength(300);
      expect(result).toBe('a'.repeat(300));
    });

    it('should handle empty or whitespace-only text', () => {
      const cleanDescription = (adapter as any).cleanDescription.bind(adapter);

      expect(cleanDescription('')).toBe('');
      expect(cleanDescription('   ')).toBe('');
      expect(cleanDescription('\n\t\r')).toBe('');
    });
  });
});