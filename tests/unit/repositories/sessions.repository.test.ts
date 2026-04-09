/**
 * SessionRepository Unit Tests
 *
 * Tests all CRUD operations and composite queries:
 * - Sessions: create, getById, getSessions (with filters), update, delete, complete
 * - Analyses: create, get, update
 * - Questions: create, getForSession, batch create
 * - Answers: create, getForQuestion, getForSession, update
 * - Composite: getCompleteSession, getSessionQAPairs, getSessionStats
 * - Hoo context: getSessionContextForHoo
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ========================================
// Mocks
// ========================================

vi.mock('@/db/edge', () => {
  return {
    db: {
      insert: vi.fn(),
      select: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
});

vi.mock('@/db/schema/sessions', () => ({
  sessions: { id: 'id', userId: 'user_id', type: 'type', status: 'status', isPublic: 'is_public', createdAt: 'created_at' },
  sessionAnalyses: { id: 'id', sessionId: 'session_id' },
  interviewQuestions: { id: 'id', sessionId: 'session_id', order: 'order' },
  interviewAnswers: { id: 'id', sessionId: 'session_id', questionId: 'question_id' },
  sessionTypeEnum: { enumValues: ['recording', 'mixing', 'composing', 'practicing', 'general'] },
  sessionStatusEnum: { enumValues: ['draft', 'in_progress', 'completed'] },
  interviewFocusEnum: { enumValues: ['intent', 'process', 'emotion', 'outcome', 'general'] },
  interviewDepthEnum: { enumValues: ['surface', 'medium', 'deep'] },
}));

vi.mock('@/db/schema/muednote-mobile', () => ({
  muednoteMobileSessions: { id: 'id', userId: 'user_id', createdAt: 'created_at' },
  muednoteMobileLogs: { sessionId: 'session_id', timestampSec: 'timestamp_sec' },
}));

vi.mock('drizzle-orm', () => ({
  desc: vi.fn((col) => col),
  eq: vi.fn((a, b) => ({ a, b })),
  and: vi.fn((...args) => args),
  sql: vi.fn((strings: any) => strings),
  inArray: vi.fn((col, vals) => ({ col, vals })),
}));

import { SessionRepository } from '@/lib/repositories/sessions.repository';
import { db } from '@/db/edge';

// ========================================
// Fixtures
// ========================================

const mockSession = {
  id: 'sess-001',
  userId: 'user-001',
  type: 'recording',
  title: 'Test Session',
  userShortNote: 'Working on drums',
  status: 'draft',
  isPublic: false,
  shareWithMentor: true,
  createdAt: new Date('2026-04-10'),
  updatedAt: new Date('2026-04-10'),
};

const mockAnalysis = {
  id: 'analysis-001',
  sessionId: 'sess-001',
  analysisData: { focusArea: 'drums', intentHypothesis: 'Improving timing' },
  analysisVersion: 'mvp-1.0',
  confidence: 0.85,
  createdAt: new Date('2026-04-10'),
  updatedAt: new Date('2026-04-10'),
};

const mockQuestion = {
  id: 'q-001',
  sessionId: 'sess-001',
  text: 'What was your goal?',
  focus: 'intent',
  depth: 'medium',
  order: 0,
  generatedBy: 'ai',
};

const mockAnswer = {
  id: 'a-001',
  sessionId: 'sess-001',
  questionId: 'q-001',
  text: 'I wanted to improve my drum timing',
  aiInsights: null,
};

const mockMobileSession = {
  id: 'mobile-001',
  userId: 'clerk_user_001',
  sessionMemo: 'Drum session notes',
  durationSec: 3600,
  createdAt: new Date('2026-04-10'),
};

const mockMobileLog = {
  sessionId: 'mobile-001',
  text: 'Working on kick pattern',
  timestampSec: 120,
};

// ========================================
// Setup
// ========================================

describe('SessionRepository', () => {
  let repository: SessionRepository;

  // Helper: make a mock that is both chainable and thenable (like Drizzle query builders)
  function thenable(methods: Record<string, any>, result: any[]) {
    return {
      ...methods,
      then: (resolve: any) => resolve(result),
    };
  }

  // Reusable chain mock builder
  function setupSelectChain(result: any[]) {
    const mockOffset = vi.fn().mockImplementation(() => thenable({}, result));
    const mockLimit = vi.fn().mockImplementation(() => thenable({ offset: mockOffset }, result));
    const mockOrderBy = vi.fn().mockImplementation(() =>
      thenable({ limit: mockLimit, offset: mockOffset }, result)
    );
    const mockWhere = vi.fn().mockImplementation(() =>
      thenable({ limit: mockLimit, orderBy: mockOrderBy, returning: vi.fn().mockResolvedValue(result) }, result)
    );
    const mockFrom = vi.fn().mockImplementation(() =>
      thenable({
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        leftJoin: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(result),
          }),
        }),
      }, result)
    );
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as never);
    return { mockFrom, mockWhere, mockOrderBy, mockLimit, mockOffset };
  }

  function setupInsertChain(result: any) {
    const mockReturning = vi.fn().mockResolvedValue([result]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as never);
    return { mockValues, mockReturning };
  }

  function setupUpdateChain(result: any) {
    const mockReturning = vi.fn().mockResolvedValue([result]);
    const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as never);
    return { mockSet, mockWhere, mockReturning };
  }

  function setupDeleteChain(result: any) {
    const mockReturning = vi.fn().mockResolvedValue([result]);
    const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
    vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as never);
    return { mockWhere, mockReturning };
  }

  beforeEach(() => {
    repository = new SessionRepository();
    vi.clearAllMocks();
  });

  // ========================================
  // Sessions CRUD
  // ========================================

  describe('createSession', () => {
    it('creates a session and returns it', async () => {
      setupInsertChain(mockSession);

      const result = await repository.createSession({
        userId: 'user-001',
        type: 'recording',
        title: 'Test Session',
        userShortNote: 'Working on drums',
      });

      expect(db.insert).toHaveBeenCalled();
      expect(result).toEqual(mockSession);
    });

    it('sets default values for optional fields', async () => {
      const { mockValues } = setupInsertChain(mockSession);

      await repository.createSession({
        userId: 'user-001',
        type: 'recording',
        title: 'Test',
        userShortNote: 'Note',
      });

      const insertedValues = mockValues.mock.calls[0][0];
      expect(insertedValues.isPublic).toBe(false);
      expect(insertedValues.shareWithMentor).toBe(true);
      expect(insertedValues.status).toBe('draft');
    });

    it('respects explicit optional field values', async () => {
      const { mockValues } = setupInsertChain(mockSession);

      await repository.createSession({
        userId: 'user-001',
        type: 'recording',
        title: 'Public Session',
        userShortNote: 'Note',
        isPublic: true,
        shareWithMentor: false,
      });

      const insertedValues = mockValues.mock.calls[0][0];
      expect(insertedValues.isPublic).toBe(true);
      expect(insertedValues.shareWithMentor).toBe(false);
    });
  });

  describe('getSessionById', () => {
    it('returns session when found', async () => {
      setupSelectChain([mockSession]);

      const result = await repository.getSessionById('sess-001');

      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual(mockSession);
    });

    it('returns undefined when not found', async () => {
      setupSelectChain([]);

      const result = await repository.getSessionById('nonexistent');

      expect(result).toBeUndefined();
    });
  });

  describe('getSessions', () => {
    it('returns all sessions when no filters', async () => {
      setupSelectChain([mockSession]);

      const result = await repository.getSessions();

      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual([mockSession]);
    });

    it('applies userId filter', async () => {
      const { mockWhere } = setupSelectChain([mockSession]);

      await repository.getSessions({ userId: 'user-001' });

      expect(mockWhere).toHaveBeenCalled();
    });

    it('applies limit and offset', async () => {
      const { mockLimit, mockOffset } = setupSelectChain([mockSession]);

      await repository.getSessions({ limit: 10, offset: 20 });

      expect(mockLimit).toHaveBeenCalledWith(10);
      expect(mockOffset).toHaveBeenCalledWith(20);
    });
  });

  describe('updateSession', () => {
    it('updates and returns the session', async () => {
      const updated = { ...mockSession, title: 'Updated Title' };
      setupUpdateChain(updated);

      const result = await repository.updateSession('sess-001', {
        title: 'Updated Title',
      });

      expect(db.update).toHaveBeenCalled();
      expect(result).toEqual(updated);
    });

    it('sets updatedAt timestamp', async () => {
      const { mockSet } = setupUpdateChain(mockSession);

      await repository.updateSession('sess-001', { title: 'New' });

      const setArgs = mockSet.mock.calls[0][0];
      expect(setArgs.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('deleteSession', () => {
    it('deletes and returns the session', async () => {
      setupDeleteChain(mockSession);

      const result = await repository.deleteSession('sess-001');

      expect(db.delete).toHaveBeenCalled();
      expect(result).toEqual(mockSession);
    });
  });

  describe('completeSession', () => {
    it('delegates to updateSession with completed status', async () => {
      setupUpdateChain({ ...mockSession, status: 'completed' });

      const spy = vi.spyOn(repository, 'updateSession');
      await repository.completeSession('sess-001');

      expect(spy).toHaveBeenCalledWith('sess-001', {
        status: 'completed',
        completedAt: expect.any(Date),
      });
    });
  });

  // ========================================
  // Session Analyses
  // ========================================

  describe('createSessionAnalysis', () => {
    it('creates analysis with defaults', async () => {
      const { mockValues } = setupInsertChain(mockAnalysis);

      const result = await repository.createSessionAnalysis({
        sessionId: 'sess-001',
        analysisData: { focusArea: 'drums', intentHypothesis: 'Timing' } as any,
      });

      expect(result).toEqual(mockAnalysis);
      const values = mockValues.mock.calls[0][0];
      expect(values.analysisVersion).toBe('mvp-1.0');
      expect(values.confidence).toBe(0);
    });

    it('uses provided version and confidence', async () => {
      const { mockValues } = setupInsertChain(mockAnalysis);

      await repository.createSessionAnalysis({
        sessionId: 'sess-001',
        analysisData: {} as any,
        analysisVersion: 'v2.0',
        confidence: 0.95,
      });

      const values = mockValues.mock.calls[0][0];
      expect(values.analysisVersion).toBe('v2.0');
      expect(values.confidence).toBe(0.95);
    });
  });

  describe('getSessionAnalysis', () => {
    it('returns analysis when found', async () => {
      setupSelectChain([mockAnalysis]);

      const result = await repository.getSessionAnalysis('sess-001');
      expect(result).toEqual(mockAnalysis);
    });
  });

  describe('updateSessionAnalysis', () => {
    it('updates analysis data', async () => {
      const { mockSet } = setupUpdateChain(mockAnalysis);

      await repository.updateSessionAnalysis(
        'sess-001',
        { focusArea: 'updated' } as any,
        0.9
      );

      expect(db.update).toHaveBeenCalled();
      const setArgs = mockSet.mock.calls[0][0];
      expect(setArgs.analysisData).toEqual({ focusArea: 'updated' });
      expect(setArgs.confidence).toBe(0.9);
      expect(setArgs.updatedAt).toBeInstanceOf(Date);
    });
  });

  // ========================================
  // Interview Questions
  // ========================================

  describe('createInterviewQuestion', () => {
    it('creates a question with defaults', async () => {
      const { mockValues } = setupInsertChain(mockQuestion);

      await repository.createInterviewQuestion({
        sessionId: 'sess-001',
        text: 'What was your goal?',
        focus: 'intent',
        depth: 'medium',
      });

      const values = mockValues.mock.calls[0][0];
      expect(values.order).toBe(0);
      expect(values.generatedBy).toBe('ai');
    });
  });

  describe('getSessionQuestions', () => {
    it('returns questions for a session', async () => {
      setupSelectChain([mockQuestion]);

      const result = await repository.getSessionQuestions('sess-001');
      expect(result).toEqual([mockQuestion]);
    });
  });

  describe('createSessionQuestions', () => {
    it('returns empty array for empty input', async () => {
      const result = await repository.createSessionQuestions([]);
      expect(result).toEqual([]);
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('batch inserts multiple questions', async () => {
      const { mockValues } = setupInsertChain(mockQuestion);

      await repository.createSessionQuestions([
        { sessionId: 'sess-001', text: 'Q1', focus: 'intent', depth: 'medium' },
        { sessionId: 'sess-001', text: 'Q2', focus: 'process', depth: 'deep' },
      ]);

      expect(db.insert).toHaveBeenCalled();
      const values = mockValues.mock.calls[0][0];
      expect(values).toHaveLength(2);
      expect(values[0].order).toBe(0);
      expect(values[1].order).toBe(1);
    });
  });

  // ========================================
  // Interview Answers
  // ========================================

  describe('createInterviewAnswer', () => {
    it('creates an answer', async () => {
      setupInsertChain(mockAnswer);

      const result = await repository.createInterviewAnswer({
        sessionId: 'sess-001',
        questionId: 'q-001',
        text: 'I wanted to improve my drum timing',
      });

      expect(result).toEqual(mockAnswer);
    });
  });

  describe('getQuestionAnswer', () => {
    it('returns answer for a question', async () => {
      setupSelectChain([mockAnswer]);

      const result = await repository.getQuestionAnswer('q-001');
      expect(result).toEqual(mockAnswer);
    });
  });

  describe('getSessionAnswers', () => {
    it('returns all answers for a session', async () => {
      setupSelectChain([mockAnswer]);

      const result = await repository.getSessionAnswers('sess-001');
      expect(result).toEqual([mockAnswer]);
    });
  });

  describe('updateInterviewAnswer', () => {
    it('updates answer text and insights', async () => {
      const { mockSet } = setupUpdateChain(mockAnswer);

      await repository.updateInterviewAnswer('q-001', 'Updated answer', {
        sentiment: 'positive',
      } as any);

      const setArgs = mockSet.mock.calls[0][0];
      expect(setArgs.text).toBe('Updated answer');
      expect(setArgs.aiInsights).toEqual({ sentiment: 'positive' });
      expect(setArgs.updatedAt).toBeInstanceOf(Date);
    });
  });

  // ========================================
  // Composite Queries
  // ========================================

  describe('getCompleteSession', () => {
    it('returns session with analysis, questions, and answers', async () => {
      const spy = vi.spyOn(repository, 'getSessionById').mockResolvedValue(mockSession as any);
      vi.spyOn(repository, 'getSessionAnalysis').mockResolvedValue(mockAnalysis as any);
      vi.spyOn(repository, 'getSessionQuestions').mockResolvedValue([mockQuestion] as any);
      vi.spyOn(repository, 'getSessionAnswers').mockResolvedValue([mockAnswer] as any);

      const result = await repository.getCompleteSession('sess-001');

      expect(result).toEqual({
        session: mockSession,
        analysis: mockAnalysis,
        questions: [mockQuestion],
        answers: [mockAnswer],
      });
      spy.mockRestore();
    });

    it('returns null when session not found', async () => {
      vi.spyOn(repository, 'getSessionById').mockResolvedValue(undefined as any);
      vi.spyOn(repository, 'getSessionAnalysis').mockResolvedValue(undefined as any);
      vi.spyOn(repository, 'getSessionQuestions').mockResolvedValue([]);
      vi.spyOn(repository, 'getSessionAnswers').mockResolvedValue([]);

      const result = await repository.getCompleteSession('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getSessionQAPairs', () => {
    it('pairs questions with their answers', async () => {
      vi.spyOn(repository, 'getSessionQuestions').mockResolvedValue([mockQuestion] as any);
      vi.spyOn(repository, 'getSessionAnswers').mockResolvedValue([mockAnswer] as any);

      const result = await repository.getSessionQAPairs('sess-001');

      expect(result).toEqual([
        {
          question: mockQuestion,
          answer: mockAnswer,
        },
      ]);
    });

    it('returns null for unanswered questions', async () => {
      vi.spyOn(repository, 'getSessionQuestions').mockResolvedValue([mockQuestion] as any);
      vi.spyOn(repository, 'getSessionAnswers').mockResolvedValue([]);

      const result = await repository.getSessionQAPairs('sess-001');

      expect(result[0].answer).toBeNull();
    });
  });

  describe('getSessionStats', () => {
    it('returns statistics for a user', async () => {
      const stats = {
        totalSessions: 5,
        completedSessions: 3,
        totalQuestions: 15,
        totalAnswers: 12,
      };
      setupSelectChain([stats]);

      const result = await repository.getSessionStats('user-001');

      expect(db.select).toHaveBeenCalled();
      expect(result).toEqual(stats);
    });
  });

  // ========================================
  // Hoo Session Context
  // ========================================

  describe('getSessionContextForHoo', () => {
    it('returns empty context when no mobile sessions', async () => {
      // First select call returns empty (no mobile sessions)
      setupSelectChain([]);

      const result = await repository.getSessionContextForHoo('clerk_user_001');

      expect(result.hasContext).toBe(false);
      expect(result.recentSessions).toEqual([]);
    });

    it('returns context with mobile sessions and logs', async () => {
      // We need to mock two sequential select calls:
      // 1. get mobile sessions
      // 2. get logs for those sessions
      const mockSelectCall = vi.fn();
      let callCount = 0;

      // Setup for mobile sessions query (1st call)
      const sessionsResult = [mockMobileSession];
      // Setup for logs query (2nd call)
      const logsResult = [mockMobileLog];

      const mockOrderBy = vi.fn();
      const mockLimit = vi.fn();
      const mockWhere = vi.fn();

      mockSelectCall.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Mobile sessions query
          mockLimit.mockResolvedValue(sessionsResult);
          mockOrderBy.mockReturnValue({ limit: mockLimit });
          mockWhere.mockReturnValue({ orderBy: mockOrderBy });
          return {
            from: vi.fn().mockReturnValue({ where: mockWhere }),
          };
        } else {
          // Logs query
          mockOrderBy.mockResolvedValue(logsResult);
          mockWhere.mockReturnValue({ orderBy: mockOrderBy });
          return {
            from: vi.fn().mockReturnValue({ where: mockWhere }),
          };
        }
      });

      vi.mocked(db.select).mockImplementation(mockSelectCall as any);

      const result = await repository.getSessionContextForHoo('clerk_user_001');

      expect(result.hasContext).toBe(true);
      expect(result.recentSessions).toHaveLength(1);
      expect(result.recentSessions[0].title).toBe('Drum session notes');
      expect(result.recentSessions[0].type).toBe('mobile_session');
    });

    it('uses default limit of 3', async () => {
      setupSelectChain([]);

      await repository.getSessionContextForHoo('clerk_user_001');

      // Verify limit(3) was called
      expect(db.select).toHaveBeenCalled();
    });

    it('truncates long log text to 200 chars', async () => {
      const longText = 'A'.repeat(300);
      const longLog = { ...mockMobileLog, text: longText };

      let callCount = 0;
      vi.mocked(db.select).mockImplementation((() => {
        callCount++;
        const mockOrderBy = vi.fn();
        const mockLimit = vi.fn();
        const mockWhere = vi.fn();

        if (callCount === 1) {
          mockLimit.mockResolvedValue([mockMobileSession]);
          mockOrderBy.mockReturnValue({ limit: mockLimit });
          mockWhere.mockReturnValue({ orderBy: mockOrderBy });
        } else {
          mockOrderBy.mockResolvedValue([longLog]);
          mockWhere.mockReturnValue({ orderBy: mockOrderBy });
        }
        return { from: vi.fn().mockReturnValue({ where: mockWhere }) };
      }) as any);

      const result = await repository.getSessionContextForHoo('clerk_user_001');

      if (result.recentSessions[0]?.qaPairs) {
        expect(result.recentSessions[0].qaPairs[0].answer.length).toBeLessThanOrEqual(203); // 200 + '...'
      }
    });

    it('uses sessionMemo as title when available', async () => {
      let callCount = 0;
      vi.mocked(db.select).mockImplementation((() => {
        callCount++;
        const mockOrderBy = vi.fn();
        const mockLimit = vi.fn();
        const mockWhere = vi.fn();

        if (callCount === 1) {
          mockLimit.mockResolvedValue([{ ...mockMobileSession, sessionMemo: 'My memo' }]);
          mockOrderBy.mockReturnValue({ limit: mockLimit });
          mockWhere.mockReturnValue({ orderBy: mockOrderBy });
        } else {
          mockOrderBy.mockResolvedValue([mockMobileLog]);
          mockWhere.mockReturnValue({ orderBy: mockOrderBy });
        }
        return { from: vi.fn().mockReturnValue({ where: mockWhere }) };
      }) as any);

      const result = await repository.getSessionContextForHoo('clerk_user_001');

      expect(result.recentSessions[0].title).toBe('My memo');
    });

    it('falls back to first log text for title when no memo', async () => {
      let callCount = 0;
      vi.mocked(db.select).mockImplementation((() => {
        callCount++;
        const mockOrderBy = vi.fn();
        const mockLimit = vi.fn();
        const mockWhere = vi.fn();

        if (callCount === 1) {
          mockLimit.mockResolvedValue([{ ...mockMobileSession, sessionMemo: null }]);
          mockOrderBy.mockReturnValue({ limit: mockLimit });
          mockWhere.mockReturnValue({ orderBy: mockOrderBy });
        } else {
          mockOrderBy.mockResolvedValue([mockMobileLog]);
          mockWhere.mockReturnValue({ orderBy: mockOrderBy });
        }
        return { from: vi.fn().mockReturnValue({ where: mockWhere }) };
      }) as any);

      const result = await repository.getSessionContextForHoo('clerk_user_001');

      expect(result.recentSessions[0].title).toBe('Working on kick pattern');
    });
  });
});
