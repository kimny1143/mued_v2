-- Migration 0044: Add draft_number to dial_sessions
-- title column already exists; only draft_number is new

ALTER TABLE dial_sessions ADD COLUMN draft_number INTEGER NOT NULL DEFAULT 1;
