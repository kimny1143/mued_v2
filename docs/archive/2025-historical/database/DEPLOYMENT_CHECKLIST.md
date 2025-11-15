# Phase 2 Deployment Checklist
**MUED LMS v2 - RAG Metrics and Data Provenance**

**Version**: 1.0
**Last Updated**: 2025-10-29
**Status**: Ready for Implementation

---

## Pre-Deployment Verification

### Documentation Review
- [ ] Read `/docs/database/PHASE2_IMPLEMENTATION_SUMMARY.md` (overview)
- [ ] Read `/docs/database/phase2-schema-review-report.md` (detailed analysis)
- [ ] Read `/docs/database/MIGRATION_GUIDE.md` (execution steps)
- [ ] Understand rollback procedure

### Environment Setup
- [ ] Database URL configured: `echo $DATABASE_URL`
- [ ] psql client installed: `psql --version`
- [ ] Node.js runtime available: `node --version` (v18+)
- [ ] Migration files present in `/db/migrations/`

### File Verification
```bash
# Check all required files exist
ls -lh db/migrations/0002_add_rag_metrics.sql
ls -lh db/migrations/0003_optimize_rag_indexes.sql
ls -lh db/migrations/0004_add_foreign_keys.sql
ls -lh db/migrations/rollback_0002_add_rag_metrics.sql
ls -lh scripts/jobs/calculate-rag-metrics.ts
```

Expected output: All 5 files present

---

## Development Environment Deployment

### Phase 1: Migration Execution (15 min)

#### Step 1.1: Verify Database Connection
```bash
psql $DATABASE_URL -c "SELECT current_database(), current_user, version();"
```
- [ ] Connection successful
- [ ] Database name correct
- [ ] PostgreSQL version 14+ or Neon

#### Step 1.2: Check Current State
```bash
psql $DATABASE_URL -c "\dt" | grep -E "users|materials"
```
- [ ] Base tables exist (`users`, `materials`)
- [ ] No `ai_dialogue_log` table (or base version only)

#### Step 1.3: Execute Core Migration (0002)
```bash
psql $DATABASE_URL -f db/migrations/0002_add_rag_metrics.sql
```
Expected output:
```
CREATE TABLE       <- ai_dialogue_log base
CREATE TYPE        <- content_type enum
CREATE TYPE        <- acquisition_method enum
CREATE TYPE        <- license_type enum
ALTER TABLE        <- ai_dialogue_log extended
CREATE INDEX (x12) <- All indexes created
CREATE TABLE (x3)  <- provenance, rag_metrics_history, plugin_registry
CREATE FUNCTION    <- update_updated_at_column
CREATE TRIGGER (x3)<- Auto-update triggers
INSERT 0 2         <- Default plugins
```
- [ ] No errors in output
- [ ] 2 plugins inserted

#### Step 1.4: Verify Core Migration
```bash
# Test 1: Check tables exist
psql $DATABASE_URL -c "
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('ai_dialogue_log', 'provenance', 'rag_metrics_history', 'plugin_registry')
  ORDER BY table_name;
"
```
Expected: 4 rows
- [ ] `ai_dialogue_log` ✓
- [ ] `plugin_registry` ✓
- [ ] `provenance` ✓
- [ ] `rag_metrics_history` ✓

```bash
# Test 2: Check ai_dialogue_log columns
psql $DATABASE_URL -c "
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'ai_dialogue_log'
  ORDER BY ordinal_position;
"
```
Expected: 17 columns
- [ ] Base columns: id, user_id, session_id, query, response, model_used, created_at, updated_at
- [ ] RAG columns: citations, latency_ms, token_cost_jpy, citation_rate, etc.

```bash
# Test 3: Check enums
psql $DATABASE_URL -c "
  SELECT typname FROM pg_type
  WHERE typname IN ('content_type', 'acquisition_method', 'license_type');
"
```
Expected: 3 rows
- [ ] `content_type` ✓
- [ ] `acquisition_method` ✓
- [ ] `license_type` ✓

```bash
# Test 4: Check default plugins
psql $DATABASE_URL -c "SELECT name, source, enabled FROM plugin_registry;"
```
Expected: 2 rows
- [ ] Note.com Integration (note) ✓
- [ ] Local Materials (local) ✓

```bash
# Test 5: Check indexes
psql $DATABASE_URL -c "
  SELECT COUNT(*) as index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename IN ('ai_dialogue_log', 'provenance', 'rag_metrics_history', 'plugin_registry');
"
```
Expected: 12 indexes
- [ ] Index count = 12 ✓

