# Stripe Subscription State Ingestion — Plan Record

**作成**: 2026-05-09 mud課  
**関連PR**: #324 (feat/stripe-subscription-state-ingestion)

---

## 承認経緯

| 項目 | 詳細 |
|------|------|
| 設計draft | `docs/stripe/subscription-state-ingestion-design-draft.md` (2026-05-08 mud課作成) |
| /plan発動 | 2026-05-09 mud課 `EnterPlanMode` 実行 |
| kimny承認 | `ExitPlanMode` UI承認 → システムメッセージ "User has approved your plan." 受領 |
| 案β採用根拠 | 設計draft「案β推奨（最小差分）」明記 → peer judgment で踏襲 |
| migration方針 | drizzle-kit history sync 未解消のため psql 直接適用 (0045と一貫) → peer judgment |

---

## 実装スコープ

| # | ファイル | 変更 |
|---|---------|------|
| 1 | `db/schema/dial.ts` | `dialSubscriptionEvents` テーブル追加 |
| 2 | `db/migrations/0046_add_dial_subscription_events.sql` | CREATE TABLE + 5 indices |
| 3 | `app/api/webhooks/stripe/route.ts` | handler 4箇所 + `event.id` 引数追加 |
| 4 | `tests/unit/api/stripe-webhook-dial-sub-events.test.ts` | 7 unit tests |

---

## Migration 0046 適用手順 (PR merge後 kimny実行)

```bash
psql "$DATABASE_URL" -c "$(cat db/migrations/0046_add_dial_subscription_events.sql)"
```

適用確認:
```sql
SELECT table_name FROM information_schema.tables
  WHERE table_name = 'dial_subscription_events';
```
