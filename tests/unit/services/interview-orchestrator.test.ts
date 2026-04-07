/**
 * InterviewOrchestrator Unit Tests
 *
 * Tests:
 * - Zod input schema validation
 * - Zod output schema validation
 * - Input validation error handling
 * - Fallback questions on service failure
 * - getInterviewHistory sessionId validation
 * - saveAnswer validation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ========================================
// Mocks — all downstream services
// ========================================

const mockAnalyzeSession = vi.fn();
vi.mock('@/lib/services/analyzer.service', () => ({
  analyzerService: {
    analyzeSession: (...args: any[]) => mockAnalyzeSession(...args),
  },
}));

const mockGenerateQuestions = vi.fn();
vi.mock('@/lib/services/interviewer.service', () => ({
  interviewerService: {
    generateQuestions: (...args: any[]) => mockGenerateQuestions(...args),
  },
  InterviewQuestionSchema: {},
}));

const mockFindSimilarLogs = vi.fn();
vi.mock('@/lib/services/rag.service', () => ({
  ragService: {
    findSimilarLogs: (...args: any[]) => mockFindSimilarLogs(...args),
  },
}));

const mockCreateInterviewAnswer = vi.fn();
const mockUpdateSession = vi.fn();
const mockGetSessionQAPairs = vi.fn();
vi.mock('@/lib/repositories', () => ({
  sessionRepository: {
    createInterviewAnswer: (...args: any[]) => mockCreateInterviewAnswer(...args),
    updateSession: (...args: any[]) => mockUpdateSession(...args),
    getSessionQAPairs: (...args: any[]) => mockGetSessionQAPairs(...args),
  },
}));

vi.mock('@/lib/utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import {
  GenerateInterviewInputSchema,
  SaveAnswerInputSchema,
  InterviewOrchestrator,
} from '@/lib/services/interview-orchestrator.service';

// ========================================
// Tests
// ========================================

describe('InterviewOrchestrator', () => {
  let orchestrator: InterviewOrchestrator;

  beforeEach(() => {
    vi.restoreAllMocks();
    orchestrator = new InterviewOrchestrator();
    mockAnalyzeSession.mockResolvedValue({
      focusArea: 'harmony',
      intentHypothesis: 'Working on chord progression',
      confidence: 0.85,
    });
    mockGenerateQuestions.mockResolvedValue({
      questions: [
        { text: 'Q1?', focus: 'harmony', depth: 'shallow', order: 0 },
        { text: 'Q2?', focus: 'harmony', depth: 'medium', order: 1 },
      ],
      confidence: 0.8,
      generationMethod: 'ai',
    });
    mockFindSimilarLogs.mockResolvedValue([]);
    mockCreateInterviewAnswer.mockResolvedValue({ id: 'answer-1' });
    mockUpdateSession.mockResolvedValue({});
    mockGetSessionQAPairs.mockResolvedValue([]);
  });

  // ------------------------------------------------------------------
  // GenerateInterviewInputSchema validation
  // ------------------------------------------------------------------

  describe('GenerateInterviewInputSchema', () => {
    const validInput = {
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
      sessionType: 'composition',
      userShortNote: 'サビのコードをFからGに変えた',
    };

    it('accepts valid input', () => {
      expect(() => GenerateInterviewInputSchema.parse(validInput)).not.toThrow();
    });

    it('rejects non-UUID sessionId', () => {
      expect(() => GenerateInterviewInputSchema.parse({
        ...validInput,
        sessionId: 'not-a-uuid',
      })).toThrow();
    });

    it('rejects invalid sessionType', () => {
      expect(() => GenerateInterviewInputSchema.parse({
        ...validInput,
        sessionType: 'invalid_type',
      })).toThrow();
    });

    it('accepts all valid sessionTypes', () => {
      const types = ['composition', 'practice', 'mix', 'ear_training', 'listening', 'theory', 'other'];
      for (const type of types) {
        expect(() => GenerateInterviewInputSchema.parse({
          ...validInput,
          sessionType: type,
        })).not.toThrow();
      }
    });

    it('rejects empty userShortNote', () => {
      expect(() => GenerateInterviewInputSchema.parse({
        ...validInput,
        userShortNote: '',
      })).toThrow();
    });

    it('accepts optional dawMeta', () => {
      expect(() => GenerateInterviewInputSchema.parse({
        ...validInput,
        dawMeta: {
          dawName: 'Ableton',
          tempo: 120,
          timeSignature: '4/4',
        },
      })).not.toThrow();
    });

    it('accepts optional previousQuestions', () => {
      expect(() => GenerateInterviewInputSchema.parse({
        ...validInput,
        previousQuestions: ['Previous Q1', 'Previous Q2'],
      })).not.toThrow();
    });
  });

  // ------------------------------------------------------------------
  // SaveAnswerInputSchema validation
  // ------------------------------------------------------------------

  describe('SaveAnswerInputSchema', () => {
    const validInput = {
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
      questionId: '660e8400-e29b-41d4-a716-446655440001',
      answerText: 'サビをもっと盛り上げたかった',
    };

    it('accepts valid input', () => {
      expect(() => SaveAnswerInputSchema.parse(validInput)).not.toThrow();
    });

    it('rejects empty answerText', () => {
      expect(() => SaveAnswerInputSchema.parse({
        ...validInput,
        answerText: '',
      })).toThrow();
    });

    it('rejects non-UUID sessionId', () => {
      expect(() => SaveAnswerInputSchema.parse({
        ...validInput,
        sessionId: 'bad-id',
      })).toThrow();
    });

    it('accepts optional metadata', () => {
      expect(() => SaveAnswerInputSchema.parse({
        ...validInput,
        metadata: { key: 'value', nested: { a: 1 } },
      })).not.toThrow();
    });
  });

  // ------------------------------------------------------------------
  // generateInterviewQuestions
  // ------------------------------------------------------------------

  describe('generateInterviewQuestions', () => {
    const validInput = {
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
      sessionType: 'composition' as const,
      userShortNote: 'Changed the chorus chord from F to G',
    };

    it('returns questions with enriched context', async () => {
      const result = await orchestrator.generateInterviewQuestions(validInput);
      expect(result.questions).toHaveLength(2);
      expect(result.focusArea).toBe('harmony');
      expect(result.intentHypothesis).toBeTruthy();
      expect(result.generationMethod).toBe('ai');
    });

    it('throws on invalid input', async () => {
      await expect(orchestrator.generateInterviewQuestions({
        ...validInput,
        sessionId: 'invalid',
      })).rejects.toThrow('Invalid input');
    });

    it('returns fallback questions when services fail', async () => {
      mockAnalyzeSession.mockRejectedValue(new Error('Service down'));

      const result = await orchestrator.generateInterviewQuestions(validInput);
      expect(result.generationMethod).toBe('fallback');
      expect(result.questions).toHaveLength(2);
      expect(result.confidence).toBe(0.3);
    });

    it('continues without RAG when RAG service fails', async () => {
      mockFindSimilarLogs.mockRejectedValue(new Error('RAG error'));

      const result = await orchestrator.generateInterviewQuestions(validInput);
      expect(result.similarLogs).toEqual([]);
      expect(result.questions).toHaveLength(2); // Still generates questions
    });

    it('includes similar logs in output when found', async () => {
      mockFindSimilarLogs.mockResolvedValue([
        { logId: 'log-1', similarity: 0.85, content: 'Similar chord change' },
        { logId: 'log-2', similarity: 0.75, content: 'Verse chord analysis' },
      ]);

      const result = await orchestrator.generateInterviewQuestions(validInput);
      expect(result.similarLogs).toHaveLength(2);
      expect(result.similarLogs[0].logId).toBe('log-1');
    });
  });

  // ------------------------------------------------------------------
  // saveAnswer
  // ------------------------------------------------------------------

  describe('saveAnswer', () => {
    const validInput = {
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
      questionId: '660e8400-e29b-41d4-a716-446655440001',
      answerText: 'My answer text',
    };

    it('saves answer successfully', async () => {
      const result = await orchestrator.saveAnswer(validInput);
      expect(result.success).toBe(true);
      expect(result.answerId).toBe('answer-1');
      expect(result.sessionId).toBe(validInput.sessionId);
    });

    it('throws on invalid input', async () => {
      await expect(orchestrator.saveAnswer({
        ...validInput,
        answerText: '',
      })).rejects.toThrow('Invalid input');
    });

    it('throws on database error', async () => {
      mockCreateInterviewAnswer.mockRejectedValue(new Error('DB connection failed'));

      await expect(orchestrator.saveAnswer(validInput)).rejects.toThrow('Failed to save answer');
    });
  });

  // ------------------------------------------------------------------
  // getInterviewHistory
  // ------------------------------------------------------------------

  describe('getInterviewHistory', () => {
    it('throws on invalid sessionId format', async () => {
      await expect(orchestrator.getInterviewHistory('not-a-uuid')).rejects.toThrow('Invalid sessionId format');
    });

    it('throws on empty sessionId', async () => {
      await expect(orchestrator.getInterviewHistory('')).rejects.toThrow('Invalid sessionId format');
    });

    it('returns empty history when no questions exist', async () => {
      const result = await orchestrator.getInterviewHistory('550e8400-e29b-41d4-a716-446655440000');
      expect(result.totalQuestions).toBe(0);
      expect(result.answeredCount).toBe(0);
      expect(result.questions).toEqual([]);
    });

    it('returns history with questions and answers', async () => {
      mockGetSessionQAPairs.mockResolvedValue([
        {
          question: {
            id: 'q-1',
            text: 'Question 1?',
            focus: 'harmony',
            depth: 'shallow',
            createdAt: new Date('2026-01-01'),
          },
          answer: {
            id: 'a-1',
            text: 'Answer 1',
            createdAt: new Date('2026-01-01'),
          },
        },
        {
          question: {
            id: 'q-2',
            text: 'Question 2?',
            focus: 'emotion',
            depth: 'medium',
            createdAt: new Date('2026-01-01'),
          },
          answer: null,
        },
      ]);

      const result = await orchestrator.getInterviewHistory('550e8400-e29b-41d4-a716-446655440000');
      expect(result.totalQuestions).toBe(2);
      expect(result.answeredCount).toBe(1);
      expect(result.questions[0].answer).not.toBeNull();
      expect(result.questions[1].answer).toBeNull();
    });
  });
});
