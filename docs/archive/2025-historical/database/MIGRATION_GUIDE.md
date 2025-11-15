# Phase 2 Database Migration Execution Guide

**Project**: MUED LMS v2
**Phase**: Phase 2 - RAG Metrics and Data Provenance
**Date**: 2025-10-29
**Database**: Neon PostgreSQL (via Drizzle ORM)

---

## Overview

This guide provides step-by-step instructions for executing the Phase 2 database migrations safely in development, staging, and production environments.

### Migration Files

1. **0002_add_rag_metrics.sql** (Core migration)
   - Creates base `ai_dialogue_log` table
   - Adds RAG metrics columns
   - Creates `provenance`, `rag_metrics_history`, `plugin_registry` tables
   - Status: ✅ **FIXED** (base table issue resolved)

2. **0003_optimize_rag_indexes.sql** (Performance optimization)
   - Adds 4 optimized indexes
   - Adds database-level comments
   - Status: ✅ **READY**

3. **0004_add_foreign_keys.sql** (Data integrity)
   - Adds foreign key constraints
   - Status: ✅ **READY** (optional but recommended)

4. **rollback_0002_add_rag_metrics.sql** (Emergency rollback)
   - Reverts all Phase 2 changes
   - Status: ✅ **READY**

---

## Pre-Migration Checklist

### For All Environments

- [ ] Review `/docs/database/phase2-schema-review-report.md`
- [ ] Verify Drizzle ORM version: `npm list drizzle-orm` (should be 0.44.5+)
- [ ] Verify database connection: `npm run db:push -- --check`
- [ ] Check disk space (migration adds ~4 tables + indexes)

### For Production Only

- [ ] **Critical**: Create database backup
  ```bash
  # Neon backup (via CLI or UI)
  neon branches create --from main --name backup-$(date +%Y%m%d)
  ```
- [ ] Schedule during low-traffic window (recommended: 2-4 AM JST)
- [ ] Notify team of maintenance window
- [ ] Prepare rollback plan
- [ ] Test migration on staging first

---

## Migration Execution

### Step 1: Development Environment

#### 1.1 Verify Current State

```bash
# Check current database schema
psql $DATABASE_URL -c "\dt"

# Verify ai_dialogue_log doesn't exist yet (or has base columns only)
psql $DATABASE_URL -c "\d ai_dialogue_log"
```

#### 1.2 Execute Core Migration (0002)

```bash
# Method A: Using psql (recommended for manual control)
psql $DATABASE_URL -f db/migrations/0002_add_rag_metrics.sql

# Method B: Using Drizzle Kit (automated)
npm run db:push
```

**Expected output**:
```
CREATE TABLE
CREATE TYPE
CREATE TYPE
CREATE TYPE
ALTER TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE FUNCTION
CREATE TRIGGER
CREATE TRIGGER
CREATE TRIGGER
INSERT 0 2
```

#### 1.3 Verify Core Migration

```sql
-- 1. Check all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('ai_dialogue_log', 'provenance', 'rag_metrics_history', 'plugin_registry')
ORDER BY table_name;
-- Expected: 4 rows

-- 2. Verify ai_dialogue_log columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'ai_dialogue_log'
ORDER BY ordinal_position;
-- Expected: 17 columns (7 base + 10 RAG metrics)

-- 3. Check enums
SELECT typname FROM pg_type
WHERE typname IN ('content_type', 'acquisition_method', 'license_type');
-- Expected: 3 rows

-- 4. Verify plugins inserted
SELECT name, source, enabled FROM plugin_registry;
-- Expected: 2 rows (note, local)

-- 5. Check indexes
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND (tablename LIKE '%dialogue%' OR tablename LIKE '%provenance%' OR tablename LIKE '%rag_metrics%' OR tablename = 'plugin_registry')
ORDER BY tablename, indexname;
-- Expected: 12 indexes
```

#### 1.4 Execute Optimization Migration (0003)

