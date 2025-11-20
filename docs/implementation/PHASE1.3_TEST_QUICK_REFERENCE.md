# Phase 1.3 Test Strategy - Quick Reference

**Target**: 81 tests, >85% coverage
**Timeline**: Day 11-30 (20 days)
**Status**: Ready for implementation

---

## Test Count Breakdown

| Component | Tests | Priority |
|-----------|-------|----------|
| InterviewerService Unit | 29 | 🔴 Critical |
| RAGService Unit | 18 | 🔴 Critical |
| Interview API Integration | 15 | 🟡 High |
| E2E Tests | 5 | 🟡 High |
| Performance Tests | 8 | 🟢 Medium |
| RAG Quality Tests | 6 | 🔴 Critical |
| **TOTAL** | **81** | |

---

## Critical Setup Tasks

### 1. pgvector Test Infrastructure

```bash
# Install testcontainers
npm install --save-dev @testcontainers/postgresql

# Create setup file
touch tests/setup/testcontainers.setup.ts
```

```typescript
// tests/setup/testcontainers.setup.ts
import { PostgreSqlContainer } from '@testcontainers/postgresql';

export async function setupTestDatabase() {
  const container = await new PostgreSqlContainer('pgvector/pgvector:pg16')
    .start();
  // ... (see full review doc)
}
```

### 2. Test Fixtures

```bash
touch tests/fixtures/phase1.3-fixtures.ts
```

Key fixtures needed:
- `mockEmbedding1536()` - Pre-computed 1536-dim vector
- `mockSessionData` - Complete session object
- `mockQuestionTemplates` - All 7 focusAreas × 3 depths
- `mockSimilarLogs` - RAG search results
- `mockInterviewQuestions` - Q&A pairs

### 3. Performance Utilities

```bash
touch lib/utils/test-performance.ts
```

```typescript
export function percentile(values: number[], p: number): number;
export async function measureAsync<T>(fn: () => Promise<T>);
export async function measureGenerationBreakdown(input: any);
```

---

## Test Patterns

### Unit Test Pattern (Vitest)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock OpenAI
vi.mock('@/lib/openai', () => ({
  createChatCompletion: vi.fn(),
  createEmbedding: vi.fn(),
}));

describe('InterviewerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate 2-3 questions for harmony focus', async () => {
    vi.mocked(openai.createChatCompletion).mockResolvedValue({
      completion: { choices: [{ message: { content: JSON.stringify({...}) } }] }
    });

    const result = await interviewer.generateQuestions({...});

    expect(result.questions).toHaveLength(2);
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });
});
```

### Integration Test Pattern

```typescript
import { beforeAll, afterAll } from 'vitest';
import { setupTestDatabase, teardownTestDatabase } from '../setup/testcontainers.setup';

let testDb: any;

beforeAll(async () => {
  ({ testDb } = await setupTestDatabase());
}, 60000);

afterAll(async () => {
  await teardownTestDatabase();
});

describe('Interview API', () => {
  it('should save questions to database', async () => {
    const response = await POST(request);
    expect(response.status).toBe(200);

    // Verify DB state
    const questions = await testDb.select()...;
    expect(questions).toHaveLength(2);
  });
});
```

### E2E Test Pattern (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test('should complete session → analyzer → interview flow', async ({ page }) => {
  await page.goto('/muednote');
  await page.click('button:has-text("新しいセッション")');
  // ...

  // Performance assertion
  const start = Date.now();
  await page.click('button:has-text("質問を生成")');
  await page.waitForSelector('[data-testid="interview-question"]');
  const duration = Date.now() - start;

  expect(duration).toBeLessThan(3000);
});
```

### Performance Test Pattern

```typescript
import { performance } from 'perf_hooks';

it('should complete RAG search in < 500ms', async () => {
  const start = performance.now();
  const results = await ragService.findSimilarLogs('Test', 5);
  const end = performance.now();

  expect(end - start).toBeLessThan(500);
});
```

---

## Key Assertions

### RAG Quality

```typescript
// Recall@5 > 0.8
const recall = hits / testQueries.length;
expect(recall).toBeGreaterThan(0.8);

// MRR > 0.7
const mrr = mrrSum / testQueries.length;
expect(mrr).toBeGreaterThan(0.7);

// Similarity threshold
expect(result.similarity).toBeGreaterThanOrEqual(0.7);
```

### Performance

```typescript
// RAG search
expect(duration).toBeLessThan(500);

// Question generation
expect(metrics.ragSearch).toBeLessThan(500);
expect(metrics.openaiCall).toBeLessThan(2000);
expect(metrics.dbSave).toBeLessThan(500);
expect(metrics.total).toBeLessThan(3000);

// P95/P99 latency
const p95 = percentile(durations, 95);
expect(p95).toBeLessThan(1000);
```

### Embedding Quality

```typescript
// Dimension check
expect(embedding).toHaveLength(1536);

// Normalization (L2 norm = 1.0)
const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v*v, 0));
expect(magnitude).toBeCloseTo(1.0, 5);

// Semantic similarity
const similarity = cosineSimilarity(emb1, emb2);
expect(similarity).toBeGreaterThan(0.8);
```

