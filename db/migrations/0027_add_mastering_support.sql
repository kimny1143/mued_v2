-- Add masteringMode to dial_sessions
ALTER TABLE dial_sessions ADD COLUMN IF NOT EXISTS mastering_mode TEXT;

-- Add 'mastering' to session status enum
ALTER TYPE dial_session_status ADD VALUE IF NOT EXISTS 'mastering';

-- Add 'mastering_preview' to task type enum
ALTER TYPE dial_task_type ADD VALUE IF NOT EXISTS 'mastering_preview';

-- Add new purchase types for mastering
ALTER TYPE dial_purchase_type ADD VALUE IF NOT EXISTS 'omakase_mastering';
ALTER TYPE dial_purchase_type ADD VALUE IF NOT EXISTS 'mastering_omakase';
ALTER TYPE dial_purchase_type ADD VALUE IF NOT EXISTS 'mastering_dialogue';
