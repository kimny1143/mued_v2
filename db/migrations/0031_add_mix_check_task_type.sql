-- Add 'mix_check' to dial_task_type enum (was missing from initial migration)
ALTER TYPE dial_task_type ADD VALUE IF NOT EXISTS 'mix_check';
