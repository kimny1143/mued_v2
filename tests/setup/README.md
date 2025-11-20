# Testcontainers Setup for pgvector

This directory contains the testcontainers configuration for PostgreSQL + pgvector integration testing.

## Overview

The testcontainers setup provides an isolated PostgreSQL database with pgvector extension for testing RAGService and embedding operations without affecting the production database.

## Architecture

```
tests/setup/
├── testcontainers.setup.ts  # Global setup for Vitest
├── init-pgvector.sql         # Database initialization script
├── vitest.setup.ts           # Test environment setup
└── README.md                 # This file
```

## How It Works

### 1. Global Setup (testcontainers.setup.ts)

- Runs **before all tests** via Vitest's `globalSetup`
- Starts PostgreSQL 16 Docker container with pgvector extension
- Initializes database schema using `init-pgvector.sql`
- Sets `TEST_DATABASE_URL` environment variable
- Returns teardown function to stop container after tests

### 2. Database Initialization (init-pgvector.sql)

Creates test infrastructure:

- **pgvector extension**: Enables vector similarity search
- **test_embeddings table**: Sample table with 1536-dimension vectors
- **HNSW index**: High-performance similarity search index
- **Helper functions**:
  - `cosine_similarity(a, b)`: Calculate similarity between vectors
  - `find_similar_embeddings(query, threshold, limit)`: Find similar embeddings
  - `generate_random_embedding(dimensions)`: Generate test vectors
- **Sample data**: 5 test records with random embeddings

### 3. Integration Tests (pgvector.test.ts)

Comprehensive test suite covering:

- Extension verification
- VECTOR data type support
- HNSW index creation and usage
- Vector similarity search
- Helper function operations
- Performance and query plans
- Data constraints

## Prerequisites

### Required Software

1. **Docker Desktop** (or Docker Engine)
   - Must be running before tests
   - Download: https://www.docker.com/products/docker-desktop

2. **Node.js** (v20+)
   - Required for running tests

### Required Dependencies

```bash
npm install --save-dev @testcontainers/postgresql
```

## Usage

### Run pgvector Integration Tests

```bash
# Run all pgvector tests
npm run test:pgvector

# Run with verbose output
npm run test:pgvector -- --reporter=verbose

# Run in watch mode (for development)
vitest watch tests/integration/setup/pgvector.test.ts
```

### Run All Integration Tests (includes pgvector)

```bash
npm run test:integration
```

### Environment Variables

The testcontainers setup automatically sets:

```bash
TEST_DATABASE_URL=postgresql://test_user:test_password@localhost:PORT/test_mued
```

This is available to all tests during the test run.

## Test Database Schema

### test_embeddings Table

```sql
CREATE TABLE test_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

### Indexes

- **HNSW index**: `idx_test_embeddings_vector` (for similarity search)
  - Algorithm: HNSW (Hierarchical Navigable Small World)
  - Distance metric: Cosine distance (`vector_cosine_ops`)
  - Parameters: `m=16, ef_construction=64`

### Helper Functions

#### cosine_similarity(a VECTOR, b VECTOR) → FLOAT

Calculates cosine similarity between two vectors (returns 0-1).

```sql
SELECT cosine_similarity(vec1, vec2) FROM test_embeddings;
```

#### find_similar_embeddings(query VECTOR, threshold FLOAT, limit INT)

Finds similar embeddings above a threshold.

```sql
SELECT * FROM find_similar_embeddings(
  query_embedding,
  0.7,  -- similarity threshold
  5     -- max results
);
```

## Troubleshooting

### Error: "Docker not running"

**Symptom:**
```
Error: Could not find a valid Docker environment
```

**Solution:**
1. Start Docker Desktop
2. Verify Docker is running: `docker ps`
3. Retry tests

### Error: "Port already in use"

**Symptom:**
```
Error: Port 5432 is already allocated
```

**Solution:**
1. Stop local PostgreSQL: `brew services stop postgresql` (macOS)
2. Or let testcontainers use a random port (automatic)

### Error: "pgvector extension not found"

**Symptom:**
```
Error: pgvector extension failed to install
```

**Solution:**
1. Ensure using `pgvector/pgvector:pg16` image
2. Check Docker can pull the image: `docker pull pgvector/pgvector:pg16`
3. Check init-pgvector.sql for syntax errors

### Slow Container Startup

**Cause:** First run downloads Docker image (~500MB)

**Solution:**
- Wait for image download (one-time)
- Subsequent runs will be faster (30-60 seconds)

### Tests Failing After Schema Changes

**Solution:**
1. Update `init-pgvector.sql` with new schema
2. Restart tests (container is recreated each run)

## Performance Considerations

### Container Lifecycle

- **Startup time**: ~30-60 seconds (after image download)
- **Teardown time**: ~5-10 seconds
- **Total overhead**: ~40-70 seconds per test run

### Optimization Tips

1. **Use globalSetup**: Share one container across all tests (current implementation)
2. **Run tests in parallel**: Vitest runs tests in parallel by default
3. **Keep tests focused**: Only test pgvector functionality, not full application logic
4. **Use transactions**: Rollback changes between tests (if needed)

## Integration with Phase 1.3

This testcontainers setup is designed for:

1. **RAGService testing**: Test embedding generation and similarity search
2. **InterviewerService testing**: Test question generation with RAG context
3. **Database migration testing**: Verify Phase 1.3 migrations work correctly

### Next Steps for Phase 1.3

After verifying pgvector setup:

1. Create RAGService implementation (`lib/services/rag.service.ts`)
2. Create RAGService integration tests using this testcontainers setup
3. Implement InterviewerService with RAG integration
4. Create end-to-end tests for Interview API

## References

- [Testcontainers Documentation](https://node.testcontainers.org/)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [PostgreSQL HNSW Index](https://github.com/pgvector/pgvector#hnsw)
- [Vitest Global Setup](https://vitest.dev/config/#globalsetup)

## Maintenance

### Updating pgvector Version

Edit `testcontainers.setup.ts`:

```typescript
new PostgreSqlContainer('pgvector/pgvector:pg17') // Update version
```

### Adding New Test Tables

Edit `init-pgvector.sql`:

```sql
CREATE TABLE new_test_table (
  id UUID PRIMARY KEY,
  embedding VECTOR(1536)
);
```

### Modifying Helper Functions

Edit `init-pgvector.sql` and update function definitions.

---

**Last Updated**: 2025-11-20
**Phase**: 1.3 (Day 11-12)
**Status**: Production Ready
