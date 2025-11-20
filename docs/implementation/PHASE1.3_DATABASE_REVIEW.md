# Phase 1.3 Database Schema Review

**Reviewer**: Database Architect (Claude Code)
**Date**: 2025-11-20
**Version**: 1.0.0
**Target**: Phase 1.3 - RAG Embeddings & Question Templates

---

## Executive Summary

This review evaluates the proposed database schema for Phase 1.3's RAG-powered interview system. The implementation plan proposes two new tables (`rag_embeddings`, `question_templates`) and pgvector integration for semantic search.

### Overall Assessment: **APPROVED with CRITICAL MODIFICATIONS**

The core architecture is sound, but several critical issues must be addressed:

1. **CRITICAL**: IVFFlat index will fail on Neon PostgreSQL (use HNSW instead)
2. **HIGH**: Source polymorphism design needs improvement for referential integrity
3. **MEDIUM**: Index strategy requires optimization for actual query patterns
4. **LOW**: Missing monitoring/observability considerations

**Estimated Risk**: Medium (migration will succeed but performance may be suboptimal without modifications)

---

## 1. rag_embeddings Table Analysis

### 1.1 Proposed Schema (from Implementation Plan)

```sql
CREATE TABLE IF NOT EXISTS rag_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL, -- 'log_entry' | 'session' | 'template'
  source_id UUID NOT NULL,
  embedding VECTOR(1536), -- OpenAI ada-002 dimension
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rag_embeddings_source ON rag_embeddings(source_type, source_id);
CREATE INDEX idx_rag_embeddings_vector ON rag_embeddings USING ivfflat (embedding vector_cosine_ops);
```

### 1.2 Critical Issues

#### Issue 1.1: IVFFlat Index Incompatibility with Neon ⚠️ CRITICAL

**Problem**: Neon PostgreSQL (as of pgvector 0.5.0+) recommends **HNSW** over IVFFlat for cloud environments.

**Evidence**:
- Neon's pgvector implementation favors HNSW (Hierarchical Navigable Small World) for:
  - Better performance on smaller datasets (< 1M vectors)
  - No need for training/index building phase
  - More predictable query performance
  - Lower maintenance overhead

