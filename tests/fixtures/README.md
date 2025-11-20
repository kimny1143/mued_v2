# Test Fixtures

This directory contains test fixtures for MUED LMS v2.

## Phase 1.3 Fixtures (InterviewerService, RAGService, Interview API)

### Quick Start

```typescript
import {
  mockSessions,
  mockQuestionTemplates,
  mockEmbeddings,
  ragGroundTruth,
  Phase13FixtureFactory,
  phase13Helpers,
} from './phase1.3-fixtures';

// Get a harmony session
const harmonySession = phase13Helpers.getSessionByFocus('harmony');

// Get harmony templates (all depths)
const harmonyTemplates = phase13Helpers.getTemplatesByFocus('harmony');

// Calculate cosine similarity
const similarity = phase13Helpers.cosineSimilarity(vec1, vec2);

// Create custom test data
const session = Phase13FixtureFactory.createSession({ userId: 'custom-user' });
const question = Phase13FixtureFactory.createQuestion('session-001');
```

### Available Data

- **mockSessions**: 7 sessions (one per focusArea)
- **mockQuestionTemplates**: 21 templates (7 focusArea × 3 depth)
- **mockEmbeddings**: 14 embedding vectors (1536 dimensions)
- **ragGroundTruth**: 10 RAG quality test queries
- **mockInterviewQuestions**: Sample interview questions
- **mockInterviewAnswers**: Sample interview answers
- **mockRAGEmbeddings**: Database-ready embedding records

### FocusAreas

- `harmony` - Chord progressions, harmonic analysis
- `melody` - Melodic lines, phrases
- `rhythm` - Rhythmic patterns, grooves
- `mix` - Mixing, balance, spatial positioning
- `emotion` - Emotional expression
- `image` - Sonic imagery, atmosphere
- `structure` - Song structure, arrangement

### Question Depths

- `shallow` - Factual questions ("Which chord did you use?")
- `medium` - Intent questions ("Why did you change it?")
- `deep` - Essence questions ("What emotion does this express?")

### Verification

Run the verification script to ensure all fixtures are valid:

```bash
npx tsx scripts/verify-phase1.3-fixtures.ts
```

Expected output: 🎉 All checks passed!

### Documentation

See [PHASE1.3_TEST_FIXTURES_SUMMARY.md](../../docs/implementation/PHASE1.3_TEST_FIXTURES_SUMMARY.md) for detailed documentation.
