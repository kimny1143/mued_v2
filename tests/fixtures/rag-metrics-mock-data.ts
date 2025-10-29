/**
 * RAG Metrics Mock Data
 *
 * Test fixtures for RAG metrics, provenance records, and related data.
 */

export interface RAGMetrics {
  id: string;
  contentId: string;
  timestamp: Date;
  qualityScore: number;
  retrievalMetrics: {
    precision: number;
    recall: number;
    f1Score: number;
    mrr: number;
    ndcg: number;
    latencyMs: number;
  };
  generationMetrics: {
    coherence: number;
    relevance: number;
    factuality: number;
    fluency: number;
    bleuScore: number;
    rougeScore: {
      rouge1: number;
      rouge2: number;
      rougeL: number;
    };
    latencyMs: number;
  };
  userFeedback: {
    thumbsUp: number;
    thumbsDown: number;
    reportedIssues: Array<{
      type: string;
      description: string;
      timestamp: Date;
    }>;
  };
  metadata: {
    model: string;
    temperature: number;
    maxTokens: number;
    context_length?: number;
  };
}

export interface ProvenanceRecord {
  id: string;
  contentId: string;
  version: number;
  createdAt: Date;
  createdBy: string;
  generationTrace: {
    model: string;
    promptTemplate: string;
    temperature: number;
    maxTokens: number;
    systemPrompt?: string;
    userPrompt?: string;
    completionTokens: number;
    promptTokens: number;
    totalTokens: number;
    finishReason: string;
    latencyMs: number;
  };
  sourceAttribution: Array<{
    sourceId: string;
    sourceType: string;
    title: string;
    author?: string;
    url?: string;
    retrievalScore: number;
    usageType: 'reference' | 'context' | 'citation';
    excerptUsed?: string;
  }>;
  transformations: Array<{
    operation: string;
    timestamp: Date;
    parameters: Record<string, any>;
  }>;
  qualityMetricId?: string;
  metadata?: Record<string, any>;
}

/**
 * Mock RAG Metrics Data
 */
export const mockRAGMetrics: RAGMetrics[] = [
  {
    id: 'metric-1',
    contentId: 'content-1',
    timestamp: new Date('2024-01-15T10:00:00Z'),
    qualityScore: 0.85,
    retrievalMetrics: {
      precision: 0.8,
      recall: 0.75,
      f1Score: 0.77,
      mrr: 0.82,
      ndcg: 0.85,
      latencyMs: 120,
    },
    generationMetrics: {
      coherence: 0.88,
      relevance: 0.85,
      factuality: 0.90,
      fluency: 0.92,
      bleuScore: 0.75,
      rougeScore: {
        rouge1: 0.78,
        rouge2: 0.65,
        rougeL: 0.72,
      },
      latencyMs: 450,
    },
    userFeedback: {
      thumbsUp: 5,
      thumbsDown: 1,
      reportedIssues: [],
    },
    metadata: {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 1000,
      context_length: 3500,
    },
  },
  {
    id: 'metric-2',
    contentId: 'content-2',
    timestamp: new Date('2024-01-16T14:30:00Z'),
    qualityScore: 0.92,
    retrievalMetrics: {
      precision: 0.9,
      recall: 0.85,
      f1Score: 0.87,
      mrr: 0.88,
      ndcg: 0.90,
      latencyMs: 100,
    },
    generationMetrics: {
      coherence: 0.93,
      relevance: 0.91,
      factuality: 0.94,
      fluency: 0.95,
      bleuScore: 0.82,
      rougeScore: {
        rouge1: 0.85,
        rouge2: 0.72,
        rougeL: 0.79,
      },
      latencyMs: 420,
    },
    userFeedback: {
      thumbsUp: 12,
      thumbsDown: 0,
      reportedIssues: [],
    },
    metadata: {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 1500,
      context_length: 4000,
    },
  },
  {
    id: 'metric-3',
    contentId: 'content-3',
    timestamp: new Date('2024-01-17T09:15:00Z'),
    qualityScore: 0.72,
    retrievalMetrics: {
      precision: 0.68,
      recall: 0.70,
      f1Score: 0.69,
      mrr: 0.75,
      ndcg: 0.78,
      latencyMs: 150,
    },
    generationMetrics: {
      coherence: 0.75,
      relevance: 0.72,
      factuality: 0.78,
      fluency: 0.80,
      bleuScore: 0.68,
      rougeScore: {
        rouge1: 0.70,
        rouge2: 0.58,
        rougeL: 0.65,
      },
      latencyMs: 480,
    },
    userFeedback: {
      thumbsUp: 2,
      thumbsDown: 3,
      reportedIssues: [
        {
          type: 'factual_error',
          description: 'Incorrect chord progression in example',
          timestamp: new Date('2024-01-17T10:00:00Z'),
        },
      ],
    },
    metadata: {
      model: 'gpt-3.5-turbo',
      temperature: 0.8,
      maxTokens: 800,
      context_length: 2000,
    },
  },
];

