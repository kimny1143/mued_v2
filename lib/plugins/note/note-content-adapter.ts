/**
 * Note.com Content Adapter
 * note.comコンテンツアダプター
 *
 * Adapts note.com RSS items to UnifiedContent schema
 */

import type { IContentAdapter } from '@/lib/content';
import type { UnifiedContent } from '@/types/unified-content';

interface NoteRSSItem {
  title?: string;
  link?: string;
  pubDate?: string;
  content?: string;
  contentSnippet?: string;
  guid?: string;
  categories?: string[];
  creator?: string;
  isoDate?: string;
}

export class NoteContentAdapter implements IContentAdapter<NoteRSSItem> {
  /**
   * Adapt note.com RSS item to UnifiedContent
   * note.com RSSアイテムをUnifiedContentに変換
   */
  adapt(source: NoteRSSItem): UnifiedContent {
    // Extract ID from GUID or link
    const id = this.extractId(source.guid || source.link || '');

    // Parse categories and tags
    const categories = source.categories || [];
    const primaryCategory = categories[0] || 'general';
    const tags = categories.slice(1);

    // Determine difficulty from tags
    const difficulty = this.extractDifficulty(tags);

    // Parse publish date
    const publishedAt = source.isoDate
      ? new Date(source.isoDate)
      : source.pubDate
      ? new Date(source.pubDate)
      : new Date();

    // Extract author info
    const author = {
      name: source.creator || 'MUED Glasswerks',
      avatar: undefined,
    };

    // Create description from content snippet
    const description = source.contentSnippet || source.content?.slice(0, 200) || '';

    return {
      id,
      source: 'note',
      type: 'article',
      title: source.title || 'Untitled',
      description: this.cleanDescription(description),
      url: source.link,
      content: source.content,
      category: primaryCategory,
      difficulty,
      tags,
      publishedAt,
      updatedAt: publishedAt,
      author,
      thumbnail: undefined,
      relevanceScore: 1.0,
      qualityScore: 8.0, // Default quality score for note.com content
      viewCount: 0,
      likeCount: 0,
      bookmarkCount: 0,
    };
  }

  /**
   * Check if source can be adapted
   * ソースが変換可能かどうかをチェック
   */
  canAdapt(source: NoteRSSItem): boolean {
    return Boolean(source.title && (source.link || source.guid));
  }

  /**
   * Extract ID from URL or GUID
   * URLまたはGUIDからIDを抽出
   */
  private extractId(urlOrGuid: string): string {
    // Try to extract note ID from URL (e.g., https://note.com/mued_glasswerks/n/n123abc456)
    const match = urlOrGuid.match(/\/n\/([a-zA-Z0-9]+)/);
    if (match) {
      return `note-${match[1]}`;
    }

    // Fallback: create ID from URL hash
    return `note-${this.simpleHash(urlOrGuid)}`;
  }

  /**
   * Simple hash function for creating IDs
   * ID作成用のシンプルなハッシュ関数
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Extract difficulty level from tags
   * タグから難易度レベルを抽出
   */
  private extractDifficulty(tags: string[]): 'beginner' | 'intermediate' | 'advanced' | undefined {
    const lowerTags = tags.map(t => t.toLowerCase());

    if (lowerTags.some(t => t.includes('beginner') || t.includes('初級') || t.includes('入門'))) {
      return 'beginner';
    }
    if (lowerTags.some(t => t.includes('advanced') || t.includes('上級') || t.includes('応用'))) {
      return 'advanced';
    }
    if (lowerTags.some(t => t.includes('intermediate') || t.includes('中級'))) {
      return 'intermediate';
    }

    // Default to beginner for educational content
    return 'beginner';
  }

  /**
   * Clean description text
   * 説明文をクリーンアップ
   */
  private cleanDescription(text: string): string {
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .slice(0, 300); // Limit to 300 characters
  }
}
