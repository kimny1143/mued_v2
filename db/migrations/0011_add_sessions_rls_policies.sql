-- ================================================
-- Migration: 0011_add_sessions_rls_policies
-- Row Level Security (RLS) for Session/Interview tables
-- Date: 2025-11-19
-- ================================================

-- ========================================
-- IMPORTANT: Neon PostgreSQL RLS Setup
-- ========================================
-- 1. Clerk userId は users.clerk_id に保存されている
-- 2. RLS ポリシーでは current_setting('app.current_user_id') を使用
-- 3. アプリケーション側で SET LOCAL を実行する必要あり
--    例: SET LOCAL app.current_user_id = 'user_xxx';
-- ========================================

-- ========================================
-- 1. Enable RLS on tables
-- ========================================

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_answers ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 2. Create helper function for user access check
-- ========================================

-- Function: Get internal UUID from Clerk user ID
CREATE OR REPLACE FUNCTION get_internal_user_id(clerk_user_id TEXT)
RETURNS UUID AS $$
DECLARE
  internal_id UUID;
BEGIN
  SELECT id INTO internal_id
  FROM users
  WHERE clerk_id = clerk_user_id;

  RETURN internal_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function: Check if current user is the owner
CREATE OR REPLACE FUNCTION is_session_owner(session_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_clerk_id TEXT;
  current_internal_id UUID;
BEGIN
  -- Get current user's Clerk ID from session variable
  current_clerk_id := current_setting('app.current_user_id', TRUE);

  IF current_clerk_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get internal user ID
  current_internal_id := get_internal_user_id(current_clerk_id);

  RETURN current_internal_id = session_user_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function: Check if current user is a mentor with access
CREATE OR REPLACE FUNCTION is_session_mentor(session_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_clerk_id TEXT;
  current_internal_id UUID;
  current_user_role TEXT;
BEGIN
  -- Get current user's Clerk ID
  current_clerk_id := current_setting('app.current_user_id', TRUE);

  IF current_clerk_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get internal user ID and role
  SELECT id, role INTO current_internal_id, current_user_role
  FROM users
  WHERE clerk_id = current_clerk_id;

  -- Check if user is a mentor
  IF current_user_role != 'mentor' AND current_user_role != 'admin' THEN
    RETURN FALSE;
  END IF;

  -- Check if there's a reservation relationship
  -- (mentor has taught or is teaching this student)
  RETURN EXISTS (
    SELECT 1
    FROM reservations r
    WHERE r.student_id = session_user_id
      AND r.mentor_id = current_internal_id
      AND r.status IN ('approved', 'paid', 'completed')
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ========================================
-- 3. Sessions table RLS policies
-- ========================================

-- Policy: Users can view their own sessions
CREATE POLICY sessions_select_own
  ON sessions
  FOR SELECT
  USING (is_session_owner(user_id));

-- Policy: Users can view public sessions
CREATE POLICY sessions_select_public
  ON sessions
  FOR SELECT
  USING (is_public = TRUE);

-- Policy: Mentors can view sessions shared with them
CREATE POLICY sessions_select_mentor
  ON sessions
  FOR SELECT
  USING (
    share_with_mentor = TRUE
    AND is_session_mentor(user_id)
  );

-- Policy: Users can insert their own sessions
CREATE POLICY sessions_insert_own
  ON sessions
  FOR INSERT
  WITH CHECK (is_session_owner(user_id));

-- Policy: Users can update their own sessions
CREATE POLICY sessions_update_own
  ON sessions
  FOR UPDATE
  USING (is_session_owner(user_id))
  WITH CHECK (is_session_owner(user_id));

-- Policy: Users can delete their own sessions
CREATE POLICY sessions_delete_own
  ON sessions
  FOR DELETE
  USING (is_session_owner(user_id));

-- ========================================
-- 4. Session analyses table RLS policies
-- ========================================

-- Policy: Users can view analyses for their own sessions
CREATE POLICY session_analyses_select_own
  ON session_analyses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = session_analyses.session_id
        AND is_session_owner(sessions.user_id)
    )
  );

-- Policy: Users can view analyses for public sessions
CREATE POLICY session_analyses_select_public
  ON session_analyses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = session_analyses.session_id
        AND sessions.is_public = TRUE
    )
  );