```bash
psql $DATABASE_URL -f db/migrations/0003_optimize_rag_indexes.sql
```

**Expected output**:
```
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
COMMENT
COMMENT
...
```

#### 1.5 Verify Optimization Migration

```sql
-- Check new indexes
SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_ai_dialogue_user_created',
    'idx_provenance_expiring',
    'idx_rag_metrics_date_unique',
    'idx_plugin_enabled_healthy'
  );
-- Expected: 4 rows

-- Check database comments
SELECT
  obj_description(c.oid, 'pg_class') as table_comment
FROM pg_class c
WHERE c.relname = 'ai_dialogue_log'
  AND c.relkind = 'r';
-- Expected: 'RAG dialogue logs with citation tracking...'
```

#### 1.6 Execute Foreign Keys Migration (0004) - Optional

```bash
psql $DATABASE_URL -f db/migrations/0004_add_foreign_keys.sql
```

**Expected output**:
```
ALTER TABLE
ALTER TABLE
ALTER TABLE
NOTICE:  Successfully created all 3 foreign key constraints
```

#### 1.7 Verify Foreign Keys

```sql
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE contype = 'f'
  AND conname IN (
    'fk_ai_dialogue_user',
    'fk_provenance_content',
    'fk_provenance_acquired_by'
  );
-- Expected: 3 rows
```

---

### Step 2: Integration Testing

#### 2.1 Insert Test Data

```sql
-- Insert test user (if not exists)
INSERT INTO users (clerk_id, email, name, role)
VALUES ('test_user_001', 'test@example.com', 'Test User', 'student')
ON CONFLICT (clerk_id) DO NOTHING
RETURNING id;

-- Insert test dialogue log
INSERT INTO ai_dialogue_log (user_id, session_id, query, response, model_used, citations, latency_ms, token_cost_jpy)
VALUES (
  (SELECT id FROM users WHERE clerk_id = 'test_user_001'),
  gen_random_uuid(),
  'What is RAG?',
  'RAG stands for Retrieval-Augmented Generation...',
  'gpt-4',
  '[{"source": "wikipedia", "sourceType": "web", "excerpt": "RAG is...", "confidence": 0.95, "timestamp": "2025-10-29T12:00:00Z"}]'::jsonb,
  1200,
  2.50
)
RETURNING id, created_at;

-- Insert test provenance record
INSERT INTO provenance (content_id, content_type, source_uri, license_type, acquisition_method)
VALUES (
  (SELECT id FROM materials LIMIT 1),
  'material',
  'https://example.com/source',
  'cc_by',
  'api_fetch'
)
RETURNING id;

-- Insert test metrics record
INSERT INTO rag_metrics_history (date, citation_rate, latency_p50_ms, cost_per_answer, total_queries)
VALUES (
  NOW(),
  75.5,
  1200,
  2.30,
  1000
)
RETURNING id;
```

#### 2.2 Test Batch Job

```bash
# Run RAG metrics calculation job
npx tsx scripts/jobs/calculate-rag-metrics.ts
```

**Expected output**:
```
Calculating metrics for period: 2025-10-28 to 2025-10-28
✅ Metrics calculation completed for 2025-10-28
Metrics: {
  "citationRate": 75.5,
  "citationCount": 120,
  ...
}
```

#### 2.3 Test Queries

```sql
-- Query 1: Get user dialogue history (tests composite index)
EXPLAIN ANALYZE
SELECT id, query, response, citations, created_at
FROM ai_dialogue_log
WHERE user_id = (SELECT id FROM users LIMIT 1)
ORDER BY created_at DESC
LIMIT 10;
-- Check: Should use idx_ai_dialogue_user_created (Index Scan)

-- Query 2: Daily metrics aggregation (tests date index)
EXPLAIN ANALYZE
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_queries,
  AVG(latency_ms) as avg_latency
FROM ai_dialogue_log
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
-- Check: Should use idx_ai_dialogue_created_at (Bitmap Index Scan)

-- Query 3: Expiring content (tests partial index)
EXPLAIN ANALYZE
SELECT content_id, retention_years, acquired_at
FROM provenance
WHERE retention_years IS NOT NULL
  AND acquired_at + (retention_years || ' years')::interval < NOW() + INTERVAL '30 days'
ORDER BY acquired_at;
-- Check: Should use idx_provenance_expiring (Bitmap Index Scan)
```

