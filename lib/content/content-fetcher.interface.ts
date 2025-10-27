/**
 * Content Fetcher Interface
 * コンテンツフェッチャーインターフェース
 *
 * Base interface that all content fetchers must implement
 */

import type { UnifiedContent, ContentFetchParams, ContentFetchResult } from '@/types/unified-content';

/**
 * Content Fetcher Interface
 * すべてのコンテンツフェッチャーが実装する必要があるインターフェース
 */
export interface IContentFetcher {
  /**
   * Unique identifier for this fetcher
   * このフェッチャーの一意識別子
   */
  readonly id: string;

  /**
   * Display name for this fetcher
   * このフェッチャーの表示名
   */
  readonly name: string;

  /**
   * Fetch content based on parameters
   * パラメータに基づいてコンテンツを取得
   */
  fetch(params: ContentFetchParams): Promise<ContentFetchResult>;

  /**
   * Health check for this fetcher
   * このフェッチャーのヘルスチェック
   */
  healthCheck(): Promise<{ healthy: boolean; message?: string }>;
}

/**
 * Content Adapter Interface
 * コンテンツアダプターインターフェース
 *
 * Adapts external content format to UnifiedContent schema
 */
export interface IContentAdapter<TSource = unknown> {
  /**
   * Adapt external content to unified format
   * 外部コンテンツを統一フォーマットに変換
   */
  adapt(source: TSource): UnifiedContent;

  /**
   * Validate if source can be adapted
   * ソースが変換可能かどうかを検証
   */
  canAdapt(source: TSource): boolean;
}

/**
 * Content Validator Interface
 * コンテンツバリデーターインターフェース
 */
export interface IContentValidator {
  /**
   * Validate unified content
   * 統一コンテンツを検証
   */
  validate(content: UnifiedContent): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }>;

  /**
   * Calculate quality score
   * 品質スコアを計算
   */
  calculateQualityScore(content: UnifiedContent): number;
}
