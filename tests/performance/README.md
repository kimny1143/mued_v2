# Performance Testing Infrastructure

This directory contains performance testing utilities and tests for RAG search and AI question generation.

## Overview

### KPI Targets

- **RAG Search**: P95 latency < 500ms
- **Question Generation**: P95 latency < 3000ms
- **RAG Quality**: Recall@5 > 0.8, MRR > 0.7
- **Throughput**: > 20 questions/minute

### Architecture

```
tests/performance/
├── rag-search.test.ts              # RAG search performance tests
├── question-generation.test.ts     # AI question generation tests
└── README.md                       # This file

lib/utils/
├── test-performance.ts             # Performance measurement utilities
├── test-performance.test.ts        # Unit tests for performance utils
├── rag-metrics.ts                  # RAG quality metrics calculator
└── rag-metrics.test.ts             # Unit tests for RAG metrics

tests/setup/
└── custom-matchers.ts              # Vitest custom matchers
```

## Quick Start

### Run All Performance Tests

```bash
npm run test:performance
```

### Run Specific Test Suites

```bash
# RAG search tests only
npm run test:performance:rag

# Question generation tests only
npm run test:performance:questions

# Watch mode for development
npm run test:performance:watch
```

### Run Unit Tests for Utilities

```bash
# Test performance measurement utilities
npm run test:unit -- lib/utils/test-performance.test.ts

# Test RAG metrics calculator
npm run test:unit -- lib/utils/rag-metrics.test.ts
```

## Usage Guide

### 1. Performance Measurement

#### Basic Usage

```typescript
import { PerformanceMeasurement } from '@/lib/utils/test-performance';

const perf = new PerformanceMeasurement();

// Measure async function
const { result, latency } = await perf.measure(() =>
  ragService.search('query')
);

console.log(`Latency: ${latency}ms`);
```

#### Collecting Metrics

```typescript
// Run multiple iterations
for (let i = 0; i < 100; i++) {
  await perf.measure(() => myFunction());
}

// Get statistics
const metrics = perf.getMetrics();
console.log(`P95: ${metrics.p95}ms`);
console.log(`Mean: ${metrics.latency}ms`);
console.log(`StdDev: ${metrics.stdDev}ms`);

// Print formatted summary
perf.printSummary();
```

#### Custom Assertions

```typescript
// Assert P95 < 500ms
perf.assertLatency(500, 95);

// Assert mean < 250ms
perf.assertMeanLatency(250);
```

### 2. RAG Quality Metrics

#### Calculate Metrics

```typescript
import {
  calculateRAGMetrics,
  evaluateRAGQuery,
} from '@/lib/utils/rag-metrics';

const results = await ragService.search('query', 5);
const retrievedIds = results.map(r => r.id);
const groundTruth = ['doc1', 'doc2', 'doc3'];

const metrics = calculateRAGMetrics(retrievedIds, groundTruth, 5);

console.log(`Recall@5: ${metrics.recallAtK}`);
console.log(`Precision@5: ${metrics.precisionAtK}`);
console.log(`MRR: ${metrics.mrr}`);
console.log(`F1 Score: ${metrics.f1Score}`);
```

#### Evaluate Multiple Queries

```typescript
import { aggregateRAGMetrics } from '@/lib/utils/rag-metrics';

const evaluations = [];

for (const { query, relevantIds } of groundTruthQueries) {
  const results = await ragService.search(query, 5);
  const retrievedIds = results.map(r => r.id);

  const eval = evaluateRAGQuery(query, retrievedIds, relevantIds, 5);
  evaluations.push(eval);
}

const aggregated = aggregateRAGMetrics(evaluations);
console.log(`Average Recall@5: ${aggregated.recallAtK}`);
```

#### Assert Quality Thresholds

```typescript
import { assertRAGQuality } from '@/lib/utils/rag-metrics';

assertRAGQuality(metrics, {
  minRecall: 0.8,
  minPrecision: 0.7,
  minMRR: 0.7,
  minF1: 0.75,
});
```

### 3. Custom Vitest Matchers

The custom matchers are automatically available after importing the setup file.

```typescript
import { expect } from 'vitest';
import '@/tests/setup/custom-matchers';

// Performance matchers
expect(performanceMetrics).toHaveLatencyLessThan(500);
expect(performanceMetrics).toHaveLatencyLessThan(300, 50); // P50
expect(performanceMetrics).toHaveMeanLatencyLessThan(250);

// RAG quality matchers
expect(ragMetrics).toHaveRecallAtLeast(0.8);
expect(ragMetrics).toHavePrecisionAtLeast(0.7);
expect(ragMetrics).toHaveMRRAtLeast(0.7);
expect(ragMetrics).toHaveF1ScoreAtLeast(0.75);
```

### 4. Throughput Measurement

```typescript
import { ThroughputMeasurement } from '@/lib/utils/test-performance';

const throughput = new ThroughputMeasurement();

throughput.start();

for (let i = 0; i < 100; i++) {
  await processItem(i);
  throughput.record();
}

const opsPerSecond = throughput.stop();
console.log(`Throughput: ${opsPerSecond} ops/sec`);
```

### 5. Benchmarking Multiple Implementations

