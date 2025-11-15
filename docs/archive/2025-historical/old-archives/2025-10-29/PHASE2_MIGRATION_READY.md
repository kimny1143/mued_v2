# Phase 2 Migration - Ready to Execute

## Status: ✅ READY

All migration files have been reviewed, fixed, and are ready for execution.

## Quick Start

```bash
# 1. Test database connection
npm run db:test-connection

# 2. Execute Phase 2 migrations
npm run db:migrate:phase2
```

## What Gets Installed

### 4 New Tables
- `ai_dialogue_log` - RAG dialogue tracking with citations
- `provenance` - Data lineage and compliance tracking
- `rag_metrics_history` - Daily aggregated metrics
- `plugin_registry` - Content source plugin registry

### 3 ENUM Types
- `content_type` - Type classification for content
- `acquisition_method` - How content was obtained
- `license_type` - Legal licensing information

### 15+ Indexes
- Performance optimization for analytics queries
- Partial indexes for filtered queries
- Unique constraints for data integrity

### 2 Foreign Keys
- User cascade deletion for dialogue logs
- Soft delete for provenance acquired_by

### Initial Data
- 2 plugins pre-registered (note.com, local)

## Critical Fix Applied

**Issue Fixed**: Original migration 0008 had a polymorphic foreign key constraint that would fail.

**Solution**: Created `0008_add_foreign_keys_fixed.sql` that:
- Removes the problematic `provenance.content_id` → `materials.id` constraint
- Uses application-level validation instead (correct for polymorphic references)
- Adds documentation comments explaining the design

## Files Created

### Migration Scripts
- `/db/migrations/0006_add_rag_metrics.sql` - Core tables
- `/db/migrations/0007_optimize_rag_indexes.sql` - Performance indexes
- `/db/migrations/0008_add_foreign_keys_fixed.sql` - Foreign keys (FIXED)
- `/db/migrations/rollback_0006_add_rag_metrics.sql` - Rollback script

### Execution Tools
- `/scripts/run-phase2-migrations.ts` - Automated migration executor
- `/scripts/test-db-connection.ts` - Pre-flight connection test

### Documentation
- `/docs/phase2-migration-guide.md` - Complete migration guide
- `PHASE2_MIGRATION_READY.md` - This file (quick reference)

### Package.json Scripts Added
```json
{
  "db:test-connection": "tsx scripts/test-db-connection.ts",
  "db:migrate:phase2": "tsx scripts/run-phase2-migrations.ts"
}
```

## Safety Features

### Idempotent Operations
All migrations use:
- `CREATE TABLE IF NOT EXISTS`
- `CREATE INDEX IF NOT EXISTS`
- `ALTER TABLE ADD COLUMN IF NOT EXISTS`
- `INSERT ... ON CONFLICT DO NOTHING`

**Result**: Safe to re-run if interrupted or partially completed.

### Transaction Wrapped
Each migration executes within a transaction:
- `BEGIN` → Execute SQL → `COMMIT`
- On error: automatic `ROLLBACK`

### Verification Built-In
The migration script automatically verifies:
- All tables created
- All ENUM types exist
- All indexes created
- All foreign keys applied
- Initial data seeded

## Expected Execution Time

- **Duration**: ~5-10 seconds
- **Network**: Requires stable connection to Neon PostgreSQL
- **Blocking**: No downtime (tables don't exist yet)

## Database Impact

### Existing Data
- ✅ No changes to existing tables
- ✅ No data migration required
- ✅ No foreign key constraints on existing tables
- ✅ Zero downtime

### New Constraints
- `ai_dialogue_log.user_id` must reference existing users
- `provenance.acquired_by` must reference existing users (nullable)

### Storage
Estimated initial storage:
- Empty tables: ~100 KB
- With indexes: ~200 KB
- After 1000 dialogues: ~2 MB
- After 10,000 dialogues: ~20 MB

## Post-Migration Checklist

- [ ] Migration executed successfully
- [ ] Verification checks passed
- [ ] `plugin_registry` has 2 entries
- [ ] All indexes created
- [ ] Foreign keys exist
- [ ] No error messages in output
- [ ] Execution report generated

## Next Steps After Migration

1. **Integration Testing**
   ```bash
   npm run test:integration
   ```

2. **API Development**
   - Implement RAG dialogue endpoints
   - Add provenance tracking to upload flows
   - Create metrics aggregation cron job

3. **Monitoring Setup**
   - Configure daily metrics collection
   - Set SLO alerting thresholds
   - Enable cost tracking dashboard

4. **Plugin Testing**
   - Verify note.com plugin registration
   - Test plugin health check system
   - Implement plugin discovery API

## Rollback Instructions

If anything goes wrong:

```bash
# Option 1: Use rollback script
psql $DATABASE_URL -f db/migrations/rollback_0006_add_rag_metrics.sql

# Option 2: Manual cleanup
psql $DATABASE_URL
DROP TABLE IF EXISTS ai_dialogue_log CASCADE;
DROP TABLE IF EXISTS provenance CASCADE;
DROP TABLE IF EXISTS rag_metrics_history CASCADE;
DROP TABLE IF EXISTS plugin_registry CASCADE;
DROP TYPE IF EXISTS content_type CASCADE;
DROP TYPE IF EXISTS acquisition_method CASCADE;
DROP TYPE IF EXISTS license_type CASCADE;
```

⚠️ **Warning**: Rollback deletes all data in Phase 2 tables!

## Troubleshooting

### "relation already exists"
✅ Safe to ignore - migrations use IF NOT EXISTS

### "permission denied"
❌ Check DATABASE_URL has CREATE/ALTER privileges

### "foreign key violation"
❌ Ensure base tables (users, materials) exist

### "WebSocket connection failed"
❌ Check network connection to Neon

## Support Resources

- **Full Guide**: `/docs/phase2-migration-guide.md`
- **Schema Docs**: `/db/schema/rag-metrics.ts`
- **Neon Dashboard**: https://console.neon.tech
- **Migration Logs**: Check console output from `npm run db:migrate:phase2`

---

## Ready to Execute?

```bash
# Execute these commands in order:

cd /Users/kimny/Dropbox/_DevProjects/mued/mued_v2

# Test connection first
npm run db:test-connection

# If test passes, run migration
npm run db:migrate:phase2
```

**Estimated completion**: 5-10 seconds

✅ All systems ready for Phase 2 migration!
