/**
 * SessionRepository - Data access layer for Session/Interview system
 * Phase 2: MUEDnote AI Interview-driven Logging
 *
 * This repository provides type-safe CRUD operations for:
 * - sessions
 * - session_analyses
 * - interview_questions
 * - interview_answers
 */

import { db } from '@/db/edge';
import {
  sessions,
  sessionAnalyses,
  interviewQuestions,
  interviewAnswers,
  sessionTypeEnum,
  sessionStatusEnum,
  interviewFocusEnum,
  interviewDepthEnum,
  type DAWMetadata,
  type AIAnnotations,
  type SessionAnalysisData,
  type AIInsights,
} from '@/db/schema/sessions';
import { desc, eq, and, sql } from 'drizzle-orm';

// ========================================
// Type Definitions
// ========================================

/**
 * Session creation input (minimal required fields)
 */
export interface CreateSessionInput {
  userId: string;
  type: typeof sessionTypeEnum.enumValues[number];
  title: string;
  userShortNote: string;
  projectId?: string;
  projectName?: string;
  dawMeta?: DAWMetadata;
  isPublic?: boolean;
  shareWithMentor?: boolean;
}

/**
 * Session update input (all fields optional)
 */
export interface UpdateSessionInput {
  title?: string;
  userShortNote?: string;
  status?: typeof sessionStatusEnum.enumValues[number];
  dawMeta?: DAWMetadata;
  aiAnnotations?: AIAnnotations;
  isPublic?: boolean;
  shareWithMentor?: boolean;
  completedAt?: Date;
}

/**
 * Session analysis creation input
 */
export interface CreateSessionAnalysisInput {
  sessionId: string;
  analysisData: SessionAnalysisData;
  analysisVersion?: string;
  confidence?: number;
}

/**
 * Interview question creation input
 */
export interface CreateInterviewQuestionInput {
  sessionId: string;
  text: string;
  focus: typeof interviewFocusEnum.enumValues[number];
  depth: typeof interviewDepthEnum.enumValues[number];
  order?: number;
  generatedBy?: string;
  templateId?: string;
  ragContext?: Record<string, unknown>;
}

/**
 * Interview answer creation input
 */
export interface CreateInterviewAnswerInput {
  sessionId: string;
  questionId: string;
  text: string;
  aiInsights?: AIInsights;
}

/**
 * Session filter options
 */
export interface SessionFilters {
  userId?: string;
  type?: typeof sessionTypeEnum.enumValues[number];
  status?: typeof sessionStatusEnum.enumValues[number];
  isPublic?: boolean;
  limit?: number;
  offset?: number;
}

// ========================================
// SessionRepository Class
// ========================================

export class SessionRepository {
  // ========================================
  // Sessions CRUD
  // ========================================

  /**
   * Create a new session
   */
  async createSession(input: CreateSessionInput) {
    const [session] = await db
      .insert(sessions)
      .values({
        userId: input.userId,
        type: input.type,
        title: input.title,
        userShortNote: input.userShortNote,
        projectId: input.projectId,
        projectName: input.projectName,
        dawMeta: input.dawMeta,
        isPublic: input.isPublic ?? false,
        shareWithMentor: input.shareWithMentor ?? true,
        status: 'draft',
      })
      .returning();

    return session;
  }

  /**
   * Get session by ID
   */
  async getSessionById(sessionId: string) {
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    return session;
  }

  /**
   * Get sessions with filters
   */
  async getSessions(filters: SessionFilters = {}) {
    let query = db.select().from(sessions);

    const conditions = [];

    if (filters.userId) {
      conditions.push(eq(sessions.userId, filters.userId));
    }

    if (filters.type) {
      conditions.push(eq(sessions.type, filters.type));
    }

    if (filters.status) {
      conditions.push(eq(sessions.status, filters.status));
    }

    if (filters.isPublic !== undefined) {
      conditions.push(eq(sessions.isPublic, filters.isPublic));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    // Order by most recent first
    query = query.orderBy(desc(sessions.createdAt)) as typeof query;

    if (filters.limit) {
      query = query.limit(filters.limit) as typeof query;
    }

    if (filters.offset) {
      query = query.offset(filters.offset) as typeof query;
    }

    return await query;
  }

  /**
   * Update session
   */
  async updateSession(sessionId: string, input: UpdateSessionInput) {
    const [updated] = await db
      .update(sessions)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, sessionId))
      .returning();

