# Phase 1.3 Database Schema Review - Executive Summary

**Date**: 2025-11-20
**Reviewer**: Database Architect (Claude Code)
**Status**: ✅ APPROVED WITH CRITICAL MODIFICATIONS

---

## Quick Decision Matrix

| Item | Status | Priority | Action Required |
|------|--------|----------|-----------------|
| Overall Schema Design | ✅ Good | - | Proceed with modifications |
| Vector Index (HNSW vs IVFFlat) | ⚠️ Critical Issue | **CRITICAL** | Must fix before deployment |
| Source Polymorphism | ⚠️ Design Issue | **HIGH** | Recommended fix |
| RLS Policies | ❌ Missing | **HIGH** | Must add before production |
| ENUM Constraints | ⚠️ Missing | **MEDIUM** | Recommended fix |
| Monitoring | ❌ Missing | **LOW** | Plan for post-deployment |

---

## Critical Issues (Must Fix Before Deployment)

### 1. ❌ CRITICAL: IVFFlat Index Incompatibility with Neon

**Problem**: Proposed `ivfflat` index won't perform well on Neon PostgreSQL.

**Current Code** (from implementation plan):
```sql
CREATE INDEX idx_rag_embeddings_vector
  ON rag_embeddings USING ivfflat (embedding vector_cosine_ops);
```

**Required Fix**:
```sql
-- Use HNSW instead (optimized for Neon's serverless architecture)
CREATE INDEX IF NOT EXISTS idx_rag_embeddings_vector
  ON rag_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

**Why HNSW**:
- ✅ No training/index building phase (serverless-friendly)
- ✅ Better performance for < 1M vectors (your use case)
- ✅ Predictable query latency
- ✅ Neon PostgreSQL recommendation

**Impact**: Without this fix, vector search may be 5-10x slower than expected.

---

### 2. ⚠️ HIGH: Missing Referential Integrity

**Problem**: `source_type` + `source_id` pattern allows orphaned embeddings.

**Example Problem**:
```sql
-- This will succeed even if session doesn't exist!
INSERT INTO rag_embeddings (source_type, source_id, embedding)
VALUES ('session', '00000000-0000-0000-0000-000000000000', '[...]');
```

**Recommended Fix**:
```sql
-- Add validation trigger
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

---

### 3. ⚠️ HIGH: Missing RLS Policies

**Problem**: No Row-Level Security on new tables.

**Required Policies**:
```sql
-- Enable RLS
ALTER TABLE rag_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_templates ENABLE ROW LEVEL SECURITY;

-- Users can only read embeddings for their own sessions
CREATE POLICY "Users can read own session embeddings"
  ON rag_embeddings FOR SELECT
  USING (
    source_type = 'session' AND
    source_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  );

-- All users can read template embeddings
CREATE POLICY "All users can read template embeddings"
  ON rag_embeddings FOR SELECT
  USING (source_type = 'template');

-- All authenticated users can read enabled templates
CREATE POLICY "Authenticated users can read enabled templates"
  ON question_templates FOR SELECT
  USING (enabled = TRUE AND auth.uid() IS NOT NULL);
```

---

## Medium Priority Improvements

### 4. ⚠️ MEDIUM: Use ENUM Instead of TEXT

**Current**:
```sql
CREATE TABLE question_templates (
  focus TEXT NOT NULL, -- ❌ No validation
  depth TEXT NOT NULL  -- ❌ No validation
);
```

**Fix**:
```sql
CREATE TABLE question_templates (
  focus interview_focus NOT NULL, -- ✅ Use existing ENUM
  depth interview_depth NOT NULL  -- ✅ Use existing ENUM
);
```

**Why**: Prevents data inconsistency ("Harmony" vs "harmony" vs "HARMONY").

---

### 5. ⚠️ MEDIUM: Add Future-Proofing Columns

**Recommended Additions to `rag_embeddings`**:
```sql
ALTER TABLE rag_embeddings
  ADD COLUMN embedding_model VARCHAR(100) DEFAULT 'text-embedding-ada-002',
  ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN token_count INTEGER; -- For cost tracking
```

**Recommended Additions to `question_templates`**:
```sql
ALTER TABLE question_templates
  ADD COLUMN usage_count INTEGER DEFAULT 0,
  ADD COLUMN last_used_at TIMESTAMPTZ,
  ADD COLUMN enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN category TEXT; -- 'technical' | 'creative' | 'reflective'
```

---

## Low Priority (Can Defer)

### 6. Template Variable Schema Improvement

**Current**:
```json
{
  "{chord}": "placeholder for chord name"
}
```

**Better Design**:
```json
{
  "placeholders": [
    {
      "key": "chord",
      "description": "Musical chord (e.g., F major, Dm)",
      "type": "string",
      "required": true,
      "example": "C major"
    }
  ]
}
```

---

## Performance Targets & Benchmarks

