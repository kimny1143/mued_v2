-- Migration: 0039_glasswerks_inquiries.sql
-- Phase 2: glasswerks service inquiry tracking via Hoo MCP

CREATE TABLE IF NOT EXISTS glasswerks_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  clerk_id TEXT NOT NULL,

  -- Inquiry details
  service_type TEXT NOT NULL,
  budget_range TEXT NOT NULL,
  description TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'flexible',
  language TEXT NOT NULL DEFAULT 'ja',

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  quoted_amount INTEGER,

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  quoted_at TIMESTAMP,
  resolved_at TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_glasswerks_inquiries_user_id ON glasswerks_inquiries(user_id);
CREATE INDEX idx_glasswerks_inquiries_status ON glasswerks_inquiries(status);
CREATE INDEX idx_glasswerks_inquiries_created_at ON glasswerks_inquiries(created_at DESC);
