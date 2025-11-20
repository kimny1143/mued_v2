/**
 * Phase 1.3 Test Fixtures
 *
 * Comprehensive test data for InterviewerService, RAGService, and Interview API testing.
 * Covers all 7 focusAreas with shallow/medium/deep question templates.
 */

export type FocusArea = 'harmony' | 'melody' | 'rhythm' | 'mix' | 'emotion' | 'image' | 'structure';
export type QuestionDepth = 'shallow' | 'medium' | 'deep';

/**
 * 1.1 Sample Sessions (7 focusAreas)
 */
export interface MockSession {
  id: string;
  userId: string;
  type: 'composition' | 'practice' | 'listening';
  title: string;
  userShortNote: string;
  aiAnnotations: {
    focusArea: FocusArea;
    intentHypothesis: string;
    confidence: number;
  };
  createdAt: Date;
}

export const mockSessions: MockSession[] = [
  {
    id: 'session-001',
    userId: 'user-001',
    type: 'composition',
    title: 'Dメジャーのバラード制作',
    userShortNote: 'サビのコード進行をFからGに変更した',
    aiAnnotations: {
      focusArea: 'harmony',
      intentHypothesis: 'サビへの流れを滑らかにする意図',
      confidence: 0.85,
    },
    createdAt: new Date('2025-01-15T10:00:00Z'),
  },
  {
    id: 'session-002',
    userId: 'user-001',
    type: 'composition',
    title: 'ポップスのメロディアレンジ',
    userShortNote: 'サビのメロディラインを高音域に移動した',
    aiAnnotations: {
      focusArea: 'melody',
      intentHypothesis: '印象的なフックを作る意図',
      confidence: 0.90,
    },
    createdAt: new Date('2025-01-16T11:00:00Z'),
  },
  {
    id: 'session-003',
    userId: 'user-001',
    type: 'composition',
    title: 'ファンクのグルーヴ作成',
    userShortNote: 'ドラムのハイハットパターンを16分音符に変更した',
    aiAnnotations: {
      focusArea: 'rhythm',
      intentHypothesis: 'グルーヴ感を強化する意図',
      confidence: 0.88,
    },
    createdAt: new Date('2025-01-17T14:00:00Z'),
  },
  {
    id: 'session-004',
    userId: 'user-001',
    type: 'composition',
    title: 'ロックバンドのミックス調整',
    userShortNote: 'ベースの音量を少し下げてギターを前に出した',
    aiAnnotations: {
      focusArea: 'mix',
      intentHypothesis: 'ギターソロを際立たせる意図',
      confidence: 0.82,
    },
    createdAt: new Date('2025-01-18T09:00:00Z'),
  },
  {
    id: 'session-005',
    userId: 'user-001',
    type: 'composition',
    title: '悲しい雰囲気のバラード',
    userShortNote: '短調のコードを増やして、テンポを遅くした',
    aiAnnotations: {
      focusArea: 'emotion',
      intentHypothesis: '切なさを表現する意図',
      confidence: 0.87,
    },
    createdAt: new Date('2025-01-19T16:00:00Z'),
  },
  {
    id: 'session-006',
    userId: 'user-001',
    type: 'composition',
    title: '海をイメージした曲',
    userShortNote: 'シンセパッドで波の音を追加した',
    aiAnnotations: {
      focusArea: 'image',
      intentHypothesis: '海の雰囲気を創出する意図',
      confidence: 0.80,
    },
    createdAt: new Date('2025-01-20T13:00:00Z'),
  },
  {
    id: 'session-007',
    userId: 'user-001',
    type: 'composition',
    title: 'ポップスの楽曲構成',
    userShortNote: 'サビの後にブリッジセクションを追加した',
    aiAnnotations: {
      focusArea: 'structure',
      intentHypothesis: '楽曲に変化を持たせる意図',
      confidence: 0.84,
    },
    createdAt: new Date('2025-01-21T10:00:00Z'),
  },
];

/**
 * 1.2 Question Templates (21 templates: 7 focusAreas × 3 depths)
 */
export interface QuestionTemplate {
  id: string;
  focus: FocusArea;
  depth: QuestionDepth;
  template: string;
  variables?: Record<string, string>;
  priority: number;
}