-- Policy: Mentors can view analyses for sessions shared with them
CREATE POLICY session_analyses_select_mentor
  ON session_analyses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = session_analyses.session_id
        AND sessions.share_with_mentor = TRUE
        AND is_session_mentor(sessions.user_id)
    )
  );

-- Policy: System can insert/update analyses (bypass RLS for service accounts)
-- Note: This will be handled by service account with elevated privileges

-- ========================================
-- 5. Interview questions table RLS policies
-- ========================================

-- Policy: Users can view questions for their own sessions
CREATE POLICY interview_questions_select_own
  ON interview_questions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = interview_questions.session_id
        AND is_session_owner(sessions.user_id)
    )
  );

-- Policy: Users can view questions for public sessions
CREATE POLICY interview_questions_select_public
  ON interview_questions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = interview_questions.session_id
        AND sessions.is_public = TRUE
    )
  );

-- Policy: Mentors can view questions for sessions shared with them
CREATE POLICY interview_questions_select_mentor
  ON interview_questions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = interview_questions.session_id
        AND sessions.share_with_mentor = TRUE
        AND is_session_mentor(sessions.user_id)
    )
  );

-- Policy: System can insert questions (AI generation)
-- Note: Handled by service account

-- ========================================
-- 6. Interview answers table RLS policies
-- ========================================

-- Policy: Users can view answers for their own sessions
CREATE POLICY interview_answers_select_own
  ON interview_answers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = interview_answers.session_id
        AND is_session_owner(sessions.user_id)
    )
  );

-- Policy: Users can view answers for public sessions
CREATE POLICY interview_answers_select_public
  ON interview_answers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = interview_answers.session_id
        AND sessions.is_public = TRUE
    )
  );

-- Policy: Mentors can view answers for sessions shared with them
CREATE POLICY interview_answers_select_mentor
  ON interview_answers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = interview_answers.session_id
        AND sessions.share_with_mentor = TRUE
        AND is_session_mentor(sessions.user_id)
    )
  );

-- Policy: Users can insert their own answers
CREATE POLICY interview_answers_insert_own
  ON interview_answers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = interview_answers.session_id
        AND is_session_owner(sessions.user_id)
    )
  );

-- Policy: Users can update their own answers
CREATE POLICY interview_answers_update_own
  ON interview_answers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = interview_answers.session_id
        AND is_session_owner(sessions.user_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = interview_answers.session_id
        AND is_session_owner(sessions.user_id)
    )
  );

-- Policy: Users can delete their own answers
CREATE POLICY interview_answers_delete_own
  ON interview_answers
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = interview_answers.session_id
        AND is_session_owner(sessions.user_id)
    )
  );

-- ========================================
-- 7. Grant permissions to service account
-- ========================================

-- Service account for AI operations (bypasses RLS)
-- This should be configured in application code with elevated privileges

-- Example usage in application:
-- const { data, error } = await supabase
--   .from('session_analyses')
--   .insert({ ... })
--   .select();

-- ========================================
-- 8. Add comments for documentation
-- ========================================

COMMENT ON FUNCTION get_internal_user_id IS 'Converts Clerk user ID to internal UUID';
COMMENT ON FUNCTION is_session_owner IS 'Checks if current user owns the session';
COMMENT ON FUNCTION is_session_mentor IS 'Checks if current user is an authorized mentor for the session owner';

COMMENT ON POLICY sessions_select_own ON sessions IS 'Users can view their own sessions';
COMMENT ON POLICY sessions_select_public ON sessions IS 'Anyone can view public sessions';
COMMENT ON POLICY sessions_select_mentor ON sessions IS 'Mentors can view sessions shared with them';

-- ========================================
-- Migration complete
-- ========================================
