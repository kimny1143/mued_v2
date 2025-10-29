# Execute Phase 2 Migration - Simple Guide

## TL;DR

```bash
cd /Users/kimny/Dropbox/_DevProjects/mued/mued_v2

# Test connection
npm run db:test-connection

# Execute migration
npm run db:migrate:phase2
```

Done! Migration will complete in ~5-10 seconds.

---

## What's Happening

This migration adds:
- **RAG Observability**: Track AI dialogues, citations, costs, performance
- **Data Provenance**: GDPR-compliant content tracking with lineage
- **Plugin Registry**: Extensible content source architecture (note.com, etc.)
- **Metrics Dashboard**: Daily aggregated analytics for SLO monitoring

---

## Before You Execute

### Prerequisites Check

- ✅ `.env.local` has `DATABASE_URL` set
- ✅ Database is Neon PostgreSQL
- ✅ Node.js and npm installed
- ✅ No active transactions on database

### What Gets Created

| Item | Count | Description |
|------|-------|-------------|
| Tables | 4 | ai_dialogue_log, provenance, rag_metrics_history, plugin_registry |
| ENUM Types | 3 | content_type, acquisition_method, license_type |
| Indexes | 15+ | Performance optimization for analytics |
| Foreign Keys | 2 | User references for data integrity |
| Initial Data | 2 plugins | note.com and local content sources |

### Safety Features

- ✅ **Idempotent**: Safe to re-run if interrupted
- ✅ **Transaction-wrapped**: Automatic rollback on error
- ✅ **Zero downtime**: No impact on existing tables
- ✅ **Automatic verification**: Built-in checks after execution

---

## Execution Steps

### Step 1: Navigate to Project

```bash
cd /Users/kimny/Dropbox/_DevProjects/mued/mued_v2
```

### Step 2: Test Connection

```bash
npm run db:test-connection
```

**Expected Output:**
```
✅ Connection successful!
✅ No Phase 2 tables found - ready for fresh migration
```

If you see errors, stop and check:
- `DATABASE_URL` in `.env.local`
- Network connection to Neon
- Database credentials

### Step 3: Execute Migration

```bash
npm run db:migrate:phase2
```

**What You'll See:**

```
🚀 Phase 2 Migration Executor

Step 1: Pre-flight checks
──────────────────────────────────────────────────────────────────────
📋 Checking current database state...
✅ No Phase 2 tables found - fresh migration

Step 2: Execute migrations
──────────────────────────────────────────────────────────────────────
📋 Executing: Create RAG metrics tables...
✅ Completed: 0006_add_rag_metrics.sql

📋 Executing: Optimize indexes for analytics queries
✅ Completed: 0007_optimize_rag_indexes.sql

📋 Executing: Add foreign key constraints for data integrity
✅ Completed: 0008_add_foreign_keys_fixed.sql

Step 3: Verify migration results
──────────────────────────────────────────────────────────────────────
✅ Table 'ai_dialogue_log' exists
✅ Table 'provenance' exists
✅ Table 'rag_metrics_history' exists
✅ Table 'plugin_registry' exists
✅ plugin_registry has 2 entries

Registered Plugins:
  - Note.com Integration (note) v1.0.0 ✓
  - Local Materials (local) v1.0.0 ✓

======================================================================
📊 MIGRATION EXECUTION REPORT
======================================================================

✅ Phase 2 Database Setup Complete!

Next Steps:
  1. Review verification output above
  2. Test API endpoints for RAG metrics
  3. Run integration tests: npm run test:integration
======================================================================
```

**Duration**: 5-10 seconds

### Step 4: Verify Success

Migration successful if you see:
- ✅ All "Completed" messages
- ✅ All "exists" verifications
- ✅ "Phase 2 Database Setup Complete!"
- ✅ 2 plugins registered
- ❌ No error messages (except "already exists" warnings are OK)

---

## If Something Goes Wrong

### Migration Failed Midway

**Symptoms**: Red error messages, stopped before "Complete"

