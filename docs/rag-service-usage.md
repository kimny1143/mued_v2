# RAG Service - Usage Guide

## Overview

The RAG (Retrieval-Augmented Generation) Service provides semantic search capabilities over session logs using OpenAI embeddings and PostgreSQL's pgvector extension.

**Implementation File**: `/lib/services/rag.service.ts`

**Key Features**:
- Embedding generation with OpenAI API (text-embedding-ada-002)
- Vector similarity search using pgvector HNSW index
- Batch embedding with automatic rate limiting (50 req/min)
- Question template retrieval
- RAG quality metrics evaluation

---

## Architecture

### Vector Search Pipeline

```
User Query
    ↓
[Generate Embedding] → OpenAI API
    ↓
[Vector Similarity Search] → pgvector (HNSW index)
    ↓
[Cosine Distance Calculation] → 1 - (embedding <=> query_embedding)
    ↓
[Threshold Filtering] → similarity >= 0.7
    ↓
[Top-K Results] → Sorted by similarity
```

### Database Schema

```sql
-- rag_embeddings table (from migration 0012)
CREATE TABLE rag_embeddings (
  id UUID PRIMARY KEY,
  source_type TEXT CHECK (source_type IN ('session', 'template')),
  source_id UUID,
  embedding VECTOR(1536) NOT NULL,
  metadata JSONB,
  embedding_model VARCHAR(100) DEFAULT 'text-embedding-ada-002',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_type, source_id)
);

-- HNSW index for fast similarity search
CREATE INDEX idx_rag_embeddings_vector
  ON rag_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

---

## API Reference

### 1. Embed a Session

Store a session's userShortNote as a vector embedding.

```typescript
import { ragService } from '@/lib/services/rag.service';

// Embed a single session
await ragService.embedSession(
  'session-uuid-001',
  'サビのコード進行をFからGに変更した'
);
```

**Parameters**:
- `sessionId` (string): Session UUID
- `content` (string): User's short note text (1-10,000 characters)

**Returns**: `Promise<void>`

**Throws**:
- `ZodError` if validation fails
- `Error` if OpenAI API fails

---

### 2. Find Similar Logs

Search for sessions similar to a query text.

```typescript
const results = await ragService.findSimilarLogs(
  'コード進行を変更した',
  5,    // limit: top 5 results
  0.7   // threshold: minimum similarity 0.7
);

console.log(results);
// [
//   {
//     logId: 'session-001',
//     sessionId: 'session-001',
//     content: 'サビのコード進行をFからGに変更した',
//     similarity: 0.89,
//     metadata: { focusArea: 'harmony', ... }
//   },
//   ...
// ]
```

**Parameters**:
- `query` (string): Search query text
- `limit` (number, default: 5): Number of results (1-50)
- `threshold` (number, default: 0.7): Minimum similarity (0.0-1.0)

**Returns**: `Promise<SimilarLog[]>`

**Notes**:
- Returns empty array on error (graceful fallback)
- Uses HNSW index for O(log n) search
- Cosine similarity: `1 - (embedding <=> query_embedding)`

---

### 3. Batch Embed Sessions

Embed multiple sessions with automatic rate limiting.

```typescript
const sessions = [
  { id: 'session-001', userShortNote: 'メロディ変更' },
  { id: 'session-002', userShortNote: 'リズム調整' },
  { id: 'session-003', userShortNote: 'ミックス改善' },
];

await ragService.embedSessionsBatch(sessions);
// Automatically adds 1.2s delay between requests
// to stay under 50 requests/min limit
```

**Parameters**:
- `sessions` (Array): `{id: string, userShortNote: string}[]`

**Returns**: `Promise<void>`

**Rate Limiting**:
- 1.2 seconds delay between requests
- Max 50 requests/minute (OpenAI free tier)

---

### 4. Get Question Templates

Retrieve question templates by focus area.

```typescript
const templates = await ragService.getQuestionTemplates('harmony', 3);

console.log(templates);
// [
//   {
//     id: 'qt-001',
//     text: 'どのコードを使いましたか？',
//     focus: 'harmony',
//     depth: 'shallow',
//     variables: {}
//   },
//   ...
// ]
```

**Parameters**:
- `focusArea` (InterviewFocus): 'harmony' | 'melody' | 'rhythm' | 'mix' | 'emotion' | 'image' | 'structure'
- `limit` (number, default: 3): Maximum templates to retrieve

**Returns**: `Promise<QuestionTemplate[]>`

---

### 5. Evaluate RAG Quality

Calculate RAG metrics (Recall, Precision, MRR, F1) against ground truth.

```typescript
const metrics = await ragService.evaluateRAGQuality(
  'コード進行を変更した',
  ['session-001', 'session-005'], // ground truth
  5 // top-K
);

console.log(metrics);
// {
//   recallAtK: 0.75,      // 75% of relevant docs retrieved
//   precisionAtK: 0.60,   // 60% of results are relevant
//   mrr: 0.50,            // Mean Reciprocal Rank
//   f1Score: 0.67,        // Harmonic mean of P & R
//   hits: 3,              // Number of relevant results found
//   totalRelevant: 4,     // Total relevant docs
//   totalRetrieved: 5     // Total docs retrieved
// }
```

**Parameters**:
- `query` (string): Search query
- `groundTruth` (string[]): Expected relevant session IDs
- `k` (number, default: 5): Top-K for evaluation

**Returns**: `Promise<RAGMetrics>`

---

### 6. Check Index Usage (Debug)

Verify that HNSW index is being used for queries.

```typescript
const plan = await ragService.checkIndexUsage('コード進行変更');