#### Step 1.5: Execute Optimization Migration (0003)
```bash
psql $DATABASE_URL -f db/migrations/0003_optimize_rag_indexes.sql
```
Expected output:
```
CREATE INDEX (x4)  <- Optimized indexes
COMMENT (x11+)     <- Database comments
```
- [ ] No errors in output

#### Step 1.6: Verify Optimization Migration
```bash
psql $DATABASE_URL -c "
  SELECT indexname
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname IN (
      'idx_ai_dialogue_user_created',
      'idx_provenance_expiring',
      'idx_rag_metrics_date_unique',
      'idx_plugin_enabled_healthy'
    )
  ORDER BY indexname;
"
```
Expected: 4 rows
- [ ] `idx_ai_dialogue_user_created` ✓
- [ ] `idx_plugin_enabled_healthy` ✓
- [ ] `idx_provenance_expiring` ✓
- [ ] `idx_rag_metrics_date_unique` ✓

#### Step 1.7: Execute Foreign Keys Migration (0004) - Optional
```bash
psql $DATABASE_URL -f db/migrations/0004_add_foreign_keys.sql
```
Expected output:
```
ALTER TABLE (x3)
NOTICE: Successfully created all 3 foreign key constraints
```
- [ ] No errors in output
- [ ] Notice message displayed

If you see `ERROR: insert or update on table "provenance" violates foreign key constraint`:
- [ ] Run orphaned records cleanup (see troubleshooting)
- [ ] Re-execute migration

#### Step 1.8: Verify Foreign Keys (If Executed)
```bash
psql $DATABASE_URL -c "
  SELECT conname, conrelid::regclass, confrelid::regclass
  FROM pg_constraint
  WHERE contype = 'f'
    AND conname IN (
      'fk_ai_dialogue_user',
      'fk_provenance_content',
      'fk_provenance_acquired_by'
    );
"
```
Expected: 3 rows
- [ ] `fk_ai_dialogue_user` (ai_dialogue_log → users) ✓
- [ ] `fk_provenance_content` (provenance → materials) ✓
- [ ] `fk_provenance_acquired_by` (provenance → users) ✓

---

### Phase 2: Data Validation (15 min)

#### Step 2.1: Insert Test Data
```bash
psql $DATABASE_URL <<'EOF'
-- Insert test user (skip if already exists)
INSERT INTO users (clerk_id, email, name, role)
VALUES ('test_phase2_001', 'phase2test@example.com', 'Phase 2 Test User', 'student')
ON CONFLICT (clerk_id) DO NOTHING;

-- Insert test dialogue log
INSERT INTO ai_dialogue_log (
  user_id, session_id, query, response, model_used,
  citations, latency_ms, token_cost_jpy, citation_rate
)
VALUES (
  (SELECT id FROM users WHERE clerk_id = 'test_phase2_001'),
  gen_random_uuid(),
  'Test query: What is RAG?',
  'Test response: RAG is Retrieval-Augmented Generation...',
  'gpt-4',
  '[{"source": "test_source", "sourceType": "web", "excerpt": "RAG definition", "confidence": 0.95, "timestamp": "2025-10-29T12:00:00Z"}]'::jsonb,
  1200,
  2.50,
  100.0
)
RETURNING id, created_at;

-- Insert test provenance (if materials exist)
DO $$
DECLARE
  test_material_id UUID;
BEGIN
  SELECT id INTO test_material_id FROM materials LIMIT 1;

  IF test_material_id IS NOT NULL THEN
    INSERT INTO provenance (
      content_id, content_type, source_uri, license_type, acquisition_method
    )
    VALUES (
      test_material_id,
      'material',
      'https://test.example.com/source',
      'cc_by',
      'manual_upload'
    );
    RAISE NOTICE 'Test provenance record inserted';
  ELSE
    RAISE NOTICE 'No materials found, skipping provenance test';
  END IF;
END $$;

-- Insert test metrics record
INSERT INTO rag_metrics_history (
  date, citation_rate, latency_p50_ms, cost_per_answer, total_queries
)
VALUES (
  NOW(),
  75.5,
  1200,
  2.30,
  1000
)
RETURNING id, date;
EOF
```
- [ ] Test user created or already exists
- [ ] Test dialogue log inserted
- [ ] Test provenance inserted (if materials exist)
- [ ] Test metrics record inserted

