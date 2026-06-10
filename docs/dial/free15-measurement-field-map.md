# free15 計測 — dial_sessions/dial_tasks 導出可能フィールド一覧

作成: 2026-06-10 / mued課 → data課 (PR #196 `measure_free15_funnel.py` proxy 実装支援)
正本: `db/schema/dial.ts`。本書は data課の6イベント proxy を **実在フィールド**に紐付ける。

> ★最重要の発見: **`dial_trial_events` テーブル = サーバー側ファネルイベントログ**が既に存在する
> (`db/schema/dial.ts:351`)。GA4 手動読みに頼らず、ここを直接クエリすれば preview/final/
> free_campaign_start が確定値で取れる。`dial_sessions.first_touch` JOIN で campaign 帰属も可能。

---

## コホート定義（最重要・ここが分母）

**free15 コホート = `dial_sessions WHERE is_free_campaign = true`**。
claim は `campaign/start` 経由でしか起きない（`isFreeCampaign=true` insert）ので、この集合が
**施策参加者の権威的定義**。utm_campaign フィルタより確実（utm は tagged link 経由でないと null）。
これらの `user_id` が15名の参加者 → 下流イベントは全てこのコホートに対して導出する。

```sql
-- コホート（= claim 数 = 分母）
SELECT count(*) AS claim FROM dial_sessions WHERE is_free_campaign = true;
```

---

## 6イベント → 実フィールド マッピング

| data課イベント | 実signal（導出元） | 備考 |
|---|---|---|
| `signup` | dial 外（Clerk dashboard 手動）。参考: `dial_sessions.first_touch->>'utmCampaign'='free15'` の distinct user | GA4 sign_up は Gap A 未instrument。Clerk 読み確定でOK |
| `claim` ★分母 | `count(dial_sessions WHERE is_free_campaign=true)` または `dial_trial_events WHERE event_type='free_campaign_start'` | 前者が権威的 |
| `first_generation` | `dial_trial_events WHERE event_type='preview'`（session毎の初回）OR `dial_tasks WHERE task_type='preview' AND status='completed'`（初回） | 「体験開始」= 初preview完了 |
| `credit_consumed_480`（完走3点） | 下記3条件AND（session毎） | 「480cr」でなく完走3点で判定 |
| `payment_opportunity` | **現状なし** → (c) Hoo Pass post-completion CTA 追加 + 新 event `payment_opportunity` 実装後に発火 | data/growth/mued 調整中 |
| `payment_paid` | 実Stripe行（下記） | is_free_campaign=false 集計より Stripe 行が確実 |

### `credit_consumed_480`（体験完走 3点セット）の導出

コホート session について、以下3つが全て真 = 完走：

```sql
-- 1) final done: 最終WAVが焼けた
--    dial_tasks: final_basic / final_advanced（free=dialogueなので final_advanced）が completed
--    または dial_sessions.paid_cycle_count >= 1（final/mix_check で +1, final/route.ts:269+）
-- 2) mastering done:
--    dial_tasks: task_type='mastering' AND status='completed'
-- 3) diagnosis done:
--    dial_sessions.analysis_result IS NOT NULL   （RoEx mix analysis キャッシュ）
--    または dial_trial_events event_type='analyze' が存在
SELECT s.id
FROM dial_sessions s
WHERE s.is_free_campaign = true
  AND EXISTS (SELECT 1 FROM dial_tasks t WHERE t.session_id=s.id
              AND t.task_type IN ('final_basic','final_advanced') AND t.status='completed')
  AND EXISTS (SELECT 1 FROM dial_tasks t WHERE t.session_id=s.id
              AND t.task_type='mastering' AND t.status='completed')
  AND s.analysis_result IS NOT NULL;
```

★ボーナス: **`dial_tasks.credits_consumed`（integer, nullable）が per-task 実cr** を持つ。
populate されていれば `SUM(dial_tasks.credits_consumed) per session` で **実cr（notional 480 でなく実数）**が取れる。
※ `credits/consume` 本番未配線（memory）のため **null の可能性あり** → go-live 初日に1件で populate 有無を要検証。null なら完走3点セットで判定、非null なら実cr も併記可。

### `payment_paid`（課金転換 = 実収益）

free15 ユーザーが後から実購入したか。コホート user_id に対し：

```sql
-- いずれか = 転換（OR で和集合・重複は user 単位で dedupe）
-- A) dial_purchases  WHERE status='completed'        （単発購入）
-- B) dial_subscriptions WHERE status='active' AND tier='hoo_pass'  （Hoo Pass = 継続課金主軸）
-- C) dial_credit_packs WHERE status='completed' AND source IS NULL （有料pack, source='bonus'は無料grantなので除外）
-- D) 弱proxy: dial_sessions WHERE is_free_campaign=false AND payment_status='paid'
```

⚠️ data課 PR #196 の SQL注意 `AND is_free_campaign=false` は (D) に対して**正確**。
ただし (A)(B)(C) は **Stripe 由来テーブルなので free grant が構造的に現れない** → 追加フィルタ不要。
最も確実な収益分子 = (B) Hoo Pass subscription（継続課金主軸）+ (A)/(C)。

---

## dial_trial_events（サーバー側ファネルログ）を使う利点

`db/schema/dial.ts:351-366`。`event_type` ∈ `analyze | preview | final | checkout_view`（+ `free_campaign_start`）、
`session_id` / `user_id` / `guest_token` / `mode` / `metadata` / `created_at` を持つ。
index: `(event_type, created_at)` / `(session_id)` / `(user_id, event_type, created_at)`。

→ GA4 手動読み（authuser=1）の代わりに **このテーブルを日次集計**すれば preview/final/free_campaign_start が
確定値で取れる（GA4 のサンプリング/ラグ/手動誤差を回避）。`payment_opportunity` だけは新規 event 追加待ち。

---

## go-live 後の運用クエリ単位

cohort（is_free_campaign=true）→ 各 session で first_generation / 完走3点 / 実cr を導出 → 集計。
`first_touch->>'utmCampaign'` で 'free15' 帰属確認（参考）。n<30 は count のみ報告（data課 v1.2 統計ガード踏襲）。
