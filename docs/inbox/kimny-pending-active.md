# kimny手動作業 pending リスト

mued課・conductorがトラッキングする kimny手動作業のリスト。完了次第チェック。

---

## 未完了

### Item #5: Migration 0047 psql適用 (5/13 launch前完納必須)

```bash
psql "$DATABASE_URL" -f db/migrations/0047_add_dial_subs_unique_active_constraint.sql
```

適用確認:
```sql
SELECT indexname FROM pg_indexes
  WHERE tablename = 'dial_subscriptions'
    AND indexname = 'dial_subs_unique_active_per_user';
```

**背景**: PR #334 (feat/dial-subs-partial-unique-index) merge予定 (2026-05-09)。`dial_subscriptions (user_id) WHERE status = 'active'` のDB層重複ガード。API層ガード (PR #331) との多層防御。drizzle-kit history sync未解消のためpsql直接適用。

**deadline**: 5/13 launch当日サブスク購入前（#4と同時実行可）

---

### Item #4: Migration 0046 psql適用 (5/13 launch前完納必須)

```bash
psql "$DATABASE_URL" -c "$(cat db/migrations/0046_add_dial_subscription_events.sql)"
```

適用確認:
```sql
SELECT table_name FROM information_schema.tables
  WHERE table_name = 'dial_subscription_events';
```

**背景**: PR #324 (feat/stripe-subscription-state-ingestion) merge済み (2026-05-09T07:37:46Z)。drizzle-kit history sync未解消のためpsql直接適用が必要 (0045と同方針)。

**deadline**: 5/13 launch当日サブスク購入前

---

## 完了

### Item #1: Neon migration 0045 psql適用 ✅ (2026-05-09)
`ALTER TYPE dial_sub_tier ADD VALUE 'hoo_pass'` — psql直接適用済み確認 (2026-05-09)

### Item #2: Stripe Hoo Pass Product設定 ✅ (確認予定)
Stripe Dashboard: Hoo Pass $5.99/月 Price ID = `STRIPE_DIAL_HOO_PASS_PRICE_ID`

### Item #3: Vercel Production 環境変数設定 ✅ (確認予定)
`STRIPE_DIAL_HOO_PASS_PRICE_ID`, `NEXT_PUBLIC_RESEARCH_BETA=true`, `BLOB_READ_WRITE_TOKEN`
