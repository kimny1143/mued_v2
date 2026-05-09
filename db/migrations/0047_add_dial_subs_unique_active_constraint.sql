-- Partial unique index: only one active subscription per user
-- Race-condition safety net on top of the API-layer guard (PR #319/#331).
-- Applied via psql directly (drizzle-kit history sync pending, backlog D).
CREATE UNIQUE INDEX dial_subs_unique_active_per_user
  ON dial_subscriptions (user_id)
  WHERE status = 'active';
