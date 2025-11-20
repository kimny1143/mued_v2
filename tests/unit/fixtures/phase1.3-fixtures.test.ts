/**
 * Tests for Phase 1.3 Fixtures
 *
 * Validates that all fixtures are properly structured and functional.
 */

import { describe, it, expect } from 'vitest';
import {
  mockSessions,
  mockQuestionTemplates,
  mockEmbeddings,
  ragGroundTruth,
  mockInterviewQuestions,
  mockInterviewAnswers,
  mockRAGEmbeddings,
  Phase13FixtureFactory,
  phase13Helpers,
  generateDeterministicVector,
} from '../../fixtures/phase1.3-fixtures';

describe('Phase 1.3 Fixtures', () => {
  describe('Mock Sessions', () => {
    it('should have 7 sessions (one per focusArea)', () => {
      expect(mockSessions).toHaveLength(7);
    });

    it('should cover all 7 focusAreas', () => {
      const focusAreas = mockSessions.map((s) => s.aiAnnotations.focusArea);
      const uniqueFocusAreas = new Set(focusAreas);

      expect(uniqueFocusAreas.size).toBe(7);
      expect(uniqueFocusAreas).toContain('harmony');
      expect(uniqueFocusAreas).toContain('melody');
      expect(uniqueFocusAreas).toContain('rhythm');
      expect(uniqueFocusAreas).toContain('mix');
      expect(uniqueFocusAreas).toContain('emotion');
      expect(uniqueFocusAreas).toContain('image');
      expect(uniqueFocusAreas).toContain('structure');
    });

    it('should have valid confidence scores', () => {
      mockSessions.forEach((session) => {
        expect(session.aiAnnotations.confidence).toBeGreaterThanOrEqual(0);
        expect(session.aiAnnotations.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Question Templates', () => {
    it('should have 21 templates (7 focusAreas × 3 depths)', () => {
      expect(mockQuestionTemplates).toHaveLength(21);
    });

    it('should have 3 templates per focusArea', () => {
      const focusAreas = ['harmony', 'melody', 'rhythm', 'mix', 'emotion', 'image', 'structure'];

      focusAreas.forEach((focus) => {
        const templates = mockQuestionTemplates.filter((t) => t.focus === focus);
        expect(templates).toHaveLength(3);

        const depths = templates.map((t) => t.depth);
        expect(depths).toContain('shallow');
        expect(depths).toContain('medium');
        expect(depths).toContain('deep');
      });
    });

    it('should have valid priority values', () => {
      mockQuestionTemplates.forEach((template) => {
        expect(template.priority).toBeGreaterThanOrEqual(0);
        expect(template.priority).toBeLessThanOrEqual(10);
      });
    });
  });

  describe('Mock Embeddings', () => {
    it('should have embeddings for all session notes', () => {
      mockSessions.forEach((session) => {
        expect(mockEmbeddings[session.userShortNote]).toBeDefined();
      });
    });

    it('should have 1536-dimensional vectors', () => {
      Object.values(mockEmbeddings).forEach((embedding) => {
        expect(embedding).toHaveLength(1536);
      });
    });

    it('should have values in range [-1, 1]', () => {
      Object.values(mockEmbeddings).forEach((embedding) => {
        embedding.forEach((value) => {
          expect(value).toBeGreaterThanOrEqual(-1);
          expect(value).toBeLessThanOrEqual(1);
        });
      });
    });

    it('should be deterministic (same input = same output)', () => {
      const text = 'テストテキスト';
      const vec1 = generateDeterministicVector(text);
      const vec2 = generateDeterministicVector(text);

      expect(vec1).toEqual(vec2);
    });
  });

  describe('RAG Ground Truth', () => {
    it('should have at least 10 test queries', () => {
      expect(ragGroundTruth.length).toBeGreaterThanOrEqual(10);
    });

    it('should have valid expected results', () => {
      ragGroundTruth.forEach((gt) => {
        expect(gt.expectedResults).toBeDefined();
        expect(gt.expectedResults.length).toBeGreaterThan(0);

        gt.expectedResults.forEach((sessionId) => {
          expect(sessionId).toMatch(/^session-\d{3}$/);
        });
      });
    });

    it('should have similarity thresholds', () => {
      ragGroundTruth.forEach((gt) => {
        if (gt.minSimilarity) {
          expect(gt.minSimilarity).toBeGreaterThan(0);
          expect(gt.minSimilarity).toBeLessThanOrEqual(1);
        }
      });
    });
  });

  describe('Phase13FixtureFactory', () => {
    it('should create valid sessions', () => {
      const session = Phase13FixtureFactory.createSession();

      expect(session.id).toBeDefined();
      expect(session.userId).toBe('user-test');
      expect(session.aiAnnotations.focusArea).toBeDefined();
      expect(session.aiAnnotations.confidence).toBeGreaterThanOrEqual(0);
    });

    it('should create sessions with overrides', () => {
      const session = Phase13FixtureFactory.createSession({
        userId: 'custom-user',
        aiAnnotations: {
          focusArea: 'melody',
          intentHypothesis: 'Custom hypothesis',
          confidence: 0.95,
        },
      });

      expect(session.userId).toBe('custom-user');
      expect(session.aiAnnotations.focusArea).toBe('melody');
      expect(session.aiAnnotations.confidence).toBe(0.95);
    });

    it('should create batch sessions', () => {
      const sessions = Phase13FixtureFactory.createBatchSessions(5, 'harmony');

      expect(sessions).toHaveLength(5);
      sessions.forEach((session) => {
        expect(session.aiAnnotations.focusArea).toBe('harmony');
      });
    });

    it('should create valid questions', () => {
      const question = Phase13FixtureFactory.createQuestion('session-001');

      expect(question.id).toBeDefined();
      expect(question.sessionId).toBe('session-001');
      expect(question.focus).toBeDefined();
      expect(question.depth).toBeDefined();
    });

    it('should create valid answers', () => {
      const answer = Phase13FixtureFactory.createAnswer('q-001');

      expect(answer.id).toBeDefined();
      expect(answer.questionId).toBe('q-001');
      expect(answer.aiInsights).toBeDefined();
    });
  });

  describe('phase13Helpers', () => {
    it('should get templates by focus', () => {
      const harmonyTemplates = phase13Helpers.getTemplatesByFocus('harmony');

      expect(harmonyTemplates).toHaveLength(3);
      harmonyTemplates.forEach((t) => {
        expect(t.focus).toBe('harmony');
      });
    });

    it('should get templates by depth', () => {
      const deepTemplates = phase13Helpers.getTemplatesByDepth('deep');

      expect(deepTemplates).toHaveLength(7); // 7 focusAreas
      deepTemplates.forEach((t) => {
        expect(t.depth).toBe('deep');
      });
    });

    it('should get session by focus', () => {
      const harmonySession = phase13Helpers.getSessionByFocus('harmony');

      expect(harmonySession).toBeDefined();
      expect(harmonySession?.aiAnnotations.focusArea).toBe('harmony');
    });

    it('should calculate cosine similarity', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [1, 0, 0];
      const vec3 = [0, 1, 0];

      const sim1 = phase13Helpers.cosineSimilarity(vec1, vec2);
      const sim2 = phase13Helpers.cosineSimilarity(vec1, vec3);

      expect(sim1).toBe(1); // Identical vectors
      expect(sim2).toBe(0); // Orthogonal vectors
    });

    it('should find similar sessions', () => {
      const queryEmbedding = mockEmbeddings['サビのコード進行をFからGに変更した'];
      const similar = phase13Helpers.findSimilarSessions(queryEmbedding, 3);

      expect(similar).toHaveLength(3);
      similar.forEach((result) => {
        expect(result.sessionId).toBeDefined();
        expect(result.similarity).toBeGreaterThanOrEqual(-1);
        expect(result.similarity).toBeLessThanOrEqual(1);
      });

      // First result should be the same session (similarity = 1)
      expect(similar[0].sessionId).toBe('session-001');
      expect(similar[0].similarity).toBeCloseTo(1, 5);
    });

    it('should validate RAG results', () => {
      const groundTruth = ragGroundTruth[0];
      const results = groundTruth.expectedResults.slice(0, 2);

      const metrics = phase13Helpers.validateRAGResults(
        groundTruth.query,
        results,
        groundTruth
      );

      expect(metrics.precision).toBeGreaterThan(0);
      expect(metrics.recall).toBeGreaterThan(0);
      expect(metrics.f1).toBeGreaterThan(0);
    });
  });

  describe('Interview Questions & Answers', () => {
    it('should have valid interview questions', () => {
      expect(mockInterviewQuestions.length).toBeGreaterThan(0);

      mockInterviewQuestions.forEach((q) => {
        expect(q.id).toBeDefined();
        expect(q.sessionId).toBeDefined();
        expect(q.text).toBeDefined();
        expect(q.focus).toBeDefined();
        expect(q.depth).toBeDefined();
        expect(['ai', 'template', 'fallback']).toContain(q.generationMethod);
      });
    });

    it('should have valid interview answers', () => {
      expect(mockInterviewAnswers.length).toBeGreaterThan(0);

      mockInterviewAnswers.forEach((a) => {
        expect(a.id).toBeDefined();
        expect(a.questionId).toBeDefined();
        expect(a.text).toBeDefined();

        if (a.aiInsights) {
          expect(a.aiInsights.keyPhrases).toBeDefined();
          expect(a.aiInsights.emotionalTone).toBeDefined();
          expect(a.aiInsights.confidence).toBeGreaterThanOrEqual(0);
          expect(a.aiInsights.confidence).toBeLessThanOrEqual(1);
        }
      });
    });
  });

  describe('RAG Embeddings Database Records', () => {
    it('should have embeddings for all sessions', () => {
      expect(mockRAGEmbeddings).toHaveLength(mockSessions.length);
    });

    it('should have valid source types', () => {
      mockRAGEmbeddings.forEach((emb) => {
        expect(['log_entry', 'session', 'template']).toContain(emb.sourceType);
      });
    });

    it('should have valid embeddings', () => {
      mockRAGEmbeddings.forEach((emb) => {
        expect(emb.embedding).toHaveLength(1536);
        expect(emb.metadata).toBeDefined();
      });
    });
  });
});