export const mockQuestionTemplates: QuestionTemplate[] = [
  // harmony × 3
  {
    id: 'qt-harmony-shallow-001',
    focus: 'harmony',
    depth: 'shallow',
    template: 'どのコードを使いましたか？',
    priority: 10,
  },
  {
    id: 'qt-harmony-medium-001',
    focus: 'harmony',
    depth: 'medium',
    template: 'コード進行を変更した理由は何ですか？',
    priority: 5,
  },
  {
    id: 'qt-harmony-deep-001',
    focus: 'harmony',
    depth: 'deep',
    template: 'この和音進行が表現したい感情の本質は何ですか？',
    priority: 1,
  },

  // melody × 3
  {
    id: 'qt-melody-shallow-001',
    focus: 'melody',
    depth: 'shallow',
    template: 'メロディをどの音域に設定しましたか？',
    priority: 10,
  },
  {
    id: 'qt-melody-medium-001',
    focus: 'melody',
    depth: 'medium',
    template: 'メロディラインを変更した意図は何ですか？',
    priority: 5,
  },
  {
    id: 'qt-melody-deep-001',
    focus: 'melody',
    depth: 'deep',
    template: 'このメロディが聴き手に与えたい印象は何ですか？',
    priority: 1,
  },

  // rhythm × 3
  {
    id: 'qt-rhythm-shallow-001',
    focus: 'rhythm',
    depth: 'shallow',
    template: 'どのリズムパターンを使いましたか？',
    priority: 10,
  },
  {
    id: 'qt-rhythm-medium-001',
    focus: 'rhythm',
    depth: 'medium',
    template: 'リズムパターンを変更した理由は何ですか？',
    priority: 5,
  },
  {
    id: 'qt-rhythm-deep-001',
    focus: 'rhythm',
    depth: 'deep',
    template: 'このグルーヴが表現したい身体性とは何ですか？',
    priority: 1,
  },

  // mix × 3
  {
    id: 'qt-mix-shallow-001',
    focus: 'mix',
    depth: 'shallow',
    template: 'どの楽器の音量を調整しましたか？',
    priority: 10,
  },
  {
    id: 'qt-mix-medium-001',
    focus: 'mix',
    depth: 'medium',
    template: 'ミックスバランスを変更した意図は何ですか？',
    priority: 5,
  },
  {
    id: 'qt-mix-deep-001',
    focus: 'mix',
    depth: 'deep',
    template: 'この音響空間で創り出したい世界観は何ですか？',
    priority: 1,
  },

  // emotion × 3
  {
    id: 'qt-emotion-shallow-001',
    focus: 'emotion',
    depth: 'shallow',
    template: 'どのような感情を表現したかったですか？',
    priority: 10,
  },
  {
    id: 'qt-emotion-medium-001',
    focus: 'emotion',
    depth: 'medium',
    template: 'その感情を表現するために何を変更しましたか？',
    priority: 5,
  },
  {
    id: 'qt-emotion-deep-001',
    focus: 'emotion',
    depth: 'deep',
    template: 'この曲で伝えたい感情体験の核心は何ですか？',
    priority: 1,
  },

  // image × 3
  {
    id: 'qt-image-shallow-001',
    focus: 'image',
    depth: 'shallow',
    template: 'どのようなイメージを想起させたいですか？',
    priority: 10,
  },
  {
    id: 'qt-image-medium-001',
    focus: 'image',
    depth: 'medium',
    template: 'そのイメージを創り出すために何を追加しましたか？',
    priority: 5,
  },
  {
    id: 'qt-image-deep-001',
    focus: 'image',
    depth: 'deep',
    template: 'この音風景が描く世界の本質は何ですか？',
    priority: 1,
  },

  // structure × 3
  {
    id: 'qt-structure-shallow-001',
    focus: 'structure',
    depth: 'shallow',
    template: '楽曲のどの部分を変更しましたか？',
    priority: 10,
  },
  {
    id: 'qt-structure-medium-001',
    focus: 'structure',
    depth: 'medium',
    template: '楽曲構成を変更した理由は何ですか？',
    priority: 5,
  },
  {
    id: 'qt-structure-deep-001',
    focus: 'structure',
    depth: 'deep',
    template: 'この構成が創り出す音楽的ナラティブは何ですか？',
    priority: 1,
  },
];

