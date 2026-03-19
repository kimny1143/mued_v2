-- Add reference track columns to dial_sessions
ALTER TABLE "dial_sessions" ADD COLUMN "reference_track_url" text;
ALTER TABLE "dial_sessions" ADD COLUMN "reference_track_filename" text;
ALTER TABLE "dial_sessions" ADD COLUMN "reference_analysis_result" jsonb;