#### Step 2.2: Verify Test Data
```bash
# Check dialogue log
psql $DATABASE_URL -c "
  SELECT id, query, SUBSTRING(response, 1, 50) as response_preview,
         jsonb_array_length(citations) as citation_count,
         latency_ms, token_cost_jpy
  FROM ai_dialogue_log
  WHERE query LIKE 'Test query:%'
  ORDER BY created_at DESC LIMIT 1;
"
```
- [ ] 1 row returned
- [ ] `citation_count` = 1
- [ ] `latency_ms` = 1200
- [ ] `token_cost_jpy` = 2.50

```bash
# Check provenance
psql $DATABASE_URL -c "
  SELECT content_id, content_type, source_uri, license_type
  FROM provenance
  WHERE source_uri = 'https://test.example.com/source';
"
```
- [ ] 1 row returned (if materials exist)
- [ ] `license_type` = cc_by

```bash
# Check metrics history
psql $DATABASE_URL -c "
  SELECT date, citation_rate, latency_p50_ms, cost_per_answer
  FROM rag_metrics_history
  ORDER BY date DESC LIMIT 1;
"
```
- [ ] 1 row returned
- [ ] `citation_rate` = 75.50

---

### Phase 3: Batch Job Testing (30 min)

#### Step 3.1: Test Batch Job Execution
```bash
# Install dependencies if needed
npm install

# Run batch job
npx tsx scripts/jobs/calculate-rag-metrics.ts
```
Expected output:
```
Calculating metrics for period: 2025-10-28 to 2025-10-28
✅ Metrics calculation completed for 2025-10-28
Metrics: {
  "citationRate": ...,
  "citationCount": ...,
  ...
}
SLO Compliance: {
  "citationRateMet": true/false,
  "latencyMet": true/false,
  "costMet": true/false,
  "overallMet": true/false
}
```
- [ ] No errors during execution
- [ ] Metrics calculated successfully
- [ ] SLO compliance checked

#### Step 3.2: Verify Batch Job Results
```bash
psql $DATABASE_URL -c "
  SELECT date, citation_rate, latency_p50_ms, cost_per_answer,
         slo_compliance->>'overallMet' as slo_met
  FROM rag_metrics_history
  ORDER BY date DESC LIMIT 3;
"
```
- [ ] New record inserted with yesterday's date
- [ ] Metrics values populated
- [ ] SLO compliance calculated

---

### Phase 4: Query Performance Testing (30 min)

#### Step 4.1: Test User Dialogue Query
```bash
psql $DATABASE_URL <<'EOF'
EXPLAIN ANALYZE
SELECT id, query, response, citations, created_at
FROM ai_dialogue_log
WHERE user_id = (SELECT id FROM users LIMIT 1)
ORDER BY created_at DESC
LIMIT 10;
EOF
```
- [ ] Query executes successfully
- [ ] Uses `idx_ai_dialogue_user_created` index (check EXPLAIN output)
- [ ] Execution time < 100ms (with <10K records)

#### Step 4.2: Test Daily Metrics Aggregation
```bash
psql $DATABASE_URL <<'EOF'
EXPLAIN ANALYZE
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_queries,
  AVG(latency_ms) as avg_latency,
  AVG(token_cost_jpy) as avg_cost
FROM ai_dialogue_log
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
EOF
```
- [ ] Query executes successfully
- [ ] Uses `idx_ai_dialogue_created_at` index
- [ ] Execution time < 500ms (with <100K records)

#### Step 4.3: Test Provenance Lookup
```bash
psql $DATABASE_URL <<'EOF'
EXPLAIN ANALYZE
SELECT content_id, source_uri, license_type, retention_years
FROM provenance
WHERE content_type = 'material'
  AND license_type IN ('cc_by', 'cc_by_sa')
ORDER BY created_at DESC
LIMIT 20;
EOF
```
- [ ] Query executes successfully
- [ ] Uses appropriate index
- [ ] Execution time < 100ms

---

### Phase 5: Cleanup Test Data (5 min)

```bash
psql $DATABASE_URL <<'EOF'
-- Remove test records
DELETE FROM rag_metrics_history
WHERE date >= NOW() - INTERVAL '1 hour';

DELETE FROM provenance
WHERE source_uri = 'https://test.example.com/source';

DELETE FROM ai_dialogue_log
WHERE query LIKE 'Test query:%';

DELETE FROM users
WHERE clerk_id = 'test_phase2_001';

-- Verify cleanup
SELECT 'ai_dialogue_log' as table_name, COUNT(*) as remaining_test_records
FROM ai_dialogue_log WHERE query LIKE 'Test query:%'
UNION ALL
SELECT 'provenance', COUNT(*) FROM provenance WHERE source_uri = 'https://test.example.com/source'
UNION ALL
SELECT 'users', COUNT(*) FROM users WHERE clerk_id = 'test_phase2_001';
EOF
```
- [ ] All test records deleted (all counts = 0)