#### 2.4 Cleanup Test Data

```sql
DELETE FROM rag_metrics_history WHERE date = (SELECT MAX(date) FROM rag_metrics_history);
DELETE FROM provenance WHERE source_uri = 'https://example.com/source';
DELETE FROM ai_dialogue_log WHERE query = 'What is RAG?';
DELETE FROM users WHERE clerk_id = 'test_user_001';
```

---

### Step 3: Staging Environment

#### 3.1 Pre-Deployment Checks

```bash
# 1. Verify staging database connection
export DATABASE_URL="<staging_database_url>"
psql $DATABASE_URL -c "SELECT version();"

# 2. Check current table count
psql $DATABASE_URL -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"

# 3. Check available disk space
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size(current_database()));"
```

#### 3.2 Execute Migrations

```bash
# Execute in order (same as development)
psql $DATABASE_URL -f db/migrations/0002_add_rag_metrics.sql
psql $DATABASE_URL -f db/migrations/0003_optimize_rag_indexes.sql
psql $DATABASE_URL -f db/migrations/0004_add_foreign_keys.sql  # Optional
```

#### 3.3 Run Verification Queries

Execute all verification queries from Step 1.3, 1.5, 1.7

#### 3.4 Monitor Performance

```sql
-- Check index usage after 24 hours
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename IN ('ai_dialogue_log', 'provenance', 'rag_metrics_history', 'plugin_registry')
ORDER BY tablename, indexname;
-- Look for idx_scan > 0 (indexes being used)
```

---

### Step 4: Production Environment

#### 4.1 Pre-Production Checklist

- [ ] Staging migration successful for 48+ hours
- [ ] No performance degradation reported
- [ ] Batch job tested successfully
- [ ] Team notified of deployment window
- [ ] Backup created (Neon branch)
- [ ] Rollback script tested

#### 4.2 Create Backup

```bash
# Create backup branch in Neon
neon branches create \
  --project-id <your-project-id> \
  --from main \
  --name "backup-phase2-$(date +%Y%m%d-%H%M)"

# Verify backup
neon branches list --project-id <your-project-id>
```

#### 4.3 Execute Migrations (Production)

```bash
# Set production database URL
export DATABASE_URL="<production_database_url>"

# Verify connection
psql $DATABASE_URL -c "SELECT current_database(), current_user;"

# Execute migrations with transaction
psql $DATABASE_URL <<EOF
BEGIN;
\i db/migrations/0002_add_rag_metrics.sql
\i db/migrations/0003_optimize_rag_indexes.sql
\i db/migrations/0004_add_foreign_keys.sql
COMMIT;
EOF
```

**Alternative: Single transaction file**

```bash
# Create combined migration
cat db/migrations/0002_add_rag_metrics.sql \
    db/migrations/0003_optimize_rag_indexes.sql \
    db/migrations/0004_add_foreign_keys.sql \
    > /tmp/phase2_combined.sql

# Add transaction wrapper
echo "BEGIN;" | cat - /tmp/phase2_combined.sql > /tmp/phase2_transaction.sql
echo "COMMIT;" >> /tmp/phase2_transaction.sql

# Execute
psql $DATABASE_URL -f /tmp/phase2_transaction.sql
```

#### 4.4 Post-Migration Verification

