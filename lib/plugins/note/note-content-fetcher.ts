/**
 * Note.com Content Fetcher
 * note.comコンテンツフェッチャー
 *
 * Fetches educational content from note.com RSS feed
 */

import Parser from 'rss-parser';
import type { IContentFetcher } from '@/lib/content';
import type { ContentFetchParams, ContentFetchResult, ContentSource } from '@/types/unified-content';
import { NoteContentAdapter } from './note-content-adapter';

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

export class NoteContentFetcher implements IContentFetcher {
  readonly id = 'note-fetcher';
  readonly name = 'note.com Content Fetcher';

  private readonly rssUrl: string;
  private readonly parser: Parser<object, NoteRSSItem>;
  private readonly adapter: NoteContentAdapter;
  private readonly cacheDuration = 3600; // 1 hour in seconds
  private cache: { data: ContentFetchResult; timestamp: number } | null = null;

  constructor(rssUrl = 'https://note.com/mued_glasswerks/m/mdeeb405509ee/rss') {
    this.rssUrl = rssUrl;
    this.parser = new Parser();
    this.adapter = new NoteContentAdapter();
  }

  /**
   * Fetch content from note.com RSS feed
   * note.com RSSフィードからコンテンツを取得
   */
  async fetch(params: ContentFetchParams): Promise<ContentFetchResult> {
    try {
      // Check cache first
      if (this.cache && Date.now() - this.cache.timestamp < this.cacheDuration * 1000) {
        console.log('[NoteContentFetcher] Using cached data');
        return this.applyFilters(this.cache.data, params);
      }

      console.log(`[NoteContentFetcher] Fetching from: ${this.rssUrl}`);

      // Fetch RSS feed
      const feed = await this.parser.parseURL(this.rssUrl);

      if (!feed.items || feed.items.length === 0) {
        return {
          success: true,
          content: [],
          total: 0,
          sources: {
            ai_generated: 0,
            note: 0,
            youtube: 0,
            internal: 0,
            partner: 0,
          },
        };
      }

      // Convert RSS items to UnifiedContent
      const content = feed.items
        .filter(item => this.adapter.canAdapt(item))
        .map(item => this.adapter.adapt(item));

      const result: ContentFetchResult = {
        success: true,
        content,
        total: content.length,
        sources: {
          ai_generated: 0,
          note: content.length,
          youtube: 0,
          internal: 0,
          partner: 0,
        },
      };

      // Cache the result
      this.cache = {
        data: result,
        timestamp: Date.now(),
      };

      console.log(`[NoteContentFetcher] Fetched ${content.length} items`);
      return this.applyFilters(result, params);
    } catch (error) {
      console.error('[NoteContentFetcher] Fetch error:', error);
      return {
        success: false,
        content: [],
        total: 0,
        sources: {
          ai_generated: 0,
          note: 0,
          youtube: 0,
          internal: 0,
          partner: 0,
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Apply filters to the fetched content
   * 取得したコンテンツにフィルターを適用
   */
  private applyFilters(result: ContentFetchResult, params: ContentFetchParams): ContentFetchResult {
    let filtered = [...result.content];

    // Filter by type
    if (params.type) {
      filtered = filtered.filter(item => item.type === params.type);
    }

    // Filter by category
    if (params.category) {
      filtered = filtered.filter(item => item.category === params.category);
    }

    // Filter by difficulty
    if (params.difficulty) {
      filtered = filtered.filter(item => item.difficulty === params.difficulty);
    }

    // Filter by tags
    if (params.tags && params.tags.length > 0) {
      filtered = filtered.filter(item =>
        item.tags && params.tags!.some(tag => item.tags.includes(tag))
      );
    }

    // Search filter
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    if (params.sortBy) {
      filtered.sort((a, b) => {
        let comparison = 0;

        switch (params.sortBy) {
          case 'date':
            comparison = b.publishedAt.getTime() - a.publishedAt.getTime();
            break;
          case 'popularity':
            comparison = (b.viewCount || 0) - (a.viewCount || 0);
            break;
          case 'relevance':
            comparison = (b.relevanceScore || 0) - (a.relevanceScore || 0);
            break;
        }

        return params.sortOrder === 'asc' ? -comparison : comparison;
      });
    }

    // Pagination
    const offset = params.offset || 0;
    const limit = params.limit || filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      ...result,
      content: paginated,
      total: filtered.length,
    };
  }

  /**
   * Health check for note.com fetcher
   * note.comフェッチャーのヘルスチェック
   */
  async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    try {
      const feed = await this.parser.parseURL(this.rssUrl);

      if (!feed || !feed.items) {
        return {
          healthy: false,
          message: 'RSS feed is empty or invalid',
        };
      }

      return {
        healthy: true,
        message: `RSS feed accessible with ${feed.items.length} items`,
      };
    } catch (error) {
      return {
        healthy: false,
        message: error instanceof Error ? error.message : 'Health check failed',
      };
    }
  }

  /**
   * Clear cache
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache = null;
    console.log('[NoteContentFetcher] Cache cleared');
  }
}
