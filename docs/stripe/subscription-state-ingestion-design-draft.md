# Stripe Subscription State Ingestion — 事前設計draft

**作成**: 2026-05-08 mud課  
**目的**: data scorecard v3 D30/D60 retention計測のための subscription state変化ingestion設計  
**/plan対象**: 5/14以降セッションで `/plan` 発動時の参照素材  
**Tier**: Tier 3（DBスキーマ追加 + webhookハンドラ修正）  

---

## 背景・課題

### data scorecard v3 のKPI要件

D30/D60 retention計測には以下が必要:
- ユーザーがいつ `active` → `cancelled` に遷移したか
- ユーザーがいつ `active` → `past_due` に遷移したか  
- `past_due` → `active` (回収成功) の時刻
- `checkout.session.completed` (購入) からD30/D60時点での status

### 現状のギャップ

`dialSubscriptions.status` は **in-place上書き** — 遷移履歴が失われる:

```
// handleDialSubscriptionUpdated: 現在の実装
await tx.update(dialSubscriptions).set({ status: statusMap[subscription.status] }).where(...)
// → 旧statusを上書き。いつcancelledになったか追跡不可
```

`webhookEvents` テーブルは payload全体を保存するが、SQL集計に適したインデックス・構造がない。

---

## 設計方針

### 新テーブル: `dial_subscription_events`

状態遷移ログ専用テーブル。既存テーブルは変更しない（非破壊）。

```sql
CREATE TABLE dial_subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES dial_subscriptions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,                          -- denormalized for query performance
  event_type TEXT NOT NULL,                       -- stripe event type (e.g. customer.subscription.updated)
  stripe_event_id TEXT NOT NULL UNIQUE,           -- idempotency (webhookEvents.eventId と同期)
  from_status TEXT,                               -- status before change (null if first event)
  to_status TEXT NOT NULL,                        -- status after change
  cancel_at_period_end BOOLEAN,
  current_period_end TIMESTAMP,
  stripe_subscription_id TEXT NOT NULL,
  occurred_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dial_sub_events_user_id ON dial_subscription_events(user_id);
CREATE INDEX idx_dial_sub_events_sub_id ON dial_subscription_events(subscription_id);
CREATE INDEX idx_dial_sub_events_occurred_at ON dial_subscription_events(occurred_at);
CREATE INDEX idx_dial_sub_events_to_status ON dial_subscription_events(to_status);
```

#### Drizzle スキーマ (`db/schema/dial.ts` に追加)

```ts
export const dialSubscriptionEvents = pgTable('dial_subscription_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  subscriptionId: uuid('subscription_id').notNull().references(() => dialSubscriptions.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  eventType: text('event_type').notNull(),
  stripeEventId: text('stripe_event_id').notNull().unique(),
  fromStatus: text('from_status'),
  toStatus: text('to_status').notNull(),
  cancelAtPeriodEnd: boolean('cancel_at_period_end'),
  currentPeriodEnd: timestamp('current_period_end'),
  stripeSubscriptionId: text('stripe_subscription_id').notNull(),
  occurredAt: timestamp('occurred_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_dial_sub_events_user_id').on(table.userId),
  subIdIdx: index('idx_dial_sub_events_sub_id').on(table.subscriptionId),
  occurredAtIdx: index('idx_dial_sub_events_occurred_at').on(table.occurredAt),
  toStatusIdx: index('idx_dial_sub_events_to_status').on(table.toStatus),
}));
```

---

## Webhook Handler 修正計画

### 対象イベント

| Stripeイベント | 現在の処理 | 追加する処理 |
|---------------|-----------|------------|
| `checkout.session.completed` (mode=subscription) | `dialSubscriptions` upsert | `dial_subscription_events` insert (toStatus='active') |
| `customer.subscription.updated` | `handleDialSubscriptionUpdated` | 同関数末尾に event insert 追加 |
| `customer.subscription.deleted` | `handleDialSubscriptionDeleted` | 同関数末尾に event insert 追加 |
| `invoice.payment_failed` | MUEDnote側のみ処理、Dial側なし | Dial subscriptionが存在すれば event insert 追加 |

### 変更箇所 (`app/api/webhooks/stripe/route.ts`)

#### A. `handleDialSubscriptionUpdated` 末尾に追加

```ts
// 既存の update が完了した後
async function handleDialSubscriptionUpdated(tx, subscription, eventId) {
  const [existingSub] = await tx.select().from(dialSubscriptions)
    .where(eq(dialSubscriptions.stripeSubscriptionId, subscription.id)).limit(1);
  if (!existingSub) { ... }

  const prevStatus = existingSub.status; // キャプチャ
  const newStatus = statusMap[subscription.status] || 'active';

  await tx.update(dialSubscriptions).set({ status: newStatus, ... }).where(...);

  // ← 追加: state change log
  await tx.insert(dialSubscriptionEvents).values({
    subscriptionId: existingSub.id,
    userId: existingSub.userId,
    eventType: 'customer.subscription.updated',
    stripeEventId: eventId,
    fromStatus: prevStatus,
    toStatus: newStatus,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    stripeSubscriptionId: subscription.id,
  });
}
```

`eventId` は `processStripeEvent(tx, event)` の `event.id` を引数に追加して渡す（または関数シグネチャ拡張）。

#### B. `handleDialSubscriptionDeleted` 末尾に追加

同様に `fromStatus: existingSub.status`, `toStatus: 'cancelled'` で insert。

#### C. `handleDialCheckoutCompleted` (subscription mode) 末尾に追加

`toStatus: 'active'`, `fromStatus: null` で insert。

#### D. `invoice.payment_failed` Dial用ハンドラ追加 (新規関数)

