-- One mastering final per session: DB backstop for the advisory-lock + insert-before-charge
-- guard in app/api/dial/mastering/final/route.ts. Prevents two concurrent mastering POSTs
-- from each charging 220cr (the prior findFirst dup-guard was check-then-act, non-atomic).
--
-- Partial unique index — same pattern as dial_sessions_unique_free_campaign_per_user (0048).
-- IF NOT EXISTS so the merge=auto-deploy ordering is safe even if applied manually first
-- (feedback-migration-before-schema-deploy / 6-9 全断教訓: apply to prod BEFORE code merge).
--
-- Pre-check (kimny prod, 2026-06-10): 0 sessions with >1 mastering task (7 mastering rows /
-- 7 distinct sessions) → no dedup needed; the index builds cleanly.
CREATE UNIQUE INDEX IF NOT EXISTS dial_tasks_unique_mastering_per_session
  ON dial_tasks (session_id)
  WHERE task_type = 'mastering';
