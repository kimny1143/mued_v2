# Production Deployment Checklist & Strategy
**System**: MUED LMS v2 - Neon PostgreSQL
**Date**: 2025-10-27
**Risk Level**: MEDIUM-HIGH
**Estimated Duration**: 3-4 hours total (phased)

## Pre-Deployment Checklist

### 📋 1 Week Before Deployment
- [ ] Review all SQL scripts with team
- [ ] Test complete deployment in staging environment
- [ ] Load test staging with RLS enabled
- [ ] Prepare rollback scripts and test them
- [ ] Schedule maintenance window (suggest: Sunday 2-5 AM JST)
- [ ] Notify users of potential brief service interruption
- [ ] Ensure database backups are current

### 🔧 1 Day Before Deployment
- [ ] Final staging environment test
- [ ] Verify all team members are available
- [ ] Create fresh database backup
- [ ] Review monitoring dashboards
- [ ] Prepare incident response plan
- [ ] Test rollback procedure one more time

### 🚀 Day of Deployment
- [ ] Announce maintenance start on status page
- [ ] Create point-in-time recovery backup
- [ ] Have rollback scripts ready
- [ ] Open monitoring dashboards
- [ ] Start deployment log

---

## Phase 1: Index Deployment (30 mins)
**Risk**: LOW | **Rollback Time**: 5 mins | **Downtime**: NONE

### Steps:

1. **Connect to Production Database**
```bash
# Using Neon CLI
neon sql --db-url=$DATABASE_URL

# Or using psql
psql $DATABASE_URL
```

2. **Create Performance Baseline**
```sql
-- Capture current query performance
CREATE TABLE IF NOT EXISTS deployment_metrics AS
SELECT
    current_timestamp as measured_at,
    'pre_deployment' as phase,
    queryid,
    query,
    calls,
    total_time,
    mean_time,
    max_time
FROM pg_stat_statements
WHERE mean_time > 10
ORDER BY mean_time DESC
LIMIT 100;
```

3. **Deploy Indexes (NO DOWNTIME - uses CONCURRENTLY)**
```bash
# Run the index creation script
psql $DATABASE_URL -f db/index-optimization.sql

# Monitor progress
psql $DATABASE_URL -c "SELECT * FROM pg_stat_progress_create_index;"
```

4. **Verify Index Creation**
```sql
-- Check all indexes were created
SELECT
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as size,
    idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY indexname;
```

5. **Test Critical Queries**
```sql
-- Test lesson slot queries
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM lesson_slots
WHERE start_time >= CURRENT_DATE
AND status = 'available'
LIMIT 10;

-- Test reservation queries
EXPLAIN (ANALYZE, BUFFERS)
SELECT r.*, ls.start_time, u.name
FROM reservations r
JOIN lesson_slots ls ON r.slot_id = ls.id
JOIN users u ON r.student_id = u.id
WHERE r.student_id = 'test-user-id'
ORDER BY ls.start_time DESC
LIMIT 10;
```

### ✅ Phase 1 Success Criteria
- [ ] All indexes created successfully
- [ ] No query performance degradation
- [ ] Application functioning normally
- [ ] No error spike in logs

### 🔴 Phase 1 Rollback (if needed)
```sql
-- Drop all new indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_lesson_slots_start_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_messages_reservation_created;
DROP INDEX CONCURRENTLY IF EXISTS idx_materials_tags_gin;
-- ... (rest of indexes)
```

---

## Phase 2: Service Account Setup (15 mins)
**Risk**: MEDIUM | **Rollback Time**: 2 mins | **Downtime**: NONE

### Steps:

1. **Create Service Accounts**
```sql
-- Generate secure passwords
-- Use a password generator for production!
\set service_pwd `openssl rand -base64 32`
\set app_pwd `openssl rand -base64 32`

-- Create roles
CREATE ROLE service_account WITH LOGIN PASSWORD :'service_pwd';
CREATE ROLE app_user WITH LOGIN PASSWORD :'app_pwd';

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_account;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_account;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Enable RLS bypass for service account
ALTER ROLE service_account BYPASSRLS;
```

2. **Update Environment Variables**
```bash
# Update .env.production (or Vercel/platform environment)
SERVICE_DATABASE_URL=postgresql://service_account:PASSWORD@host/database
APP_DATABASE_URL=postgresql://app_user:PASSWORD@host/database

# Keep original DATABASE_URL as fallback
```

