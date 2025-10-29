# Phase 2 Database Migration Guide

## Overview

This guide covers the execution of Phase 2 database migrations for the MUED LMS v2 RAG (Retrieval-Augmented Generation) system.

**Migration Date**: 2025-10-29
**Database**: Neon PostgreSQL
**ORM**: Drizzle ORM

## What's Being Added

### New Tables

1. **ai_dialogue_log**: RAG dialogue logs with citation tracking
   - Stores user queries and AI responses
   - Tracks citations, latency, token costs, and quality metrics
   - Enables performance monitoring and quality analysis

2. **provenance**: Data provenance tracking for compliance
   - Tracks source, license, and rights for all content
   - GDPR-compliant data retention policies
   - C2PA digital signature support
   - Multi-content-type support (materials, AI responses, articles, etc.)

3. **rag_metrics_history**: Daily aggregated metrics for SLO monitoring
   - Citation rates, latency percentiles, cost tracking
   - Quality metrics (relevance scores, user feedback)
   - SLO compliance tracking

4. **plugin_registry**: Extensible content source registry
   - Plugin architecture for content integrations (note.com, local, etc.)
   - Capability definitions (list, search, filter, fetch, transform)
   - Health check status tracking

### ENUM Types

- `content_type`: material, creation_log, generated, note_article, ai_response
- `acquisition_method`: api_fetch, manual_upload, ai_generated, user_created, system_import
- `license_type`: cc_by, cc_by_sa, cc_by_nc, cc_by_nc_sa, proprietary, mit, apache_2_0, all_rights_reserved, public_domain

### Indexes

**Performance Optimization Indexes:**
- User dialogue history: `idx_ai_dialogue_user_created`
- Retention policy enforcement: `idx_provenance_expiring` (partial index)
- Daily metrics: `idx_rag_metrics_date_unique` (unique constraint)
- Active plugin discovery: `idx_plugin_enabled_healthy` (partial index)

### Foreign Keys

- `ai_dialogue_log.user_id` → `users.id` (ON DELETE CASCADE)
- `provenance.acquired_by` → `users.id` (ON DELETE SET NULL)

**Note**: `provenance.content_id` is **polymorphic** and does NOT have a foreign key constraint. It can reference different tables based on `content_type` (e.g., `materials`, `ai_dialogue_log`). Validation is handled at the application level.

## Migration Files

### 0006_add_rag_metrics.sql

**Purpose**: Create core RAG tracking tables

**Changes:**
- Creates `ai_dialogue_log` table with RAG metrics columns
- Creates `provenance` table for data lineage tracking
- Creates `rag_metrics_history` for daily aggregations
- Creates `plugin_registry` for content source management
- Creates ENUM types for structured data
- Adds basic indexes for performance
- Seeds initial plugin entries (note.com, local)

**Safety**: Uses `IF NOT EXISTS` clauses - safe to re-run

### 0007_optimize_rag_indexes.sql

**Purpose**: Performance optimization for analytics queries

**Changes:**
- Composite index for user dialogue history
- Partial index for retention policy queries
- Unique constraint on daily metrics
- Partial index for active plugin discovery
- Database-level comments for documentation

**Safety**: Uses `IF NOT EXISTS` clauses - safe to re-run

### 0008_add_foreign_keys_fixed.sql

**Purpose**: Add referential integrity constraints

**Changes:**
- Foreign key: `ai_dialogue_log.user_id` → `users.id`
- Foreign key: `provenance.acquired_by` → `users.id`
- Verification query to confirm constraint creation
- Documentation comments for polymorphic design

**Important Fix**: Removed `provenance.content_id` foreign key constraint because content_id is polymorphic (can reference multiple tables). This is the **fixed** version that should be used instead of `0008_add_foreign_keys.sql`.

**Safety**: Uses `IF NOT EXISTS` clauses - safe to re-run

## Pre-Migration Checklist