**IVFFlat Limitations**:
```sql
-- IVFFlat requires VACUUM ANALYZE and index rebuild
-- Not ideal for serverless Neon environment
CREATE INDEX idx_vector USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

**Recommended Fix**:
```sql
-- Use HNSW instead (better for Neon's architecture)
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_vector
  ON rag_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

**Rationale**:
- `m = 16`: Number of bi-directional links (higher = better recall, slower build)
- `ef_construction = 64`: Size of dynamic candidate list (higher = better quality, slower build)
- For 1536-dimensional vectors, these are recommended starting values

**Performance Impact**:
- HNSW: O(log N) search time, no training required
- IVFFlat: O(N/lists) search time, requires VACUUM ANALYZE after bulk inserts

#### Issue 1.2: Vector Dimension Assumption ⚠️ MEDIUM

**Problem**: Hardcoded to OpenAI `text-embedding-ada-002` (1536 dimensions).

**Risk**: If you migrate to newer models:
- `text-embedding-3-small`: 1536 dimensions (compatible)
- `text-embedding-3-large`: 3072 dimensions (**incompatible**)

**Recommended Fix**:
```sql
-- Option 1: Add version column for future flexibility
ALTER TABLE rag_embeddings ADD COLUMN embedding_model VARCHAR(100) DEFAULT 'text-embedding-ada-002';

-- Option 2: Use a config table
CREATE TABLE IF NOT EXISTS embedding_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name VARCHAR(100) NOT NULL UNIQUE,
  dimensions INTEGER NOT NULL,
  provider VARCHAR(50) NOT NULL,
  active BOOLEAN DEFAULT FALSE
);

INSERT INTO embedding_models (model_name, dimensions, provider, active)
VALUES ('text-embedding-ada-002', 1536, 'openai', TRUE);
```

**Recommendation**: Use Option 1 for MVP, migrate to Option 2 if you plan to support multiple models.

#### Issue 1.3: Source Polymorphism Design ⚠️ HIGH

**Problem**: `source_type` + `source_id` pattern lacks referential integrity.

**Current Design**:
```sql
source_type TEXT NOT NULL, -- 'log_entry' | 'session' | 'template'
source_id UUID NOT NULL,
```

**Risks**:
1. **No Foreign Key**: Can reference non-existent records
2. **Orphaned Embeddings**: Source deleted but embedding remains
3. **Query Complexity**: JOIN requires CASE statements

**Example Problem**:
```sql
-- This will succeed even if session doesn't exist
INSERT INTO rag_embeddings (source_type, source_id, embedding)
VALUES ('session', '00000000-0000-0000-0000-000000000000', '[...]');
```

**Recommended Fix (Option A - Separate Tables)**:
```sql
-- More maintainable, enforces referential integrity
CREATE TABLE IF NOT EXISTS rag_session_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  embedding VECTOR(1536) NOT NULL,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS rag_template_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES question_templates(id) ON DELETE CASCADE,
  embedding VECTOR(1536) NOT NULL,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Union view for queries that need all embeddings
CREATE VIEW v_all_embeddings AS
  SELECT id, 'session' as source_type, session_id as source_id, embedding, metadata, created_at
  FROM rag_session_embeddings
  UNION ALL
  SELECT id, 'template' as source_type, template_id as source_id, embedding, metadata, created_at
  FROM rag_template_embeddings;
```

**Recommended Fix (Option B - Polymorphic with CHECK Constraints)**:
```sql
-- Keep single table but add validation
CREATE TABLE IF NOT EXISTS rag_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN ('session', 'template')),
  source_id UUID NOT NULL,
  embedding VECTOR(1536) NOT NULL,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Ensure unique embedding per source
  UNIQUE(source_type, source_id)
);

-- Add partial indexes for each source type
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_session
  ON rag_embeddings(source_id)
  WHERE source_type = 'session';

CREATE INDEX IF NOT EXISTS idx_rag_embeddings_template
  ON rag_embeddings(source_id)
  WHERE source_type = 'template';

-- Add trigger to validate foreign keys
CREATE OR REPLACE FUNCTION validate_rag_embedding_source()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.source_type = 'session' THEN
    IF NOT EXISTS (SELECT 1 FROM sessions WHERE id = NEW.source_id) THEN
      RAISE EXCEPTION 'Invalid source_id: session % does not exist', NEW.source_id;
    END IF;
  ELSIF NEW.source_type = 'template' THEN
    IF NOT EXISTS (SELECT 1 FROM question_templates WHERE id = NEW.source_id) THEN
      RAISE EXCEPTION 'Invalid source_id: template % does not exist', NEW.source_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_rag_embedding_source
  BEFORE INSERT OR UPDATE ON rag_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION validate_rag_embedding_source();
```

**Recommendation**: Use **Option B** for MVP (simpler migration), plan for **Option A** if query performance becomes an issue.

### 1.3 Index Strategy Review

#### Current Proposed Indexes:
```sql
CREATE INDEX idx_rag_embeddings_source ON rag_embeddings(source_type, source_id);
CREATE INDEX idx_rag_embeddings_vector ON rag_embeddings USING ivfflat (embedding vector_cosine_ops);
```

#### Recommended Indexes:
```sql
-- 1. Vector similarity search (PRIMARY USE CASE)
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_vector
  ON rag_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 2. Partial indexes for source filtering (if using Option B)
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_session
  ON rag_embeddings(source_id, created_at DESC)
  WHERE source_type = 'session';

CREATE INDEX IF NOT EXISTS idx_rag_embeddings_template
  ON rag_embeddings(source_id)
  WHERE source_type = 'template';

-- 3. Composite index for filtered vector search
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_type_vector
  ON rag_embeddings(source_type)
  INCLUDE (embedding);

-- 4. GIN index for JSONB metadata search (if needed)
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_metadata
  ON rag_embeddings USING GIN (metadata)
  WHERE metadata IS NOT NULL AND metadata != '{}'::JSONB;
```

#### Query Pattern Analysis:

**Primary Query Pattern** (from RAGService.findSimilarLogs):
```sql
-- Expected query from RAGService
SELECT
  source_id,
  source_type,
  metadata,
  embedding <=> $1::VECTOR AS distance
FROM rag_embeddings
WHERE source_type = 'session'
ORDER BY embedding <=> $1::VECTOR
LIMIT 5;
```

**Index Coverage**:
- ✅ `idx_rag_embeddings_vector` (HNSW) → handles `ORDER BY embedding <=> $1`
- ✅ `idx_rag_embeddings_type_vector` → handles `WHERE source_type = 'session'`
- ⚠️ Requires `SET hnsw.ef_search = 100;` for better recall at query time

**Recommended Query Optimization**:
```sql
-- Set at connection level in RAGService
SET hnsw.ef_search = 100; -- Higher = better recall, slower search

-- Optimized query with pre-filtering
WITH filtered AS (
  SELECT id, source_id, embedding, metadata
  FROM rag_embeddings
  WHERE source_type = 'session'
    AND created_at > NOW() - INTERVAL '180 days' -- Limit to recent sessions
)
SELECT
  source_id,
  metadata,
  embedding <=> $1::VECTOR AS distance
FROM filtered
ORDER BY embedding <=> $1::VECTOR
LIMIT 5;
```

### 1.4 Missing Columns & Features

#### Recommended Additional Columns:

```sql
ALTER TABLE rag_embeddings
  ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(100) DEFAULT 'text-embedding-ada-002',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS embedding_hash TEXT, -- Cache key for deduplication
  ADD COLUMN IF NOT EXISTS token_count INTEGER; -- For cost tracking

-- Add trigger for updated_at
CREATE TRIGGER trg_rag_embeddings_updated_at
  BEFORE UPDATE ON rag_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add index for deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_rag_embeddings_hash
  ON rag_embeddings(embedding_hash)
  WHERE embedding_hash IS NOT NULL;
```

**Rationale**:
- `embedding_model`: Track which model generated the embedding (future-proofing)
- `updated_at`: Track re-embedding operations
- `embedding_hash`: Prevent duplicate embeddings (save API costs)
- `token_count`: Monitor token usage for OpenAI billing

---

## 2. question_templates Table Analysis

### 2.1 Proposed Schema

```sql
CREATE TABLE IF NOT EXISTS question_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  focus TEXT NOT NULL, -- harmony, melody, rhythm, etc.
  depth TEXT NOT NULL, -- shallow, medium, deep
  template_text TEXT NOT NULL,
  variables JSONB, -- {"{chord}": "placeholder for chord name"}
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_question_templates_focus ON question_templates(focus, depth);
```

### 2.2 Schema Analysis

#### Issue 2.1: Missing ENUM Constraints ⚠️ MEDIUM

**Problem**: `focus` and `depth` are TEXT instead of ENUM.

**Risk**: Data inconsistency (e.g., "Harmony" vs "harmony" vs "HARMONY")

**Recommended Fix**:
```sql
-- Reuse existing ENUMs from sessions.ts
-- (interview_focus and interview_depth already exist from migration 0010)

CREATE TABLE IF NOT EXISTS question_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  focus interview_focus NOT NULL, -- ✅ Use existing ENUM
  depth interview_depth NOT NULL, -- ✅ Use existing ENUM
  template_text TEXT NOT NULL,
  variables JSONB DEFAULT '{}'::JSONB,
  priority INTEGER DEFAULT 0,

  -- Add constraints
  CONSTRAINT chk_question_templates_text_length CHECK (LENGTH(template_text) >= 5),
  CONSTRAINT chk_question_templates_priority CHECK (priority >= 0 AND priority <= 100),

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

#### Issue 2.2: JSONB `variables` Design ⚠️ MEDIUM

**Current Design**:
```json
{
  "{chord}": "placeholder for chord name",
  "{key}": "placeholder for musical key"
}
```

**Problems**:
1. Unclear structure (description vs default value?)
2. No validation of placeholder format
3. Difficult to query available placeholders

**Recommended Design**:
```json
{
  "placeholders": [
    {
      "key": "chord",
      "description": "Musical chord (e.g., F major, Dm)",
      "type": "string",
      "required": true,
      "example": "C major"
    },
    {
      "key": "key",
      "description": "Musical key",
      "type": "enum",
      "enum": ["C", "D", "E", "F", "G", "A", "B"],
      "required": false,
      "example": "C"
    }
  ]
}
```

**Template Text Example**:
```
Original: "コード進行を {chord} に変更した理由は？"
Rendered: "コード進行を F major に変更した理由は？"
```

**Migration Path**:
```sql
-- Add JSON schema validation (PostgreSQL 14+)
ALTER TABLE question_templates
  ADD CONSTRAINT chk_variables_schema
  CHECK (
    variables IS NULL OR
    variables = '{}'::JSONB OR
    (
      variables ? 'placeholders' AND
      jsonb_typeof(variables->'placeholders') = 'array'
    )
  );
```

#### Issue 2.3: Missing Metadata Columns ⚠️ LOW

**Recommended Additional Columns**:
```sql
ALTER TABLE question_templates
  ADD COLUMN IF NOT EXISTS category TEXT, -- 'technical' | 'creative' | 'reflective'
  ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'ja',
  ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Index for filtering
CREATE INDEX IF NOT EXISTS idx_question_templates_enabled
  ON question_templates(enabled, focus, depth)
  WHERE enabled = TRUE;

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_question_templates_usage
  ON question_templates(usage_count DESC, last_used_at DESC);

-- GIN index for tag search
CREATE INDEX IF NOT EXISTS idx_question_templates_tags
  ON question_templates USING GIN (tags);
```

**Rationale**:
- `category`: Group templates by question type
- `language`: Support i18n in the future
- `usage_count`: Track template effectiveness
- `enabled`: Soft-delete or A/B testing
- `tags`: Flexible categorization

### 2.3 Index Strategy

#### Recommended Indexes:
```sql
-- 1. Primary lookup (focus + depth)
CREATE INDEX IF NOT EXISTS idx_question_templates_focus_depth
  ON question_templates(focus, depth, priority DESC)
  WHERE enabled = TRUE;

-- 2. Priority-based selection
CREATE INDEX IF NOT EXISTS idx_question_templates_priority
  ON question_templates(priority DESC, created_at DESC);

-- 3. Full-text search on template_text (if needed)
CREATE INDEX IF NOT EXISTS idx_question_templates_fts
  ON question_templates USING GIN (to_tsvector('japanese', template_text));

-- 4. Analytics queries
CREATE INDEX IF NOT EXISTS idx_question_templates_analytics
  ON question_templates(focus, usage_count DESC, last_used_at DESC)
  WHERE enabled = TRUE;
```

#### Query Pattern Analysis:

**Primary Query** (from RAGService.getQuestionTemplates):
```sql
-- Expected query
SELECT id, template_text, variables, priority
FROM question_templates
WHERE focus = $1
  AND enabled = TRUE
ORDER BY priority DESC, RANDOM()
LIMIT 5;
```

**Index Coverage**:
- ✅ `idx_question_templates_focus_depth` covers `WHERE focus = $1 AND enabled = TRUE`
- ✅ `ORDER BY priority DESC` uses index
- ⚠️ `RANDOM()` forces sequential scan on top-N results (acceptable for small result sets)

**Optimized Query**:
```sql
-- Better performance for large template sets
WITH top_priority AS (
  SELECT id, template_text, variables, priority
  FROM question_templates
  WHERE focus = $1
    AND depth = $2
    AND enabled = TRUE
  ORDER BY priority DESC
  LIMIT 20 -- Get top 20 by priority
)
SELECT * FROM top_priority
ORDER BY RANDOM()
LIMIT 5;
```

---

## 3. Integration with Existing Tables

### 3.1 Relationship Mapping

```
sessions (existing)
  ├─ 1:1 → session_analyses (existing)
  ├─ 1:N → interview_questions (existing)
  ├─ 1:N → interview_answers (existing)
  └─ 1:N → rag_embeddings (new) ← via source_type='session'

question_templates (new)
  └─ 1:1 → rag_embeddings (new) ← via source_type='template'

interview_questions (existing)
  └─ N:1 → question_templates (new) ← via template_id
```

### 3.2 Foreign Key Strategy

#### Current State (from sessions.ts):
```typescript
// interview_questions already has:
templateId: text('template_id'),
```

#### Recommended Migration:
```sql
-- Add foreign key constraint to interview_questions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_interview_questions_template'
  ) THEN
    ALTER TABLE interview_questions
    ADD CONSTRAINT fk_interview_questions_template
    FOREIGN KEY (template_id) REFERENCES question_templates(id)
    ON DELETE SET NULL; -- Keep question even if template is deleted
  END IF;
