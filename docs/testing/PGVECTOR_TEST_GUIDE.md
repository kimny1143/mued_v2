# pgvector Integration Testing Guide

## Quick Start

### Prerequisites Check

```bash
# 1. Verify Docker is running
docker ps

# 2. Verify Node.js version
node --version  # Should be v20+

# 3. Install dependencies
npm install
```

### Run Tests

```bash
# Run pgvector integration tests
npm run test:pgvector

# Expected output:
# 🐳 Starting PostgreSQL + pgvector container...
# ✅ Container started: localhost:xxxxx
# ✅ pgvector extension verified: vX.X.X
# ✅ Created 1 test table(s): test_embeddings
# ✓ tests/integration/setup/pgvector.test.ts (XX tests)
```

## Test Structure

### Test Categories

```
pgvector Integration Tests
├── Extension Verification (2 tests)
│   ├── pgvector extension installed
│   └── VECTOR data type support
├── Table and Index Verification (3 tests)
│   ├── test_embeddings table created
│   ├── HNSW index created
│   └── Sample data inserted
├── Vector Operations (3 tests)
│   ├── Insert new embedding
│   ├── Calculate vector dimensions
│   └── Cosine distance calculation
├── Helper Functions (3 tests)
│   ├── cosine_similarity function exists
│   ├── cosine_similarity calculation
│   └── find_similar_embeddings function
├── Similarity Search (3 tests)
│   ├── HNSW index search
│   ├── Helper function search
│   └── JSONB metadata filtering
├── Performance and Index Usage (2 tests)
│   ├── Query plan verification
│   └── Bulk similarity searches
└── Data Type Constraints (2 tests)
    ├── Vector dimension constraints
    └── NOT NULL enforcement

Total: 18 tests
```

## Common Test Scenarios

### 1. Verify pgvector Installation

```typescript
// Test: Extension is installed and working
const result = await client.query(`
  SELECT extname, extversion
  FROM pg_extension
  WHERE extname = 'vector'
`);

expect(result.rows[0].extname).toBe('vector');
```

### 2. Test Vector Similarity Search

```typescript
// Test: Find similar embeddings using cosine distance
const result = await client.query(`
  SELECT id, text, (embedding <=> $1) AS distance
  FROM test_embeddings
  ORDER BY embedding <=> $1
  LIMIT 3
`, [referenceEmbedding]);

// Results are ordered by similarity (lowest distance first)
```

### 3. Test HNSW Index Usage

```typescript
// Test: Verify query plan uses HNSW index
const plan = await client.query(`
  EXPLAIN (FORMAT JSON)
  SELECT id FROM test_embeddings
  ORDER BY embedding <=> $1
  LIMIT 3
`, [referenceEmbedding]);
```

### 4. Test Helper Functions

```typescript
// Test: Use custom similarity function
const result = await client.query(`
  SELECT
    text,
    cosine_similarity(embedding, $1) AS similarity
  FROM test_embeddings
  ORDER BY similarity DESC
  LIMIT 5
`, [queryEmbedding]);
```

## Debugging Tests

### Enable Verbose Output

```bash
npm run test:pgvector -- --reporter=verbose
```

### View Container Logs

```bash
# List running containers
docker ps

# View logs for testcontainers
docker logs <container_id>
```

### Inspect Test Database

```bash
# Get connection URI from test output
# Connect using psql
psql "postgresql://test_user:test_password@localhost:PORT/test_mued"

# Verify tables
\dt

# Verify extensions
\dx

# Verify vector dimensions
SELECT vector_dims(embedding) FROM test_embeddings LIMIT 1;
```

### Debug Individual Tests

```bash
# Run specific test file
vitest run tests/integration/setup/pgvector.test.ts

# Run specific test suite
vitest run tests/integration/setup/pgvector.test.ts -t "Extension Verification"

# Run specific test
vitest run tests/integration/setup/pgvector.test.ts -t "should have pgvector extension installed"
```

## Performance Benchmarks

### Expected Timings