/**
 * Mock Provenance Records
 */
export const mockProvenanceRecords: ProvenanceRecord[] = [
  {
    id: 'prov-1',
    contentId: 'content-1',
    version: 1,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    createdBy: 'user-123',
    generationTrace: {
      model: 'gpt-4',
      promptTemplate: 'music-lesson-generator-v1',
      temperature: 0.7,
      maxTokens: 1000,
      systemPrompt: 'You are a music theory educator creating engaging lessons...',
      userPrompt: 'Create a lesson on jazz chord progressions for intermediate students',
      completionTokens: 850,
      promptTokens: 120,
      totalTokens: 970,
      finishReason: 'stop',
      latencyMs: 450,
    },
    sourceAttribution: [
      {
        sourceId: 'note-article-123',
        sourceType: 'note.com',
        title: 'Understanding Jazz Progressions',
        author: 'John Doe',
        url: 'https://note.com/article/123',
        retrievalScore: 0.85,
        usageType: 'reference',
        excerptUsed: 'The ii-V-I progression is fundamental to jazz harmony...',
      },
      {
        sourceId: 'internal-lesson-456',
        sourceType: 'internal',
        title: 'Basic Music Theory',
        author: 'System',
        retrievalScore: 0.78,
        usageType: 'context',
      },
    ],
    transformations: [
      {
        operation: 'generate',
        timestamp: new Date('2024-01-15T10:00:00Z'),
        parameters: { topic: 'chord-progressions', level: 'intermediate' },
      },
    ],
    qualityMetricId: 'metric-1',
    metadata: {
      tags: ['music-theory', 'chords', 'jazz'],
      difficulty: 'intermediate',
      estimatedDuration: '15min',
    },
  },
  {
    id: 'prov-2',
    contentId: 'content-2',
    version: 1,
    createdAt: new Date('2024-01-16T14:30:00Z'),
    createdBy: 'user-456',
    generationTrace: {
      model: 'gpt-4',
      promptTemplate: 'music-lesson-generator-v1',
      temperature: 0.7,
      maxTokens: 1500,
      systemPrompt: 'You are a music theory educator creating engaging lessons...',
      userPrompt: 'Create a lesson on pentatonic scales for beginners',
      completionTokens: 1200,
      promptTokens: 100,
      totalTokens: 1300,
      finishReason: 'stop',
      latencyMs: 420,
    },
    sourceAttribution: [
      {
        sourceId: 'note-article-789',
        sourceType: 'note.com',
        title: 'Introduction to Pentatonic Scales',
        author: 'Jane Smith',
        url: 'https://note.com/article/789',
        retrievalScore: 0.92,
        usageType: 'reference',
        excerptUsed: 'The pentatonic scale consists of five notes...',
      },
      {
        sourceId: 'youtube-video-456',
        sourceType: 'youtube',
        title: 'Pentatonic Scale Tutorial',
        author: 'Music Teacher Pro',
        url: 'https://youtube.com/watch?v=abc123',
        retrievalScore: 0.88,
        usageType: 'citation',
      },
    ],
    transformations: [
      {
        operation: 'generate',
        timestamp: new Date('2024-01-16T14:30:00Z'),
        parameters: { topic: 'pentatonic-scales', level: 'beginner' },
      },
    ],
    qualityMetricId: 'metric-2',
    metadata: {
      tags: ['scales', 'pentatonic', 'beginner'],
      difficulty: 'beginner',
      estimatedDuration: '10min',
    },
  },
  {
    id: 'prov-3',
    contentId: 'content-3',
    version: 2,
    createdAt: new Date('2024-01-17T09:15:00Z'),
    createdBy: 'user-789',
    generationTrace: {
      model: 'gpt-3.5-turbo',
      promptTemplate: 'music-lesson-generator-v1',
      temperature: 0.8,
      maxTokens: 800,
      systemPrompt: 'You are a music theory educator creating engaging lessons...',
      userPrompt: 'Create a lesson on modal harmony',
      completionTokens: 650,
      promptTokens: 80,
      totalTokens: 730,
      finishReason: 'stop',
      latencyMs: 480,
    },
    sourceAttribution: [
      {
        sourceId: 'internal-lesson-999',
        sourceType: 'internal',
        title: 'Advanced Harmony Concepts',
        author: 'System',
        retrievalScore: 0.75,
        usageType: 'context',
      },
    ],
    transformations: [
      {
        operation: 'generate',
        timestamp: new Date('2024-01-17T09:00:00Z'),
        parameters: { topic: 'modal-harmony', level: 'advanced' },
      },
      {
        operation: 'edit',
        timestamp: new Date('2024-01-17T09:15:00Z'),
        parameters: { section: 'introduction', change: 'clarity-improvement' },
      },
    ],
    qualityMetricId: 'metric-3',
    metadata: {
      tags: ['harmony', 'modes', 'advanced'],
      difficulty: 'advanced',
      estimatedDuration: '20min',
    },
  },
];