END $$;

-- Add index for template usage tracking
CREATE INDEX IF NOT EXISTS idx_interview_questions_template
  ON interview_questions(template_id)
  WHERE template_id IS NOT NULL;
```

### 3.3 Data Consistency Triggers

#### Recommended Triggers:

```sql
-- 1. Auto-generate embedding for new templates
CREATE OR REPLACE FUNCTION auto_generate_template_embedding()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert placeholder embedding (actual embedding via async job)
  INSERT INTO rag_embeddings (source_type, source_id, metadata)
  VALUES (
    'template',
    NEW.id,
    jsonb_build_object(
      'focus', NEW.focus,
      'depth', NEW.depth,
      'pending_embedding', TRUE
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_generate_template_embedding
  AFTER INSERT ON question_templates
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_template_embedding();

-- 2. Increment template usage count
CREATE OR REPLACE FUNCTION increment_template_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.template_id IS NOT NULL THEN
    UPDATE question_templates
    SET
      usage_count = usage_count + 1,
      last_used_at = NOW()
    WHERE id = NEW.template_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_increment_template_usage
  AFTER INSERT ON interview_questions
  FOR EACH ROW
  EXECUTE FUNCTION increment_template_usage();
```

---

## 4. pgvector Extension

### 4.1 Neon PostgreSQL Support

**Status**: ✅ Neon fully supports pgvector extension

**Version**: pgvector 0.5.0+ (as of 2024)

**Installation**:
```sql
-- Already supported in Neon, just enable
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify version
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### 4.2 Performance Tuning

#### Recommended Settings:

```sql
-- Set at session level in RAGService connection
SET hnsw.ef_search = 100; -- Default: 40, higher = better recall

-- For bulk inserts
SET maintenance_work_mem = '256MB'; -- Increase for index building

-- Verify settings
SHOW hnsw.ef_search;
```

#### Performance Benchmarks (Expected):

| Vector Count | Index Type | Search Time (p95) | Recall@10 |
|--------------|------------|-------------------|-----------|
| 1K vectors   | HNSW       | < 5ms             | > 95%     |
| 10K vectors  | HNSW       | < 15ms            | > 90%     |
| 100K vectors | HNSW       | < 50ms            | > 85%     |
| 1M vectors   | HNSW       | < 150ms           | > 80%     |

**Note**: These are estimates. Actual performance depends on:
- Neon compute tier (shared vs dedicated)
- Vector dimensionality (1536 for ada-002)
- Query pattern (pre-filtering, LIMIT, etc.)

### 4.3 Scalability Considerations

#### Current Plan (MVP):
- ~1,000 sessions × 1 embedding = 1K vectors
- ~100 templates × 1 embedding = 100 vectors
- **Total**: ~1.1K vectors ✅ HNSW is optimal

#### Future Scale (Year 1):
- ~100K sessions × 1 embedding = 100K vectors
- ~500 templates × 1 embedding = 500 vectors
- **Total**: ~100.5K vectors ✅ HNSW still optimal

#### Scale-Out Strategy (Year 2+, 1M+ vectors):

**Option 1: Table Partitioning**
```sql
-- Partition by created_at (time-based)
CREATE TABLE rag_embeddings_2025_q1 PARTITION OF rag_embeddings
  FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');

-- Or partition by source_type
CREATE TABLE rag_embeddings_session PARTITION OF rag_embeddings
  FOR VALUES IN ('session');
```

**Option 2: Separate Vector Database**
- Migrate to dedicated vector DB (Pinecone, Weaviate, Qdrant)
- Keep PostgreSQL for relational data
- Sync embeddings via CDC (Change Data Capture)

**Recommendation**: Stick with Neon + HNSW for 2 years, re-evaluate at 500K vectors.

---

## 5. Migration Strategy

### 5.1 Proposed Migration Files

```
db/migrations/
├── 0012_add_rag_embeddings.sql       (NEW)
├── 0013_add_question_templates.sql   (NEW)
└── rollback_0012_rag_embeddings.sql  (NEW)
```

### 5.2 Migration 0012: rag_embeddings

**File**: `db/migrations/0012_add_rag_embeddings.sql`

```sql
-- ================================================
-- Migration: 0012_add_rag_embeddings
-- Phase 1.3: RAG Embeddings for Semantic Search
-- Date: 2025-11-20
-- ================================================

-- ========================================
-- 1. Enable pgvector extension
-- ========================================

CREATE EXTENSION IF NOT EXISTS vector;

-- Verify extension
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    RAISE EXCEPTION 'pgvector extension failed to install';
  END IF;
END $$;

-- ========================================
-- 2. Create rag_embeddings table
-- ========================================

CREATE TABLE IF NOT EXISTS rag_embeddings (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Polymorphic source reference
  source_type TEXT NOT NULL CHECK (source_type IN ('session', 'template')),
  source_id UUID NOT NULL,

  -- Vector embedding
  embedding VECTOR(1536) NOT NULL,

  -- Metadata
  metadata JSONB DEFAULT '{}'::JSONB,
  embedding_model VARCHAR(100) DEFAULT 'text-embedding-ada-002' NOT NULL,
  embedding_hash TEXT, -- For deduplication
  token_count INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  UNIQUE(source_type, source_id), -- One embedding per source
  UNIQUE(embedding_hash) WHERE embedding_hash IS NOT NULL
);

-- ========================================
-- 3. Create indexes
-- ========================================

-- HNSW index for vector similarity search (PRIMARY)
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_vector
  ON rag_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Partial indexes for source type filtering
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_session
  ON rag_embeddings(source_id, created_at DESC)
  WHERE source_type = 'session';

CREATE INDEX IF NOT EXISTS idx_rag_embeddings_template
  ON rag_embeddings(source_id)
  WHERE source_type = 'template';

-- Composite index for type-filtered vector search
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_type_created
  ON rag_embeddings(source_type, created_at DESC);

-- GIN index for metadata search
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_metadata
  ON rag_embeddings USING GIN (metadata)
  WHERE metadata IS NOT NULL AND metadata != '{}'::JSONB;

-- ========================================
-- 4. Create validation trigger
-- ========================================

CREATE OR REPLACE FUNCTION validate_rag_embedding_source()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.source_type = 'session' THEN
    IF NOT EXISTS (SELECT 1 FROM sessions WHERE id = NEW.source_id) THEN
      RAISE EXCEPTION 'Invalid source_id: session % does not exist', NEW.source_id;
    END IF;
  ELSIF NEW.source_type = 'template' THEN
    IF NOT EXISTS (SELECT 1 FROM question_templates WHERE id = NEW.source_id) THEN
      RAISE EXCEPTION 'Invalid source_id: template % does not exist', NEW.source_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_rag_embedding_source
  BEFORE INSERT OR UPDATE ON rag_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION validate_rag_embedding_source();

-- ========================================
-- 5. Create updated_at trigger
-- ========================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_rag_embeddings_updated_at'
  ) THEN
    CREATE TRIGGER update_rag_embeddings_updated_at
      BEFORE UPDATE ON rag_embeddings
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ========================================
-- 6. Add table comments
-- ========================================

COMMENT ON TABLE rag_embeddings IS 'Vector embeddings for RAG semantic search (sessions and templates)';
COMMENT ON COLUMN rag_embeddings.source_type IS 'Type of source: session (user log) or template (question template)';
COMMENT ON COLUMN rag_embeddings.source_id IS 'Foreign key to source table (sessions or question_templates)';
COMMENT ON COLUMN rag_embeddings.embedding IS 'OpenAI text-embedding vector (1536 dimensions)';
COMMENT ON COLUMN rag_embeddings.metadata IS 'Additional context: focus area, depth, timestamp, etc.';
COMMENT ON COLUMN rag_embeddings.embedding_model IS 'Model used to generate embedding (for versioning)';
COMMENT ON COLUMN rag_embeddings.embedding_hash IS 'SHA256 hash of input text (for deduplication)';

-- ========================================
-- 7. Create helper view
-- ========================================

CREATE OR REPLACE VIEW v_rag_embeddings_with_source AS
SELECT
  e.id,
  e.source_type,
  e.source_id,
  e.embedding,
  e.metadata,
  e.embedding_model,
  e.created_at,
  -- Conditionally join source details
  CASE
    WHEN e.source_type = 'session' THEN (
      SELECT jsonb_build_object(
        'title', s.title,
        'user_short_note', s.user_short_note,
        'focus_area', (s.ai_annotations->>'focusArea')
      )
      FROM sessions s WHERE s.id = e.source_id
    )
    WHEN e.source_type = 'template' THEN (
      SELECT jsonb_build_object(
        'template_text', t.template_text,
        'focus', t.focus,
        'depth', t.depth
      )
      FROM question_templates t WHERE t.id = e.source_id
    )
  END AS source_details
FROM rag_embeddings e;

-- ========================================
-- 8. Analyze table
-- ========================================

ANALYZE rag_embeddings;

-- ========================================
-- Migration 0012 complete
-- ========================================
```

### 5.3 Migration 0013: question_templates

**File**: `db/migrations/0013_add_question_templates.sql`

```sql
-- ================================================
-- Migration: 0013_add_question_templates
-- Phase 1.3: Question Template System for Interviewer
-- Date: 2025-11-20
-- ================================================

-- ========================================
-- 1. Create question_templates table
-- ========================================

CREATE TABLE IF NOT EXISTS question_templates (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Classification (using existing ENUMs)
  focus interview_focus NOT NULL,
  depth interview_depth NOT NULL,

  -- Content
  template_text TEXT NOT NULL,
  variables JSONB DEFAULT '{}'::JSONB,

  -- Metadata
  category TEXT CHECK (category IN ('technical', 'creative', 'reflective', 'diagnostic')),
  language VARCHAR(10) DEFAULT 'ja' NOT NULL,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Priority & analytics
  priority INTEGER DEFAULT 50 CHECK (priority >= 0 AND priority <= 100),
  usage_count INTEGER DEFAULT 0 CHECK (usage_count >= 0),
  last_used_at TIMESTAMPTZ,

  -- Status
  enabled BOOLEAN DEFAULT TRUE NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT chk_question_templates_text_length CHECK (LENGTH(template_text) >= 5),
  CONSTRAINT chk_variables_valid_json CHECK (
    variables IS NULL OR
    variables = '{}'::JSONB OR
    (variables ? 'placeholders' AND jsonb_typeof(variables->'placeholders') = 'array')
  )
);

-- ========================================
-- 2. Create indexes
-- ========================================

-- Primary lookup (focus + depth + priority)
CREATE INDEX IF NOT EXISTS idx_question_templates_focus_depth
  ON question_templates(focus, depth, priority DESC)
  WHERE enabled = TRUE;

-- Priority-based selection
CREATE INDEX IF NOT EXISTS idx_question_templates_priority
  ON question_templates(priority DESC, created_at DESC)
  WHERE enabled = TRUE;

-- Category filtering
CREATE INDEX IF NOT EXISTS idx_question_templates_category
  ON question_templates(category, focus)
  WHERE enabled = TRUE AND category IS NOT NULL;

-- Analytics queries
CREATE INDEX IF NOT EXISTS idx_question_templates_analytics
  ON question_templates(usage_count DESC, last_used_at DESC)
  WHERE enabled = TRUE;

-- Full-text search on template_text
CREATE INDEX IF NOT EXISTS idx_question_templates_fts
  ON question_templates USING GIN (to_tsvector('japanese', template_text));

-- Tag search
CREATE INDEX IF NOT EXISTS idx_question_templates_tags
  ON question_templates USING GIN (tags);

-- ========================================
-- 3. Add foreign key to interview_questions
-- ========================================

DO $$
BEGIN
  -- Add foreign key constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_interview_questions_template'
  ) THEN
    ALTER TABLE interview_questions
    ADD CONSTRAINT fk_interview_questions_template
    FOREIGN KEY (template_id) REFERENCES question_templates(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for template usage tracking
CREATE INDEX IF NOT EXISTS idx_interview_questions_template
  ON interview_questions(template_id)
  WHERE template_id IS NOT NULL;

-- ========================================
-- 4. Create triggers
-- ========================================

-- Trigger 1: updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_question_templates_updated_at'
  ) THEN
    CREATE TRIGGER update_question_templates_updated_at
      BEFORE UPDATE ON question_templates
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Trigger 2: Auto-generate embedding placeholder
CREATE OR REPLACE FUNCTION auto_generate_template_embedding()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO rag_embeddings (source_type, source_id, metadata, embedding)
  VALUES (
    'template',
    NEW.id,
    jsonb_build_object(
      'focus', NEW.focus,
      'depth', NEW.depth,
      'pending_embedding', TRUE
    ),
    -- Placeholder embedding (zeros) - will be updated by async job
    ARRAY_FILL(0.0, ARRAY[1536])::VECTOR(1536)
  )
  ON CONFLICT (source_type, source_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_auto_generate_template_embedding'
  ) THEN
    CREATE TRIGGER trg_auto_generate_template_embedding
      AFTER INSERT ON question_templates
      FOR EACH ROW
      EXECUTE FUNCTION auto_generate_template_embedding();
  END IF;
END $$;

-- Trigger 3: Increment usage count
CREATE OR REPLACE FUNCTION increment_template_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.template_id IS NOT NULL THEN
    UPDATE question_templates
    SET
      usage_count = usage_count + 1,
      last_used_at = NOW()
    WHERE id = NEW.template_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_increment_template_usage'
  ) THEN
    CREATE TRIGGER trg_increment_template_usage
      AFTER INSERT ON interview_questions
      FOR EACH ROW
      EXECUTE FUNCTION increment_template_usage();
  END IF;
END $$;

-- ========================================
-- 5. Seed initial templates
-- ========================================

-- Insert default question templates
INSERT INTO question_templates (focus, depth, template_text, category, priority, variables)
VALUES
  -- Harmony templates
  ('harmony', 'shallow', 'このコード進行を選んだ理由を教えてください。', 'technical', 80,
   '{"placeholders": [{"key": "chord", "description": "コード名", "type": "string", "required": false}]}'::JSONB),
  ('harmony', 'medium', 'コード進行の変更によって、曲の雰囲気はどう変わりましたか？', 'creative', 70, '{}'::JSONB),
  ('harmony', 'deep', '和音の選択において、古典和声と現代和声のどちらを意識しましたか？', 'reflective', 50, '{}'::JSONB),

  -- Melody templates
  ('melody', 'shallow', 'メロディラインで最も気に入っているフレーズはどこですか？', 'creative', 80, '{}'::JSONB),
  ('melody', 'medium', 'メロディの音域設定で工夫した点はありますか？', 'technical', 70, '{}'::JSONB),
  ('melody', 'deep', 'このメロディで表現したい感情の本質は何ですか？', 'reflective', 60, '{}'::JSONB),

  -- Rhythm templates
  ('rhythm', 'shallow', 'このグルーブ感を作るために意識したことは何ですか？', 'technical', 80, '{}'::JSONB),
  ('rhythm', 'medium', 'テンポやリズムパターンの変更理由を教えてください。', 'diagnostic', 70, '{}'::JSONB),
  ('rhythm', 'deep', 'リズムの「揺らぎ」に込めた意図はありますか？', 'creative', 50, '{}'::JSONB),

  -- Mix templates
  ('mix', 'shallow', '音量バランスで最も調整に時間をかけた要素は何ですか？', 'technical', 80, '{}'::JSONB),
  ('mix', 'medium', 'EQやエフェクトで狙った効果は得られましたか？', 'diagnostic', 70, '{}'::JSONB),
  ('mix', 'deep', 'このミックスで最も「聴いてほしい」音は何ですか？', 'creative', 60, '{}'::JSONB),

  -- Emotion templates
  ('emotion', 'shallow', 'この曲で聴き手にどんな気持ちになってほしいですか？', 'reflective', 90, '{}'::JSONB),
  ('emotion', 'medium', '感情表現において、音楽的に工夫したポイントはどこですか？', 'creative', 75, '{}'::JSONB),
  ('emotion', 'deep', 'この曲を通じて、自分自身の中で何を発見しましたか？', 'reflective', 50, '{}'::JSONB),

  -- Image templates
  ('image', 'shallow', 'この曲で思い浮かべているイメージや風景はありますか？', 'creative', 85, '{}'::JSONB),
  ('image', 'medium', '音像の広がりや空間を作るためにどんな工夫をしましたか？', 'technical', 70, '{}'::JSONB),
  ('image', 'deep', '聴き手に「見せたい世界」の本質は何ですか？', 'reflective', 55, '{}'::JSONB),

  -- Structure templates
  ('structure', 'shallow', 'セクション（イントロ、Aメロ、サビなど）の配置で工夫した点は？', 'technical', 80, '{}'::JSONB),
  ('structure', 'medium', '曲の展開において、聴き手を飽きさせない工夫は何ですか？', 'creative', 70, '{}'::JSONB),
  ('structure', 'deep', 'この曲の「物語」は、音楽的にどのように語られていますか？', 'reflective', 60, '{}'::JSONB)

ON CONFLICT DO NOTHING;

-- ========================================
-- 6. Add table comments
-- ========================================

COMMENT ON TABLE question_templates IS 'Reusable question templates for AI Interviewer';
COMMENT ON COLUMN question_templates.focus IS 'Musical focus area (harmony, melody, rhythm, etc.)';
COMMENT ON COLUMN question_templates.depth IS 'Question depth: shallow (beginner), medium, deep (theoretical)';
COMMENT ON COLUMN question_templates.template_text IS 'Question text with optional {placeholders}';
COMMENT ON COLUMN question_templates.variables IS 'JSONB defining placeholders: {placeholders: [{key, description, type}]}';
COMMENT ON COLUMN question_templates.category IS 'Question category: technical, creative, reflective, diagnostic';
COMMENT ON COLUMN question_templates.priority IS 'Priority score 0-100 (higher = more likely to be selected)';
COMMENT ON COLUMN question_templates.usage_count IS 'Number of times this template was used';
COMMENT ON COLUMN question_templates.enabled IS 'Whether template is active (for A/B testing)';

-- ========================================
-- 7. Analyze table
-- ========================================

ANALYZE question_templates;

-- ========================================
-- Migration 0013 complete
-- ========================================
```

### 5.4 Rollback Script

**File**: `db/migrations/rollback_0012_rag_embeddings.sql`

```sql
-- ================================================
-- Rollback: 0012_add_rag_embeddings + 0013_add_question_templates
-- Emergency rollback for Phase 1.3
-- Date: 2025-11-20
-- ================================================

-- Drop in reverse order of creation

-- Drop question_templates triggers
DROP TRIGGER IF EXISTS trg_increment_template_usage ON interview_questions;
DROP TRIGGER IF EXISTS trg_auto_generate_template_embedding ON question_templates;
DROP TRIGGER IF EXISTS update_question_templates_updated_at ON question_templates;

-- Drop rag_embeddings triggers
DROP TRIGGER IF EXISTS update_rag_embeddings_updated_at ON rag_embeddings;
DROP TRIGGER IF EXISTS trg_validate_rag_embedding_source ON rag_embeddings;

-- Drop functions
DROP FUNCTION IF EXISTS increment_template_usage();
DROP FUNCTION IF EXISTS auto_generate_template_embedding();
DROP FUNCTION IF EXISTS validate_rag_embedding_source();

-- Drop views
DROP VIEW IF EXISTS v_rag_embeddings_with_source;

-- Drop foreign key constraint
ALTER TABLE interview_questions DROP CONSTRAINT IF EXISTS fk_interview_questions_template;

-- Drop tables
DROP TABLE IF EXISTS question_templates CASCADE;
DROP TABLE IF EXISTS rag_embeddings CASCADE;

-- Note: We do NOT drop pgvector extension (may be used by other tables)
-- DROP EXTENSION IF EXISTS vector;

-- ================================================
-- Rollback complete
-- ================================================
```

### 5.5 Migration Execution Script

**File**: `scripts/run-phase1.3-migrations.ts`

```typescript
#!/usr/bin/env tsx

/**
 * Phase 1.3 Migration Runner
 * Applies RAG embeddings and question templates
 */

import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL || '';

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

async function runMigration(filePath: string, description: string) {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log(`\n📂 ${description}`);
    console.log(`   File: ${path.basename(filePath)}`);

    const sql = fs.readFileSync(filePath, 'utf-8');
    await client.query(sql);

    console.log(`✅ Success: ${description}`);
  } catch (error) {
    console.error(`❌ Failed: ${description}`);
    console.error(error);
    throw error;
  } finally {
    await client.end();
  }
}

async function main() {
  console.log('🚀 Phase 1.3 Migration: RAG Embeddings + Question Templates');
  console.log(`📍 Database: ${DATABASE_URL.split('@')[1]?.split('/')[0] || 'hidden'}\n`);

  const migrations = [
    {
      file: 'db/migrations/0012_add_rag_embeddings.sql',
      description: 'Create rag_embeddings table with pgvector',
    },
    {
      file: 'db/migrations/0013_add_question_templates.sql',
      description: 'Create question_templates table',
    },
  ];

  for (const migration of migrations) {
    const fullPath = path.resolve(migration.file);

    if (!fs.existsSync(fullPath)) {
      console.error(`❌ Migration file not found: ${migration.file}`);
      process.exit(1);
    }

    await runMigration(fullPath, migration.description);
  }

  console.log('\n✅ Phase 1.3 migrations completed successfully!');
  console.log('\n📊 Next steps:');
  console.log('   1. Run seed script: npm run db:seed:templates');
  console.log('   2. Generate embeddings: npm run job:generate-embeddings');
  console.log('   3. Test RAG search: npm run test:integration -- rag.test.ts');
}

main().catch((error) => {
  console.error('\n❌ Migration failed:', error);
  process.exit(1);
});
```

### 5.6 NPM Script Updates

**Add to `package.json`**:
```json
{
  "scripts": {
    "db:migrate:phase1.3": "tsx scripts/run-phase1.3-migrations.ts",
    "db:rollback:phase1.3": "tsx scripts/apply-migrations.ts db/migrations/rollback_0012_rag_embeddings.sql",
    "db:seed:templates": "tsx scripts/seed-question-templates.ts",
    "job:generate-embeddings": "tsx scripts/jobs/generate-embeddings.ts"
  }
}
```

---

## 6. Performance & Scalability

### 6.1 Query Performance Targets

| Query Type | Target Latency (p95) | Expected Volume |
|------------|----------------------|-----------------|
| Vector similarity search (top-5) | < 50ms | 100 req/min |
| Template lookup (by focus) | < 10ms | 50 req/min |
| Session embedding lookup | < 20ms | 30 req/min |
| Bulk embedding insert (100) | < 500ms | 1 req/hour |

### 6.2 Load Testing Recommendations

**File**: `tests/performance/rag-load-test.ts`

```typescript
import { performance } from 'perf_hooks';
import { db } from '@/lib/db';
import { ragEmbeddings } from '@/db/schema';
import { sql } from 'drizzle-orm';

async function testVectorSearch(iterations: number = 100) {
  const queryVector = new Array(1536).fill(0).map(() => Math.random());
  const results: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();

    await db.execute(sql`
      SELECT source_id, embedding <=> ${JSON.stringify(queryVector)}::VECTOR AS distance
      FROM rag_embeddings
      WHERE source_type = 'session'
      ORDER BY embedding <=> ${JSON.stringify(queryVector)}::VECTOR
      LIMIT 5
    `);

    const elapsed = performance.now() - start;
    results.push(elapsed);
  }

  const p50 = results.sort((a, b) => a - b)[Math.floor(results.length * 0.5)];
  const p95 = results.sort((a, b) => a - b)[Math.floor(results.length * 0.95)];
  const p99 = results.sort((a, b) => a - b)[Math.floor(results.length * 0.99)];

  console.log(`Vector Search Performance (${iterations} queries):`);
  console.log(`  p50: ${p50.toFixed(2)}ms`);
  console.log(`  p95: ${p95.toFixed(2)}ms`);
  console.log(`  p99: ${p99.toFixed(2)}ms`);
}

// Run: npm run test:perf -- rag
```

### 6.3 Monitoring & Alerts

**Recommended Metrics**:

```sql
-- Query 1: Average vector search time (daily)
SELECT
  DATE(created_at) as date,
  COUNT(*) as search_count,
  AVG(latency_ms) as avg_latency,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95_latency
FROM rag_search_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Query 2: Embedding freshness (outdated embeddings)
SELECT
  source_type,
  COUNT(*) as outdated_count
FROM rag_embeddings
WHERE updated_at < NOW() - INTERVAL '30 days'
  AND metadata->>'pending_embedding' != 'true'
GROUP BY source_type;

-- Query 3: Template effectiveness
SELECT
  t.focus,
  t.depth,
  t.template_text,
  t.usage_count,
  t.last_used_at
FROM question_templates t
WHERE t.enabled = TRUE
ORDER BY t.usage_count DESC
LIMIT 20;
```

**Recommended Alerts** (Sentry/Datadog):
1. Vector search latency > 100ms (p95) → Warning
2. Embedding generation failures > 5% → Critical
3. Template usage imbalance (top 10% > 80% usage) → Info

---

## 7. Security & RLS Policies

### 7.1 Row-Level Security

**Currently Missing** - RLS policies for new tables

**Recommended Policies**:

```sql
-- Enable RLS on rag_embeddings
ALTER TABLE rag_embeddings ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can only read embeddings for their own sessions
CREATE POLICY "Users can read own session embeddings"
  ON rag_embeddings
  FOR SELECT
  USING (
    source_type = 'session' AND
    source_id IN (
      SELECT id FROM sessions WHERE user_id = (SELECT id FROM users WHERE id = auth.uid())
    )
  );

-- Policy 2: All users can read template embeddings
CREATE POLICY "All users can read template embeddings"
  ON rag_embeddings
  FOR SELECT
  USING (source_type = 'template');

-- Policy 3: Service role can manage all embeddings
CREATE POLICY "Service role full access"
  ON rag_embeddings
  FOR ALL
  USING (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- Enable RLS on question_templates
ALTER TABLE question_templates ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read enabled templates
CREATE POLICY "Authenticated users can read enabled templates"
  ON question_templates
  FOR SELECT
  USING (enabled = TRUE AND auth.uid() IS NOT NULL);

-- Policy: Only admins can modify templates
CREATE POLICY "Admins can modify templates"
  ON question_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

**File**: `db/migrations/0014_add_rag_rls_policies.sql`

### 7.2 API Security

**Recommendations**:
1. **Rate Limiting**: Vector search API should be rate-limited to 60 req/min per user
2. **Input Validation**: Validate query text length (max 2000 chars) before embedding
3. **Cost Protection**: Monitor OpenAI API usage, set spending limits
4. **Query Filtering**: Always filter by `source_type` to prevent cross-contamination

---

## 8. Testing Strategy

### 8.1 Unit Tests

**File**: `tests/unit/services/rag.service.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RAGService } from '@/lib/services/rag.service';
import { db } from '@/lib/db';

describe('RAGService', () => {
  let ragService: RAGService;

  beforeEach(() => {
    ragService = new RAGService();
  });

  describe('findSimilarLogs', () => {
    it('should return top 5 similar sessions', async () => {
      const query = 'コード進行を変更した';
      const results = await ragService.findSimilarLogs(query, 5);

      expect(results).toHaveLength(5);
      expect(results[0]).toHaveProperty('source_id');
      expect(results[0]).toHaveProperty('distance');
      expect(results[0].distance).toBeGreaterThanOrEqual(0);
      expect(results[0].distance).toBeLessThanOrEqual(2); // Cosine distance range
    });

    it('should filter by source_type=session', async () => {
      const query = 'メロディ';
      const results = await ragService.findSimilarLogs(query);

      for (const result of results) {
        expect(result.source_type).toBe('session');
      }
    });

    it('should handle empty results gracefully', async () => {
      vi.spyOn(db, 'execute').mockResolvedValueOnce({ rows: [] });

      const results = await ragService.findSimilarLogs('nonexistent query');
      expect(results).toEqual([]);
    });
  });

  describe('getQuestionTemplates', () => {
    it('should return templates for given focus', async () => {
      const templates = await ragService.getQuestionTemplates('harmony');

      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0].focus).toBe('harmony');
      expect(templates[0]).toHaveProperty('template_text');
    });

    it('should respect depth filter', async () => {
      const templates = await ragService.getQuestionTemplates('melody', 'deep');

      expect(templates.every(t => t.depth === 'deep')).toBe(true);
    });
  });

  describe('generateEmbedding', () => {
    it('should return 1536-dimensional vector', async () => {
      const text = 'テストテキスト';
      const embedding = await ragService.generateEmbedding(text);

      expect(embedding).toHaveLength(1536);
      expect(embedding.every(n => typeof n === 'number')).toBe(true);
    });

    it('should cache embeddings by hash', async () => {
      const text = '同じテキスト';
      const spy = vi.spyOn(ragService['openai'].embeddings, 'create');

      await ragService.generateEmbedding(text);
      await ragService.generateEmbedding(text); // Second call should use cache

      expect(spy).toHaveBeenCalledTimes(1); // OpenAI API called only once
    });
  });
});
```

### 8.2 Integration Tests

**File**: `tests/integration/api/interview-rag.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { testClient } from '@/tests/helpers/test-client';
import { db } from '@/lib/db';
import { sessions, ragEmbeddings } from '@/db/schema';