---

## Mock Strategies

### OpenAI Chat Completions

```typescript
vi.mocked(openai.createChatCompletion).mockResolvedValue({
  completion: {
    choices: [{
      message: {
        content: JSON.stringify({
          questions: [
            { text: 'Q1', focus: 'harmony', depth: 'medium' }
          ]
        })
      }
    }]
  },
  usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }
});
```

### OpenAI Embeddings

```typescript
vi.mocked(openai.createEmbedding).mockResolvedValue({
  data: [{ embedding: Array(1536).fill(0).map(() => Math.random()) }],
  usage: { total_tokens: 100 }
});
```

### Database (pgvector)

```typescript
vi.mocked(db.execute).mockResolvedValue({
  rows: [
    { session_id: 'sess-1', similarity: 0.95, user_short_note: 'Note 1' },
    { session_id: 'sess-2', similarity: 0.87, user_short_note: 'Note 2' },
  ]
});
```

---

## CI/CD Integration

### package.json Scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "playwright test",
    "test:performance": "vitest run tests/performance",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch"
  }
}
```

### GitHub Actions

```yaml
jobs:
  integration-tests:
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env:
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
```

---

## Error Scenarios to Test

1. **OpenAI API Failures**
   - Rate limit exceeded (429)
   - Timeout (408)
   - Invalid API key (401)
   - Network error

2. **Database Errors**
   - Connection pool exhausted
   - Transaction rollback
   - Duplicate key violation
   - Foreign key constraint

3. **pgvector Issues**
   - Embedding dimension mismatch
   - Empty result set
   - Index not created
   - Vector normalization failure

4. **Edge Cases**
   - Empty user note
   - Very long note (>500 chars)
   - Special characters / SQL injection
   - Concurrent requests

---

## Coverage Targets

| Component | Target | Method |
|-----------|--------|--------|
| InterviewerService | 90% | Unit tests + integration |
| RAGService | 85% | Unit tests + integration |
| Interview API | 88% | Integration + E2E |
| Database schema | 60% | Migration tests |
| **Overall** | **>85%** | Vitest coverage report |

---

## Performance Benchmarks

| Metric | Target | Test Method |
|--------|--------|-------------|
| RAG search latency | < 500ms | `performance.now()` |
| Question generation | < 3s | End-to-end timing |
| P95 latency | < 1s | k6 load test |
| P99 latency | < 1.5s | k6 load test |
| Recall@5 | > 0.8 | RAG quality test |
| MRR | > 0.7 | RAG quality test |

---

## Test Execution Order

### Day 11-13: InterviewerService
1. Setup mocks (OpenAI, RAGService)
2. Implement 7 focusArea tests
3. Add fallback tests
4. Add edge case tests
5. Target: 29 tests passing

### Day 14-16: RAGService
1. Setup testcontainers
2. Implement embedding tests
3. Add vector search tests
4. Add template retrieval tests
5. Target: 18 tests passing

### Day 17-18: Interview API
1. Setup integration test DB
2. Implement POST /questions tests
3. Implement POST /answers tests
4. Implement GET /history tests
5. Target: 15 tests passing

### Day 19-20: E2E & Performance
1. Implement complete flow E2E
2. Add performance tests
3. Add RAG quality tests
4. Run full test suite
5. Target: 81 tests passing, >85% coverage

---

## Useful Commands

```bash
# Run all tests
npm run test

# Run specific category
npm run test:unit
npm run test:integration
npm run test:e2e

# Watch mode (development)
npm run test:watch

# Coverage report
npm run test:coverage

# Performance benchmarks
npm run test:performance

# k6 load test
k6 run tests/performance/interview-load-test.js

# Debug specific test
npx vitest run -t "should generate questions for harmony focus"

# Update snapshots
npx vitest run -u
```

---

## Common Issues & Solutions

### Issue: Testcontainer startup timeout

```typescript
beforeAll(async () => {
  ({ testDb } = await setupTestDatabase());
}, 120000); // Increase timeout to 2 minutes
```

### Issue: OpenAI mock not working

```typescript
// Make sure to import after mocks
vi.mock('@/lib/openai');
import { interviewer } from '@/lib/services/interviewer.service';
```

### Issue: pgvector extension not found

```sql
-- Run in testcontainer setup
CREATE EXTENSION IF NOT EXISTS vector;
```

### Issue: Flaky E2E tests

```typescript
// Use Playwright auto-wait
await page.waitForLoadState('networkidle');

// Increase timeout for CI
timeout: process.env.CI ? 30000 : 10000
```

---

## Resources

- Full review: `PHASE1.3_TEST_STRATEGY_REVIEW.md`
- Implementation plan: `PHASE1.3_IMPLEMENTATION_PLAN.md`
- Phase 1.2 tests: `tests/integration/api/muednote-sessions.test.ts`
- Testcontainers docs: https://testcontainers.com/modules/pgvector/
- Vitest docs: https://vitest.dev/guide/
- Playwright docs: https://playwright.dev/

---

**Last Updated**: 2025-11-20
**Status**: Ready for implementation
**Confidence**: High (Based on Phase 1.2 success)