/**
 * 1.3 Sample Embeddings (Deterministic vectors for testing)
 */
export interface MockEmbedding {
  text: string;
  vector: number[]; // 1536 dimensions
}

/**
 * Generate deterministic embedding vector for testing
 * @param text - Input text
 * @param seed - Optional seed for variation
 * @returns 1536-dimensional vector
 */
function generateDeterministicVector(text: string, seed = 0): number[] {
  const dim = 1536;
  const hashCode = text.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, seed);

  return Array.from({ length: dim }, (_, i) => {
    const value = Math.sin(hashCode + i * 0.1);
    // Normalize to [-1, 1]
    return Math.max(-1, Math.min(1, value));
  });
}

export const mockEmbeddings: Record<string, number[]> = {
  // Session notes
  'サビのコード進行をFからGに変更した': generateDeterministicVector('サビのコード進行をFからGに変更した', 1),
  'サビのメロディラインを高音域に移動した': generateDeterministicVector('サビのメロディラインを高音域に移動した', 2),
  'ドラムのハイハットパターンを16分音符に変更した': generateDeterministicVector('ドラムのハイハットパターンを16分音符に変更した', 3),
  'ベースの音量を少し下げてギターを前に出した': generateDeterministicVector('ベースの音量を少し下げてギターを前に出した', 4),
  '短調のコードを増やして、テンポを遅くした': generateDeterministicVector('短調のコードを増やして、テンポを遅くした', 5),
  'シンセパッドで波の音を追加した': generateDeterministicVector('シンセパッドで波の音を追加した', 6),
  'サビの後にブリッジセクションを追加した': generateDeterministicVector('サビの後にブリッジセクションを追加した', 7),

  // Query examples
  'コード進行を変更': generateDeterministicVector('コード進行を変更', 10),
  'メロディを高音に': generateDeterministicVector('メロディを高音に', 11),
  'リズムパターン変更': generateDeterministicVector('リズムパターン変更', 12),
  'ミックスバランス調整': generateDeterministicVector('ミックスバランス調整', 13),
  '感情表現': generateDeterministicVector('感情表現', 14),
  'イメージ音': generateDeterministicVector('イメージ音', 15),
  '楽曲構成変更': generateDeterministicVector('楽曲構成変更', 16),
};

/**
 * 1.4 Ground Truth Labels (RAG Quality Testing)
 */
export interface RAGGroundTruth {
  query: string;
  expectedResults: string[]; // Session IDs
  minSimilarity?: number; // Minimum cosine similarity threshold
}

export const ragGroundTruth: RAGGroundTruth[] = [
  {
    query: 'コード進行を変更した',
    expectedResults: ['session-001', 'session-005'],
    minSimilarity: 0.7,
  },
  {
    query: 'メロディを高音に',
    expectedResults: ['session-002'],
    minSimilarity: 0.75,
  },
  {
    query: 'リズムパターン変更',
    expectedResults: ['session-003'],
    minSimilarity: 0.7,
  },
  {
    query: 'ミックスバランス調整',
    expectedResults: ['session-004'],
    minSimilarity: 0.65,
  },
  {
    query: '感情表現を変更',
    expectedResults: ['session-005'],
    minSimilarity: 0.7,
  },
  {
    query: 'イメージや雰囲気',
    expectedResults: ['session-006'],
    minSimilarity: 0.65,
  },
  {
    query: '楽曲構成を変更',
    expectedResults: ['session-007'],
    minSimilarity: 0.7,
  },
  {
    query: 'サビの変更',
    expectedResults: ['session-001', 'session-002', 'session-007'],
    minSimilarity: 0.6,
  },
  {
    query: 'グルーヴ感',
    expectedResults: ['session-003'],
    minSimilarity: 0.7,
  },
  {
    query: '音響空間',
    expectedResults: ['session-004', 'session-006'],
    minSimilarity: 0.6,
  },
];

/**
 * 2. Interview Questions & Answers
 */
export interface MockInterviewQuestion {
  id: string;
  sessionId: string;
  text: string;
  focus: FocusArea;
  depth: QuestionDepth;
  order: number;
  generationMethod: 'ai' | 'template' | 'fallback';
  createdAt: Date;
}