describe('POST /api/interview/questions (with RAG)', () => {
  let sessionId: string;

  beforeAll(async () => {
    // Create test session with embedding
    const [session] = await db.insert(sessions).values({
      userId: 'test-user-id',
      type: 'composition',
      title: 'Test Session',
      userShortNote: 'コード進行をFメジャーからDmに変更した',
    }).returning();
    sessionId = session.id;

    // Generate embedding
    const embedding = new Array(1536).fill(0.1); // Mock embedding
    await db.insert(ragEmbeddings).values({
      sourceType: 'session',
      sourceId: session.id,
      embedding,
    });
  });

  it('should use RAG to find similar logs', async () => {
    const response = await testClient.post('/api/interview/questions', {
      body: { sessionId },
    });

    expect(response.status).toBe(200);
    expect(response.body.questions).toHaveLength(2); // 2-3 questions
    expect(response.body.generationMethod).toBe('ai'); // Uses AI with RAG context
    expect(response.body.ragContext).toBeDefined();
    expect(response.body.ragContext.similarLogs).toHaveLength(5); // Top 5 similar
  });

  afterAll(async () => {
    await db.delete(ragEmbeddings).where({ sourceId: sessionId });
    await db.delete(sessions).where({ id: sessionId });
  });
});
```

### 8.3 E2E Tests

**File**: `tests/e2e/muednote-phase1.3.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('MUEDnote Phase 1.3: RAG Interview', () => {
  test('should generate contextual questions using RAG', async ({ page }) => {
    // 1. Login
    await page.goto('/sign-in');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // 2. Create new session
    await page.goto('/sessions/new');
    await page.fill('[name="title"]', 'Chord Progression Experiment');
    await page.fill('[name="userShortNote"]', 'コード進行をC-Am-F-Gに変更して、サビの雰囲気を明るくした');
    await page.selectOption('[name="type"]', 'composition');
    await page.click('button:has-text("作成")');

    // 3. Wait for Analyzer + Interviewer
    await page.waitForSelector('[data-testid="interview-questions"]', { timeout: 5000 });

    // 4. Verify questions were generated
    const questions = page.locator('[data-testid="interview-question"]');
    await expect(questions).toHaveCount(2); // At least 2 questions

    // 5. Verify RAG context is shown (optional debug UI)
    const ragContext = page.locator('[data-testid="rag-similar-logs"]');
    if (await ragContext.isVisible()) {
      await expect(ragContext).toContainText('類似ログ');
    }

    // 6. Answer first question
    await page.fill('[data-testid="answer-input-0"]', 'サビへの流れをスムーズにするため');
    await page.click('[data-testid="submit-answer-0"]');

    // 7. Verify answer was saved
    await expect(page.locator('[data-testid="answer-saved-0"]')).toBeVisible();
  });
});
```

---

## 9. Observability & Debugging

### 9.1 Logging Strategy

**Recommended Log Levels**:

```typescript
// lib/services/rag.service.ts
import { logger } from '@/lib/logger';

