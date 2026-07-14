-- Paid line — MUEDsp masterchain ($69) interest + purchase ledgers (design #670, conductor-approved).
--
-- Two self-owned, email-keyed, guest-friendly tables:
--   masterchain_interest  (C2) — pre-launch "notify me at launch" signals, SEPARATE from the free
--     MUEDsat/MUEDlim download lists = the un-polluted denominator for the 90-day judgment.
--   masterchain_purchases (C+) — the "客は所有する" buyer record (email + FastSpring-issued license
--     key), recorded regardless of FastSpring = the foundation for a future account/subscription layer.
--
-- PURE ADDITIVE (Tier 2): two new tables + their indexes, no change to any existing table, no backfill.
--
-- WARNING — DEPLOY ORDER: apply this to PRODUCTION Neon BEFORE the code that writes these tables goes
-- live. In practice both writers ship inert (C2 route is gated by MASTERCHAIN_INTEREST_LIVE=off; the
-- C+ FastSpring webhook receives nothing until FastSpring is configured), so a code-first merge is
-- still safe — but apply this migration before flipping the flag / going live on FastSpring. Pure-
-- additive CREATE TABLE is forward-compatible: old code ignores the new tables. Hand-written like
-- 0050–0056 (drizzle-kit journal is stale at 0008). prod apply = kimny (manual psql).

-- ── C2: masterchain interest ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS masterchain_interest (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL UNIQUE,               -- dedup key (one interest row per email)
  locale      text NOT NULL,                       -- 'ja' | 'en'
  source      text NOT NULL,                       -- capture surface, e.g. 'muedsp_masterchain_s1'
  first_touch jsonb,                               -- gaClientId + utm* → channel-level denominator
  user_id     uuid REFERENCES users(id) ON DELETE SET NULL,  -- nullable (guest)
  created_at  timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_masterchain_interest_email      ON masterchain_interest (email);
CREATE INDEX IF NOT EXISTS idx_masterchain_interest_source     ON masterchain_interest (source);
CREATE INDEX IF NOT EXISTS idx_masterchain_interest_created_at ON masterchain_interest (created_at);

-- ── C+: masterchain purchases ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS masterchain_purchases (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                   text NOT NULL UNIQUE, -- FastSpring order id (idempotent join key)
  email                      text NOT NULL,        -- buyer
  license_key                text,                 -- key FastSpring issued (ownership + future acct layer)
  product_id                 text NOT NULL,        -- 'muedsp_masterchain'
  amount_cents               integer,              -- order total (smallest unit)
  currency                   text,                 -- e.g. 'USD'
  buyer_country              text,
  first_touch                jsonb,                -- inherited gaClientId + utm* (attribution)
  fastspring_subscription_id text,                 -- null for buy-once; reserved for future subs
  user_id                    uuid REFERENCES users(id) ON DELETE SET NULL,  -- nullable (guest)
  created_at                 timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_masterchain_purchases_email      ON masterchain_purchases (email);
CREATE INDEX IF NOT EXISTS idx_masterchain_purchases_created_at ON masterchain_purchases (created_at);