```sql
-- 1. Verify table counts
SELECT
  schemaname,
  tablename,
  n_live_tup as row_count
FROM pg_stat_user_tables
WHERE tablename IN ('ai_dialogue_log', 'provenance', 'rag_metrics_history', 'plugin_registry')
ORDER BY tablename;

-- 2. Check application connectivity
-- Run health check endpoint: GET /api/health

-- 3. Monitor error logs
-- Check application logs for database errors

-- 4. Verify batch job
# Run RAG metrics job manually
npm run job:rag-metrics

-- 5. Check query performance
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%ai_dialogue_log%'
  OR query LIKE '%provenance%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

#### 4.5 Monitor for 24 Hours

- [ ] Check application error rates (should remain unchanged)
- [ ] Monitor database CPU/memory usage
- [ ] Verify batch job runs successfully at scheduled time
- [ ] Check query latency metrics
- [ ] Review user-reported issues

---

## Rollback Procedures

### When to Rollback

- Migration fails mid-execution
- Application errors increase significantly
- Database performance degrades
- Data integrity issues discovered

### Rollback Execution

#### Full Rollback (All Phase 2 Changes)

```bash
# Execute rollback script
psql $DATABASE_URL -f db/migrations/rollback_0002_add_rag_metrics.sql
```

**Expected output**:
```
BEGIN
ALTER TABLE
ALTER TABLE
ALTER TABLE
DROP TRIGGER
DROP TRIGGER
DROP TRIGGER
DROP TABLE
DROP TABLE
DROP TABLE
ALTER TABLE
DROP INDEX
DROP INDEX
DROP INDEX
DROP INDEX
DROP TYPE
DROP TYPE
DROP TYPE
COMMIT
NOTICE:  ai_dialogue_log records remaining: <count>
NOTICE:  Rollback successful: provenance table removed
```

#### Partial Rollback (Foreign Keys Only)

```bash
psql $DATABASE_URL <<EOF
ALTER TABLE ai_dialogue_log DROP CONSTRAINT IF EXISTS fk_ai_dialogue_user;
ALTER TABLE provenance DROP CONSTRAINT IF EXISTS fk_provenance_content;
ALTER TABLE provenance DROP CONSTRAINT IF EXISTS fk_provenance_acquired_by;
EOF
```

#### Verify Rollback

```sql
-- Check tables removed
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('provenance', 'rag_metrics_history', 'plugin_registry');
-- Expected: 0 rows

-- Check ai_dialogue_log columns
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'ai_dialogue_log'
  AND column_name IN ('citations', 'latency_ms', 'token_cost_jpy');
-- Expected: 0 rows (if full rollback)
```

---

## Troubleshooting

### Issue 1: "relation 'ai_dialogue_log' already exists"

**Cause**: Base table already created in previous migration attempt

**Solution**:
```sql
-- Check existing table structure
\d ai_dialogue_log

-- If missing RAG columns, run only ALTER TABLE section
-- Skip CREATE TABLE section in migration
```

### Issue 2: "type 'content_type' already exists"

**Cause**: Enums already created

**Solution**:
```sql
-- Drop and recreate
DROP TYPE IF EXISTS content_type CASCADE;
DROP TYPE IF EXISTS acquisition_method CASCADE;
DROP TYPE IF EXISTS license_type CASCADE;

-- Then re-run migration
```

### Issue 3: Foreign key constraint violation

**Cause**: Orphaned records in ai_dialogue_log referencing non-existent users

**Solution**:
```sql
-- Find orphaned records
SELECT DISTINCT user_id
FROM ai_dialogue_log
WHERE user_id NOT IN (SELECT id FROM users);

-- Option A: Create placeholder users
INSERT INTO users (id, clerk_id, email, name, role)
SELECT
  user_id,
  'orphaned_' || user_id,
  'orphaned@example.com',
  'Orphaned User',
  'student'
FROM (
  SELECT DISTINCT user_id
  FROM ai_dialogue_log
  WHERE user_id NOT IN (SELECT id FROM users)
) AS orphaned;