class RAGService {
  async findSimilarLogs(query: string, limit: number = 5) {
    logger.info('[RAGService] Finding similar logs', {
      query: query.slice(0, 50),
      limit
    });

    const start = Date.now();
    const embedding = await this.generateEmbedding(query);
    const embeddingTime = Date.now() - start;

    logger.debug('[RAGService] Embedding generated', {
      embeddingTime,
      dimensions: embedding.length
    });

    const results = await this.searchVectors(embedding, limit);
    const searchTime = Date.now() - start - embeddingTime;

    logger.info('[RAGService] Search complete', {
      totalTime: Date.now() - start,
      embeddingTime,
      searchTime,
      resultsCount: results.length,
    });

    return results;
  }
}
```

### 9.2 Query Debugging

**Helper SQL for debugging slow queries**:

```sql
-- Check HNSW index stats
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE tablename = 'rag_embeddings';

-- Analyze query plan
EXPLAIN ANALYZE
SELECT source_id, embedding <=> '[0.1, 0.2, ...]'::VECTOR AS distance
FROM rag_embeddings
WHERE source_type = 'session'
ORDER BY embedding <=> '[0.1, 0.2, ...]'::VECTOR
LIMIT 5;

-- Check HNSW parameters
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'rag_embeddings' AND indexname LIKE '%vector%';
```

### 9.3 Cost Monitoring

**Track OpenAI API costs**:

```typescript
// lib/services/rag.service.ts
class RAGService {
  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });

    // Log token usage for cost tracking
    const tokenCount = response.usage.total_tokens;
    const estimatedCost = (tokenCount / 1000) * 0.0001; // $0.0001 per 1K tokens

    logger.info('[RAGService] Embedding generated', {
      tokenCount,
      estimatedCostUSD: estimatedCost,
    });

    // Store in database for aggregation
    await db.insert(ragEmbeddings).values({
      // ... other fields
      tokenCount,
    });

    return response.data[0].embedding;
  }
}
```

---

## 10. Final Recommendations

### 10.1 Must-Fix Before Deployment

1. **CRITICAL**: Change IVFFlat to HNSW index
2. **CRITICAL**: Add source validation trigger
3. **HIGH**: Implement RLS policies for rag_embeddings
4. **HIGH**: Add embedding_model column for versioning

### 10.2 Recommended Improvements

1. **MEDIUM**: Implement Option B polymorphic design with triggers
2. **MEDIUM**: Add usage_count tracking to question_templates
3. **MEDIUM**: Create monitoring dashboard for RAG metrics
4. **LOW**: Add embedding_hash for deduplication

### 10.3 Post-Deployment Actions

1. **Day 1**: Monitor vector search latency (target < 50ms p95)
2. **Week 1**: Analyze template usage patterns, disable low-performing templates
3. **Week 2**: A/B test different HNSW parameters (m=16 vs m=32)
4. **Month 1**: Evaluate embedding freshness, plan re-embedding strategy

### 10.4 Migration Checklist

- [ ] Review migration SQL files (0012, 0013)
- [ ] Test migrations on staging database
- [ ] Backup production database
- [ ] Run migrations with `npm run db:migrate:phase1.3`
- [ ] Verify tables created: `SELECT * FROM rag_embeddings LIMIT 1;`
- [ ] Verify indexes: `\di rag_embeddings` (psql)
- [ ] Run seed script: `npm run db:seed:templates`
- [ ] Generate initial embeddings: `npm run job:generate-embeddings`
- [ ] Run integration tests: `npm run test:integration`
- [ ] Deploy API changes
- [ ] Monitor logs for errors
- [ ] Run load tests: `npm run test:perf -- rag`

---

## Appendix A: SQL Migration Files

See Section 5 for complete migration files:
- `0012_add_rag_embeddings.sql`
- `0013_add_question_templates.sql`
- `rollback_0012_rag_embeddings.sql`
- `run-phase1.3-migrations.ts`

---

## Appendix B: Drizzle Schema Updates

**File**: `db/schema/rag.ts` (NEW)

```typescript
import { pgTable, uuid, text, timestamp, jsonb, integer, boolean, index, check, unique } from 'drizzle-orm/pg-core';
import { interviewFocusEnum, interviewDepthEnum } from './sessions';

