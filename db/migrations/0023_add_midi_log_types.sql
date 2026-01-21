-- Migration: Add MIDI log types to muednote_daw_action enum
-- Purpose: Support MIDI events (Note On/Off, Control Change, Pitch Bend)
--          recorded during DAW stopped state
-- Date: 2026-01-21

-- Add MIDI action types to the existing enum
-- Note: PostgreSQL enum values cannot be removed, so choose names carefully

ALTER TYPE "public"."muednote_daw_action" ADD VALUE IF NOT EXISTS 'midi_note_on';
ALTER TYPE "public"."muednote_daw_action" ADD VALUE IF NOT EXISTS 'midi_note_off';
ALTER TYPE "public"."muednote_daw_action" ADD VALUE IF NOT EXISTS 'midi_control_change';
ALTER TYPE "public"."muednote_daw_action" ADD VALUE IF NOT EXISTS 'midi_pitch_bend';

-- Column mapping convention for MIDI logs:
-- track_id   → MIDI Channel (0-15)
-- device_id  → -2 (MIDI source identifier, distinguishes from OSC logs which use -1 for track-level)
-- param_id   → Note number (0-127) or CC number (0-127) or 0 for Pitch Bend
-- value      → Normalized value (0.0-1.0): velocity/127 for notes, CC value/127, pitchbend normalized
-- value_string → Human readable: "C4 vel=100", "CC1 = 64", "PitchBend = +8192"