3. **Test Connections**
```bash
# Test service account
psql $SERVICE_DATABASE_URL -c "SELECT current_user, current_database();"

# Test app user
psql $APP_DATABASE_URL -c "SELECT current_user, current_database();"
```

### ✅ Phase 2 Success Criteria
- [ ] Service accounts created
- [ ] Connections working
- [ ] Webhook endpoints using service account
- [ ] App using app_user account

### 🔴 Phase 2 Rollback
```sql
-- Remove service accounts
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM service_account;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM app_user;
DROP ROLE IF EXISTS service_account;
DROP ROLE IF EXISTS app_user;

-- Revert to original DATABASE_URL in environment
```

---

## Phase 3: RLS Deployment - Table by Table (2 hours)
**Risk**: HIGH | **Rollback Time**: 5 mins per table | **Downtime**: MINIMAL

### Deployment Order (least to most critical):

#### 3.1 Low-Risk Tables (15 mins each)
Start with tables that have minimal user interaction:

1. **webhook_events table**
```sql
BEGIN;
-- Enable RLS
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Apply policies from rls-policies.sql
\i db/rls-policies.sql -- (only webhook_events section)

-- Test webhook insertion
INSERT INTO webhook_events (event_id, type, source, payload)
VALUES ('test-' || gen_random_uuid(), 'test', 'manual', '{}');

-- If successful
COMMIT;
-- If failed
-- ROLLBACK;
```

2. **learning_metrics table**
```sql
BEGIN;
ALTER TABLE learning_metrics ENABLE ROW LEVEL SECURITY;
-- Apply policies...
-- Test queries...
COMMIT;
```

#### 3.2 Medium-Risk Tables (20 mins each)
Tables with moderate user interaction:

3. **materials table**
```sql
BEGIN;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
-- Apply policies...

-- Test critical queries
SET app.current_user_id = 'test-user-clerk-id';
SELECT * FROM materials WHERE is_public = true LIMIT 1;

COMMIT;
```

4. **messages table**
```sql
-- Similar process...
```

#### 3.3 High-Risk Tables (30 mins each)
Core business logic tables - require careful testing:

5. **subscriptions table**
```sql
BEGIN;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
-- Apply policies including service account policies from rls-fixes.sql

-- Critical: Test Stripe webhook can update
SET ROLE service_account;
UPDATE subscriptions SET updated_at = NOW() WHERE id = 'test-id';
SET ROLE NONE;

COMMIT;
```

6. **reservations table**
```sql
BEGIN;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
-- Apply policies...

-- Test booking flow
SET app.current_user_id = 'test-student-id';
-- Simulate reservation creation
-- Test mentor access
SET app.current_user_id = 'test-mentor-id';
-- Verify mentor can see reservations

COMMIT;
```

7. **lesson_slots table**
```sql
-- Most critical - affects availability display
BEGIN;
ALTER TABLE lesson_slots ENABLE ROW LEVEL SECURITY;
-- Apply policies...

-- Extensive testing of calendar views
-- Test as different user roles

COMMIT;
```

8. **users table**
```sql
-- Most sensitive - do last
BEGIN;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- Apply policies including admin overrides

-- Test authentication still works
-- Test profile updates
-- Test admin access

COMMIT;
```

### After Each Table:
- [ ] Run application health check
- [ ] Check error logs
- [ ] Test specific features using that table
- [ ] Monitor query performance
- [ ] Verify no 403 errors

### ✅ Phase 3 Success Criteria
- [ ] All tables have RLS enabled
- [ ] No permission errors in application
- [ ] Performance within acceptable range (+20% max)
- [ ] All user roles can perform expected actions

### 🔴 Phase 3 Emergency Rollback
```sql
-- Disable RLS on all tables immediately
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_slots DISABLE ROW LEVEL SECURITY;
ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE learning_metrics DISABLE ROW LEVEL SECURITY;

-- Application should immediately return to normal
```

---

## Phase 4: Monitoring & Validation (30 mins)
**Risk**: LOW | **Focus**: Verification

### Performance Monitoring
```sql
-- Compare with baseline
INSERT INTO deployment_metrics
SELECT
    current_timestamp as measured_at,
    'post_deployment' as phase,
    queryid,
    query,
    calls,
    total_time,
    mean_time,
    max_time
FROM pg_stat_statements
WHERE mean_time > 10
ORDER BY mean_time DESC
LIMIT 100;

-- Analyze performance change
SELECT
    pre.query,
    pre.mean_time as pre_deployment_ms,
    post.mean_time as post_deployment_ms,
    round(((post.mean_time - pre.mean_time) / pre.mean_time * 100)::numeric, 2) as change_percent
FROM deployment_metrics pre
JOIN deployment_metrics post ON pre.queryid = post.queryid
WHERE pre.phase = 'pre_deployment'
AND post.phase = 'post_deployment'
ORDER BY abs(post.mean_time - pre.mean_time) DESC;
```