console.log(JSON.stringify(plan, null, 2));
// EXPLAIN output showing index scan
```

**Returns**: `Promise<any>` - PostgreSQL EXPLAIN JSON output

---

### 7. Get Embedding Statistics

Get counts of embeddings by source type.

```typescript
const stats = await ragService.getEmbeddingStats();

console.log(stats);
// {
//   sessions: 150,
//   templates: 21,
//   total: 171
// }
```

**Returns**: `Promise<{sessions: number, templates: number, total: number}>`

---

## Performance Benchmarks

### Similarity Search Performance

| Operation | Target | Actual |
|-----------|--------|--------|
| Single search (5 results) | < 500ms | ~200-300ms |
| Concurrent searches (5 queries) | < 2s | ~800-1200ms |
| Batch embedding (10 sessions) | ~12s | ~13s (with rate limiting) |

### HNSW Index Parameters

```sql
-- Current configuration (migration 0012)
WITH (m = 16, ef_construction = 64)

-- m: Number of connections per layer (trade-off: recall vs speed)
-- ef_construction: Size of dynamic candidate list (build quality)
```

**Optimization Notes**:
- Increasing `m` improves recall but slows down search
- Increasing `ef_construction` improves index quality but slows down build
- Current settings balance speed and accuracy for ~1000 embeddings

---

## Error Handling

The service implements graceful fallbacks:

```typescript
// Example: Empty result on error
const results = await ragService.findSimilarLogs('invalid query', 5, 0.7);
// Returns: [] instead of throwing
```

**Common Errors**:
1. **OPENAI_API_KEY not set**: Throws `Error` with clear message
2. **Invalid UUID**: Throws `ZodError` with validation details
3. **Network timeout**: Logs error, returns empty array
4. **Rate limit exceeded**: Automatic retry with exponential backoff (future)

---

## Integration with Other Services

### Agent 1: InterviewerService

```typescript
import { ragService } from '@/lib/services/rag.service';
import { interviewerService } from '@/lib/services/interviewer.service';

// 1. Embed new session
await ragService.embedSession(sessionId, userShortNote);

// 2. Find similar past sessions
const similarLogs = await ragService.findSimilarLogs(userShortNote, 3, 0.75);

// 3. Generate questions using RAG context
const questions = await interviewerService.generateQuestions(
  sessionId,
  focusArea,
  { similarSessions: similarLogs }
);
```

### Agent 3: ProviderService

```typescript
// Retrieve question templates for current session
const templates = await ragService.getQuestionTemplates(focusArea, 5);

// Provide context-aware questions
const question = await providerService.selectQuestion(templates, context);
```

---

## Testing

**Test File**: `/tests/integration/rag.service.test.ts`

**Run Tests**:
```bash
npm run test -- rag.service.test.ts
```

**Coverage Areas**:
- ✅ Embedding generation
- ✅ Vector similarity search
- ✅ Batch operations with rate limiting
- ✅ Question template retrieval
- ✅ RAG quality metrics
- ✅ HNSW index usage verification
- ✅ Performance benchmarks

---

## Migration Reference

**File**: `/db/migrations/0012_add_rag_embeddings.sql`

**Key Steps**:
1. Enable pgvector extension
2. Create `rag_embeddings` table with VECTOR(1536) column
3. Create HNSW index for cosine similarity
4. Add validation trigger for foreign key checks
5. Create helper view `v_rag_embeddings_with_source`

**Verify Migration**:
```sql
-- Check extension
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Check index
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'rag_embeddings'
  AND indexname = 'idx_rag_embeddings_vector';
```

---

## Troubleshooting

### Issue: Slow similarity search (> 500ms)

**Solution**:
1. Check if HNSW index is being used:
   ```typescript
   const plan = await ragService.checkIndexUsage(query);
   console.log(plan); // Should show "Index Scan using idx_rag_embeddings_vector"
   ```
2. If sequential scan is used, rebuild index:
   ```sql
   REINDEX INDEX CONCURRENTLY idx_rag_embeddings_vector;
   ```

### Issue: OpenAI API rate limit errors

**Solution**:
- Increase `RATE_LIMIT_DELAY` in service (currently 1.2s)
- Use batch operations with automatic rate limiting
- Cache embeddings aggressively

### Issue: Low similarity scores for relevant results

**Solution**:
- Lower threshold (e.g., 0.6 instead of 0.7)
- Check embedding quality (ensure Japanese text is properly handled)
- Use longer, more descriptive session notes

---

## Future Enhancements

1. **Hybrid Search**: Combine vector search with keyword search
2. **Embedding Cache**: Redis cache for frequently searched queries
3. **Model Upgrade**: Migrate to text-embedding-3-small (better performance)
4. **Relevance Feedback**: Track user interactions to improve ranking
5. **Multi-modal**: Support MIDI/audio embeddings for music analysis

---

## References

- [OpenAI Embeddings API](https://platform.openai.com/docs/guides/embeddings)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [HNSW Algorithm Paper](https://arxiv.org/abs/1603.09320)
- [RAG Metrics Paper](https://arxiv.org/abs/2005.11401)
