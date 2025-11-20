/**
 * Unit tests for RAG Metrics Calculator
 */

import { describe, it, expect } from 'vitest';
import {
  calculateRecallAtK,
  calculatePrecisionAtK,
  calculateMRR,
  calculateF1Score,
  calculateRAGMetrics,
  calculateDCG,
  calculateNDCG,
  evaluateRAGQuery,
  aggregateRAGMetrics,
  assertRAGQuality,
} from './rag-metrics';

describe('RAG Metrics', () => {
  describe('calculateRecallAtK', () => {
    it('should calculate perfect recall', () => {
      const results = ['doc1', 'doc2', 'doc3'];
      const groundTruth = ['doc1', 'doc2', 'doc3'];

      const recall = calculateRecallAtK(results, groundTruth, 5);
      expect(recall).toBe(1.0);
    });

    it('should calculate partial recall', () => {
      const results = ['doc1', 'doc3', 'doc5'];
      const groundTruth = ['doc1', 'doc2', 'doc3', 'doc4'];

      const recall = calculateRecallAtK(results, groundTruth, 5);
      expect(recall).toBe(0.5); // 2 out of 4 relevant docs found
    });

    it('should handle zero recall', () => {
      const results = ['doc5', 'doc6', 'doc7'];
      const groundTruth = ['doc1', 'doc2', 'doc3'];

      const recall = calculateRecallAtK(results, groundTruth, 5);
      expect(recall).toBe(0);
    });

    it('should respect K limit', () => {
      const results = ['doc1', 'doc2', 'doc3', 'doc4', 'doc5'];
      const groundTruth = ['doc1', 'doc5'];

      const recall3 = calculateRecallAtK(results, groundTruth, 3);
      const recall5 = calculateRecallAtK(results, groundTruth, 5);

      expect(recall3).toBe(0.5); // Only doc1 in top 3
      expect(recall5).toBe(1.0); // Both docs in top 5
    });

    it('should handle empty ground truth', () => {
      const results = ['doc1', 'doc2'];
      const groundTruth: string[] = [];

      const recall = calculateRecallAtK(results, groundTruth, 5);
      expect(recall).toBe(0);
    });
  });

  describe('calculatePrecisionAtK', () => {
    it('should calculate perfect precision', () => {
      const results = ['doc1', 'doc2', 'doc3'];
      const groundTruth = ['doc1', 'doc2', 'doc3', 'doc4'];

      const precision = calculatePrecisionAtK(results, groundTruth, 3);
      expect(precision).toBe(1.0);
    });

    it('should calculate partial precision', () => {
      const results = ['doc1', 'doc3', 'doc5', 'doc7'];
      const groundTruth = ['doc1', 'doc3'];

      const precision = calculatePrecisionAtK(results, groundTruth, 4);
      expect(precision).toBe(0.5); // 2 out of 4 retrieved are relevant
    });

    it('should handle K=0', () => {
      const results = ['doc1', 'doc2'];
      const groundTruth = ['doc1'];

      const precision = calculatePrecisionAtK(results, groundTruth, 0);
      expect(precision).toBe(0);
    });
  });

  describe('calculateMRR', () => {
    it('should return 1.0 for first result relevant', () => {
      const results = ['doc1', 'doc2', 'doc3'];
      const groundTruth = ['doc1'];

      const mrr = calculateMRR(results, groundTruth);
      expect(mrr).toBe(1.0);
    });

    it('should calculate MRR for second position', () => {
      const results = ['doc1', 'doc2', 'doc3'];
      const groundTruth = ['doc2'];

      const mrr = calculateMRR(results, groundTruth);
      expect(mrr).toBe(0.5); // 1/2
    });

    it('should calculate MRR for third position', () => {
      const results = ['doc1', 'doc2', 'doc3'];
      const groundTruth = ['doc3'];

      const mrr = calculateMRR(results, groundTruth);
      expect(mrr).toBeCloseTo(0.333, 2); // 1/3
    });

    it('should return 0 for no relevant results', () => {
      const results = ['doc1', 'doc2', 'doc3'];
      const groundTruth = ['doc4', 'doc5'];

      const mrr = calculateMRR(results, groundTruth);
      expect(mrr).toBe(0);
    });

    it('should use first relevant result only', () => {
      const results = ['doc1', 'doc2', 'doc3'];
      const groundTruth = ['doc2', 'doc3'];

      const mrr = calculateMRR(results, groundTruth);
      expect(mrr).toBe(0.5); // First relevant is at position 2
    });
  });

  describe('calculateF1Score', () => {
    it('should calculate F1 for perfect scores', () => {
      const f1 = calculateF1Score(1.0, 1.0);
      expect(f1).toBe(1.0);
    });

    it('should calculate F1 for balanced scores', () => {
      const f1 = calculateF1Score(0.5, 0.5);
      expect(f1).toBe(0.5);
    });

    it('should calculate F1 for imbalanced scores', () => {
      const precision = 0.8;
      const recall = 0.4;
      const f1 = calculateF1Score(precision, recall);

      // F1 = 2 * (0.8 * 0.4) / (0.8 + 0.4) = 0.64 / 1.2 = 0.533
      expect(f1).toBeCloseTo(0.533, 2);
    });

    it('should return 0 when both are 0', () => {
      const f1 = calculateF1Score(0, 0);
      expect(f1).toBe(0);
    });
  });

  describe('calculateRAGMetrics', () => {
    it('should calculate all metrics together', () => {
      const results = ['doc1', 'doc3', 'doc5', 'doc7', 'doc9'];
      const groundTruth = ['doc1', 'doc2', 'doc3'];

      const metrics = calculateRAGMetrics(results, groundTruth, 5);

      expect(metrics.recallAtK).toBeCloseTo(0.667, 2); // 2/3
      expect(metrics.precisionAtK).toBe(0.4); // 2/5
      expect(metrics.mrr).toBe(1.0); // First result is relevant
      expect(metrics.f1Score).toBeGreaterThan(0);
      expect(metrics.hits).toBe(2);
      expect(metrics.totalRelevant).toBe(3);
      expect(metrics.totalRetrieved).toBe(5);
    });

    it('should handle perfect retrieval', () => {
      const results = ['doc1', 'doc2', 'doc3'];
      const groundTruth = ['doc1', 'doc2', 'doc3'];

      const metrics = calculateRAGMetrics(results, groundTruth, 5);

      expect(metrics.recallAtK).toBe(1.0);
      expect(metrics.precisionAtK).toBe(1.0);
      expect(metrics.mrr).toBe(1.0);
      expect(metrics.f1Score).toBe(1.0);
    });
  });

  describe('calculateDCG', () => {
    it('should calculate DCG for relevance scores', () => {
      const relevanceScores = [3, 2, 3, 0, 1, 2];

      const dcg = calculateDCG(relevanceScores);

      // DCG = 3/log2(2) + 2/log2(3) + 3/log2(4) + 0/log2(5) + 1/log2(6) + 2/log2(7)
      // DCG ≈ 3.0 + 1.26 + 1.5 + 0 + 0.39 + 0.71 = 6.86
      expect(dcg).toBeGreaterThan(6.5);
      expect(dcg).toBeLessThan(7.5);
    });

    it('should respect K limit', () => {
      const relevanceScores = [3, 2, 3, 0, 1, 2];

      const dcg3 = calculateDCG(relevanceScores, 3);
      const dcg6 = calculateDCG(relevanceScores, 6);

      expect(dcg3).toBeLessThan(dcg6);
    });

    it('should handle all zeros', () => {
      const relevanceScores = [0, 0, 0];
      const dcg = calculateDCG(relevanceScores);
      expect(dcg).toBe(0);
    });
  });

  describe('calculateNDCG', () => {
    it('should calculate NDCG for perfect ranking', () => {
      const relevanceScores = [5, 4, 3, 2, 1];

      const ndcg = calculateNDCG(relevanceScores);

      expect(ndcg.ndcgAtK).toBe(1.0); // Perfect ranking
      expect(ndcg.dcgAtK).toBe(ndcg.idcgAtK);
    });

    it('should calculate NDCG for imperfect ranking', () => {
      const relevanceScores = [2, 3, 1, 5, 4]; // Suboptimal order

      const ndcg = calculateNDCG(relevanceScores);

      expect(ndcg.ndcgAtK).toBeLessThan(1.0);
      expect(ndcg.ndcgAtK).toBeGreaterThan(0);
      expect(ndcg.dcgAtK).toBeLessThan(ndcg.idcgAtK);
    });

    it('should handle K parameter', () => {
      const relevanceScores = [2, 3, 1, 5, 4];

      const ndcg3 = calculateNDCG(relevanceScores, 3);
      const ndcg5 = calculateNDCG(relevanceScores, 5);

      expect(ndcg3.dcgAtK).toBeLessThan(ndcg5.dcgAtK);
    });
  });

  describe('evaluateRAGQuery', () => {
    it('should create complete evaluation result', () => {
      const query = 'What is a chord progression?';
      const retrievedIds = ['doc1', 'doc3', 'doc5'];
      const relevantIds = ['doc1', 'doc2', 'doc3'];
      const relevanceScores = [5, 4, 2];

      const result = evaluateRAGQuery(
        query,
        retrievedIds,
        relevantIds,
        5,
        relevanceScores
      );

      expect(result.query).toBe(query);
      expect(result.retrievedIds).toEqual(retrievedIds);
      expect(result.relevantIds).toEqual(relevantIds);
      expect(result.metrics).toBeDefined();
      expect(result.ndcg).toBeDefined();
    });

    it('should work without relevance scores', () => {
      const query = 'test query';
      const retrievedIds = ['doc1'];
      const relevantIds = ['doc1'];

      const result = evaluateRAGQuery(query, retrievedIds, relevantIds, 5);

      expect(result.metrics).toBeDefined();
      expect(result.ndcg).toBeUndefined();
    });
  });

  describe('aggregateRAGMetrics', () => {
    it('should aggregate multiple evaluations', () => {
      const evaluations = [
        evaluateRAGQuery('q1', ['doc1', 'doc2'], ['doc1', 'doc2'], 5),
        evaluateRAGQuery('q2', ['doc1', 'doc3'], ['doc1', 'doc2'], 5),
        evaluateRAGQuery('q3', ['doc1'], ['doc1', 'doc2', 'doc3'], 5),
      ];

      const aggregated = aggregateRAGMetrics(evaluations);

      expect(aggregated.queryCount).toBe(3);
      expect(aggregated.recallAtK).toBeGreaterThan(0);
      expect(aggregated.recallAtK).toBeLessThanOrEqual(1.0);
      expect(aggregated.mrr).toBeGreaterThan(0);
    });

    it('should handle empty evaluations', () => {
      const aggregated = aggregateRAGMetrics([]);

      expect(aggregated.queryCount).toBe(0);
      expect(aggregated.recallAtK).toBe(0);
      expect(aggregated.mrr).toBe(0);
    });
  });

  describe('assertRAGQuality', () => {
    it('should pass when metrics meet thresholds', () => {
      const metrics = calculateRAGMetrics(
        ['doc1', 'doc2', 'doc3'],
        ['doc1', 'doc2', 'doc3'],
        5
      );

      expect(() =>
        assertRAGQuality(metrics, {
          minRecall: 0.8,
          minPrecision: 0.8,
          minMRR: 0.8,
        })
      ).not.toThrow();
    });

    it('should throw when recall is below threshold', () => {
      const metrics = calculateRAGMetrics(
        ['doc5', 'doc6'],
        ['doc1', 'doc2', 'doc3'],
        5
      );

      expect(() =>
        assertRAGQuality(metrics, { minRecall: 0.8 })
      ).toThrow(/Recall/);
    });

    it('should throw when precision is below threshold', () => {
      const metrics = calculateRAGMetrics(
        ['doc1', 'doc5', 'doc6', 'doc7', 'doc8'],
        ['doc1'],
        5
      );

      expect(() =>
        assertRAGQuality(metrics, { minPrecision: 0.5 })
      ).toThrow(/Precision/);
    });

    it('should throw when MRR is below threshold', () => {
      const metrics = calculateRAGMetrics(
        ['doc5', 'doc6', 'doc1'],
        ['doc1'],
        5
      );

      expect(() =>
        assertRAGQuality(metrics, { minMRR: 0.5 })
      ).toThrow(/MRR/);
    });

    it('should throw when F1 is below threshold', () => {
      const metrics = calculateRAGMetrics(
        ['doc1'],
        ['doc1', 'doc2', 'doc3', 'doc4', 'doc5'],
        5
      );

      expect(() =>
        assertRAGQuality(metrics, { minF1: 0.5 })
      ).toThrow(/F1 Score/);
    });

    it('should throw with multiple failures', () => {
      const metrics = calculateRAGMetrics(['doc5'], ['doc1', 'doc2'], 5);

      try {
        assertRAGQuality(metrics, {
          minRecall: 0.5,
          minPrecision: 0.5,
          minMRR: 0.5,
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Recall');
        expect((error as Error).message).toContain('Precision');
        expect((error as Error).message).toContain('MRR');
      }
    });
  });
});
