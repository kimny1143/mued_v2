# Phase 1.3 Fixtures Quick Reference

## Import Statement

```typescript
import {
  // Main Fixtures
  mockSessions,
  mockQuestionTemplates,
  mockEmbeddings,
  ragGroundTruth,
  mockInterviewQuestions,
  mockInterviewAnswers,
  mockRAGEmbeddings,

  // Factory
  Phase13FixtureFactory,

  // Helpers
  phase13Helpers,
  generateDeterministicVector,
} from './phase1.3-fixtures';

// Helper functions
import {
  cosineSimilarity,
  calculateRAGMetrics,
  seedTestDatabase,
  // ... more helpers
} from '../utils/test-helpers';
```

## Common Patterns

### Get Session by FocusArea

```typescript
const harmonySession = phase13Helpers.getSessionByFocus('harmony');
// => session-001: "サビのコード進行をFからGに変更した"
```

### Get Templates

```typescript
// All harmony templates (3: shallow, medium, deep)
const harmonyTemplates = phase13Helpers.getTemplatesByFocus('harmony');

// All deep templates (7: one per focusArea)
const deepTemplates = phase13Helpers.getTemplatesByDepth('deep');
```

### Vector Operations

```typescript
// Get embedding for session
const embedding = phase13Helpers.getEmbeddingForSession('session-001');

// Calculate similarity
const sim = phase13Helpers.cosineSimilarity(vec1, vec2);

// Find similar sessions
const similar = phase13Helpers.findSimilarSessions(queryEmbedding, 5);
// => [{ sessionId: 'session-001', similarity: 0.95 }, ...]
```

### Create Test Data

```typescript
// Single session
const session = Phase13FixtureFactory.createSession({
  userId: 'user-test',
  aiAnnotations: {
    focusArea: 'melody',
    intentHypothesis: 'Test hypothesis',
    confidence: 0.8,
  },
});

// Batch sessions (all same focusArea)
const sessions = Phase13FixtureFactory.createBatchSessions(10, 'harmony');

// Question
const question = Phase13FixtureFactory.createQuestion('session-001', {
  focus: 'harmony',
  depth: 'deep',
});

// Answer
const answer = Phase13FixtureFactory.createAnswer('q-001', {
  text: 'Custom answer text',
});
```

### Validate RAG Results

```typescript
const gt = ragGroundTruth[0]; // { query: 'コード進行を変更した', expectedResults: [...] }

const metrics = phase13Helpers.validateRAGResults(
  'コード進行を変更した',
  ['session-001', 'session-005'],
  gt
);
// => { precision: 1.0, recall: 1.0, f1: 1.0 }
```

## Data Summary

| Data Type | Count | Notes |
|-----------|-------|-------|
| Sessions | 7 | One per focusArea |
| Question Templates | 21 | 7 focusArea × 3 depth |
| Embeddings | 14 | 1536 dimensions, deterministic |
| RAG Ground Truth | 10 | Quality test queries |
| Interview Questions | 3 | Sample Q&A pairs |
| Interview Answers | 2 | With AI insights |

## FocusAreas

```typescript
type FocusArea =
  | 'harmony'    // session-001
  | 'melody'     // session-002
  | 'rhythm'     // session-003
  | 'mix'        // session-004
  | 'emotion'    // session-005
  | 'image'      // session-006
  | 'structure'; // session-007
```

## Question Depths

```typescript
type QuestionDepth =
  | 'shallow'  // Factual (priority: 10)
  | 'medium'   // Intent (priority: 5)
  | 'deep';    // Essence (priority: 1)
```

## Verification

```bash
# Verify all fixtures
npx tsx scripts/verify-phase1.3-fixtures.ts

# Expected: 🎉 All checks passed!
```

## Example Test

```typescript
import { mockSessions, phase13Helpers } from '../fixtures/phase1.3-fixtures';

test('InterviewerService generates questions for harmony', async () => {
  const session = phase13Helpers.getSessionByFocus('harmony');

  const result = await interviewer.generateQuestions({
    sessionId: session.id,
    focusArea: session.aiAnnotations.focusArea,
    intentHypothesis: session.aiAnnotations.intentHypothesis,
    userShortNote: session.userShortNote,
  });

  expect(result.questions.length).toBeGreaterThanOrEqual(2);
  expect(result.questions.length).toBeLessThanOrEqual(3);
  expect(result.questions[0].focus).toBe('harmony');
});
```