export interface MockInterviewAnswer {
  id: string;
  questionId: string;
  text: string;
  aiInsights?: {
    keyPhrases: string[];
    emotionalTone: string;
    confidence: number;
  };
  createdAt: Date;
}

export const mockInterviewQuestions: MockInterviewQuestion[] = [
  {
    id: 'q-001',
    sessionId: 'session-001',
    text: 'FからGに変更した理由は何ですか？',
    focus: 'harmony',
    depth: 'medium',
    order: 0,
    generationMethod: 'ai',
    createdAt: new Date('2025-01-15T10:05:00Z'),
  },
  {
    id: 'q-002',
    sessionId: 'session-001',
    text: 'この和音進行が表現したい感情の本質は何ですか？',
    focus: 'harmony',
    depth: 'deep',
    order: 1,
    generationMethod: 'ai',
    createdAt: new Date('2025-01-15T10:05:00Z'),
  },
  {
    id: 'q-003',
    sessionId: 'session-002',
    text: 'メロディを高音域に移動した意図は何ですか？',
    focus: 'melody',
    depth: 'medium',
    order: 0,
    generationMethod: 'ai',
    createdAt: new Date('2025-01-16T11:05:00Z'),
  },
];

export const mockInterviewAnswers: MockInterviewAnswer[] = [
  {
    id: 'a-001',
    questionId: 'q-001',
    text: 'サビへの流れを滑らかにするためです。Fだと少し唐突な感じがしたので。',
    aiInsights: {
      keyPhrases: ['サビ', '流れ', '滑らか', '唐突'],
      emotionalTone: 'analytical',
      confidence: 0.88,
    },
    createdAt: new Date('2025-01-15T10:10:00Z'),
  },
  {
    id: 'a-002',
    questionId: 'q-002',
    text: '希望と少しの切なさを同時に表現したかった。',
    aiInsights: {
      keyPhrases: ['希望', '切なさ', '同時', '表現'],
      emotionalTone: 'reflective',
      confidence: 0.85,
    },
    createdAt: new Date('2025-01-15T10:12:00Z'),
  },
];

/**
 * 3. RAG Embeddings Database Records
 */
export interface MockRAGEmbedding {
  id: string;
  sourceType: 'log_entry' | 'session' | 'template';
  sourceId: string;
  embedding: number[];
  metadata?: Record<string, any>;
  createdAt: Date;
}

export const mockRAGEmbeddings: MockRAGEmbedding[] = mockSessions.map((session) => ({
  id: `emb-${session.id}`,
  sourceType: 'session' as const,
  sourceId: session.id,
  embedding: mockEmbeddings[session.userShortNote],
  metadata: {
    focusArea: session.aiAnnotations.focusArea,
    confidence: session.aiAnnotations.confidence,
  },
  createdAt: session.createdAt,
}));

/**
 * 4. Factory Functions for Dynamic Test Data
 */
export class Phase13FixtureFactory {
  static createSession(overrides?: Partial<MockSession>): MockSession {
    const id = `session-${Math.random().toString(36).substr(2, 9)}`;
    return {
      id,
      userId: 'user-test',
      type: 'composition',
      title: 'Test Session',
      userShortNote: 'Test note',
      aiAnnotations: {
        focusArea: 'harmony',
        intentHypothesis: 'Test hypothesis',
        confidence: 0.8,
      },
      createdAt: new Date(),
      ...overrides,
    };
  }

  static createQuestion(
    sessionId: string,
    overrides?: Partial<MockInterviewQuestion>
  ): MockInterviewQuestion {
    const id = `q-${Math.random().toString(36).substr(2, 9)}`;
    return {
      id,
      sessionId,
      text: 'Test question?',
      focus: 'harmony',
      depth: 'medium',
      order: 0,
      generationMethod: 'ai',
      createdAt: new Date(),
      ...overrides,
    };
  }

  static createAnswer(
    questionId: string,
    overrides?: Partial<MockInterviewAnswer>
  ): MockInterviewAnswer {
    const id = `a-${Math.random().toString(36).substr(2, 9)}`;
    return {
      id,
      questionId,
      text: 'Test answer',
      aiInsights: {
        keyPhrases: ['test'],
        emotionalTone: 'neutral',
        confidence: 0.7,
      },
      createdAt: new Date(),
      ...overrides,
    };
  }