---

## Development Environment Summary

### Checklist
- [ ] Core migration (0002) executed successfully
- [ ] Optimization migration (0003) executed successfully
- [ ] Foreign keys migration (0004) executed successfully (optional)
- [ ] All verification queries passed
- [ ] Test data inserted and validated
- [ ] Batch job runs successfully
- [ ] Query performance acceptable
- [ ] Test data cleaned up

### Time Spent
- Migration execution: ______ min (expected: 15 min)
- Data validation: ______ min (expected: 15 min)
- Batch job testing: ______ min (expected: 30 min)
- Query performance: ______ min (expected: 30 min)
- Cleanup: ______ min (expected: 5 min)
- **Total**: ______ min (expected: 95 min)

### Issues Encountered
- [ ] None - everything worked as expected
- [ ] Minor issues (describe):
  ```
  Issue: ________________________________
  Resolution: ___________________________
  ```
- [ ] Major issues requiring investigation

---

## Staging Environment Deployment

### Pre-Staging Checklist
- [ ] Development deployment successful
- [ ] All dev verification passed
- [ ] Staging database URL configured
- [ ] Staging database backed up

### Staging Backup
```bash
# For Neon PostgreSQL
export NEON_PROJECT_ID="your-project-id"
neon branches create \
  --from staging \
  --name "staging-backup-$(date +%Y%m%d-%H%M)" \
  --project-id $NEON_PROJECT_ID

# Verify backup created
neon branches list --project-id $NEON_PROJECT_ID
```
- [ ] Backup branch created
- [ ] Backup verified

### Staging Migration Execution
```bash
export DATABASE_URL="<staging_database_url>"

# Execute migrations
psql $DATABASE_URL -f db/migrations/0002_add_rag_metrics.sql
psql $DATABASE_URL -f db/migrations/0003_optimize_rag_indexes.sql
psql $DATABASE_URL -f db/migrations/0004_add_foreign_keys.sql
```
- [ ] All migrations executed without errors

### Staging Verification
Repeat all verification steps from Development Phase 1 (Steps 1.4, 1.6, 1.8)
- [ ] All tables created
- [ ] All indexes created
- [ ] All foreign keys created (if applicable)

### Staging Load Testing
```bash
# Run full test suite
npm run test

# Run E2E tests
npm run test:e2e
```
- [ ] All tests pass
- [ ] No performance degradation
- [ ] Application responds correctly

### Staging Monitoring (48 hours)
- [ ] Day 1 complete - no issues
- [ ] Day 2 complete - no issues
- [ ] Batch job runs successfully both nights
- [ ] Query performance within targets
- [ ] No error rate increase

---

## Production Environment Deployment

### Pre-Production Checklist
- [ ] Staging deployment successful for 48+ hours
- [ ] All stakeholders notified
- [ ] Maintenance window scheduled: __________ (2-4 AM JST recommended)
- [ ] Production database backed up
- [ ] Rollback script tested on staging

### Production Backup (CRITICAL)
```bash
export NEON_PROJECT_ID="your-production-project-id"
neon branches create \
  --from main \
  --name "prod-backup-phase2-$(date +%Y%m%d-%H%M)" \
  --project-id $NEON_PROJECT_ID

# Verify backup
neon branches list --project-id $NEON_PROJECT_ID | grep "prod-backup-phase2"
```
- [ ] Production backup created
- [ ] Backup verified and tested

### Production Migration Execution
```bash
export DATABASE_URL="<production_database_url>"

# Verify connection
psql $DATABASE_URL -c "SELECT current_database(), current_user;"

# Option A: Single transaction (recommended)
cat db/migrations/0002_add_rag_metrics.sql \
    db/migrations/0003_optimize_rag_indexes.sql \
    db/migrations/0004_add_foreign_keys.sql \
    > /tmp/phase2_prod.sql

psql $DATABASE_URL <<EOF
BEGIN;
\i /tmp/phase2_prod.sql
COMMIT;
EOF

# Option B: Individual files
# psql $DATABASE_URL -f db/migrations/0002_add_rag_metrics.sql
# psql $DATABASE_URL -f db/migrations/0003_optimize_rag_indexes.sql
# psql $DATABASE_URL -f db/migrations/0004_add_foreign_keys.sql
```
- [ ] Migration started: ____:____ (time)
- [ ] Migration completed: ____:____ (time)
- [ ] Duration: ______ min (expected: < 5 min)
- [ ] No errors in output