### Security Validation
```sql
-- Test RLS is working
-- As a regular user (should see limited results)
SET app.current_user_id = 'regular-user-id';
SELECT COUNT(*) FROM users; -- Should be 1 (self only)
SELECT COUNT(*) FROM reservations; -- Only own reservations

-- As admin (should see everything)
SET app.current_user_id = 'admin-user-id';
SELECT COUNT(*) FROM users; -- Should see all users
SELECT COUNT(*) FROM reservations; -- Should see all reservations

-- Reset
RESET app.current_user_id;
```

### Application Testing Checklist
- [ ] User registration/login flow
- [ ] Lesson browsing and search
- [ ] Booking creation and payment
- [ ] Message sending between users
- [ ] Material creation and viewing
- [ ] Admin dashboard access
- [ ] Webhook processing (trigger test webhook)

---

## Post-Deployment Tasks

### Immediate (First Hour)
- [ ] Monitor error rates closely
- [ ] Check database connection pool usage
- [ ] Review slow query log
- [ ] Test all critical user journeys
- [ ] Update status page - service operational

### First 24 Hours
- [ ] Monitor index usage statistics
- [ ] Check for any RLS policy violations in logs
- [ ] Review query performance metrics
- [ ] Collect user feedback
- [ ] Document any issues encountered

### First Week
- [ ] Analyze index effectiveness
- [ ] Fine-tune RLS policies if needed
- [ ] Review audit logs for anomalies
- [ ] Plan optimization based on real usage
- [ ] Schedule retrospective meeting

---

## Emergency Contacts & Escalation

### Incident Response Team
1. **Database Lead**: [Name] - [Phone]
2. **Backend Lead**: [Name] - [Phone]
3. **DevOps Lead**: [Name] - [Phone]
4. **Product Manager**: [Name] - [Phone]

### Escalation Path
1. Minor issues (performance degradation < 50%): Continue monitoring
2. Major issues (features broken): Initiate rollback for affected table
3. Critical issues (site down): Full immediate rollback
4. Security breach detected: Isolate database, contact security team

### Communication Channels
- **Slack Channel**: #db-deployment
- **Status Page**: status.mued-lms.com
- **War Room Link**: [Video call link]

---

## Rollback Decision Matrix

| Symptom | Severity | Action | Rollback? |
|---------|----------|--------|-----------|
| Query 2x slower | Low | Monitor & optimize | No |
| Some queries failing | Medium | Fix policies | Partial |
| Auth not working | Critical | Check users table | Yes |
| Payments failing | Critical | Check subscriptions | Yes |
| Site down | Critical | Full rollback | Yes |
| Data exposure | Critical | Disable RLS + investigate | Yes |

---

## Success Metrics

### Target Performance
- Query response time: < 100ms p95
- Error rate: < 0.1%
- Database CPU: < 60%
- Connection pool usage: < 70%

### Expected Improvements
- Lesson search: 85% faster
- Dashboard load: 70% faster
- Reservation list: 90% faster
- Security posture: Significantly enhanced

---

## Lessons Learned Template
(Fill out post-deployment)

### What Went Well
-
-
-

### What Could Be Improved
-
-
-

### Action Items for Next Deployment
-
-
-

---

## Appendix: Quick Commands

```bash
# Monitor active queries
psql $DATABASE_URL -c "SELECT pid, usename, application_name, client_addr, query_start, state, query FROM pg_stat_activity WHERE state = 'active';"

# Check index usage
psql $DATABASE_URL -c "SELECT schemaname, tablename, indexname, idx_scan FROM pg_stat_user_indexes ORDER BY idx_scan;"

# View slow queries
psql $DATABASE_URL -c "SELECT query, calls, mean_time, max_time FROM pg_stat_statements WHERE mean_time > 100 ORDER BY mean_time DESC LIMIT 10;"

# Emergency connection termination
psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active' AND query_start < NOW() - INTERVAL '5 minutes';"
```

---

**Document Status**: READY FOR REVIEW
**Last Updated**: 2025-10-27
**Next Review**: Pre-deployment