```typescript
import { benchmark } from '@/lib/utils/test-performance';

const results = await benchmark(
  {
    'implementation-a': () => functionA(),
    'implementation-b': () => functionB(),
  },
  100 // iterations
);

console.log(`A: P95=${results['implementation-a'].p95}ms`);
console.log(`B: P95=${results['implementation-b'].p95}ms`);
```

## Writing Performance Tests

### Template for RAG Search Tests

```typescript
import { describe, it, expect } from 'vitest';
import { PerformanceMeasurement } from '@/lib/utils/test-performance';
import { calculateRAGMetrics } from '@/lib/utils/rag-metrics';
import '@/tests/setup/custom-matchers';

describe('My RAG Service Performance', () => {
  it('should meet latency targets', async () => {
    const perf = new PerformanceMeasurement();

    for (let i = 0; i < 100; i++) {
      await perf.measure(() => myRagService.search('test'));
    }

    const metrics = perf.getMetrics();
    expect(metrics).toHaveLatencyLessThan(500, 95);
  });

  it('should meet quality targets', async () => {
    const results = await myRagService.search('query', 5);
    const metrics = calculateRAGMetrics(
      results.map(r => r.id),
      groundTruth,
      5
    );

    expect(metrics).toHaveRecallAtLeast(0.8);
  });
});
```

### Template for Question Generation Tests

```typescript
import { describe, it, expect } from 'vitest';
import { PerformanceMeasurement } from '@/lib/utils/test-performance';
import '@/tests/setup/custom-matchers';

describe('Question Generation Performance', () => {
  it('should generate questions within 3 seconds (P95)', async () => {
    const perf = new PerformanceMeasurement();

    for (let i = 0; i < 50; i++) {
      await perf.measure(() =>
        questionService.generate({ sessionId: 'test' })
      );
    }

    const metrics = perf.getMetrics();
    expect(metrics).toHaveLatencyLessThan(3000, 95);
  });
});
```

## Ground Truth Data

For accurate RAG quality testing, maintain ground truth data:

```typescript
export const groundTruthQueries: GroundTruthEntry[] = [
  {
    query: 'What is a chord progression?',
    relevantIds: ['doc1', 'doc2', 'doc5'],
    relevanceScores: [5, 4, 3, 0, 0], // 0-5 scale for NDCG
  },
  {
    query: 'How do I practice rhythm?',
    relevantIds: ['doc3', 'doc7'],
    relevanceScores: [5, 4, 0, 0, 0],
  },
  // Add more queries...
];
```

## Interpreting Results

### Performance Metrics

- **P50 (Median)**: Half of requests are faster than this
- **P95**: 95% of requests are faster than this (our SLO target)
- **P99**: 99% of requests are faster than this (rare slow requests)
- **Mean**: Average latency (can be skewed by outliers)
- **StdDev**: Consistency of performance (lower is better)

### RAG Quality Metrics

- **Recall@K**: Fraction of relevant docs retrieved (completeness)
- **Precision@K**: Fraction of retrieved docs that are relevant (accuracy)
- **MRR**: Quality of first relevant result (user experience)
- **F1 Score**: Harmonic mean of precision and recall (balance)
- **NDCG@K**: Ranking quality with graded relevance (optional)

## Integration with Real Services

The current tests use mock services. To integrate with real implementations:

1. **RAG Service**:
   - Import real service: `import { RAGService } from '@/lib/services/rag.service';`
   - Replace `MockRAGService` with actual implementation
   - Update ground truth data based on real database content

2. **Question Generation**:
   - Import real service: `import { QuestionGenerationService } from '@/lib/services/question-generation.service';`
   - Replace mock with actual OpenAI-based implementation
   - Adjust thresholds based on actual API performance

3. **Database Connection**:
   - Use testcontainers for isolated database testing
   - Ensure test data is seeded consistently

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run Performance Tests
  run: npm run test:performance

- name: Check Performance Regression
  run: |
    # Compare results with baseline
    # Fail if P95 > threshold
```

### Performance Budgets

Set budgets in `package.json` or separate config:

```json
{
  "performanceBudgets": {
    "ragSearch": {
      "p95": 500,
      "p99": 800
    },
    "questionGeneration": {
      "p95": 3000,
      "p99": 5000
    }
  }
}
```

## Troubleshooting

### Tests are flaky

- Increase sample size (iterations)
- Check for external dependencies (network, DB)
- Use stable test data
- Warm up services before measurement

### Performance is worse than expected

- Profile with Chrome DevTools or Node.js profiler
- Check database query plans
- Review API call patterns
- Consider caching strategies

### RAG quality metrics are low

- Review ground truth data quality
- Check embedding model performance
- Tune vector search parameters
- Analyze failure cases

## References

- [Vitest Documentation](https://vitest.dev/)
- [Information Retrieval Metrics](https://en.wikipedia.org/wiki/Evaluation_measures_(information_retrieval))
- [NDCG (Normalized Discounted Cumulative Gain)](https://en.wikipedia.org/wiki/Discounted_cumulative_gain)
- [Performance Testing Best Practices](https://web.dev/performance-budgets-101/)

## Contributing

When adding new performance tests:

1. Use existing utilities (`PerformanceMeasurement`, `calculateRAGMetrics`)
2. Add custom matchers if needed
3. Document expected performance characteristics
4. Include ground truth data for quality tests
5. Add integration instructions for real services