**Action**: Check the error message:
- Permission denied? → Check database user privileges
- Foreign key violation? → Ensure `users` table exists
- Connection timeout? → Check network to Neon

**Recovery**:
- Each migration file is transaction-wrapped (automatic rollback)
- Fix the error
- Re-run: `npm run db:migrate:phase2`

### "Table Already Exists" Warnings

**Symptoms**: Yellow ⚠️ warnings about existing tables

**Action**: None needed - this is safe!

**Explanation**: Migrations use `IF NOT EXISTS` clauses. If a previous run was interrupted, re-running will skip already-created items.

### Complete Rollback Needed

**Symptoms**: Need to start over from scratch

**Action**: Run rollback script

```bash
psql $DATABASE_URL -f db/migrations/rollback_0006_add_rag_metrics.sql
```

⚠️ **WARNING**: This deletes all Phase 2 data!

Then re-run migration:
```bash
npm run db:migrate:phase2
```

---

## After Migration

### Immediate Next Steps

1. **Verify in Database** (optional)
   ```bash
   psql $DATABASE_URL -c "\dt" # List tables
   psql $DATABASE_URL -c "SELECT * FROM plugin_registry;"
   ```

2. **Run Integration Tests**
   ```bash
   npm run test:integration
   ```

3. **Start Development**
   - Implement RAG API endpoints using new tables
   - Add provenance tracking to content uploads
   - Create daily metrics aggregation job

### Development Workflow

**New Tables Available:**

```typescript
// Import from schema
import {
  aiDialogueLog,
  provenance,
  ragMetricsHistory,
  pluginRegistry
} from '@/db/schema/rag-metrics';

// Use with Drizzle ORM
const dialogues = await db.select().from(aiDialogueLog);
const plugins = await db.select().from(pluginRegistry);
```

---

## Quick Reference

### Commands

| Command | Purpose |
|---------|---------|
| `npm run db:test-connection` | Test database connection |
| `npm run db:migrate:phase2` | Execute Phase 2 migrations |
| `npm run db:utils verify` | Verify all tables exist |
| `psql $DATABASE_URL` | Connect to database directly |

### Files

| File | Purpose |
|------|---------|
| `/db/migrations/0006_add_rag_metrics.sql` | Core tables |
| `/db/migrations/0007_optimize_rag_indexes.sql` | Performance indexes |
| `/db/migrations/0008_add_foreign_keys_fixed.sql` | Foreign keys (FIXED) |
| `/db/migrations/rollback_0006_add_rag_metrics.sql` | Rollback script |
| `/scripts/run-phase2-migrations.ts` | Automated executor |
| `/docs/phase2-migration-guide.md` | Complete documentation |

### Documentation

- **Quick Start**: This file
- **Complete Guide**: `/docs/phase2-migration-guide.md`
- **Technical Summary**: `/docs/MIGRATION_EXECUTION_SUMMARY.md`
- **Ready Checklist**: `/PHASE2_MIGRATION_READY.md`

---

## Support

### Troubleshooting

See full troubleshooting guide: `/docs/phase2-migration-guide.md#troubleshooting`

### Common Questions

**Q: Can I re-run if it fails?**
A: Yes! All migrations use `IF NOT EXISTS` clauses.

**Q: Will this affect my existing data?**
A: No. Only creates new tables, doesn't touch existing ones.

**Q: How long does it take?**
A: 5-10 seconds for all 3 migration files.

**Q: Can I rollback?**
A: Yes. Use `rollback_0006_add_rag_metrics.sql` script.

**Q: Is this safe for production?**
A: This is designed for development. For production:
   - Review all SQL carefully
   - Test in staging first
   - Schedule maintenance window (though zero downtime)
   - Have backup ready

---

## Ready to Execute?

```bash
# Copy-paste these commands:

cd /Users/kimny/Dropbox/_DevProjects/mued/mued_v2
npm run db:test-connection
npm run db:migrate:phase2
```

✅ Migration complete in ~10 seconds!

---

**Last Updated**: 2025-10-29
**Status**: Ready for Execution
