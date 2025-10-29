/**
 * Metrics Calculation Unit Tests
 *
 * Tests for RAG metrics calculation logic including quality scores,
 * statistical aggregations, and performance metrics.
 */

import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Mock types for testing
 */
interface RetrievalMetrics {
  precision: number;
  recall: number;
  f1Score?: number;
  mrr?: number;
  ndcg?: number;
}

interface GenerationMetrics {
  coherence: number;
  relevance: number;
  factuality: number;
  fluency: number;
  bleuScore?: number;
}

interface QualityScore {
  overall: number;
  retrieval: number;
  generation: number;
  confidence: number;
}

/**
 * Metrics calculation functions
 */
class MetricsCalculator {
  /**
   * Calculate F1 Score from precision and recall
   */
  calculateF1Score(precision: number, recall: number): number {
    if (precision + recall === 0) return 0;
    return (2 * precision * recall) / (precision + recall);
  }

  /**
   * Calculate Mean Reciprocal Rank (MRR)
   */
  calculateMRR(ranks: number[]): number {
    if (ranks.length === 0) return 0;
    const reciprocalSum = ranks.reduce((sum, rank) => sum + 1 / rank, 0);
    return reciprocalSum / ranks.length;
  }

  /**
   * Calculate Normalized Discounted Cumulative Gain (NDCG)
   */
  calculateNDCG(relevanceScores: number[], idealScores: number[]): number {
    const dcg = this.calculateDCG(relevanceScores);
    const idcg = this.calculateDCG(idealScores);
    return idcg === 0 ? 0 : dcg / idcg;
  }

  private calculateDCG(relevanceScores: number[]): number {
    return relevanceScores.reduce((sum, score, index) => {
      return sum + score / Math.log2(index + 2); // +2 because index starts at 0
    }, 0);
  }

  /**
   * Calculate overall quality score from retrieval and generation metrics
   */
  calculateQualityScore(
    retrievalMetrics: RetrievalMetrics,
    generationMetrics: GenerationMetrics,
    weights?: { retrieval: number; generation: number }
  ): QualityScore {
    const defaultWeights = { retrieval: 0.4, generation: 0.6 };
    const w = weights || defaultWeights;

    // Calculate retrieval score
    const retrievalScore = (
      retrievalMetrics.precision * 0.4 +
      retrievalMetrics.recall * 0.3 +
      (retrievalMetrics.f1Score || 0) * 0.3
    );

    // Calculate generation score
    const generationScore = (
      generationMetrics.coherence * 0.25 +
      generationMetrics.relevance * 0.25 +
      generationMetrics.factuality * 0.3 +
      generationMetrics.fluency * 0.2
    );

    // Calculate overall score
    const overall = retrievalScore * w.retrieval + generationScore * w.generation;

    // Calculate confidence based on metric consistency
    const confidence = this.calculateConfidence(retrievalMetrics, generationMetrics);

    return {
      overall: this.clamp(overall, 0, 1),
      retrieval: this.clamp(retrievalScore, 0, 1),
      generation: this.clamp(generationScore, 0, 1),
      confidence: this.clamp(confidence, 0, 1),
    };
  }

