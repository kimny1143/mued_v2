/**
 * InterviewOrchestrator - High-level Interview Flow Orchestration Service
 * Phase 1.3 Day 18-19: MUEDnote AI Interview-driven Logging
 *
 * Orchestrates the complete interview question generation flow by combining:
 * - AnalyzerService: Detects focusArea and intentHypothesis
 * - RAGService: Finds similar logs for contextual enrichment
 * - InterviewerService: Generates personalized questions
 *
 * Architecture:
 * User Input (userShortNote)
 *   ↓
 * AnalyzerService (detect focusArea, intentHypothesis)
 *   ↓
 * RAGService (find similar logs for context)
 *   ↓
 * InterviewerService (generate questions with RAG context)
 *   ↓
 * Return enriched questions + metadata
 *
 * @module lib/services/interview-orchestrator.service
 */

import { z } from 'zod';
import { logger } from '@/lib/utils/logger';
import { db } from '@/db';
import { sessions, interviewQuestions, interviewAnswers } from '@/db/schema/sessions';
import { eq, desc } from 'drizzle-orm';
import { analyzerService, type AnalyzeSessionInput } from './analyzer.service';
import { interviewerService, type GenerateQuestionsInput, InterviewQuestionSchema } from './interviewer.service';
import { ragService, type SimilarLog } from './rag.service';

// ========================================
// Type Definitions & Validation Schemas
// ========================================

/**
 * Input schema for generateInterviewQuestions
 */
export const GenerateInterviewInputSchema = z.object({
  sessionId: z.string().uuid(),
  sessionType: z.enum(['composition', 'practice', 'mix', 'ear_training', 'listening', 'theory', 'other']),
  userShortNote: z.string().min(1, 'User note cannot be empty'),
  dawMeta: z.object({
    dawName: z.string().optional(),
    tempo: z.number().optional(),
    timeSignature: z.string().optional(),
    keyEstimate: z.string().optional(),
    barsTouched: z.object({
      from: z.number(),
      to: z.number(),
    }).optional(),
  }).optional(),
  previousQuestions: z.array(z.string()).optional(),
});

/**
 * Output schema for generateInterviewQuestions
 */
export const GenerateInterviewOutputSchema = z.object({
  questions: z.array(InterviewQuestionSchema).min(2).max(3),
  confidence: z.number().min(0).max(1),
  generationMethod: z.enum(['ai', 'template', 'fallback']),
  similarLogs: z.array(z.object({
    logId: z.string().uuid(),
    similarity: z.number(),
    content: z.string(),
  })),
  focusArea: z.string(),
  intentHypothesis: z.string(),
});

/**
 * Input schema for saveAnswer
 */
