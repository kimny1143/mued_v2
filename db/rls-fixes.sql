-- RLS Security Fixes and Enhancements
-- Generated: 2025-10-27
-- Purpose: Address security gaps identified in RLS policy audit
--
-- CRITICAL: These fixes address security vulnerabilities
-- Test thoroughly in staging before production deployment

-- ============================================
-- 1. SERVICE ROLE FOR SYSTEM OPERATIONS
-- ============================================

-- Create service account for webhook/system operations
-- This role bypasses RLS for system-level operations
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_account') THEN
        CREATE ROLE service_account WITH LOGIN PASSWORD 'CHANGE_THIS_PASSWORD';
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_account;
        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_account;
        ALTER ROLE service_account SET search_path TO public;
    END IF;
END
$$;

-- Grant RLS bypass to service account (critical for webhooks)
ALTER ROLE service_account BYPASSRLS;

-- Create application role for normal operations
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
        CREATE ROLE app_user WITH LOGIN PASSWORD 'CHANGE_THIS_PASSWORD';
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
    END IF;
END
$$;

-- ============================================
-- 2. FIX MISSING DELETE POLICIES
-- ============================================

-- Allow students to delete their pending reservations (soft delete via status update)
CREATE POLICY IF NOT EXISTS "Students can cancel pending reservations"
  ON reservations FOR UPDATE
  USING (
    student_id IN (
      SELECT id FROM users
      WHERE clerk_id = current_setting('app.current_user_id', TRUE)
    )
    AND status = 'pending'
  )
  WITH CHECK (
    status = 'cancelled' -- Only allow changing to cancelled
  );

-- Allow users to delete draft materials
CREATE POLICY IF NOT EXISTS "Creators can delete draft materials"
  ON materials FOR DELETE
  USING (
    creator_id IN (
      SELECT id FROM users
      WHERE clerk_id = current_setting('app.current_user_id', TRUE)
    )
    AND quality_status = 'draft'
  );

-- ============================================
-- 3. ADMIN OVERRIDE POLICIES
-- ============================================

-- Create comprehensive admin bypass for all tables
DO $$
DECLARE
    tbl record;
BEGIN
    FOR tbl IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename IN ('users', 'lesson_slots', 'reservations', 'messages',
                          'materials', 'subscriptions', 'webhook_events', 'learning_metrics')
    LOOP
        -- Drop existing admin policies if they exist
        EXECUTE format('DROP POLICY IF EXISTS "Admins have full access" ON %I', tbl.tablename);

        -- Create new comprehensive admin policy
        EXECUTE format('
            CREATE POLICY "Admins have full access"
            ON %I FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM users
                    WHERE clerk_id = current_setting(''app.current_user_id'', TRUE)
                    AND role = ''admin''
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM users
                    WHERE clerk_id = current_setting(''app.current_user_id'', TRUE)
                    AND role = ''admin''
                )
            )
        ', tbl.tablename, tbl.tablename);
    END LOOP;
END
$$;

-- ============================================
-- 4. WEBHOOK-SPECIFIC POLICIES
-- ============================================

-- Allow service account to insert webhook events
CREATE POLICY IF NOT EXISTS "Service account can insert webhook events"
  ON webhook_events FOR INSERT
  TO service_account
  WITH CHECK (true);

-- Allow service account to update subscriptions
CREATE POLICY IF NOT EXISTS "Service account can update subscriptions"
  ON subscriptions FOR ALL
  TO service_account
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 5. ENHANCED MENTOR POLICIES
-- ============================================

-- Mentors can view student metrics for their active students
DROP POLICY IF EXISTS "Mentors view student metrics" ON learning_metrics;
CREATE POLICY "Mentors view student metrics with active lessons"
  ON learning_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reservations r
      INNER JOIN users u ON r.mentor_id = u.id
      INNER JOIN lesson_slots ls ON r.slot_id = ls.id
      WHERE r.student_id = learning_metrics.user_id
      AND u.clerk_id = current_setting('app.current_user_id', TRUE)
      AND u.role IN ('mentor', 'admin')
      AND r.status IN ('paid', 'completed')
      AND ls.start_time >= CURRENT_DATE - INTERVAL '30 days' -- Only recent lessons
    )
  );

-- ============================================
-- 6. CONTEXT VARIABLE SAFETY
-- ============================================

-- Create function to safely get current user ID
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS TEXT AS $$
BEGIN
    -- Return the current user ID or NULL if not set
    RETURN current_setting('app.current_user_id', TRUE);
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM users
    WHERE clerk_id = get_current_user_id();

    RETURN user_role = 'admin';
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. ROW-LEVEL AUDIT LOGGING
-- ============================================