- [ ] Backup database (recommended, though migrations are reversible)
- [ ] Verify `DATABASE_URL` in `.env.local`
- [ ] Ensure no active transactions on target tables
- [ ] Review migration SQL files
- [ ] Test database connection: `npm run db:test-connection`

## Execution Steps

### Step 1: Test Database Connection

```bash
npm run db:test-connection
```

**Expected Output:**
```
✅ Connection successful!

Database Info:
──────────────────────────────────────────────────────────────────────
  Database: neondb
  Server Time: 2025-10-29 12:00:00.000000+00
  PostgreSQL Version: PostgreSQL 16.x
──────────────────────────────────────────────────────────────────────

📋 Existing tables:
  - users
  - lesson_slots
  - reservations
  - materials
  ... (other existing tables)

✅ No Phase 2 tables found - ready for fresh migration
```

### Step 2: Execute Migrations

```bash
npm run db:migrate:phase2
```

**What Happens:**
1. Pre-flight checks (verifies current state)
2. Executes migrations in sequence:
   - 0006_add_rag_metrics.sql
   - 0007_optimize_rag_indexes.sql
   - 0008_add_foreign_keys_fixed.sql
3. Verifies results (tables, indexes, constraints)
4. Generates execution report

**Expected Output:**
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
✅ ENUM type 'content_type' exists
✅ ENUM type 'acquisition_method' exists
✅ ENUM type 'license_type' exists
✅ Index 'idx_ai_dialogue_user' exists
...
✅ Foreign key 'fk_ai_dialogue_user' exists
✅ Foreign key 'fk_provenance_acquired_by' exists
✅ plugin_registry has 2 entries

Registered Plugins:
  - Note.com Integration (note) v1.0.0 ✓
  - Local Materials (local) v1.0.0 ✓

======================================================================
📊 MIGRATION EXECUTION REPORT
======================================================================

📅 Execution Details:
  Start Time:     2025-10-29T12:00:00.000Z
  End Time:       2025-10-29T12:00:05.000Z
  Duration:       5.23s

📋 Executed Migrations:
  1. 0006_add_rag_metrics.sql
     Create RAG metrics tables...
  2. 0007_optimize_rag_indexes.sql
     Optimize indexes for analytics queries
  3. 0008_add_foreign_keys_fixed.sql
     Add foreign key constraints for data integrity

✅ Phase 2 Database Setup Complete!

Next Steps:
  1. Review verification output above
  2. Test API endpoints for RAG metrics
  3. Run integration tests: npm run test:integration
  4. Check plugin health: tsx scripts/db-utilities.ts check-plugins

======================================================================
```

### Step 3: Verify Results (Manual Check)

```bash
# Connect to database using psql
psql $DATABASE_URL

# Check tables
\dt

# Check ENUM types
\dT

# Check indexes
\di

# Check foreign keys
\d ai_dialogue_log
\d provenance

# Check plugin registry data
SELECT * FROM plugin_registry;

# Exit psql
\q
```

## Post-Migration Verification

### Automated Verification

The migration script automatically verifies:
- All tables created
- All ENUM types created
- All indexes created
- All foreign keys created
- Initial plugin data seeded

### Manual Testing

```bash
# Run integration tests
npm run test:integration