export const SaveAnswerInputSchema = z.object({
  sessionId: z.string().uuid(),
  questionId: z.string().uuid(),
  answerText: z.string().min(1, 'Answer cannot be empty'),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Output schema for saveAnswer
 */
export const SaveAnswerOutputSchema = z.object({
  success: z.boolean(),
  answerId: z.string().uuid(),
  sessionId: z.string().uuid(),
});

/**
 * Interview history item
 */
export const InterviewHistoryItemSchema = z.object({
  id: z.string().uuid(),
  text: z.string(),
  focus: z.string(),
  depth: z.string(),
  answer: z.object({
    id: z.string().uuid(),
    text: z.string(),
    createdAt: z.date(),
  }).nullable(),
  createdAt: z.date(),
});

/**
 * Interview history response
 */
export const InterviewHistorySchema = z.object({
  sessionId: z.string().uuid(),
  questions: z.array(InterviewHistoryItemSchema),
  totalQuestions: z.number().int().min(0),
  answeredCount: z.number().int().min(0),
});

// ========================================
// Type Exports
// ========================================

export type GenerateInterviewInput = z.infer<typeof GenerateInterviewInputSchema>;
export type GenerateInterviewOutput = z.infer<typeof GenerateInterviewOutputSchema>;
export type SaveAnswerInput = z.infer<typeof SaveAnswerInputSchema>;
export type SaveAnswerOutput = z.infer<typeof SaveAnswerOutputSchema>;
export type InterviewHistory = z.infer<typeof InterviewHistorySchema>;
export type InterviewHistoryItem = z.infer<typeof InterviewHistoryItemSchema>;

// ========================================
// InterviewOrchestrator Class
// ========================================

/**
 * InterviewOrchestrator - Orchestrates the complete interview flow
 */
class InterviewOrchestrator {
  private analyzerService = analyzerService;
  private interviewerService = interviewerService;
  private ragService = ragService;

  /**
   * Generate interview questions with full context enrichment
   *
   * @param input - GenerateInterviewInput
   * @returns GenerateInterviewOutput with enriched context
   *
   * @example
   * ```typescript
   * const result = await orchestrator.generateInterviewQuestions({
   *   sessionId: 'uuid',
   *   sessionType: 'composition',
   *   userShortNote: 'サビのコードをFからGに変えた',
   *   previousQuestions: [],
   * });
   * ```
   */
  async generateInterviewQuestions(input: GenerateInterviewInput): Promise<GenerateInterviewOutput> {
    const startTime = Date.now();

    // 1. Validate Input
    let validated: GenerateInterviewInput;
    try {
      validated = GenerateInterviewInputSchema.parse(input);
      logger.info('[InterviewOrchestrator] Starting interview question generation', {
        sessionId: validated.sessionId,
        sessionType: validated.sessionType,
        noteLength: validated.userShortNote.length,
      });
    } catch (error) {
      logger.error('[InterviewOrchestrator] Input validation failed', { error });
      throw new Error(`Invalid input: ${error instanceof Error ? error.message : 'Unknown validation error'}`);
    }

    try {
      // 2. Analyze User's Note
      logger.debug('[InterviewOrchestrator] Step 1: Analyzing user note', {
        sessionId: validated.sessionId,
      });

      const analysisInput: AnalyzeSessionInput = {
        sessionType: validated.sessionType,
        userShortNote: validated.userShortNote,
        dawMeta: validated.dawMeta,
      };

      const analysisResult = await this.analyzerService.analyzeSession(analysisInput);

      const { focusArea, intentHypothesis, confidence: analysisConfidence } = analysisResult;

      logger.info('[InterviewOrchestrator] Analysis completed', {
        focusArea,
        intentHypothesis,
        confidence: analysisConfidence,
      });

      // 3. Find Similar Logs (RAG)
      logger.debug('[InterviewOrchestrator] Step 2: Finding similar logs', {
        sessionId: validated.sessionId,
      });

      let similarLogs: SimilarLog[] = [];
      try {
        similarLogs = await this.ragService.findSimilarLogs(
          validated.userShortNote,
          5, // top 5 results
          0.7 // similarity threshold
        );

        logger.info('[InterviewOrchestrator] Similar logs found', {
          count: similarLogs.length,
          avgSimilarity: similarLogs.length > 0
            ? similarLogs.reduce((sum, log) => sum + log.similarity, 0) / similarLogs.length
            : 0,
        });
      } catch (error) {
        logger.warn('[InterviewOrchestrator] RAG search failed, continuing without context', { error });
        // Continue without similar logs - not a critical failure
      }

      // 4. Generate Questions with Context
      logger.debug('[InterviewOrchestrator] Step 3: Generating questions', {
        sessionId: validated.sessionId,
        focusArea,
      });

      const questionInput: GenerateQuestionsInput = {
        sessionId: validated.sessionId,
        focusArea: focusArea as any, // Type assertion - focusArea is validated by AnalyzerService
        intentHypothesis,
        userShortNote: validated.userShortNote,
        previousQuestions: validated.previousQuestions,
      };

      const questionResult = await this.interviewerService.generateQuestions(questionInput);

      logger.info('[InterviewOrchestrator] Questions generated', {
        count: questionResult.questions.length,
        method: questionResult.generationMethod,
        confidence: questionResult.confidence,
      });

      // 5. Return Enriched Response
      const output: GenerateInterviewOutput = {
        ...questionResult,
        similarLogs: similarLogs.map(log => ({
          logId: log.logId,
          similarity: log.similarity,
          content: log.content || 'No content',
        })),
        focusArea,
        intentHypothesis,
      };

      const elapsedTime = Date.now() - startTime;
      logger.info('[InterviewOrchestrator] Interview generation completed', {
        sessionId: validated.sessionId,
        elapsedTimeMs: elapsedTime,
        questionCount: output.questions.length,
        similarLogCount: output.similarLogs.length,
      });

      return output;

    } catch (error) {
      logger.error('[InterviewOrchestrator] Failed to generate questions', {
        error,
        sessionId: validated.sessionId,
      });

      // Fallback: Return default questions
      logger.warn('[InterviewOrchestrator] Using fallback questions', {
        sessionId: validated.sessionId,
      });

      return {
        questions: this.getDefaultQuestions(),
        confidence: 0.3,
        generationMethod: 'fallback',
        similarLogs: [],
        focusArea: 'emotion',
        intentHypothesis: '分析データが不足しているため、基本的な質問を表示しています',
      };
    }
  }

  /**
   * Save interview answer and update session
   *
   * @param input - SaveAnswerInput
   * @returns SaveAnswerOutput with answer ID
   *
   * @example
   * ```typescript
   * const result = await orchestrator.saveAnswer({
   *   sessionId: 'uuid',
   *   questionId: 'uuid',
   *   answerText: 'サビをもっと盛り上げたかった',
   * });
   * ```
   */
  async saveAnswer(input: SaveAnswerInput): Promise<SaveAnswerOutput> {
    // 1. Validate input
    let validated: SaveAnswerInput;
    try {
      validated = SaveAnswerInputSchema.parse(input);
      logger.info('[InterviewOrchestrator] Saving answer', {
        sessionId: validated.sessionId,
        questionId: validated.questionId,
        answerLength: validated.answerText.length,
      });
    } catch (error) {
      logger.error('[InterviewOrchestrator] Answer input validation failed', { error });
      throw new Error(`Invalid input: ${error instanceof Error ? error.message : 'Unknown validation error'}`);
    }

    try {
      // 2. Insert into database
      const [answer] = await db.insert(interviewAnswers).values({
        sessionId: validated.sessionId,
        questionId: validated.questionId,
        text: validated.answerText,
        aiInsights: validated.metadata as any, // Metadata can be used for AI insights
      }).returning();

      logger.info('[InterviewOrchestrator] Answer saved successfully', {
        answerId: answer.id,
        sessionId: validated.sessionId,
        questionId: validated.questionId,
      });

      // 3. Update session metadata (optional - for tracking progress)
      try {
        await db.update(sessions)
          .set({
            updatedAt: new Date(),
          })
          .where(eq(sessions.id, validated.sessionId));

        logger.debug('[InterviewOrchestrator] Session timestamp updated', {
          sessionId: validated.sessionId,
        });
      } catch (updateError) {
        // Non-critical error - log but don't throw
        logger.warn('[InterviewOrchestrator] Failed to update session timestamp', {
          error: updateError,
          sessionId: validated.sessionId,
        });
      }

      return {
        success: true,
        answerId: answer.id,
        sessionId: validated.sessionId,
      };

    } catch (error) {
      logger.error('[InterviewOrchestrator] Failed to save answer', {
        error,
        sessionId: validated.sessionId,
        questionId: validated.questionId,
      });

      throw new Error(`Failed to save answer: ${error instanceof Error ? error.message : 'Unknown database error'}`);
    }
  }

  /**
   * Get complete interview history for a session
   *
   * @param sessionId - Session UUID
   * @returns InterviewHistory with all questions and answers
   *
   * @example
   * ```typescript
   * const history = await orchestrator.getInterviewHistory('uuid');
   * console.log(`${history.answeredCount} / ${history.totalQuestions} answered`);
   * ```
   */
  async getInterviewHistory(sessionId: string): Promise<InterviewHistory> {
    // Validate sessionId
    if (!sessionId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)) {
      throw new Error('Invalid sessionId format');
    }

    logger.info('[InterviewOrchestrator] Fetching interview history', { sessionId });

    try {
      // 1. Query questions with left join on answers
      const questionsData = await db
        .select({
          question: interviewQuestions,
          answer: interviewAnswers,
        })
        .from(interviewQuestions)
        .leftJoin(
          interviewAnswers,
          eq(interviewQuestions.id, interviewAnswers.questionId)
        )
        .where(eq(interviewQuestions.sessionId, sessionId))
        .orderBy(desc(interviewQuestions.createdAt));

      // 2. Format response
      const questions: InterviewHistoryItem[] = questionsData.map(row => ({
        id: row.question.id,
        text: row.question.text,
        focus: row.question.focus,
        depth: row.question.depth,
        answer: row.answer ? {
          id: row.answer.id,
          text: row.answer.text,
          createdAt: row.answer.createdAt,
        } : null,
        createdAt: row.question.createdAt,
      }));

      const totalQuestions = questions.length;
      const answeredCount = questions.filter(q => q.answer !== null).length;

      logger.info('[InterviewOrchestrator] Interview history retrieved', {
        sessionId,
        totalQuestions,
        answeredCount,
        completionRate: totalQuestions > 0 ? (answeredCount / totalQuestions * 100).toFixed(1) + '%' : '0%',
      });

      return {
        sessionId,
        questions,
        totalQuestions,
        answeredCount,
      };

    } catch (error) {
      logger.error('[InterviewOrchestrator] Failed to fetch interview history', {
        error,
        sessionId,
      });

      throw new Error(`Failed to fetch interview history: ${error instanceof Error ? error.message : 'Unknown database error'}`);
    }
  }

  /**
   * Get default fallback questions when all services fail
   * @private
   */
  private getDefaultQuestions() {
    return [
      {
        text: '今日の制作で何を変更しましたか？',
        focus: 'emotion' as const,
        depth: 'shallow' as const,
        order: 0,
      },
      {
        text: 'その変更の理由を教えてください',
        focus: 'emotion' as const,
        depth: 'medium' as const,
        order: 1,
      },
    ];
  }
}

// ========================================
// Singleton Instance
// ========================================

/**
 * Singleton interview orchestrator instance
 */
export const interviewOrchestrator = new InterviewOrchestrator();

// ========================================
// Named Exports
// ========================================

export { InterviewOrchestrator };
