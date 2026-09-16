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
-- ★APPLIED TO PRODUCTION 2026-09-16（kimny 逐語「適用可能です」・conductor relay・mued 実行）。
-- ★rc=0 / 11 文すべて成功 / 適用後 masterchain_interest 7 列・masterchain_purchases 16 列
-- （db/schema/masterchain.ts と一致）・★両テーブル 0 行。
-- ★戻し方: DROP TABLE masterchain_purchases, masterchain_interest;（★0 行のうちは無害）
--
-- ★以前ここには「apply this to PRODUCTION BEFORE the code goes live / prod apply = kimny (manual
-- psql)」と書いてあった。★適用が済んだのでその現在形は誤りになる ∴ 事実に差し替えた。
-- ★DEPLOY ORDER の原則自体は変わらない: ★これらのテーブルへ書くコードが live になる前に適用する。
-- ★PURE ADDITIVE ゆえ forward-compatible（古いコードは新しい列を無視する）。
-- ★Hand-written like 0050–0056（drizzle-kit journal is stale at 0008）。
--
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
  license_version            integer,              -- ★keyfile format version (LICENSE_VERSION) — code writes this
  issued_at                  timestamp,            -- ★when we signed it (≠ created_at on re-issue) — code writes this
  eula_version               text,                 -- ★EULA の版（同意の事実を購入行に残す・kimny 2026-09-16）
  eula_accepted_at           timestamptz,          -- ★同意時刻（null 許容＝同意前の行や移行期を壊さない）
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

-- ── ★2026-09-16 追補 — 両方向に idempotent にする ────────────────────────────────────────────────
-- ★CREATE TABLE IF NOT EXISTS は ★テーブルが既に在る環境には ★列を足さない。★本番は ★適用済
-- （2026-09-16・上記）だが、★他の環境（preview / ローカル / 別 clone）は ★未適用・部分適用の
-- どちらもありうる ∴ ★ALTER も併記して
-- ★「無ければ作る／在れば列を足す」の両方を満たす。★再実行しても安全（すべて IF NOT EXISTS）。
--
-- ★license_version / issued_at は ★コードが insert しているのに ★元の CREATE TABLE に無かった
--   （★2026-09-16 に db/schema/masterchain.ts と列単位で突き合わせて検出）。
--   ★このまま適用すると ★最初の本物の注文が INSERT で落ちる。
-- ★eula_* は kimny 逐語（2026-09-16）「適用可能です」＋「EULA 同意の事実を購入行に残す列を同梱」。
ALTER TABLE masterchain_purchases ADD COLUMN IF NOT EXISTS license_version  integer;
ALTER TABLE masterchain_purchases ADD COLUMN IF NOT EXISTS issued_at        timestamp;
ALTER TABLE masterchain_purchases ADD COLUMN IF NOT EXISTS eula_version     text;
ALTER TABLE masterchain_purchases ADD COLUMN IF NOT EXISTS eula_accepted_at timestamptz;
