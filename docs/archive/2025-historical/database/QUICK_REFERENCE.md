# Phase 2 Quick Reference Card
**MUED LMS v2 - RAG Metrics & Data Provenance**

---

## 🚀 Quick Start (Development)

```bash
# 1. Execute migrations
psql $DATABASE_URL -f db/migrations/0002_add_rag_metrics.sql
psql $DATABASE_URL -f db/migrations/0003_optimize_rag_indexes.sql
psql $DATABASE_URL -f db/migrations/0004_add_foreign_keys.sql

# 2. Verify
psql $DATABASE_URL -c "\dt" | grep -E "ai_dialogue|provenance|rag_metrics|plugin"

# 3. Test batch job
npx tsx scripts/jobs/calculate-rag-metrics.ts
```

---

## 📊 New Tables

| Table | Purpose | Records/Day |
|-------|---------|-------------|
| `ai_dialogue_log` | RAG metrics tracking | 10K-100K |
| `provenance` | Data source tracking | 100-1K |
| `rag_metrics_history` | Daily aggregated metrics | 1 |
| `plugin_registry` | Content source registry | Static (5-10) |

---

## 🔍 Essential Queries

### Check Migration Status
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('ai_dialogue_log', 'provenance', 'rag_metrics_history', 'plugin_registry');
-- Expected: 4 rows
```

### Get User Dialogue History
```sql
SELECT id, query, response, citations, created_at
FROM ai_dialogue_log
WHERE user_id = 'user-uuid-here'
ORDER BY created_at DESC
LIMIT 10;
```

### Check SLO Compliance
```sql
SELECT
  DATE(date) as date,
  citation_rate,
  latency_p95_ms,
  cost_per_answer,
  slo_compliance->>'overallMet' as slo_met
FROM rag_metrics_history
ORDER BY date DESC
LIMIT 7;
```

### Find Expiring Content
```sql
SELECT
  content_id,
  source_uri,
  acquired_at + (retention_years || ' years')::interval AS expires_at
FROM provenance
WHERE retention_years IS NOT NULL
  AND acquired_at + (retention_years || ' years')::interval < NOW() + INTERVAL '30 days';
```

### Get Active Plugins
```sql
SELECT name, source, enabled, health_status
FROM plugin_registry
WHERE enabled = true;
```

---

## 🎯 SLO Targets

| Metric | Target | Query Column |
|--------|--------|--------------|
| Citation Rate | ≥70% | `citation_rate` |
| Latency P50 | ≤1.5s | `latency_p50_ms` |
| Latency P95 | ≤3.0s | `latency_p95_ms` |
| Cost per Answer | ≤3 JPY | `cost_per_answer` |
| Relevance Score | ≥0.7 | `average_relevance_score` |

---

## 📁 File Locations

### Documentation
- Summary: `/docs/database/PHASE2_IMPLEMENTATION_SUMMARY.md`
- Detailed Review: `/docs/database/phase2-schema-review-report.md`
- Migration Guide: `/docs/database/MIGRATION_GUIDE.md`
- Deployment Checklist: `/docs/database/DEPLOYMENT_CHECKLIST.md`
- This Card: `/docs/database/QUICK_REFERENCE.md`

### Migrations
- Core: `/db/migrations/0002_add_rag_metrics.sql` ✅ Fixed
- Optimization: `/db/migrations/0003_optimize_rag_indexes.sql` ✅ New
- Foreign Keys: `/db/migrations/0004_add_foreign_keys.sql` ✅ New
- Rollback: `/db/migrations/rollback_0002_add_rag_metrics.sql` ✅ New

### Schema
- Main: `/db/schema.ts`
- RAG Metrics: `/db/schema/rag-metrics.ts`

### Application Code
- Batch Job: `/scripts/jobs/calculate-rag-metrics.ts`

---

## 🔧 Troubleshooting

### Issue: "relation 'ai_dialogue_log' already exists"
**Fix**: Migration already applied, skip to verification

### Issue: "type 'content_type' already exists"
**Fix**: Drop and recreate enums:
```sql
DROP TYPE IF EXISTS content_type CASCADE;
DROP TYPE IF EXISTS acquisition_method CASCADE;
DROP TYPE IF EXISTS license_type CASCADE;
```
Then re-run migration.

### Issue: Foreign key constraint violation
**Fix**: Find and remove orphaned records:
```sql
DELETE FROM ai_dialogue_log
WHERE user_id NOT IN (SELECT id FROM users);
```

### Issue: Migration timeout
**Fix**: Create indexes with CONCURRENTLY:
```sql
CREATE INDEX CONCURRENTLY idx_ai_dialogue_user_created
ON ai_dialogue_log(user_id, created_at DESC);
```

---

## 🔄 Rollback (Emergency Only)

```bash
# Full rollback
psql $DATABASE_URL -f db/migrations/rollback_0002_add_rag_metrics.sql

# Verify
psql $DATABASE_URL -c "
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_name IN ('provenance', 'rag_metrics_history', 'plugin_registry');
"
# Expected: 0
```

---

## 📈 Performance Monitoring

```sql
-- Index usage
SELECT
  indexrelname as index_name,
  idx_scan as scans,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE relname IN ('ai_dialogue_log', 'provenance', 'rag_metrics_history')
ORDER BY idx_scan DESC;

-- Query performance
SELECT
  substring(query, 1, 60) as query_preview,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%ai_dialogue_log%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## ✅ Verification Checklist

### Post-Migration
- [ ] 4 tables exist
- [ ] 16 indexes created (12 base + 4 optimized)
- [ ] 3 enums created
- [ ] 2 plugins inserted
- [ ] Batch job runs successfully
- [ ] API endpoints respond correctly

### Performance
- [ ] User dialogue query < 100ms
- [ ] Daily aggregation < 30s
- [ ] Dashboard load < 2s
- [ ] Error rate unchanged

---

## 📞 Support

- **Documentation Issues**: Review `/docs/database/` files
- **Migration Errors**: Check `/docs/database/MIGRATION_GUIDE.md` troubleshooting
- **Rollback Needed**: See `/docs/database/DEPLOYMENT_CHECKLIST.md` rollback section
- **Production Issues**: Follow incident response protocol

---

## 🎯 Success Criteria

| Category | Metric | Target |
|----------|--------|--------|
| Deployment | Downtime | 0 min |
| Performance | Query latency increase | < 2% |
| Reliability | Error rate change | < 0.1% |
| Functionality | Batch job success | 100% |

---

**Status**: ✅ Ready for Implementation
**Version**: 1.0
**Date**: 2025-10-29

---

## 🔗 Quick Links

- [Phase 2 Implementation Summary](./PHASE2_IMPLEMENTATION_SUMMARY.md) - Overview & timeline
- [Schema Review Report](./phase2-schema-review-report.md) - Detailed analysis
- [Migration Guide](./MIGRATION_GUIDE.md) - Step-by-step execution
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md) - Environment-specific checklists

---

**🚀 Let's deploy Phase 2!**
