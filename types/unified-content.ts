/**
 * Unified Content Schema
 * 統一コンテンツスキーマ
 *
 * All content sources (note.com, YouTube, AI-generated) conform to this schema
 */

export type ContentSource = 'ai_generated' | 'note' | 'youtube' | 'internal' | 'partner';
export type ContentType = 'article' | 'video' | 'practice' | 'test' | 'interactive';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type QualityStatus = 'draft' | 'approved' | 'reviewed' | 'pending';

export interface UnifiedContent {
  // Core Identity
  id: string;
  source: ContentSource;
  type: ContentType;

  // Content
  title: string;
  description: string;
  url?: string;                      // External content URL
  content?: string;                  // Internal content (markdown/HTML)

  // Categorization
  category: string;
  difficulty?: DifficultyLevel;
  tags: string[];

  // Metadata
  publishedAt: Date;
  updatedAt?: Date;
  author?: {
    id?: string;
    name: string;
    email?: string;
    avatar?: string;
  };

  // Media
  thumbnail?: string;
  duration?: number;                 // seconds (for video/audio)

  // AI-specific metadata (when source === 'ai_generated')
  aiMetadata?: AIContentMetadata;

  // Quality & Relevance
  relevanceScore?: number;           // 0.0-1.0
  qualityScore?: number;             // 0.0-10.0

  // Engagement metrics
  viewCount?: number;
  likeCount?: number;
  bookmarkCount?: number;
}

export interface AIContentMetadata {
  generatedBy: {
    model: string;                   // 'gpt-4o-mini'
    provider: string;                // 'OpenAI'
    version: string;                 // '2024-07-18'
    timestamp: Date;
  };

  qualityScore: {
    playability: number;             // 0.0-10.0
    learningValue: number;           // 0.0-10.0
    accuracy: number;                // 0.0-10.0
    overallStatus: QualityStatus;
  };

  humanReview?: {
    reviewedBy: string;
    reviewedAt: Date;
    reviewNotes: string;
    status: 'approved' | 'rejected' | 'needs_revision';
  };

  regenerationCount: number;

  // Context from which this was generated
  sourceContext?: {
    articleId: string;
    articleTitle: string;
    url: string;
  };

  // C2PA digital credential for tamper detection
  c2paCredential?: string;
}

export interface ContentFetchParams {
  source?: ContentSource | 'all';
  type?: ContentType;
  category?: string;
  difficulty?: DifficultyLevel;
  tags?: string[];
  limit?: number;
  offset?: number;
  search?: string;
  sortBy?: 'relevance' | 'date' | 'popularity';
  sortOrder?: 'asc' | 'desc';
}

export interface ContentFetchResult {
  success: boolean;
  content: UnifiedContent[];
  total: number;
  sources: Record<ContentSource, number>;
  error?: string;
}