```ts
async function handleDialPaymentFailed(tx, invoice, eventId) {
  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription : invoice.subscription?.id;
  if (!subscriptionId) return;

  const [dialSub] = await tx.select().from(dialSubscriptions)
    .where(eq(dialSubscriptions.stripeSubscriptionId, subscriptionId)).limit(1);
  if (!dialSub) return; // not a dial subscription

  await tx.insert(dialSubscriptionEvents).values({
    subscriptionId: dialSub.id,
    userId: dialSub.userId,
    eventType: 'invoice.payment_failed',
    stripeEventId: eventId,
    fromStatus: dialSub.status,
    toStatus: 'past_due',
    cancelAtPeriodEnd: dialSub.cancelAtPeriodEnd,
    currentPeriodEnd: dialSub.currentPeriodEnd,
    stripeSubscriptionId: subscriptionId,
  });
}
```

`invoice.payment_failed` case 内で `dialSub` 存在チェック後に呼び出す。

---

## Migration

```sql
-- db/migrations/00xx_add_dial_subscription_events.sql
CREATE TABLE dial_subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES dial_subscriptions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  stripe_event_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  cancel_at_period_end BOOLEAN,
  current_period_end TIMESTAMP,
  stripe_subscription_id TEXT NOT NULL,
  occurred_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_dial_sub_events_stripe_event_id ON dial_subscription_events(stripe_event_id);
CREATE INDEX idx_dial_sub_events_user_id ON dial_subscription_events(user_id);
CREATE INDEX idx_dial_sub_events_sub_id ON dial_subscription_events(subscription_id);
CREATE INDEX idx_dial_sub_events_occurred_at ON dial_subscription_events(occurred_at);
CREATE INDEX idx_dial_sub_events_to_status ON dial_subscription_events(to_status);
```

---

## data scorecard v3 クエリ例

### D30 retention (active→still active at D30)

```sql
-- 購入から30日後の status
SELECT
  e_create.user_id,
  e_create.occurred_at AS subscribed_at,
  COALESCE(e_cancel.occurred_at, '9999-01-01') AS cancelled_at,
  CASE WHEN e_cancel.occurred_at IS NULL
         OR e_cancel.occurred_at > e_create.occurred_at + INTERVAL '30 days'
    THEN 1 ELSE 0
  END AS retained_d30
FROM dial_subscription_events e_create
LEFT JOIN dial_subscription_events e_cancel
  ON e_cancel.subscription_id = e_create.subscription_id
  AND e_cancel.to_status = 'cancelled'
  AND e_cancel.occurred_at >= e_create.occurred_at
WHERE e_create.to_status = 'active'
  AND e_create.from_status IS NULL  -- initial purchase
  AND e_create.occurred_at >= NOW() - INTERVAL '60 days';
```

### past_due回収率

```sql
SELECT
  COUNT(*) FILTER (WHERE to_status = 'past_due') AS total_past_due,
  COUNT(*) FILTER (WHERE to_status = 'active' AND from_status = 'past_due') AS recovered,
  ROUND(100.0 * COUNT(*) FILTER (WHERE to_status = 'active' AND from_status = 'past_due')
    / NULLIF(COUNT(*) FILTER (WHERE to_status = 'past_due'), 0), 1) AS recovery_rate_pct
FROM dial_subscription_events
WHERE occurred_at >= NOW() - INTERVAL '30 days';
```

---

## 変更ファイル一覧 (/plan時の作業スコープ)

| # | ファイル | 変更内容 |
|---|---------|---------|
| 1 | `db/schema/dial.ts` | `dialSubscriptionEvents` テーブル追加 |
| 2 | `db/migrations/00xx_add_dial_subscription_events.sql` | 新規migration |
| 3 | `app/api/webhooks/stripe/route.ts` | handler 4箇所修正 + eventId引数追加 |
| 4 | `tests/unit/api/stripe-webhook-dial-sub-events.test.ts` | 状態遷移ログ単体テスト |

→ 4ファイル変更 + DB schema = **Tier 3 (conductor merge)**

---

## リスク / 留意事項

1. **冪等性**: `stripe_event_id` UNIQUE制約で重複insert防止。Stripe再送でも安全。
2. **eventId引数**: `processStripeEvent(tx, event)` の `event.id` を handler関数に伝播させる方法は2案:
   - 案α: `processStripeEvent` シグネチャに `eventId` 追加 → 全handler関数に伝播（変更多め）
   - 案β: `event.id` を closure/contextとして扱うよりシンプル: `handleDialSubscriptionUpdated(tx, subscription, event.id)` 個別追加
   - → 案β推奨（最小差分）
3. **既存データのバックフィル**: 5/13 launch後のデータのみ対象。過去データは `webhookEvents.payload` 参照可能だが複雑なため対象外。
4. **`invoice.payment_failed` のDial handler**: 現在Dial subscriptionへの `past_due` 更新は `customer.subscription.updated` で間接的に処理されるが、`payment_failed` → `past_due` の遷移ログとして明示的に追記する価値あり。
5. **data課連携**: クエリ設計はdata課 (`cry4z0v8`) がscorecard v3で担当。本draftはDB設計のみ。クエリはdata課に渡す。

---

## 関連ファイル (参照用)

- `app/api/webhooks/stripe/route.ts:1112-1189` — 既存 handleDialSubscription* 実装
- `db/schema/dial.ts:251-270` — `dialSubscriptions` テーブル定義
- `webhookEvents` テーブル — 全Stripe eventのraw payload保存 (既存)
- `memory/project-q3ga-backlog.md` — Q3 GA前 backlog（CCO watch items含む）