# Verify database structure
npm run db:verify
```

## Rollback (If Needed)

A rollback script is available at:
`/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/db/migrations/rollback_0006_add_rag_metrics.sql`

**To rollback:**

```bash
psql $DATABASE_URL -f db/migrations/rollback_0006_add_rag_metrics.sql
```

**⚠️ Warning**: Rollback will delete all data in Phase 2 tables!

## Troubleshooting

### Error: "relation already exists"

**Cause**: Tables already exist from a previous migration attempt

**Solution**: Safe to ignore. The migrations use `IF NOT EXISTS` clauses. Re-run the migration to complete any missing steps.

### Error: "permission denied"

**Cause**: Database user lacks necessary privileges

**Solution**: Ensure `DATABASE_URL` points to a user with CREATE, ALTER, and INDEX privileges.

### Error: "foreign key constraint violation"

**Cause**: Attempting to reference non-existent users or materials

**Solution**: Ensure base tables (`users`, `materials`) are populated before adding dependent data.

### Error: "WebSocket connection failed"

**Cause**: Neon requires WebSocket support for connections

**Solution**: The script configures this automatically. If error persists, check network connectivity and firewall settings.

## Schema Documentation

### ai_dialogue_log

**Purpose**: Store RAG dialogue interactions with full observability

**Key Columns:**
- `citations`: JSONB array of citation objects
- `latency_ms`: Response time for performance monitoring
- `citation_rate`: Percentage of response backed by citations (0-100)
- `token_cost_jpy`: Cost in Japanese Yen
- `relevance_score`: AI response quality score (0-1)
- `user_feedback`: User rating (-1: negative, 0: neutral, 1: positive)

**Use Cases:**
- Performance monitoring (latency, cost)
- Quality analysis (citation rates, relevance)
- User feedback tracking
- Cost attribution per user/session

### provenance

**Purpose**: Track data lineage for compliance and transparency

**Key Columns:**
- `content_type`: Type of content (polymorphic reference)
- `source_uri`: Original source URL
- `license_type`: Legal license (ENUM)
- `acquisition_method`: How content was obtained (ENUM)
- `hash_c2pa`: C2PA digital signature for authenticity
- `retention_years`: GDPR retention policy
- `permission_flag`: Whether permission to use was obtained

**Use Cases:**
- GDPR compliance (data retention, right to be forgotten)
- Content attribution and licensing
- Audit trails for content usage
- Digital signature verification (C2PA)

### rag_metrics_history

**Purpose**: Daily aggregated metrics for dashboard and SLO monitoring

**Key Columns:**
- `date`: Aggregation date (unique constraint)
- `citation_rate`: Average citation rate
- `latency_p50_ms`, `latency_p95_ms`, `latency_p99_ms`: Latency percentiles
- `cost_per_answer`: Average cost per response
- `slo_compliance`: JSONB with SLO target achievement flags

**Use Cases:**
- Daily dashboard metrics
- SLO monitoring and alerting
- Historical trend analysis
- Cost tracking and forecasting

### plugin_registry

**Purpose**: Extensible plugin architecture for content sources

**Key Columns:**
- `name`: Human-readable plugin name
- `source`: Unique identifier (e.g., "note", "local")
- `capabilities`: JSONB defining supported operations
- `enabled`: Whether plugin is active
- `health_status`: Current health check status

**Use Cases:**
- Dynamic content source discovery
- Plugin capability negotiation
- Health monitoring
- Configuration management

## Next Steps After Migration

1. **API Integration**
   - Implement RAG API endpoints using new tables
   - Test citation tracking in AI responses
   - Verify provenance recording for uploaded content

2. **Monitoring Setup**
   - Configure daily metrics aggregation job
   - Set up SLO alerting thresholds
   - Enable cost tracking dashboard

3. **Plugin Development**
   - Test note.com integration
   - Implement plugin health checks
   - Add new content source plugins as needed

4. **Testing**
   - Run integration tests: `npm run test:integration`
   - Test E2E flows with RAG features
   - Verify GDPR compliance workflows

5. **Documentation**
   - Update API documentation with new endpoints
   - Document plugin development guidelines
   - Add user-facing documentation for new features

## Related Files

- Migration scripts: `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/db/migrations/`
- Schema definition: `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/db/schema/rag-metrics.ts`
- Execution script: `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/scripts/run-phase2-migrations.ts`
- Rollback script: `/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/db/migrations/rollback_0006_add_rag_metrics.sql`

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review migration logs
3. Consult schema documentation
4. Check Neon PostgreSQL logs in dashboard