| Query Type | Target Latency (p95) | Expected Volume |
|------------|----------------------|-----------------|
| Vector similarity search (top-5) | < 50ms | 100 req/min |
| Template lookup (by focus) | < 10ms | 50 req/min |
| Session embedding lookup | < 20ms | 30 req/min |
| Bulk embedding insert (100) | < 500ms | 1 req/hour |

**Expected Scale**:
- MVP: ~1K vectors (sessions + templates)
- Year 1: ~100K vectors
- Year 2+: ~500K vectors

**Index Choice Rationale**:
- HNSW is optimal for 1K - 1M vectors
- Re-evaluate at 500K vectors
- No need for external vector DB for 2 years

---

## Migration Plan

### Phase 1: Fix Critical Issues
1. Update migration 0012 with HNSW index
2. Add source validation trigger
3. Add RLS policies (new migration 0014)

### Phase 2: Apply Migrations
```bash
npm run db:migrate:phase1.3
```

### Phase 3: Verify
```sql
-- Check index type
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'rag_embeddings' AND indexname LIKE '%vector%';

-- Should show: "USING hnsw"
```

### Phase 4: Seed Data
```bash
npm run db:seed:templates
```

### Phase 5: Generate Embeddings
```bash
npm run job:generate-embeddings
```

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Slow vector search (if using IVFFlat) | **HIGH** | **HIGH** | Use HNSW index |
| Orphaned embeddings | **MEDIUM** | **MEDIUM** | Add validation trigger |
| Security breach (no RLS) | **MEDIUM** | **CRITICAL** | Add RLS policies |
| Inconsistent data (TEXT vs ENUM) | **LOW** | **LOW** | Use ENUMs |
| OpenAI cost overrun | **LOW** | **MEDIUM** | Add token tracking |

**Overall Risk**: Medium → **Low** (after implementing fixes)

---

## Pre-Deployment Checklist

- [ ] Replace IVFFlat with HNSW in migration 0012
- [ ] Add source validation trigger
- [ ] Create migration 0014 for RLS policies
- [ ] Update question_templates to use ENUM types
- [ ] Add usage_count and enabled columns
- [ ] Test migrations on staging database
- [ ] Run integration tests
- [ ] Verify HNSW index created: `\di rag_embeddings`
- [ ] Seed initial templates (20 templates)
- [ ] Generate embeddings for existing sessions
- [ ] Monitor first 24 hours for performance issues

---

## Post-Deployment Monitoring

**Week 1**:
- Monitor vector search latency (target: p95 < 50ms)
- Track OpenAI API costs (embeddings + completions)
- Analyze template usage distribution

**Month 1**:
- Review top 20 templates by usage_count
- Disable low-performing templates (< 5 uses)
- A/B test HNSW parameters (m=16 vs m=32)

**Quarter 1**:
- Evaluate embedding freshness (re-embed old sessions?)
- Plan for multilingual templates (if needed)
- Consider template A/B testing framework

---

## Quick Reference: Modified Migration Files

**Updated Files** (see full review document for complete SQL):
1. `/db/migrations/0012_add_rag_embeddings.sql` - **MUST UPDATE** (HNSW index)
2. `/db/migrations/0013_add_question_templates.sql` - **MUST UPDATE** (ENUMs)
3. `/db/migrations/0014_add_rag_rls_policies.sql` - **NEW** (Security)
4. `/scripts/run-phase1.3-migrations.ts` - **NEW** (Execution script)

---

## Recommended Next Steps

1. **Immediate** (Day 1):
   - Read full review: `PHASE1.3_DATABASE_REVIEW.md`
   - Update migration 0012 with HNSW index
   - Create migration 0014 for RLS policies

2. **This Week**:
   - Test migrations on staging
   - Review Drizzle schema updates
   - Create seed script for templates

3. **Next Week**:
   - Deploy to production
   - Monitor performance metrics
   - Run E2E tests

---

## Questions for Product Owner

1. **Template Categories**: Do we need to categorize templates as 'technical', 'creative', 'reflective'?
2. **Multilingual Support**: Should we plan for English templates (language='en')?
3. **Cost Budget**: What's the acceptable OpenAI Embeddings API budget per month?
4. **Re-Embedding Strategy**: How often should we re-generate embeddings for old sessions?

---

## Appendix: Key Technical Decisions

| Decision | Chosen Approach | Alternative Considered | Rationale |
|----------|----------------|------------------------|-----------|
| Vector Index Type | **HNSW** | IVFFlat | Better for Neon serverless, no training needed |
| Source Reference | **Polymorphic with validation** | Separate tables per type | Simpler migration, acceptable performance |
| Question Template Structure | **JSONB with schema validation** | Separate placeholders table | Flexibility for MVP, can refactor later |
| RLS Strategy | **Enable on all new tables** | Application-level filtering | Defense in depth, PostgreSQL native |
| Embedding Model | **text-embedding-ada-002** | text-embedding-3-large | Cost-effective, sufficient quality |

---

**For detailed technical implementation, refer to**: `PHASE1.3_DATABASE_REVIEW.md`

**Last Updated**: 2025-11-20
