/**
 * Custom Vitest Matchers for Performance and RAG Testing
 *
 * Extends Vitest's expect API with domain-specific matchers for:
 * - Performance assertions (latency, throughput)
 * - RAG quality metrics (recall, precision, MRR)
 *
 * @example
 * ```typescript
 * import { expect } from 'vitest';
 * import './tests/setup/custom-matchers';
 *
 * const metrics = perf.getMetrics();
 * expect(metrics).toHaveLatencyLessThan(500);
 *
 * const ragMetrics = calculateRAGMetrics(results, groundTruth);
 * expect(ragMetrics).toHaveRecallAtLeast(0.8);
 * ```
 */

import { expect } from 'vitest';
import type { PerformanceMetrics } from '@/lib/utils/test-performance';
import type { RAGMetrics } from '@/lib/utils/rag-metrics';

/**
 * Custom matcher: toHaveLatencyLessThan
 *
 * Asserts that P95 latency is below a threshold
 *
 * @example
 * expect(performanceMetrics).toHaveLatencyLessThan(500);
 */
interface PerformanceMatchers {
  toHaveLatencyLessThan(maxMs: number, percentile?: number): void;
  toHaveMeanLatencyLessThan(maxMs: number): void;
  toHaveMinLatencyLessThan(maxMs: number): void;
  toHaveMaxLatencyLessThan(maxMs: number): void;
}

/**
 * Custom matcher: toHaveRecallAtLeast
 *
 * Asserts that Recall@K meets a minimum threshold
 *
 * @example
 * expect(ragMetrics).toHaveRecallAtLeast(0.8);
 */
interface RAGMatchers {
  toHaveRecallAtLeast(minRecall: number): void;
  toHavePrecisionAtLeast(minPrecision: number): void;
  toHaveMRRAtLeast(minMRR: number): void;
  toHaveF1ScoreAtLeast(minF1: number): void;
}

/**
 * Combined matcher interface
 */
declare module 'vitest' {
  interface Assertion extends PerformanceMatchers, RAGMatchers {}
  interface AsymmetricMatchersContaining extends PerformanceMatchers, RAGMatchers {}
}

// ==========================================
// Performance Matchers
// ==========================================

expect.extend({
  toHaveLatencyLessThan(
    received: PerformanceMetrics,
    maxMs: number,
    percentile: number = 95
  ) {
    const { isNot } = this;

    let actualValue: number;
    let percentileLabel: string;

    if (percentile === 50) {
      actualValue = received.p50;
      percentileLabel = 'P50';
    } else if (percentile === 95) {
      actualValue = received.p95;
      percentileLabel = 'P95';
    } else if (percentile === 99) {
      actualValue = received.p99;
      percentileLabel = 'P99';
    } else {
      throw new Error(
        `Unsupported percentile: ${percentile}. Use 50, 95, or 99.`
      );
    }

    const pass = actualValue < maxMs;

    return {
      pass,
      message: () => {
        if (isNot) {
          return `Expected ${percentileLabel} latency NOT to be < ${maxMs}ms, but got ${actualValue.toFixed(2)}ms`;
        }
        return `Expected ${percentileLabel} latency to be < ${maxMs}ms, but got ${actualValue.toFixed(2)}ms (${received.count} samples)`;
      },
    };
  },

  toHaveMeanLatencyLessThan(received: PerformanceMetrics, maxMs: number) {
    const { isNot } = this;
    const pass = received.latency < maxMs;

    return {
      pass,
      message: () => {
        if (isNot) {
          return `Expected mean latency NOT to be < ${maxMs}ms, but got ${received.latency.toFixed(2)}ms`;
        }
        return `Expected mean latency to be < ${maxMs}ms, but got ${received.latency.toFixed(2)}ms (${received.count} samples)`;
      },
    };
  },

  toHaveMinLatencyLessThan(received: PerformanceMetrics, maxMs: number) {
    const { isNot } = this;
    const pass = received.min < maxMs;

    return {
      pass,
      message: () => {
        if (isNot) {
          return `Expected min latency NOT to be < ${maxMs}ms, but got ${received.min.toFixed(2)}ms`;
        }
        return `Expected min latency to be < ${maxMs}ms, but got ${received.min.toFixed(2)}ms`;
      },
    };
  },

  toHaveMaxLatencyLessThan(received: PerformanceMetrics, maxMs: number) {
    const { isNot } = this;
    const pass = received.max < maxMs;

    return {
      pass,
      message: () => {
        if (isNot) {
          return `Expected max latency NOT to be < ${maxMs}ms, but got ${received.max.toFixed(2)}ms`;
        }
        return `Expected max latency to be < ${maxMs}ms, but got ${received.max.toFixed(2)}ms`;
      },
    };
  },
});

// ==========================================
// RAG Quality Matchers
// ==========================================

expect.extend({
  toHaveRecallAtLeast(received: RAGMetrics, minRecall: number) {
    const { isNot } = this;
    const pass = received.recallAtK >= minRecall;

    return {
      pass,
      message: () => {
        if (isNot) {
          return `Expected Recall@K NOT to be >= ${minRecall}, but got ${received.recallAtK.toFixed(4)}`;
        }
        return `Expected Recall@K >= ${minRecall}, but got ${received.recallAtK.toFixed(4)} (${received.hits}/${received.totalRelevant} hits)`;
      },
    };
  },

  toHavePrecisionAtLeast(received: RAGMetrics, minPrecision: number) {
    const { isNot } = this;
    const pass = received.precisionAtK >= minPrecision;

    return {
      pass,
      message: () => {
        if (isNot) {
          return `Expected Precision@K NOT to be >= ${minPrecision}, but got ${received.precisionAtK.toFixed(4)}`;
        }
        return `Expected Precision@K >= ${minPrecision}, but got ${received.precisionAtK.toFixed(4)} (${received.hits}/${received.totalRetrieved} relevant)`;
      },
    };
  },

  toHaveMRRAtLeast(received: RAGMetrics, minMRR: number) {
    const { isNot } = this;
    const pass = received.mrr >= minMRR;

    return {
      pass,
      message: () => {
        if (isNot) {
          return `Expected MRR NOT to be >= ${minMRR}, but got ${received.mrr.toFixed(4)}`;
        }
        return `Expected MRR >= ${minMRR}, but got ${received.mrr.toFixed(4)}`;
      },
    };
  },

  toHaveF1ScoreAtLeast(received: RAGMetrics, minF1: number) {
    const { isNot } = this;
    const pass = received.f1Score >= minF1;

    return {
      pass,
      message: () => {
        if (isNot) {
          return `Expected F1 Score NOT to be >= ${minF1}, but got ${received.f1Score.toFixed(4)}`;
        }
        return `Expected F1 Score >= ${minF1}, but got ${received.f1Score.toFixed(4)} (Precision: ${received.precisionAtK.toFixed(2)}, Recall: ${received.recallAtK.toFixed(2)})`;
      },
    };
  },
});

// Export types for TypeScript
export type { PerformanceMatchers, RAGMatchers };
