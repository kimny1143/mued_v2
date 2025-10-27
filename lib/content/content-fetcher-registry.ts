/**
 * Content Fetcher Registry
 * コンテンツフェッチャーレジストリ
 *
 * Central registry for all content fetchers
 */

import { Injectable } from '@/lib/di';
import type { IContentFetcher } from './content-fetcher.interface';
import type { ContentFetchParams, ContentFetchResult, ContentSource } from '@/types/unified-content';

@Injectable()
export class ContentFetcherRegistry {
  private fetchers: Map<ContentSource, IContentFetcher> = new Map();

  /**
   * Register a content fetcher
   * コンテンツフェッチャーを登録
   */
  register(source: ContentSource, fetcher: IContentFetcher): void {
    if (this.fetchers.has(source)) {
      console.warn(`[ContentFetcherRegistry] Overwriting fetcher for source: ${source}`);
    }

    this.fetchers.set(source, fetcher);
    console.log(`[ContentFetcherRegistry] Registered fetcher for ${source}: ${fetcher.name}`);
  }

  /**
   * Unregister a content fetcher
   * コンテンツフェッチャーの登録を解除
   */
  unregister(source: ContentSource): boolean {
    const result = this.fetchers.delete(source);
    if (result) {
      console.log(`[ContentFetcherRegistry] Unregistered fetcher for source: ${source}`);
    }
    return result;
  }

  /**
   * Get a fetcher by source
   * ソースでフェッチャーを取得
   */
  get(source: ContentSource): IContentFetcher | undefined {
    return this.fetchers.get(source);
  }

  /**
   * Get all registered fetchers
   * 登録されたすべてのフェッチャーを取得
   */
  getAll(): IContentFetcher[] {
    return Array.from(this.fetchers.values());
  }

  /**
   * Check if a source has a registered fetcher
   * ソースにフェッチャーが登録されているか確認
   */
  has(source: ContentSource): boolean {
    return this.fetchers.has(source);
  }

  /**
   * Fetch content from a specific source
   * 特定のソースからコンテンツを取得
   */
  async fetch(source: ContentSource, params: ContentFetchParams): Promise<ContentFetchResult> {
    const fetcher = this.get(source);

    if (!fetcher) {
      return {
        success: false,
        content: [],
        total: 0,
        sources: {} as Record<ContentSource, number>,
        error: `No fetcher registered for source: ${source}`,
      };
    }

    try {
      return await fetcher.fetch(params);
    } catch (error) {
      console.error(`[ContentFetcherRegistry] Fetch error for ${source}:`, error);
      return {
        success: false,
        content: [],
        total: 0,
        sources: {} as Record<ContentSource, number>,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Fetch content from all sources
   * すべてのソースからコンテンツを取得
   */
  async fetchAll(params: ContentFetchParams): Promise<ContentFetchResult> {
    const sources = Array.from(this.fetchers.keys());

    if (sources.length === 0) {
      return {
        success: false,
        content: [],
        total: 0,
        sources: {} as Record<ContentSource, number>,
        error: 'No fetchers registered',
      };
    }

    const results = await Promise.allSettled(
      sources.map(source => this.fetch(source, params))
    );

    const allContent: ContentFetchResult['content'] = [];
    const sourceCounts: Record<ContentSource, number> = {} as Record<ContentSource, number>;
    const errors: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        allContent.push(...result.value.content);
        Object.assign(sourceCounts, result.value.sources);
      } else if (result.status === 'rejected') {
        errors.push(`${sources[index]}: ${result.reason}`);
      } else if (result.status === 'fulfilled' && !result.value.success) {
        errors.push(`${sources[index]}: ${result.value.error}`);
      }
    });

    return {
      success: errors.length < results.length,
      content: allContent,
      total: allContent.length,
      sources: sourceCounts,
      error: errors.length > 0 ? errors.join('; ') : undefined,
    };
  }

  /**
   * Health check for all fetchers
   * すべてのフェッチャーのヘルスチェック
   */
  async healthCheckAll(): Promise<Record<ContentSource, { healthy: boolean; message?: string }>> {
    const sources = Array.from(this.fetchers.entries());
    const results: Record<ContentSource, { healthy: boolean; message?: string }> = {} as Record<ContentSource, { healthy: boolean; message?: string }>;

    await Promise.all(
      sources.map(async ([source, fetcher]) => {
        try {
          results[source] = await fetcher.healthCheck();
        } catch (error) {
          results[source] = {
            healthy: false,
            message: error instanceof Error ? error.message : 'Health check failed',
          };
        }
      })
    );

    return results;
  }

  /**
   * List all registered sources
   * 登録されたすべてのソースをリスト表示
   */
  listSources(): ContentSource[] {
    return Array.from(this.fetchers.keys());
  }

  /**
   * Clear all fetchers
   * すべてのフェッチャーをクリア
   */
  clear(): void {
    this.fetchers.clear();
    console.log('[ContentFetcherRegistry] Cleared all fetchers');
  }
}
