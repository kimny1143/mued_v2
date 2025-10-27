/**
 * Content Validator
 * コンテンツバリデーター
 *
 * Validates unified content and calculates quality scores
 */

import { Injectable } from '@/lib/di';
import type { IContentValidator } from './content-fetcher.interface';
import type { UnifiedContent } from '@/types/unified-content';

@Injectable()
export class ContentValidator implements IContentValidator {
  /**
   * Validate unified content
   * 統一コンテンツを検証
   */
  async validate(content: UnifiedContent): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!content.id) errors.push('Missing required field: id');
    if (!content.source) errors.push('Missing required field: source');
    if (!content.type) errors.push('Missing required field: type');
    if (!content.title || content.title.trim().length === 0) {
      errors.push('Missing or empty required field: title');
    }
    if (!content.description || content.description.trim().length === 0) {
      warnings.push('Missing or empty description');
    }

    // Content validation
    if (!content.url && !content.content) {
      errors.push('Either url or content must be provided');
    }

    // Category validation
    if (!content.category || content.category.trim().length === 0) {
      warnings.push('Missing category');
    }

    // Tags validation
    if (!content.tags || content.tags.length === 0) {
      warnings.push('No tags provided');
    }

    // Date validation
    if (!content.publishedAt) {
      errors.push('Missing required field: publishedAt');
    } else if (content.publishedAt > new Date()) {
      warnings.push('publishedAt is in the future');
    }

    // AI metadata validation (for AI-generated content)
    if (content.source === 'ai_generated') {
      if (!content.aiMetadata) {
        errors.push('AI-generated content must have aiMetadata');
      } else {
        if (!content.aiMetadata.generatedBy) {
          errors.push('aiMetadata.generatedBy is required');
        }
        if (!content.aiMetadata.qualityScore) {
          errors.push('aiMetadata.qualityScore is required');
        } else {
          // Validate quality scores are in range
          if (content.aiMetadata.qualityScore.playability < 0 || content.aiMetadata.qualityScore.playability > 10) {
            errors.push('playability score must be between 0 and 10');
          }
          if (content.aiMetadata.qualityScore.learningValue < 0 || content.aiMetadata.qualityScore.learningValue > 10) {
            errors.push('learningValue score must be between 0 and 10');
          }
          if (content.aiMetadata.qualityScore.accuracy < 0 || content.aiMetadata.qualityScore.accuracy > 10) {
            errors.push('accuracy score must be between 0 and 10');
          }
        }
      }
    }

    // Quality score validation
    if (content.qualityScore !== undefined) {
      if (content.qualityScore < 0 || content.qualityScore > 10) {
        errors.push('qualityScore must be between 0 and 10');
      }
    }

    // Relevance score validation
    if (content.relevanceScore !== undefined) {
      if (content.relevanceScore < 0 || content.relevanceScore > 1) {
        errors.push('relevanceScore must be between 0 and 1');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Calculate quality score
   * 品質スコアを計算
   */
  calculateQualityScore(content: UnifiedContent): number {
    let score = 5.0; // Base score

    // Content completeness (+2.0 max)
    if (content.description && content.description.length > 50) score += 0.5;
    if (content.tags && content.tags.length >= 3) score += 0.5;
    if (content.category) score += 0.5;
    if (content.difficulty) score += 0.5;

    // Source credibility (+1.5 max)
    if (content.source === 'internal') score += 1.5;
    else if (content.source === 'partner') score += 1.0;
    else if (content.source === 'note') score += 0.8;
    else if (content.source === 'ai_generated' && content.aiMetadata) {
      const avgQuality = (
        content.aiMetadata.qualityScore.playability +
        content.aiMetadata.qualityScore.learningValue +
        content.aiMetadata.qualityScore.accuracy
      ) / 3;
      score += (avgQuality / 10) * 1.5;
    }

    // Engagement metrics (+1.5 max)
    const viewCount = content.viewCount || 0;
    const likeCount = content.likeCount || 0;
    const bookmarkCount = content.bookmarkCount || 0;

    if (viewCount > 1000) score += 0.5;
    else if (viewCount > 100) score += 0.3;

    if (likeCount > 100) score += 0.5;
    else if (likeCount > 10) score += 0.3;

    if (bookmarkCount > 50) score += 0.5;
    else if (bookmarkCount > 5) score += 0.3;

    // Freshness (-0.5 to +0.5)
    const ageInDays = (Date.now() - content.publishedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (ageInDays < 7) score += 0.5;
    else if (ageInDays < 30) score += 0.3;
    else if (ageInDays < 90) score += 0.1;
    else if (ageInDays > 365) score -= 0.3;

    // Cap at 10.0
    return Math.min(10.0, Math.max(0.0, score));
  }
}
