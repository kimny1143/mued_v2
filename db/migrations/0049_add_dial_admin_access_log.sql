-- Admin read-access audit log: records every admin view/listen/download of a
-- non-owned dial session (security-sensitive). Idempotent (IF NOT EXISTS).
--
-- ⚠️ DEPLOY ORDER: apply this to production Neon BEFORE merging/deploying the code
-- that writes to it (recordAdminAccess). Merge = Vercel auto-deploy, so code-first
-- would write to a missing table. (Lesson from migration 0048 / 2026-06-09 outage.)
CREATE TABLE IF NOT EXISTS dial_admin_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id TEXT NOT NULL,
  admin_email TEXT NOT NULL,
  target_session_id UUID NOT NULL,
  access_type TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dial_admin_access_target ON dial_admin_access_log(target_session_id);
CREATE INDEX IF NOT EXISTS idx_dial_admin_access_created ON dial_admin_access_log(created_at);
CREATE INDEX IF NOT EXISTS idx_dial_admin_access_admin ON dial_admin_access_log(admin_user_id);