-- Option B: Delete orphaned records (data loss)
DELETE FROM ai_dialogue_log
WHERE user_id NOT IN (SELECT id FROM users);
```

### Issue 4: Index creation timeout

**Cause**: Large table size, index creation taking too long

**Solution**:
```sql
-- Create indexes with CONCURRENTLY option (doesn't lock table)
CREATE INDEX CONCURRENTLY idx_ai_dialogue_user_created
ON ai_dialogue_log(user_id, created_at DESC);

-- Note: Cannot use CONCURRENTLY inside a transaction
```

### Issue 5: Insufficient disk space

**Cause**: Indexes require additional storage

**Solution**:
```bash
# Check current database size
psql $DATABASE_URL -c "
  SELECT
    pg_size_pretty(pg_database_size(current_database())) as db_size,
    pg_size_pretty(pg_indexes_size('ai_dialogue_log')) as indexes_size;
"

# Increase Neon storage limit (via UI or CLI)
# Or defer index creation to Phase 3
```

---

## Performance Monitoring

### Key Metrics to Track

#### Database-Level Metrics

```sql
-- 1. Table sizes
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('ai_dialogue_log', 'provenance', 'rag_metrics_history', 'plugin_registry')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 2. Index usage statistics
SELECT
  indexrelname as index_name,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND relname IN ('ai_dialogue_log', 'provenance', 'rag_metrics_history', 'plugin_registry')
ORDER BY idx_scan DESC;

-- 3. Query performance
SELECT
  substring(query, 1, 80) as query_preview,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%ai_dialogue_log%'
  OR query LIKE '%provenance%'
  OR query LIKE '%rag_metrics_history%'
ORDER BY mean_exec_time DESC
LIMIT 20;
```

#### Application-Level Metrics

- RAG metrics job execution time (target: < 30 seconds for daily batch)
- API response times for dialogue endpoints (target: P95 < 500ms)
- Dashboard query latency (target: < 2 seconds)
- Error rates (target: < 0.1%)

---

## Maintenance Schedule

### Daily (Automated)

- RAG metrics calculation job (02:00 JST)
- Database backup (via Neon automatic backups)

### Weekly

- Review index usage statistics
- Check for slow queries
- Monitor table bloat

### Monthly

- Review retention policy compliance
- Archive old metrics data (> 1 year)
- Performance optimization review

---

## Success Criteria

### Migration Success Indicators

- [ ] All 4 tables created successfully
- [ ] 16+ indexes created (12 base + 4 optimized)
- [ ] 3 enums created
- [ ] 2 plugin records inserted
- [ ] Zero application downtime
- [ ] No increase in error rates
- [ ] Batch job runs successfully

### Performance Benchmarks

- [ ] User dialogue query: < 100ms (P95)
- [ ] Daily metrics aggregation: < 30 seconds
- [ ] Dashboard load time: < 2 seconds
- [ ] Index usage: > 80% of new indexes used within 7 days

---

## Contact and Support

### For Issues During Migration

1. **Development**: Check logs and retry
2. **Staging**: Notify tech lead before rollback
3. **Production**: Follow incident response protocol

### Escalation Path

- Database issues → Database Architect
- Application errors → Backend Team Lead
- Performance degradation → DevOps Team

---

## Appendix: Quick Reference

### Migration Commands

```bash
# Execute all migrations
for file in db/migrations/000{2,3,4}*.sql; do
  echo "Executing $file..."
  psql $DATABASE_URL -f "$file"
done

# Rollback
psql $DATABASE_URL -f db/migrations/rollback_0002_add_rag_metrics.sql

# Verify
psql $DATABASE_URL -c "\dt"
psql $DATABASE_URL -c "\di"
```

### Useful Queries

```sql
-- Check migration status
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'ai_dialogue_log'
ORDER BY ordinal_position;

-- Monitor query performance
SELECT * FROM pg_stat_statements
WHERE query LIKE '%ai_dialogue_log%'
ORDER BY mean_exec_time DESC LIMIT 5;

-- Check locks
SELECT * FROM pg_locks WHERE NOT granted;
```

---

**Document Version**: 1.0
**Last Updated**: 2025-10-29
**Next Review**: After production deployment