  static createBatchSessions(count: number, focusArea?: FocusArea): MockSession[] {
    return Array.from({ length: count }, (_, i) =>
      this.createSession({
        id: `session-batch-${i}`,
        aiAnnotations: {
          focusArea: focusArea || 'harmony',
          intentHypothesis: `Hypothesis ${i}`,
          confidence: 0.7 + Math.random() * 0.3,
        },
      })
    );
  }
}

/**
 * 5. Helper Functions
 */
export const phase13Helpers = {
  /**
   * Get all templates for a specific focusArea
   */
  getTemplatesByFocus(focus: FocusArea): QuestionTemplate[] {
    return mockQuestionTemplates.filter((t) => t.focus === focus);
  },

  /**
   * Get all templates for a specific depth
   */
  getTemplatesByDepth(depth: QuestionDepth): QuestionTemplate[] {
    return mockQuestionTemplates.filter((t) => t.depth === depth);
  },

  /**
   * Get session by focusArea
   */
  getSessionByFocus(focus: FocusArea): MockSession | undefined {
    return mockSessions.find((s) => s.aiAnnotations.focusArea === focus);
  },

  /**
   * Get embedding for session note
   */
  getEmbeddingForSession(sessionId: string): number[] | undefined {
    const session = mockSessions.find((s) => s.id === sessionId);
    return session ? mockEmbeddings[session.userShortNote] : undefined;
  },

  /**
   * Calculate cosine similarity
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  },

  /**
   * Find similar sessions by embedding
   */
  findSimilarSessions(queryEmbedding: number[], limit = 5): Array<{ sessionId: string; similarity: number }> {
    const similarities = mockSessions.map((session) => {
      const sessionEmbedding = mockEmbeddings[session.userShortNote];
      const similarity = this.cosineSimilarity(queryEmbedding, sessionEmbedding);
      return { sessionId: session.id, similarity };
    });

    return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
  },

  /**
   * Validate RAG ground truth
   */
  validateRAGResults(
    query: string,
    results: string[],
    groundTruth: RAGGroundTruth
  ): { precision: number; recall: number; f1: number } {
    const expectedSet = new Set(groundTruth.expectedResults);
    const resultSet = new Set(results);

    const truePositives = results.filter((r) => expectedSet.has(r)).length;
    const precision = results.length > 0 ? truePositives / results.length : 0;
    const recall = groundTruth.expectedResults.length > 0 ? truePositives / groundTruth.expectedResults.length : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    return { precision, recall, f1 };
  },
};

/**
 * 6. Mock API Responses
 */
export const mockPhase13APIResponses = {
  generateQuestionsSuccess: {
    questions: [mockInterviewQuestions[0], mockInterviewQuestions[1]],
    generationMethod: 'ai' as const,
    confidence: 0.85,
  },

  generateQuestionsFallback: {
    questions: [
      {
        id: 'q-fallback-001',
        sessionId: 'session-001',
        text: 'どのような変更を行いましたか？',
        focus: 'harmony' as const,
        depth: 'medium' as const,
        order: 0,
        generationMethod: 'fallback' as const,
        createdAt: new Date(),
      },
    ],
    generationMethod: 'fallback' as const,
    confidence: 0.5,
  },

  saveAnswerSuccess: {
    answer: mockInterviewAnswers[0],
  },

  getHistorySuccess: {
    qaPairs: [
      {
        question: mockInterviewQuestions[0],
        answer: mockInterviewAnswers[0],
      },
      {
        question: mockInterviewQuestions[1],
        answer: mockInterviewAnswers[1],
      },
    ],
    total: 2,
  },

  ragSearchSuccess: {
    results: [
      {
        sessionId: 'session-001',
        similarity: 0.85,
        userShortNote: 'サビのコード進行をFからGに変更した',
      },
      {
        sessionId: 'session-005',
        similarity: 0.72,
        userShortNote: '短調のコードを増やして、テンポを遅くした',
      },
    ],
  },
};

/**
 * Export utility function for generating deterministic vectors
 */
export { generateDeterministicVector };
