-- v1.3.0: Add activity_type and mood to mobile sessions
-- Non-breaking: both columns are nullable, existing data unaffected

ALTER TABLE "muednote_mobile_sessions"
  ADD COLUMN "activity_type" text,
  ADD COLUMN "mood" text;
