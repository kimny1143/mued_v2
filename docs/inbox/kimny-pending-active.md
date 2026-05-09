# kimny手動作業 pending リスト

mued課・conductorがトラッキングする kimny手動作業のリスト。完了次第チェック。

---

## 未完了

### Item #7: GA4 Measurement Protocol API secret 作成 (5/12 EOD前必須)

GA4 Admin → Data Streams → 対象ストリーム → Measurement Protocol API secrets → 「Create」で新規secret生成。生成されたsecretを `GA4_MP_API_SECRET` としてVercel Production環境変数に設定。

確認手順:
1. GA4 Property: glasswerks inc. の MUEDial / mued.jp プロパティ
2. Admin → Data Streams → Web stream → Measurement Protocol API secrets
3. 新規secret作成 → secret value をコピー
4. Vercel Dashboard → Project → Settings → Environment Variables → `GA4_MP_API_SECRET` 追加

**背景**: H-188 GA4 purchase event実装 (5/12前PR) でserver-side Measurement Protocolを使用。未設定時はsilent skip (fail-open) で本番への影響なし。ただし設定することでpurchase eventが計測可能になり、Window A first-lookの転換率計算が有効化される。

**deadline**: 5/12 EOD (5/13 launch前)

---

### Item #6: Google Search Console `mued.jp` プロパティ確認 (5/12 EOD前必須)

GSCは「設定後のデータのみ」記録します。5/13 launch後の検索クリックデータ取得のため、5/12 EOD前に確認が必要です。

確認手順:
1. https://search.google.com/search-console にアクセス
2. `mued.jp` プロパティが「確認済み」状態にあるか確認
3. 未確認の場合: `https://mued.jp/googleec54d2b363ee969c.html` がアクセス可能なことを確認し、GSCで「確認」を実行

（コードベースに `public/googleec54d2b363ee969c.html` 存在確認済み。Vercelデプロイ済みなら検証ファイルは配信されているはず）

**背景**: reserch課 H-136依頼 (2026-05-09)

**deadline**: 5/12 EOD

---

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
