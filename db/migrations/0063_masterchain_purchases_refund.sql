-- 0063 — masterchain purchases: record a FastSpring refund (return.created) on the purchase row.
-- PURE ADDITIVE; safe to re-run (IF NOT EXISTS). The row is never deleted: it is the record that the
-- purchase happened and the only re-issue / support trail (conductor 2026-09-30).
-- Apply: psql "$DATABASE_URL" -f db/migrations/0063_masterchain_purchases_refund.sql
ALTER TABLE masterchain_purchases ADD COLUMN IF NOT EXISTS refunded_at timestamptz;
ALTER TABLE masterchain_purchases ADD COLUMN IF NOT EXISTS refund_return_id text;
ALTER TABLE masterchain_purchases ADD COLUMN IF NOT EXISTS refund_kind text;

COMMENT ON COLUMN masterchain_purchases.refunded_at IS 'FastSpring return time (data.changed) of a FULL refund or chargeback; null = not refunded. The portal stops showing the key when set.';
COMMENT ON COLUMN masterchain_purchases.refund_return_id IS 'FastSpring return id (data.return) of the most recent return recorded on this order.';
COMMENT ON COLUMN masterchain_purchases.refund_kind IS 'full | partial | chargeback. A partial refund is recorded but leaves the key visible.';