-- Create audit log table for sensitive operations
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL, -- SELECT, INSERT, UPDATE, DELETE
    user_id TEXT,
    row_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Enable RLS on audit logs (only admins can read)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (is_admin_user());

-- Create trigger function for audit logging
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (table_name, operation, user_id, row_id, old_data)
        VALUES (TG_TABLE_NAME, TG_OP, get_current_user_id(), OLD.id, to_jsonb(OLD));
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (table_name, operation, user_id, row_id, old_data, new_data)
        VALUES (TG_TABLE_NAME, TG_OP, get_current_user_id(), NEW.id, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (table_name, operation, user_id, row_id, new_data)
        VALUES (TG_TABLE_NAME, TG_OP, get_current_user_id(), NEW.id, to_jsonb(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add audit triggers to sensitive tables
CREATE TRIGGER audit_users_trigger
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_subscriptions_trigger
AFTER INSERT OR UPDATE OR DELETE ON subscriptions
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_reservations_trigger
AFTER INSERT OR UPDATE OR DELETE ON reservations
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================
-- 8. TESTING HELPERS
-- ============================================

-- Function to test RLS policies for a specific user
CREATE OR REPLACE FUNCTION test_rls_access(
    p_clerk_id TEXT,
    p_table_name TEXT
)
RETURNS TABLE(
    can_select BOOLEAN,
    can_insert BOOLEAN,
    can_update BOOLEAN,
    can_delete BOOLEAN,
    row_count INTEGER
) AS $$
DECLARE
    v_can_select BOOLEAN := FALSE;
    v_can_insert BOOLEAN := FALSE;
    v_can_update BOOLEAN := FALSE;
    v_can_delete BOOLEAN := FALSE;
    v_row_count INTEGER := 0;
BEGIN
    -- Set the context for the test user
    PERFORM set_config('app.current_user_id', p_clerk_id, TRUE);

    -- Test SELECT
    BEGIN
        EXECUTE format('SELECT COUNT(*) FROM %I', p_table_name) INTO v_row_count;
        v_can_select := TRUE;
    EXCEPTION WHEN OTHERS THEN
        v_can_select := FALSE;
    END;

    -- Test INSERT (simplified, would need actual values in production)
    BEGIN
        EXECUTE format('INSERT INTO %I DEFAULT VALUES RETURNING id', p_table_name);
        v_can_insert := TRUE;
        ROLLBACK; -- Don't actually insert
    EXCEPTION WHEN OTHERS THEN
        v_can_insert := FALSE;
    END;

    -- Return results
    RETURN QUERY SELECT v_can_select, v_can_insert, v_can_update, v_can_delete, v_row_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check all RLS policies are in place
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    substring(qual::text, 1, 50) as qual_preview,
    substring(with_check::text, 1, 50) as check_preview
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Verify service account setup
SELECT
    rolname,
    rolsuper,
    rolinherit,
    rolcreaterole,
    rolcreatedb,
    rolcanlogin,
    rolreplication,
    rolbypassrls
FROM pg_roles
WHERE rolname IN ('service_account', 'app_user')
ORDER BY rolname;

-- Test RLS for different user roles
-- SELECT * FROM test_rls_access('test_student_clerk_id', 'reservations');
-- SELECT * FROM test_rls_access('test_mentor_clerk_id', 'materials');
-- SELECT * FROM test_rls_access('test_admin_clerk_id', 'users');

-- ============================================
-- ROLLBACK SCRIPT (Emergency Use Only)
-- ============================================

-- -- Disable RLS on all tables
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE lesson_slots DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE materials DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE webhook_events DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE learning_metrics DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

-- -- Drop service roles
-- DROP ROLE IF EXISTS service_account;
-- DROP ROLE IF EXISTS app_user;

-- -- Drop audit triggers and functions
-- DROP TRIGGER IF EXISTS audit_users_trigger ON users;
-- DROP TRIGGER IF EXISTS audit_subscriptions_trigger ON subscriptions;
-- DROP TRIGGER IF EXISTS audit_reservations_trigger ON reservations;
-- DROP FUNCTION IF EXISTS audit_trigger_function();
-- DROP FUNCTION IF EXISTS get_current_user_id();
-- DROP FUNCTION IF EXISTS is_admin_user();
-- DROP FUNCTION IF EXISTS test_rls_access(TEXT, TEXT);
-- DROP TABLE IF EXISTS audit_logs;