  private calculateConfidence(
    retrievalMetrics: RetrievalMetrics,
    generationMetrics: GenerationMetrics
  ): number {
    // Calculate variance of retrieval metrics
    const retrievalValues = [
      retrievalMetrics.precision,
      retrievalMetrics.recall,
      retrievalMetrics.f1Score || 0,
    ];
    const retrievalVariance = this.calculateVariance(retrievalValues);

    // Calculate variance of generation metrics
    const generationValues = [
      generationMetrics.coherence,
      generationMetrics.relevance,
      generationMetrics.factuality,
      generationMetrics.fluency,
    ];
    const generationVariance = this.calculateVariance(generationValues);

    // Lower variance = higher confidence
    const avgVariance = (retrievalVariance + generationVariance) / 2;
    return 1 - avgVariance;
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * Calculate aggregate statistics from multiple metrics
   */
  calculateAggregates(metrics: Array<{ qualityScore: number; latency: number }>) {
    if (metrics.length === 0) {
      return {
        count: 0,
        avgQuality: 0,
        minQuality: 0,
        maxQuality: 0,
        stdDevQuality: 0,
        avgLatency: 0,
        p50Latency: 0,
        p95Latency: 0,
        p99Latency: 0,
      };
    }

    const qualityScores = metrics.map(m => m.qualityScore);
    const latencies = metrics.map(m => m.latency).sort((a, b) => a - b);

    return {
      count: metrics.length,
      avgQuality: this.average(qualityScores),
      minQuality: Math.min(...qualityScores),
      maxQuality: Math.max(...qualityScores),
      stdDevQuality: this.standardDeviation(qualityScores),
      avgLatency: this.average(latencies),
      p50Latency: this.percentile(latencies, 50),
      p95Latency: this.percentile(latencies, 95),
      p99Latency: this.percentile(latencies, 99),
    };
  }

  private average(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private standardDeviation(values: number[]): number {
    const mean = this.average(values);
    const variance = this.calculateVariance(values);
    return Math.sqrt(variance);
  }

  private percentile(sortedValues: number[], p: number): number {
    const index = (p / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (lower === upper) return sortedValues[lower];
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  /**
   * Detect performance regressions
   */
  detectRegressions(
    current: number[],
    baseline: number[],
    threshold: number = 0.05
  ): {
    hasRegression: boolean;
    changePercent: number;
    severity: 'none' | 'minor' | 'moderate' | 'severe';
  } {
    const currentAvg = this.average(current);
    const baselineAvg = this.average(baseline);
    const changePercent = ((currentAvg - baselineAvg) / baselineAvg) * 100;

    let severity: 'none' | 'minor' | 'moderate' | 'severe' = 'none';
    if (Math.abs(changePercent) >= threshold * 100) {
      if (Math.abs(changePercent) >= 20) severity = 'severe';
      else if (Math.abs(changePercent) >= 10) severity = 'moderate';
      else severity = 'minor';
    }

    return {
      hasRegression: changePercent < -threshold * 100,
      changePercent,
      severity: changePercent < 0 ? severity : 'none',
    };
  }
}

describe('MetricsCalculator', () => {
  let calculator: MetricsCalculator;

  beforeEach(() => {
    calculator = new MetricsCalculator();
  });

  describe('calculateF1Score', () => {
    it('should calculate F1 score correctly', () => {
      const f1 = calculator.calculateF1Score(0.8, 0.9);
      expect(f1).toBeCloseTo(0.847, 3);
    });

    it('should return 0 when precision and recall are 0', () => {
      const f1 = calculator.calculateF1Score(0, 0);
      expect(f1).toBe(0);
    });

    it('should handle perfect scores', () => {
      const f1 = calculator.calculateF1Score(1.0, 1.0);
      expect(f1).toBe(1.0);
    });

    it('should be symmetric', () => {
      const f1a = calculator.calculateF1Score(0.8, 0.7);
      const f1b = calculator.calculateF1Score(0.7, 0.8);
      expect(f1a).toBe(f1b);
    });
  });

  describe('calculateMRR', () => {
    it('should calculate MRR correctly', () => {
      const ranks = [1, 2, 3]; // 1/1 + 1/2 + 1/3 = 1.833 / 3 = 0.611
      const mrr = calculator.calculateMRR(ranks);
      expect(mrr).toBeCloseTo(0.611, 3);
    });

    it('should return 1.0 for all rank-1 results', () => {
      const ranks = [1, 1, 1];
      const mrr = calculator.calculateMRR(ranks);
      expect(mrr).toBe(1.0);
    });

    it('should handle single rank', () => {
      const mrr = calculator.calculateMRR([3]);
      expect(mrr).toBeCloseTo(0.333, 3);
    });

    it('should return 0 for empty array', () => {
      const mrr = calculator.calculateMRR([]);
      expect(mrr).toBe(0);
    });
  });

  describe('calculateNDCG', () => {
    it('should calculate NDCG correctly', () => {
      const relevanceScores = [3, 2, 3, 0, 1, 2];
      const idealScores = [3, 3, 2, 2, 1, 0];
      const ndcg = calculator.calculateNDCG(relevanceScores, idealScores);
      expect(ndcg).toBeGreaterThan(0);
      expect(ndcg).toBeLessThanOrEqual(1);
    });

    it('should return 1.0 for perfect ordering', () => {
      const scores = [3, 2, 1];
      const ndcg = calculator.calculateNDCG(scores, scores);
      expect(ndcg).toBe(1.0);
    });

    it('should return 0 when ideal DCG is 0', () => {
      const ndcg = calculator.calculateNDCG([0, 0], [0, 0]);
      expect(ndcg).toBe(0);
    });
  });

  describe('calculateQualityScore', () => {
    it('should calculate quality score with default weights', () => {
      const retrievalMetrics: RetrievalMetrics = {
        precision: 0.8,
        recall: 0.75,
        f1Score: 0.77,
      };

      const generationMetrics: GenerationMetrics = {
        coherence: 0.88,
        relevance: 0.85,
        factuality: 0.90,
        fluency: 0.92,
      };

      const score = calculator.calculateQualityScore(retrievalMetrics, generationMetrics);

      expect(score.overall).toBeGreaterThan(0.7);
      expect(score.overall).toBeLessThanOrEqual(1.0);
      expect(score.retrieval).toBeCloseTo(0.775, 2);
      expect(score.generation).toBeCloseTo(0.888, 2);
      expect(score.confidence).toBeGreaterThan(0);
    });

    it('should apply custom weights correctly', () => {
      const retrievalMetrics: RetrievalMetrics = {
        precision: 0.9,
        recall: 0.85,
        f1Score: 0.87,
      };

      const generationMetrics: GenerationMetrics = {
        coherence: 0.7,
        relevance: 0.7,
        factuality: 0.7,
        fluency: 0.7,
      };

      const weights = { retrieval: 0.7, generation: 0.3 };
      const score = calculator.calculateQualityScore(
        retrievalMetrics,
        generationMetrics,
        weights
      );

      // With higher retrieval weight, should favor retrieval score
      expect(score.overall).toBeGreaterThan(0.75);
    });

    it('should clamp scores to 0-1 range', () => {
      const retrievalMetrics: RetrievalMetrics = {
        precision: 1.2, // Invalid, should be clamped
        recall: 1.1, // Invalid, should be clamped
        f1Score: 1.0,
      };

      const generationMetrics: GenerationMetrics = {
        coherence: 1.0,
        relevance: 1.0,
        factuality: 1.0,
        fluency: 1.0,
      };

      const score = calculator.calculateQualityScore(retrievalMetrics, generationMetrics);

      expect(score.overall).toBeLessThanOrEqual(1.0);
      expect(score.retrieval).toBeLessThanOrEqual(1.0);
      expect(score.generation).toBeLessThanOrEqual(1.0);
    });

    it('should calculate higher confidence for consistent metrics', () => {
      const consistentRetrieval: RetrievalMetrics = {
        precision: 0.85,
        recall: 0.85,
        f1Score: 0.85,
      };

      const consistentGeneration: GenerationMetrics = {
        coherence: 0.9,
        relevance: 0.9,
        factuality: 0.9,
        fluency: 0.9,
      };

      const inconsistentRetrieval: RetrievalMetrics = {
        precision: 0.5,
        recall: 0.9,
        f1Score: 0.7,
      };

      const inconsistentGeneration: GenerationMetrics = {
        coherence: 0.5,
        relevance: 0.9,
        factuality: 0.6,
        fluency: 0.8,
      };

      const consistentScore = calculator.calculateQualityScore(
        consistentRetrieval,
        consistentGeneration
      );

      const inconsistentScore = calculator.calculateQualityScore(
        inconsistentRetrieval,
        inconsistentGeneration
      );

      expect(consistentScore.confidence).toBeGreaterThan(inconsistentScore.confidence);
    });
  });

  describe('calculateAggregates', () => {
    it('should calculate aggregate statistics correctly', () => {
      const metrics = [
        { qualityScore: 0.85, latency: 100 },
        { qualityScore: 0.90, latency: 150 },
        { qualityScore: 0.80, latency: 120 },
        { qualityScore: 0.88, latency: 180 },
        { qualityScore: 0.92, latency: 110 },
      ];

      const aggregates = calculator.calculateAggregates(metrics);

      expect(aggregates.count).toBe(5);
      expect(aggregates.avgQuality).toBeCloseTo(0.87, 2);
      expect(aggregates.minQuality).toBe(0.80);
      expect(aggregates.maxQuality).toBe(0.92);
      expect(aggregates.stdDevQuality).toBeGreaterThan(0);
      expect(aggregates.avgLatency).toBe(132);
    });

    it('should calculate percentiles correctly', () => {
      const metrics = Array.from({ length: 100 }, (_, i) => ({
        qualityScore: 0.8,
        latency: i + 1, // 1 to 100
      }));

      const aggregates = calculator.calculateAggregates(metrics);

      expect(aggregates.p50Latency).toBeCloseTo(50.5, 1);
      expect(aggregates.p95Latency).toBeCloseTo(95.05, 1);
      expect(aggregates.p99Latency).toBeCloseTo(99.01, 1);
    });

    it('should handle empty metrics array', () => {
      const aggregates = calculator.calculateAggregates([]);

      expect(aggregates.count).toBe(0);
      expect(aggregates.avgQuality).toBe(0);
      expect(aggregates.minQuality).toBe(0);
      expect(aggregates.maxQuality).toBe(0);
    });

    it('should handle single metric', () => {
      const metrics = [{ qualityScore: 0.85, latency: 100 }];

      const aggregates = calculator.calculateAggregates(metrics);

      expect(aggregates.count).toBe(1);
      expect(aggregates.avgQuality).toBe(0.85);
      expect(aggregates.minQuality).toBe(0.85);
      expect(aggregates.maxQuality).toBe(0.85);
      expect(aggregates.stdDevQuality).toBe(0);
    });
  });

  describe('detectRegressions', () => {
    it('should detect significant regression', () => {
      const baseline = [0.85, 0.87, 0.86, 0.88, 0.85];
      const current = [0.75, 0.76, 0.74, 0.77, 0.75];

      const result = calculator.detectRegressions(current, baseline);

      expect(result.hasRegression).toBe(true);
      expect(result.changePercent).toBeLessThan(0);
      expect(result.severity).not.toBe('none');
    });

    it('should not detect regression for minor changes', () => {
      const baseline = [0.85, 0.87, 0.86];
      const current = [0.84, 0.86, 0.85];

      const result = calculator.detectRegressions(current, baseline, 0.05);

      expect(result.hasRegression).toBe(false);
      expect(result.severity).toBe('none');
    });

    it('should classify regression severity correctly', () => {
      const baseline = [0.9, 0.9, 0.9];

      // Severe regression (>20%)
      const severe = calculator.detectRegressions([0.7, 0.7, 0.7], baseline);
      expect(severe.severity).toBe('severe');

      // Moderate regression (10-20%)
      const moderate = calculator.detectRegressions([0.8, 0.8, 0.8], baseline);
      expect(moderate.severity).toBe('moderate');

      // Minor regression (5-10%)
      const minor = calculator.detectRegressions([0.85, 0.85, 0.85], baseline);
      expect(minor.severity).toBe('minor');
    });

    it('should not flag improvements as regressions', () => {
      const baseline = [0.75, 0.76, 0.74];
      const current = [0.85, 0.87, 0.86];

      const result = calculator.detectRegressions(current, baseline);

      expect(result.hasRegression).toBe(false);
      expect(result.changePercent).toBeGreaterThan(0);
    });

    it('should use custom threshold', () => {
      const baseline = [0.85, 0.85, 0.85];
      const current = [0.82, 0.82, 0.82]; // ~3.5% decrease

      // Should not detect with 5% threshold
      const result1 = calculator.detectRegressions(current, baseline, 0.05);
      expect(result1.hasRegression).toBe(false);

      // Should detect with 2% threshold
      const result2 = calculator.detectRegressions(current, baseline, 0.02);
      expect(result2.hasRegression).toBe(true);
    });
  });
});
