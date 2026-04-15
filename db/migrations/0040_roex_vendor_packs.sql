-- Migration: 0040_roex_vendor_packs.sql
-- RoEx vendor credit pack tracking (operator-side cost monitoring)
--
-- Records bulk credit purchases made by MUED from RoEx.
-- Enables remaining_credits monitoring for Phase A launch cost baseline.

CREATE TABLE IF NOT EXISTS roex_vendor_packs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchased_at    TIMESTAMP NOT NULL,
  amount_usd      NUMERIC(8, 2) NOT NULL,
  credits_total   INTEGER NOT NULL,
  credits_remaining INTEGER NOT NULL,
  note            TEXT,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_roex_vendor_packs_purchased_at ON roex_vendor_packs(purchased_at DESC);
