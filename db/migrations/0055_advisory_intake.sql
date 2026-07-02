-- 0055_advisory_intake.sql
-- MUED Advisory storefront #8 — intake tables (additive / Tier 2).
-- Anonymous-friendly (no users FK): the public advisory LP books the free 60-min 壁打ち without sign-in.
-- Apply to prod BEFORE the /api/advisory routes deploy (kimny専管 — table-first ordering avoids
-- first-booking 500s / lost KPI rows). See db/schema/advisory.ts.

CREATE TABLE IF NOT EXISTS advisory_slots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_time  timestamp NOT NULL,
  end_time    timestamp NOT NULL,
  status      text NOT NULL DEFAULT 'open',   -- 'open' | 'booked' | 'closed'
  inquiry_id  uuid,                           -- advisory_inquiries.id that claimed this slot
  created_at  timestamp NOT NULL DEFAULT now(),
  updated_at  timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_advisory_slots_status_start ON advisory_slots (status, start_time);

CREATE TABLE IF NOT EXISTS advisory_inquiries (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type                    text NOT NULL,                 -- 'inquiry' | 'booking'
  status                  text NOT NULL DEFAULT 'new',   -- 'new' | 'booked' | 'completed' | 'cancelled'
  name                    text,
  email                   text NOT NULL,
  locale                  text NOT NULL DEFAULT 'ja',    -- 'ja' | 'en'
  product                 text,                          -- 'wallhit'|'diagnosis'|'build'|'run'|null
  message                 text,
  slot_id                 uuid,                          -- claimed advisory_slots.id
  scheduled_at            timestamp,                     -- denormalized slot start (KPI + .ics + email)
  meeting_url             text,                          -- fixed Google Meet link (ADVISORY_MEET_URL)
  recording_consent       boolean NOT NULL DEFAULT false,
  consent_policy_version  text,
  consent_locale          text,
  consent_at              timestamp,
  completed_at            timestamp,                     -- conducted flag (kimny one-tap) → bookings_conducted
  cancelled_at            timestamp,
  source                  text,
  utm_source              text,
  utm_medium              text,
  utm_campaign            text,
  created_at              timestamp NOT NULL DEFAULT now(),
  updated_at              timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_advisory_inquiries_type         ON advisory_inquiries (type);
CREATE INDEX IF NOT EXISTS idx_advisory_inquiries_status       ON advisory_inquiries (status);
CREATE INDEX IF NOT EXISTS idx_advisory_inquiries_created_at   ON advisory_inquiries (created_at);
CREATE INDEX IF NOT EXISTS idx_advisory_inquiries_completed_at ON advisory_inquiries (completed_at);
