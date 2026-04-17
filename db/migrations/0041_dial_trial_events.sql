-- Migration: 0041_dial_trial_events
-- Add dial_trial_events table for trial funnel measurement

CREATE TABLE IF NOT EXISTS dial_trial_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES dial_sessions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  user_id text,
  guest_token text,
  mode text,
  metadata jsonb,
  created_at timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dial_trial_events_type_created ON dial_trial_events (event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_dial_trial_events_session ON dial_trial_events (session_id);
CREATE INDEX IF NOT EXISTS idx_dial_trial_events_user_funnel ON dial_trial_events (user_id, event_type, created_at);