### Production Verification (Immediate)

#### Critical Checks (Within 5 minutes)
```bash
# 1. Check application health
curl https://your-app.com/api/health
```
- [ ] Health endpoint responds (200 OK)

```bash
# 2. Verify tables exist
psql $DATABASE_URL -c "
  SELECT COUNT(*) FROM ai_dialogue_log;
  SELECT COUNT(*) FROM provenance;
  SELECT COUNT(*) FROM plugin_registry;
"
```
- [ ] All queries return successfully

```bash
# 3. Check error logs
# (Use your logging system: Datadog, Sentry, CloudWatch, etc.)
```
- [ ] No spike in error rates

```bash
# 4. Test critical API endpoints
curl https://your-app.com/api/ai/chat \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}'
```
- [ ] API responds correctly

#### Detailed Checks (Within 30 minutes)
Run all verification queries from Development Phase 1
- [ ] All tables present
- [ ] All indexes created
- [ ] All foreign keys created
- [ ] Plugin records present

### Production Monitoring (24 hours)

#### Hour 1
- [ ] Application error rate: ______% (baseline: ____%)
- [ ] Database CPU usage: ______% (baseline: ____%)
- [ ] API P95 latency: ______ms (baseline: ____ms)
- [ ] Status: Normal / Warning / Critical

#### Hour 6
- [ ] Error rate stable
- [ ] Query performance stable
- [ ] No user complaints

#### Hour 12
- [ ] Batch job completed successfully: Yes / No / N/A
- [ ] Metrics calculated correctly
- [ ] SLO compliance tracked

#### Hour 24
- [ ] Full day monitoring complete
- [ ] Performance metrics reviewed
- [ ] Team approval: Yes / No

---

## Rollback Procedures (Emergency)

### When to Rollback
- [ ] Application error rate increases > 5%
- [ ] Critical functionality broken
- [ ] Data integrity issues discovered
- [ ] Performance degradation > 50%

### Rollback Execution (Production)
```bash
# CRITICAL: Only execute if absolutely necessary
export DATABASE_URL="<production_database_url>"

# Review rollback script first
cat db/migrations/rollback_0002_add_rag_metrics.sql

# Execute rollback
psql $DATABASE_URL -f db/migrations/rollback_0002_add_rag_metrics.sql
```
- [ ] Rollback started: ____:____ (time)
- [ ] Rollback completed: ____:____ (time)
- [ ] Duration: ______ min
- [ ] Verification passed

### Post-Rollback Verification
```bash
# Check tables removed
psql $DATABASE_URL -c "
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('provenance', 'rag_metrics_history', 'plugin_registry');
"
```
Expected: 0 rows
- [ ] Phase 2 tables removed

```bash
# Check application health
curl https://your-app.com/api/health
```
- [ ] Application responds normally

### Post-Rollback Actions
- [ ] Notify stakeholders
- [ ] Document failure reason
- [ ] Create incident report
- [ ] Plan remediation

---

## Sign-Off

### Development Environment
- **Deployed by**: ____________________
- **Date**: ____________________
- **Status**: Success / Failed / Rolled Back
- **Notes**: ____________________

### Staging Environment
- **Deployed by**: ____________________
- **Date**: ____________________
- **Status**: Success / Failed / Rolled Back
- **Monitoring Period**: ____ hours
- **Notes**: ____________________

### Production Environment
- **Deployed by**: ____________________
- **Date**: ____________________
- **Time**: ____:____ (JST)
- **Status**: Success / Failed / Rolled Back
- **Duration**: ______ min
- **Downtime**: ______ min (expected: 0)
- **Approval**: ____________________
- **Notes**: ____________________

---

## Contact Information

### For Issues During Deployment
- **Database Architect**: (AI Assistant via Claude Code)
- **Tech Lead**: ____________________
- **DevOps**: ____________________
- **On-Call**: ____________________

### Escalation
- **Minor Issues**: Slack #engineering
- **Critical Issues**: Page on-call immediately
- **Production Rollback**: Requires tech lead approval

---

## Additional Resources

- Summary: `/docs/database/PHASE2_IMPLEMENTATION_SUMMARY.md`
- Detailed Review: `/docs/database/phase2-schema-review-report.md`
- Migration Guide: `/docs/database/MIGRATION_GUIDE.md`
- Schema Files: `/db/schema/rag-metrics.ts`

---

**🎯 Ready to Deploy Phase 2!**

*Last Updated: 2025-10-29*
*Version: 1.0*
