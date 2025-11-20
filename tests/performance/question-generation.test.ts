/**
 * Question Generation Performance Tests
 *
 * Tests AI-powered question generation latency against KPI targets:
 * - P95 latency < 3000ms (3 seconds)
 * - Mean latency < 2000ms
 * - Throughput > 20 questions/minute
 *
 * This test file provides a template that can be updated once
 * the actual question generation service is implemented.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PerformanceMeasurement, ThroughputMeasurement } from '@/lib/utils/test-performance';
import '@/tests/setup/custom-matchers';

// ==========================================
// Mock Question Generation Service
// ==========================================

interface GeneratedQuestion {
  id: string;
  question: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  modelUsed: string;
  generationTimeMs: number;
}

interface QuestionGenerationRequest {
  sessionId: string;
  context?: string;
  previousQuestions?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
}

class MockQuestionGenerationService {
  /**
   * Simulates AI question generation with realistic latency (500-2500ms)
   */
  async generateQuestion(
    request: QuestionGenerationRequest
  ): Promise<GeneratedQuestion> {
    // Simulate AI model latency (varies by complexity)
    const baseLatency = 500;
    const contextComplexity = request.context?.length ?? 0;
    const complexityLatency = Math.min(contextComplexity * 2, 1500);
    const randomVariation = Math.random() * 500;

    const totalLatency = baseLatency + complexityLatency + randomVariation;

    await new Promise(resolve => setTimeout(resolve, totalLatency));

    // Generate mock question
    const difficulty = request.difficulty ?? 'medium';
    const questionNumber = (request.previousQuestions?.length ?? 0) + 1;

    return {
      id: `q-${Date.now()}-${questionNumber}`,
      question: this.generateMockQuestion(difficulty, questionNumber),
      category: this.selectCategory(),
      difficulty,
      modelUsed: 'gpt-4o-mini',
      generationTimeMs: totalLatency,
    };
  }

  /**
   * Generates multiple questions in batch
   */
  async generateQuestions(
    request: QuestionGenerationRequest,
    count: number
  ): Promise<GeneratedQuestion[]> {
    const questions: GeneratedQuestion[] = [];

    for (let i = 0; i < count; i++) {
      const question = await this.generateQuestion({
        ...request,
        previousQuestions: questions.map(q => q.question),
      });
      questions.push(question);
    }

    return questions;
  }

  private generateMockQuestion(difficulty: string, number: number): string {
    const templates = {
      easy: [
        `What is the basic structure of a ${this.randomTopic()}?`,
        `Can you identify this ${this.randomTopic()}?`,
        `What are the notes in a ${this.randomTopic()}?`,
      ],
      medium: [
        `How would you analyze the ${this.randomTopic()} in this context?`,
        `What is the relationship between ${this.randomTopic()} and harmony?`,
        `Explain the role of ${this.randomTopic()} in this piece.`,
      ],
      hard: [
        `Compare and contrast different approaches to ${this.randomTopic()}.`,
        `How does ${this.randomTopic()} contribute to the overall form?`,
        `What advanced techniques are used in this ${this.randomTopic()}?`,
      ],
    };

    const template =
      templates[difficulty as keyof typeof templates]?.[number % 3] ??
      templates.medium[0];

    return template;
  }

  private randomTopic(): string {
    const topics = [
      'chord progression',
      'melodic line',
      'rhythmic pattern',
      'harmonic structure',
      'cadence',
      'modulation',
    ];
    return topics[Math.floor(Math.random() * topics.length)];
  }

  private selectCategory(): string {
    const categories = ['theory', 'harmony', 'rhythm', 'form', 'analysis'];
    return categories[Math.floor(Math.random() * categories.length)];
  }
}

// ==========================================
// Performance Tests
// ==========================================