/**
 * Factory functions for creating test data
 */
export class MetricsFactory {
  static createMetric(overrides?: Partial<RAGMetrics>): RAGMetrics {
    return {
      id: `metric-${Math.random().toString(36).substr(2, 9)}`,
      contentId: `content-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      qualityScore: 0.85,
      retrievalMetrics: {
        precision: 0.8,
        recall: 0.75,
        f1Score: 0.77,
        mrr: 0.82,
        ndcg: 0.85,
        latencyMs: 120,
      },
      generationMetrics: {
        coherence: 0.88,
        relevance: 0.85,
        factuality: 0.90,
        fluency: 0.92,
        bleuScore: 0.75,
        rougeScore: {
          rouge1: 0.78,
          rouge2: 0.65,
          rougeL: 0.72,
        },
        latencyMs: 450,
      },
      userFeedback: {
        thumbsUp: 0,
        thumbsDown: 0,
        reportedIssues: [],
      },
      metadata: {
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 1000,
      },
      ...overrides,
    };
  }

  static createBatch(count: number, overrides?: Partial<RAGMetrics>): RAGMetrics[] {
    return Array.from({ length: count }, () => this.createMetric(overrides));
  }

  static createTimeSeriesMetrics(
    startDate: Date,
    days: number,
    metricsPerDay: number = 10
  ): RAGMetrics[] {
    const metrics: RAGMetrics[] = [];

    for (let day = 0; day < days; day++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + day);

      for (let i = 0; i < metricsPerDay; i++) {
        const timestamp = new Date(date);
        timestamp.setHours(Math.floor(Math.random() * 24));
        timestamp.setMinutes(Math.floor(Math.random() * 60));

        metrics.push(this.createMetric({
          timestamp,
          qualityScore: 0.7 + Math.random() * 0.3, // 0.7-1.0
        }));
      }
    }

    return metrics;
  }
}

export class ProvenanceFactory {
  static createProvenance(overrides?: Partial<ProvenanceRecord>): ProvenanceRecord {
    return {
      id: `prov-${Math.random().toString(36).substr(2, 9)}`,
      contentId: `content-${Math.random().toString(36).substr(2, 9)}`,
      version: 1,
      createdAt: new Date(),
      createdBy: 'user-test',
      generationTrace: {
        model: 'gpt-4',
        promptTemplate: 'music-lesson-generator-v1',
        temperature: 0.7,
        maxTokens: 1000,
        completionTokens: 850,
        promptTokens: 120,
        totalTokens: 970,
        finishReason: 'stop',
        latencyMs: 450,
      },
      sourceAttribution: [
        {
          sourceId: 'source-123',
          sourceType: 'note.com',
          title: 'Test Article',
          author: 'Test Author',
          retrievalScore: 0.85,
          usageType: 'reference',
        },
      ],
      transformations: [
        {
          operation: 'generate',
          timestamp: new Date(),
          parameters: {},
        },
      ],
      ...overrides,
    };
  }

  static createBatch(count: number, overrides?: Partial<ProvenanceRecord>): ProvenanceRecord[] {
    return Array.from({ length: count }, () => this.createProvenance(overrides));
  }

  static createVersionHistory(
    contentId: string,
    versions: number
  ): ProvenanceRecord[] {
    const baseDate = new Date('2024-01-15T10:00:00Z');

    return Array.from({ length: versions }, (_, i) => {
      const date = new Date(baseDate);
      date.setHours(date.getHours() + i);

      return this.createProvenance({
        contentId,
        version: i + 1,
        createdAt: date,
      });
    });
  }
}

/**
 * Mock API Responses
 */
export const mockAPIResponses = {
  metricsSuccess: {
    success: true,
    metrics: mockRAGMetrics,
    total: mockRAGMetrics.length,
  },

  metricsSingleSuccess: {
    success: true,
    metric: mockRAGMetrics[0],
  },

  provenanceSuccess: {
    success: true,
    records: mockProvenanceRecords,
    total: mockProvenanceRecords.length,
  },

  provenanceSingleSuccess: {
    success: true,
    provenance: mockProvenanceRecords[0],
  },

  errorUnauthorized: {
    success: false,
    error: 'Unauthorized',
  },

  errorNotFound: {
    success: false,
    error: 'Resource not found',
  },

  errorValidation: {
    success: false,
    error: 'Validation error',
    details: ['Field is required'],
  },

  errorServer: {
    success: false,
    error: 'Internal server error',
  },
};

/**
 * Helper functions for test data manipulation
 */
export const testHelpers = {
  /**
   * Filter metrics by date range
   */
  filterByDateRange(
    metrics: RAGMetrics[],
    startDate: Date,
    endDate: Date
  ): RAGMetrics[] {
    return metrics.filter(
      m => m.timestamp >= startDate && m.timestamp <= endDate
    );
  },

  /**
   * Calculate average quality score
   */
  avgQualityScore(metrics: RAGMetrics[]): number {
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, m) => acc + m.qualityScore, 0);
    return sum / metrics.length;
  },

  /**
   * Group metrics by model
   */
  groupByModel(metrics: RAGMetrics[]): Record<string, RAGMetrics[]> {
    return metrics.reduce((acc, m) => {
      const model = m.metadata.model;
      if (!acc[model]) acc[model] = [];
      acc[model].push(m);
      return acc;
    }, {} as Record<string, RAGMetrics[]>);
  },

  /**
   * Find low quality content
   */
  findLowQuality(metrics: RAGMetrics[], threshold: number = 0.7): RAGMetrics[] {
    return metrics.filter(m => m.qualityScore < threshold);
  },
};