```
Container startup:     30-60 seconds (first run: +image download)
Test execution:        5-10 seconds
Container teardown:    5-10 seconds
Total:                 40-80 seconds
```

### Optimization Tips

1. **Keep Docker running**: Avoid stopping/starting Docker between test runs
2. **Use test:integration:watch**: For rapid development
3. **Run focused tests**: Use `-t` flag to run specific tests

## Troubleshooting

### Issue: "Docker not running"

```bash
# Start Docker Desktop
open -a Docker  # macOS

# Verify
docker ps
```

### Issue: "Port conflict"

```bash
# Stop local PostgreSQL
brew services stop postgresql  # macOS

# Or: Testcontainers will use random port automatically
```

### Issue: "Image pull timeout"

```bash
# Pre-pull image
docker pull pgvector/pgvector:pg16

# Verify image
docker images | grep pgvector
```

### Issue: "Tests hanging"

```bash
# Kill all testcontainers
docker ps | grep testcontainers | awk '{print $1}' | xargs docker kill

# Restart tests
npm run test:pgvector
```

### Issue: "Extension not found"

```sql
-- Verify extension in container
docker exec -it <container_id> psql -U test_user -d test_mued -c "\dx"

-- Should show:
-- vector | X.X.X | public | vector data type and operations
```

## Integration with RAGService

### Test RAGService with testcontainers

```typescript
// Example: RAGService integration test
import { describe, it, expect, beforeAll } from 'vitest';
import { RAGService } from '@/lib/services/rag.service';
import { Client } from 'pg';

describe('RAGService Integration Tests', () => {
  let ragService: RAGService;
  let client: Client;

  beforeAll(async () => {
    const connectionUri = process.env.TEST_DATABASE_URL;
    client = new Client({ connectionString: connectionUri });
    await client.connect();

    ragService = new RAGService(/* dependencies */);
  });

  it('should generate and store embeddings', async () => {
    const text = 'Dメジャーのコード進行を練習しました';
    const embedding = await ragService.generateEmbedding(text);

    expect(embedding).toHaveLength(1536);
    expect(embedding[0]).toBeTypeOf('number');
  });

  it('should find similar logs', async () => {
    const query = 'ハーモニーの練習';
    const results = await ragService.findSimilarLogs(query, 5);

    expect(results.length).toBeLessThanOrEqual(5);
    expect(results[0]).toHaveProperty('text');
    expect(results[0]).toHaveProperty('similarity');
  });
});
```

## Best Practices

### 1. Test Isolation

- Each test should be independent
- Use transactions for data changes (if needed)
- Clean up test data in afterEach/afterAll

### 2. Meaningful Assertions

```typescript
// ❌ Bad: Vague assertion
expect(result.rows.length).toBeGreaterThan(0);

// ✅ Good: Specific assertion
expect(result.rows).toHaveLength(5);
expect(result.rows[0].similarity).toBeGreaterThan(0.7);
```

### 3. Error Handling

```typescript
// ✅ Good: Test error conditions
await expect(async () => {
  await client.query('INSERT INTO test_embeddings...');
}).rejects.toThrow('dimension mismatch');
```

### 4. Test Data

- Use realistic test data (not just random values)
- Create fixtures for common test scenarios
- Document test data assumptions

## CI/CD Integration

### GitHub Actions Example

```yaml
name: pgvector Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      docker:
        image: docker:24-dind
        options: --privileged

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run pgvector tests
        run: npm run test:pgvector
```

## Next Steps

After verifying pgvector setup:

1. ✅ Create RAGService implementation
2. ✅ Write RAGService integration tests
3. ✅ Implement InterviewerService
4. ✅ Create Interview API endpoints
5. ✅ Write E2E tests for complete flow

## References

- [Test Setup README](/tests/setup/README.md)
- [Phase 1.3 Implementation Plan](/docs/implementation/PHASE1.3_IMPLEMENTATION_PLAN.md)
- [Testcontainers Node](https://node.testcontainers.org/)
- [pgvector GitHub](https://github.com/pgvector/pgvector)

---

**Last Updated**: 2025-11-20
**Version**: 1.0.0
**Status**: Production Ready