describe('Question Generation Performance', () => {
  let questionService: MockQuestionGenerationService;

  beforeEach(() => {
    questionService = new MockQuestionGenerationService();
  });

  describe('Latency Requirements', () => {
    it('should generate question in < 3000ms (P95)', async () => {
      const perf = new PerformanceMeasurement();

      // Run 50 generations to get reliable P95 metric
      for (let i = 0; i < 50; i++) {
        await perf.measure(() =>
          questionService.generateQuestion({
            sessionId: `session-${i}`,
            difficulty: 'medium',
          })
        );
      }

      const metrics = perf.getMetrics();

      // Use custom matcher - KPI: P95 < 3000ms
      expect(metrics).toHaveLatencyLessThan(3000, 95);

      // Also verify P50 and P99
      expect(metrics).toHaveLatencyLessThan(2000, 50);
      expect(metrics).toHaveLatencyLessThan(4000, 99);

      console.log('Question Generation Latency Metrics:');
      perf.printSummary();
    });

    it('should have mean latency < 2000ms', async () => {
      const perf = new PerformanceMeasurement();

      for (let i = 0; i < 30; i++) {
        await perf.measure(() =>
          questionService.generateQuestion({
            sessionId: 'test-session',
          })
        );
      }

      const metrics = perf.getMetrics();
      expect(metrics).toHaveMeanLatencyLessThan(2000);
    });

    it('should maintain latency with long context', async () => {
      const perf = new PerformanceMeasurement();

      // Generate long context (simulates rich user history)
      const longContext = 'This is a detailed context '.repeat(50);

      for (let i = 0; i < 20; i++) {
        await perf.measure(() =>
          questionService.generateQuestion({
            sessionId: 'test-session',
            context: longContext,
          })
        );
      }

      const metrics = perf.getMetrics();

      // Should still meet P95 target even with context
      expect(metrics).toHaveLatencyLessThan(3000, 95);
    });
  });

  describe('Throughput Requirements', () => {
    it('should achieve > 20 questions/minute throughput', async () => {
      const throughput = new ThroughputMeasurement();
      const durationMs = 10000; // 10 seconds test
      const targetQuestionsPerMinute = 20;

      throughput.start();

      const startTime = Date.now();
      const questions: GeneratedQuestion[] = [];

      while (Date.now() - startTime < durationMs) {
        const question = await questionService.generateQuestion({
          sessionId: 'throughput-test',
        });
        questions.push(question);
        throughput.record();
      }

      const questionsPerSecond = throughput.stop();
      const questionsPerMinute = questionsPerSecond * 60;

      console.log(`Throughput: ${questionsPerMinute.toFixed(2)} questions/minute`);
      console.log(`Generated ${questions.length} questions in ${durationMs}ms`);

      expect(questionsPerMinute).toBeGreaterThan(targetQuestionsPerMinute);
    });

    it('should handle batch generation efficiently', async () => {
      const perf = new PerformanceMeasurement();
      const batchSize = 5;

      const { result, latency } = await perf.measure(() =>
        questionService.generateQuestions(
          { sessionId: 'batch-test' },
          batchSize
        )
      );

      // Batch should complete faster than serial individual calls
      expect(result).toHaveLength(batchSize);

      // Should be faster than batchSize * 3000ms (serial worst case)
      const serialWorstCase = batchSize * 3000;
      expect(latency).toBeLessThan(serialWorstCase);

      console.log(`Batch of ${batchSize} generated in ${latency.toFixed(2)}ms`);
    });
  });

  describe('Quality Constraints', () => {
    it('should generate unique questions', async () => {
      const questions = await questionService.generateQuestions(
        { sessionId: 'unique-test' },
        10
      );

      const uniqueQuestions = new Set(questions.map(q => q.question));

      // All questions should be unique
      expect(uniqueQuestions.size).toBe(questions.length);
    });

    it('should respect difficulty parameter', async () => {
      const difficulties: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];

      for (const difficulty of difficulties) {
        const question = await questionService.generateQuestion({
          sessionId: 'difficulty-test',
          difficulty,
        });

        expect(question.difficulty).toBe(difficulty);
      }
    });

    it('should track generation metrics', async () => {
      const question = await questionService.generateQuestion({
        sessionId: 'metrics-test',
      });

      // Should include performance metadata
      expect(question.generationTimeMs).toBeGreaterThan(0);
      expect(question.modelUsed).toBeDefined();
      expect(question.category).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty context', async () => {
      const perf = new PerformanceMeasurement();

      const { result, latency } = await perf.measure(() =>
        questionService.generateQuestion({
          sessionId: 'empty-context-test',
          context: '',
        })
      );

      expect(result.question).toBeTruthy();
      expect(latency).toBeLessThan(3000);
    });

    it('should handle many previous questions', async () => {
      const previousQuestions = Array.from(
        { length: 50 },
        (_, i) => `Previous question ${i + 1}?`
      );

      const question = await questionService.generateQuestion({
        sessionId: 'many-previous-test',
        previousQuestions,
      });

      expect(question.question).toBeTruthy();
    });

    it('should handle concurrent generation requests', async () => {
      const perf = new PerformanceMeasurement();
      const concurrentRequests = 5;

      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        questionService.generateQuestion({
          sessionId: `concurrent-${i}`,
        })
      );

      await perf.measure(() => Promise.all(promises));

      const metrics = perf.getMetrics();

      // Concurrent requests should complete in reasonable time
      expect(metrics.latency).toBeLessThan(5000);
    });
  });

  describe('Stress Testing', () => {
    it('should maintain performance under sustained load', async () => {
      const perf = new PerformanceMeasurement();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        await perf.measure(() =>
          questionService.generateQuestion({
            sessionId: `stress-test-${i}`,
          })
        );
      }

      const metrics = perf.getMetrics();

      // Performance should not degrade over time
      expect(metrics).toHaveLatencyLessThan(3000, 95);
      expect(metrics.stdDev).toBeLessThan(500); // Stable performance
    });

    it('should recover from slow responses', async () => {
      const perf = new PerformanceMeasurement();
      const samples = 30;

      for (let i = 0; i < samples; i++) {
        await perf.measure(() =>
          questionService.generateQuestion({
            sessionId: `recovery-test-${i}`,
            // Vary context to simulate different load conditions
            context: i % 5 === 0 ? 'complex context '.repeat(100) : 'simple',
          })
        );
      }

      const metrics = perf.getMetrics();

      // Despite occasional slow responses, overall metrics should meet targets
      expect(metrics).toHaveLatencyLessThan(3000, 95);
    });
  });

  describe('Difficulty Scaling', () => {
    it('should have comparable latency across difficulty levels', async () => {
      const difficulties: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];
      const results: Record<string, PerformanceMeasurement> = {};

      for (const difficulty of difficulties) {
        const perf = new PerformanceMeasurement();
        results[difficulty] = perf;

        for (let i = 0; i < 20; i++) {
          await perf.measure(() =>
            questionService.generateQuestion({
              sessionId: `difficulty-scale-${difficulty}`,
              difficulty,
            })
          );
        }
      }

      // All difficulties should meet latency targets
      for (const difficulty of difficulties) {
        const metrics = results[difficulty].getMetrics();
        expect(metrics).toHaveLatencyLessThan(3000, 95);

        console.log(`${difficulty} difficulty: P95=${metrics.p95.toFixed(2)}ms`);
      }
    });
  });
});

// ==========================================
// Integration with Real Question Service
// ==========================================

/**
 * TODO: Replace MockQuestionGenerationService with actual implementation
 *
 * When implementing the real question generation service:
 * 1. Import the actual service from lib/services/question-generation.service.ts
 * 2. Replace MockQuestionGenerationService with the real implementation
 * 3. Adjust latency thresholds based on actual OpenAI API performance
 * 4. Add tests for RAG-enhanced question generation
 *
 * Example:
 * ```typescript
 * import { QuestionGenerationService } from '@/lib/services/question-generation.service';
 * import { OpenAI } from 'openai';
 *
 * describe('Question Generation Performance (Real Service)', () => {
 *   let questionService: QuestionGenerationService;
 *
 *   beforeEach(() => {
 *     const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
 *     questionService = new QuestionGenerationService(openai);
 *   });
 *
 *   // ... same tests as above
 * });
 * ```
 */