/**
 * RAG Embeddings Table
 */
export const ragEmbeddings = pgTable('rag_embeddings', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceType: text('source_type').notNull(),
  sourceId: uuid('source_id').notNull(),
  embedding: text('embedding').notNull(), // Stored as VECTOR(1536) in DB
  metadata: jsonb('metadata').default({}).notNull(),
  embeddingModel: text('embedding_model').default('text-embedding-ada-002').notNull(),
  embeddingHash: text('embedding_hash'),
  tokenCount: integer('token_count'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  sourceTypeCheck: check('chk_source_type', `source_type IN ('session', 'template')`),
  uniqueSource: unique('uq_source').on(table.sourceType, table.sourceId),
  uniqueHash: unique('uq_hash').on(table.embeddingHash),
  vectorIdx: index('idx_rag_embeddings_vector').on(table.embedding),
  sessionIdx: index('idx_rag_embeddings_session').on(table.sourceId).where('source_type = \'session\''),
}));

/**
 * Question Templates Table
 */
export const questionTemplates = pgTable('question_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  focus: interviewFocusEnum('focus').notNull(),
  depth: interviewDepthEnum('depth').notNull(),
  templateText: text('template_text').notNull(),
  variables: jsonb('variables').default({}).notNull(),
  category: text('category'),
  language: text('language').default('ja').notNull(),
  tags: text('tags').array().default([]),
  priority: integer('priority').default(50).notNull(),
  usageCount: integer('usage_count').default(0).notNull(),
  lastUsedAt: timestamp('last_used_at'),
  enabled: boolean('enabled').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  focusDepthIdx: index('idx_question_templates_focus_depth').on(table.focus, table.depth, table.priority),
  priorityIdx: index('idx_question_templates_priority').on(table.priority, table.createdAt),
  tagsIdx: index('idx_question_templates_tags').on(table.tags),
}));

export type RAGEmbedding = typeof ragEmbeddings.$inferSelect;
export type NewRAGEmbedding = typeof ragEmbeddings.$inferInsert;

export type QuestionTemplate = typeof questionTemplates.$inferSelect;
export type NewQuestionTemplate = typeof questionTemplates.$inferInsert;
```

---

**END OF REVIEW**

**Reviewer**: Database Architect (Claude Code)
**Date**: 2025-11-20
**Status**: APPROVED WITH MODIFICATIONS
**Next Steps**: Implement recommended changes in migration files