    return updated;
  }

  /**
   * Delete session (cascade delete handled by DB)
   */
  async deleteSession(sessionId: string) {
    const [deleted] = await db
      .delete(sessions)
      .where(eq(sessions.id, sessionId))
      .returning();

    return deleted;
  }

  /**
   * Mark session as completed
   */
  async completeSession(sessionId: string) {
    return this.updateSession(sessionId, {
      status: 'completed',
      completedAt: new Date(),
    });
  }

  // ========================================
  // Session Analyses
  // ========================================

  /**
   * Create session analysis
   */
  async createSessionAnalysis(input: CreateSessionAnalysisInput) {
    const [analysis] = await db
      .insert(sessionAnalyses)
      .values({
        sessionId: input.sessionId,
        analysisData: input.analysisData,
        analysisVersion: input.analysisVersion ?? 'mvp-1.0',
        confidence: input.confidence ?? 0,
      })
      .returning();

    return analysis;
  }

  /**
   * Get analysis for a session
   */
  async getSessionAnalysis(sessionId: string) {
    const [analysis] = await db
      .select()
      .from(sessionAnalyses)
      .where(eq(sessionAnalyses.sessionId, sessionId))
      .limit(1);

    return analysis;
  }

  /**
   * Update session analysis
   */
  async updateSessionAnalysis(
    sessionId: string,
    analysisData: SessionAnalysisData,
    confidence?: number
  ) {
    const [updated] = await db
      .update(sessionAnalyses)
      .set({
        analysisData,
        confidence,
        updatedAt: new Date(),
      })
      .where(eq(sessionAnalyses.sessionId, sessionId))
      .returning();

    return updated;
  }

  // ========================================
  // Interview Questions
  // ========================================

  /**
   * Create interview question
   */
  async createInterviewQuestion(input: CreateInterviewQuestionInput) {
    const [question] = await db
      .insert(interviewQuestions)
      .values({
        sessionId: input.sessionId,
        text: input.text,
        focus: input.focus,
        depth: input.depth,
        order: input.order ?? 0,
        generatedBy: input.generatedBy ?? 'ai',
        templateId: input.templateId,
        ragContext: input.ragContext,
      })
      .returning();

    return question;
  }

  /**
   * Get questions for a session
   */
  async getSessionQuestions(sessionId: string) {
    return await db
      .select()
      .from(interviewQuestions)
      .where(eq(interviewQuestions.sessionId, sessionId))
      .orderBy(interviewQuestions.order);
  }

  /**
   * Create multiple questions (batch)
   */
  async createSessionQuestions(inputs: CreateInterviewQuestionInput[]) {
    if (inputs.length === 0) return [];

    const questions = await db
      .insert(interviewQuestions)
      .values(
        inputs.map((input, index) => ({
          sessionId: input.sessionId,
          text: input.text,
          focus: input.focus,
          depth: input.depth,
          order: input.order ?? index,
          generatedBy: input.generatedBy ?? 'ai',
          templateId: input.templateId,
          ragContext: input.ragContext,
        }))
      )
      .returning();

    return questions;
  }

  // ========================================
  // Interview Answers
  // ========================================

  /**
   * Create interview answer
   */
  async createInterviewAnswer(input: CreateInterviewAnswerInput) {
    const [answer] = await db
      .insert(interviewAnswers)
      .values({
        sessionId: input.sessionId,
        questionId: input.questionId,
        text: input.text,
        aiInsights: input.aiInsights,
      })
      .returning();

    return answer;
  }

  /**
   * Get answer for a question
   */
  async getQuestionAnswer(questionId: string) {
    const [answer] = await db
      .select()
      .from(interviewAnswers)
      .where(eq(interviewAnswers.questionId, questionId))
      .limit(1);

    return answer;
  }

  /**
   * Get all answers for a session
   */
  async getSessionAnswers(sessionId: string) {
    return await db
      .select()
      .from(interviewAnswers)
      .where(eq(interviewAnswers.sessionId, sessionId));
  }

  /**
   * Update interview answer
   */
  async updateInterviewAnswer(
    questionId: string,
    text: string,
    aiInsights?: AIInsights
  ) {
    const [updated] = await db
      .update(interviewAnswers)
      .set({
        text,
        aiInsights,
        updatedAt: new Date(),
      })
      .where(eq(interviewAnswers.questionId, questionId))
      .returning();

    return updated;
  }

  // ========================================
  // Composite Queries
  // ========================================

  /**
   * Get complete session with analysis, questions, and answers
   */
  async getCompleteSession(sessionId: string) {
    const [session, analysis, questions, answers] = await Promise.all([
      this.getSessionById(sessionId),
      this.getSessionAnalysis(sessionId),
      this.getSessionQuestions(sessionId),
      this.getSessionAnswers(sessionId),
    ]);

    if (!session) {
      return null;
    }

    return {
      session,
      analysis,
      questions,
      answers,
    };
  }

  /**
   * Get session Q&A pairs (questions with their answers)
   */
  async getSessionQAPairs(sessionId: string) {
    const questions = await this.getSessionQuestions(sessionId);
    const answers = await this.getSessionAnswers(sessionId);

    const answerMap = new Map(
      answers.map((a) => [a.questionId, a])
    );

    return questions.map((question) => ({
      question,
      answer: answerMap.get(question.id) || null,
    }));
  }

  /**
   * Get session statistics
   */
  async getSessionStats(userId: string) {
    const result = await db
      .select({
        totalSessions: sql<number>`count(*)`,
        completedSessions: sql<number>`count(*) filter (where status = 'completed')`,
        totalQuestions: sql<number>`count(distinct ${interviewQuestions.id})`,
        totalAnswers: sql<number>`count(distinct ${interviewAnswers.id})`,
      })
      .from(sessions)
      .leftJoin(interviewQuestions, eq(sessions.id, interviewQuestions.sessionId))
      .leftJoin(interviewAnswers, eq(sessions.id, interviewAnswers.sessionId))
      .where(eq(sessions.userId, userId));

    return result[0];
  }
}

// ========================================
// Singleton Instance
// ========================================

/**
 * Singleton repository instance
 * Use this for all session-related database operations
 */
export const sessionRepository = new SessionRepository();
