-- Migration: Add retake control columns to dial_sessions
-- and add 'additional_cycle' to dial_purchase_type enum

-- Add retake control columns to dial_sessions
ALTER TABLE dial_sessions
  ADD COLUMN IF NOT EXISTS paid_cycle_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS base_cycle_limit INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS additional_cycles_purchased INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS additional_cycle_limit INTEGER NOT NULL DEFAULT 5;

-- Add 'additional_cycle' to the purchase type enum
ALTER TYPE dial_purchase_type ADD VALUE IF NOT EXISTS 'additional_cycle';
