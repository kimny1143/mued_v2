# C+ — FastSpring 還流 webhook（設計ドラフト）

*mued課 / 2026-07-14 / 設計のみ（実装は C1 FastSpring 設定と並走・別 GO）。正本 = `_chief/decisions/mued/brief-paid-line-design-20260714.md`・執行計画 =`_conductor/docs/inbox/paid-line-execution-plan-20260714.md`（C+）。#664（Stripe/dial GA4 purchase）と対。*

## 目的・意義

FastSpring（MoR・masterchain $69）の購入を **自前に還流**する。「棚は借りる（FastSpring 決済）・客は所有する（自前記録）」を **$69 買い手にこそ**適用（無料DLはメールゲート必須なのに買い手だけリスト外に落ちる自己矛盾を是正）。

**発売時必須**。2つの還流:
1. **GA4 MP purchase event** — FastSpring レールの照準器（Stripe/dial の #664 と対＝両レールが GA4 purchase を吐く）。
2. **買い手メール + 発行キーを自前 DB 記録** — 「客は所有する」＋**将来サブスク基盤の起点**（Q2=Valhalla serial は revocation 不能→将来アカウント層を追設する土台を最初から確保）。

## エンドポイント

新 route `POST /api/webhooks/fastspring`（public・no-Clerk＝Stripe webhook と同じく `middleware.ts` matcher で公開）。Stripe webhook（`app/api/webhooks/stripe/route.ts`）の構造を踏襲。

## HMAC-SHA256 検証

- FastSpring は webhook payload を共有 secret で HMAC-SHA256 署名し、header で送る（**署名 header 名・base64/hex・全body vs per-event は FastSpring dashboard/docs で C1 時に確定**）。
- 検証: `createHmac('sha256', FASTSPRING_WEBHOOK_SECRET).update(rawBody).digest('base64')` を header と `timingSafeEqual` 比較（`lib/advisory/booking-token.ts` / `lib/plugins/unsubscribe-token.ts` の HMAC パターン流用）。不一致 → 401。
- secret = `process.env.FASTSPRING_WEBHOOK_SECRET`（prod-config gate・#648/#664 secret と同手順で kimny/conductor set）。
- ★FastSpring は **1 POST に複数 event を batch**しうる（`events: [...]`）。**全 body の HMAC を先に検証 → 各 event を個別処理**。

## 冪等性（既存テーブル流用）

**`webhookEvents`（`db/schema.ts:159`・`webhook_events`）を再利用**（新テーブル不要）:
- `source='fastspring'`、`eventId`=FastSpring event id（unique）、`type`=event type、`payload`=生 event。
- Stripe と同ロジック: 既存 processed → skip／未処理 → insert 'processing' → 処理 → 'processed'。FastSpring の再送（at-least-once）を unique eventId で dedup。

## `order.completed` 処理

payload から抽出（**実 shape は C1 の test 注文〔`.test.` storefront〕で確定**）:
- order id / buyer email / product（masterchain）/ amount + currency / buyerCountry
- **発行ライセンスキー**（FastSpring 内蔵ジェネレータが発行＝order の fulfillment/license フィールド）
- **custom tags**（popup で渡した gaClientId + utm＝下記「継承」）

### ① GA4 MP purchase（#664 再利用）

**`trackServerPurchase`（`lib/analytics/ga4-server.ts`）を that-is 再利用**:

| param | 値 |
|---|---|
| clientId | popup で捕捉した GA4 client_id（custom tags 経由・下記継承） |
| transactionId | FastSpring order id（再送 dedup） |
| value / currency | order total / currency |
| itemName / itemId | "MUEDsp masterchain" / "muedsp_masterchain" |
| utm | tags の utm* |

- fail-open（tx 外・非await・.catch＝#664 と同規律）。gaClientId 欠如 → skip（GA4 は client_id 必須・#664 と一貫）。
- **★ga4-server 再利用可否 = YES（無改修）**。`trackServerPurchase` は決済プロセッサ非依存（clientId/txId/value/currency/item/utm のみ）。Stripe と FastSpring が同じ event を吐く＝**#664 の設計が第2レールに一般化**（設計の妥当性の裏取り）。任意の微改修: GA4 で rail を分けたければ `itemCategory`/`source` tag（'stripe_dial' vs 'fastspring_masterchain'）を足す（必須でない）。

### ② 買い手記録 → 自前 DB + Resend

**自前 DB（buyer 台帳・所有の実体）** — 新テーブル `masterchain_purchases`（migration 0057 候補）:

| column | type | 備考 |
|---|---|---|
| id | uuid pk | |
| orderId | text notNull unique | FastSpring order id（冪等 join） |
| email | text notNull | 買い手 |
| licenseKey | text | 発行 serial/keyfile＝**所有記録 + 将来アカウント層/サブスク基盤の起点 + revocation 移行の土台** |
| productId | text | 'muedsp_masterchain' |
| amountCents / currency | int / text | |
| buyerCountry | text null | |
| firstTouch | jsonb null | 継承した gaClientId + utm（attribution） |
| fastspringSubscriptionId | text null | 買い切りは null・**将来サブスク用に予約** |
| createdAt | timestamp | |

- **これが「客は所有する」記録**。FastSpring がサイロ化しても、買い手 email + 発行キーは自前に残る＝将来アカウント層をこの上に建てられる（基盤作り直しでなく追設）。

**Resend** — 買い手を dedicated audience `RESEND_MASTERCHAIN_BUYERS_AUDIENCE_ID`（interest・無料とも別）へ add。製品更新メールの宛先。任意で receipt/welcome（キー + DL リンク）を自前送信（FastSpring も receipt を出すが、自前送信は「客を所有する」関係の強化）。
- consent 記録（`marketingConsents` パターン・source='masterchain_purchase'）。

## 順序（fail-open 境界）

1. HMAC 検証（fail → 401）
2. 冪等チェック（processed → 200 skip）
3. **buyer DB insert（critical・tx 内）** — 失敗 → webhook 非2xx → FastSpring 再送 → 冪等で dup 防止（**記録は絶対に落とさない**）
4. webhook 'processed' mark
5. **post-tx best-effort**: Resend add（失敗 = operator alert・#664 audience-fail と同型）＋ GA4 purchase（fire-and-forget fail-open）＋ receipt email
- ＝**記録は critical / 計測・配信は fail-open**（決済は FastSpring 側で完結ゆえ webhook 失敗が決済を壊さない）。

## GA4 client_id + UTM 継承（dial first-touch と同型）

- FastSpring popup は /muedsp で開く。**popup-open 時に GA4 client_id（`_ga` cookie・`lib/dial/first-touch-client.ts` の getGaClientId 流用）+ UTM（landing）を捕捉 → FastSpring session の custom `tags` に載せる**（SBL `fastspring.builder.tag({...})` 等）。→ webhook が order payload の tags で受領 → `trackServerPurchase` へ。
- ＝dial の「first-touch → checkout metadata → webhook → GA4」と同じ継承経路を FastSpring レールで再現（#664 と対称）。

## ライセンスキーの扱い（境界）

> ## ★ SUPERSEDED（2026-07-26）— 下の2行は**もう正しくありません**
>
> **旧記述**: 「**鍵の発行 = FastSpring 内蔵ジェネレータ**（自前生成しない）。webhook は発行済キーを**受領して記録**するだけ。」
>
> ★**この方式では成立しません。** C7 §4.3 は、プラグインが **Ed25519 署名**を**焼き込んだ公開鍵**でオフライン検証する設計です。**FastSpring は我々の秘密鍵を持たない**ので、**FastSpring が生成した文字列は、どうやってもその検証を通りません**。＝ **本 doc と C7 は一度も突き合わされていませんでした**（両方とも単独では筋が通っており、**間だけが空いていた**）。
>
> **現行**: ★**mued_v2 が Ed25519 で発行**します（product 決定 2026-07-25）。実装は `lib/masterchain/license.ts`、発行点は `handleFastspringOrderCompleted`。
> - `firstLicenseKey()`（FastSpring の fulfillment を掘る関数）は**削除済**。**payload から鍵を読みません——我々が作るので既に持っています**
> - **秘密鍵は Vercel env**（`MASTERCHAIN_LICENSE_PRIVATE_KEY`）。★C7 の「offline 保持」は**この webhook で署名する以上 成立しない**ため緩和（kimny 決定 2026-07-26）
> - ★**代償を明記**: オフライン検証 + revocation 無し（Q2a）なので、**秘密鍵が漏れても回収できません**。復旧は「**`masterchain_purchases` の全買い手へ再発行 → 新ビルドで旧鍵を外す**」のみ。**買い手台帳は利便性ではなく唯一の復旧経路**です
> - ★**返金しても鍵は失効しません**（プラグインはサーバに問い合わせない）。**返金の実行は可能／返金後に使えなくすることは不可能**——両者を混同しないこと。DRM-free を選んだ帰結で、実装で塞げるものではありません

- **鍵の検証（プラグイン内・Valhalla serial/keyfile・DRMなし・未認証フルデモ）= C7 / dsp の別設計**。C+ の範囲は「**発行・記録・配達**」まで。

## ★返金が発生した時の運用（kimny 批准 2026-07-26）＝ **記録のみ。失効処理は「実装しない」**

> ★**これは「未実装」ではなく「実装しないと決めた」項目です。** 区別しないと、次に読む人が「TODO だ」と解釈して実装します。

**やること**:
- **自社 DB に「この注文は返金・この鍵は失効扱い」を記録する**（`masterchain_purchases` 側）

**やらないこと（意図的）**:
- ★**鍵の失効処理を行わない** — **オフライン検証**なので、**現行 binary に対しては何をしても効きません**。プラグインはサーバに問い合わせず、焼き込んだ公開鍵で署名を見るだけです
- ★**次版で弾くリストにも入れない** — **更新した人にだけ効く**からです。**返金を受けて使い続ける人はアップデートしません**。＝ **罰が当たるのは、律儀に更新した誠実な利用者だけ**で、**罰の向きが逆**です

**記録の用途**: 監査 / 再発行判断の材料 / **累積を見て方針を再検討する材料**（年 ¥21,000 圏の残余は飲む、が現方針・CFO 試算）。

**方針の全体**（kimny 批准）: **demo-first**（デモ版が誠実さを担う）／**原則 返金不可**、ただし ★**FastSpring が自社判断で返金する3類型（不正・誤課金・説明どおりでない／チャージバック防止）は例外として表記に明記**。★**最終の表記文面は法務確認 → kimny gate で、まだ批准されていません。**

★**「返金の実行」と「返金後に使えなくすること」を混同しないこと。** **前者は可能・後者は不可能**です。DRM-free を選んだ帰結であって、実装で塞げるものではありません。

## DB schema（migration 0057 案）

- `masterchain_purchases`（本 doc・C+）
- `masterchain_interest`（C2）
→ 2テーブルを1 migration に同梱するか別 migration かは conductor 判断（両方 paid-line・pure additive nullable ゆえ Tier2 純加算）。

## 開いた論点（conductor / kimny / dsp / CFO）

1. **FastSpring 署名 scheme の実体**（header 名・base64/hex・batch 形式）＝C1（Kevin 審査後）に test webhook で確定。設計は「HMAC-SHA256 over raw body」を仮置き。
2. **`order.completed` payload の license key / tags の所在**＝`.test.` storefront の test 注文で確定。
3. **自前 receipt/welcome を出すか**（FastSpring receipt に任せて軽い「所有しました」メールのみ、か・キー再送含むか）。
4. **buyer consent モデル**（transactional-only vs marketing opt-in・GDPR/特商法整合＝C4 と連動）。
5. **`FASTSPRING_WEBHOOK_SECRET` prod set**（kimny/conductor gated・C1 と並走）。
6. **統合顧客ID**（Codex 盲点・未裁定）: FastSpring 追加で silo +1。**還流 webhook の buyer email 集約が将来の統合起点**（本 doc の DB がその第一歩）＝将来別 gate。

## 再利用（新パターンなし）

- webhook 冪等: `webhookEvents`（`db/schema.ts:159`）+ Stripe webhook の upsert ロジック。
- HMAC: `lib/advisory/booking-token.ts`（createHmac sha256 + timingSafeEqual）。
- GA4 purchase: `lib/analytics/ga4-server.ts`（`trackServerPurchase`＝#664・無改修）。
- attribution 継承: `lib/dial/first-touch.ts` / `first-touch-client.ts`。
- audience: `lib/plugins/audience.ts`（dedicated audience + operator alert）。
- consent: `db/schema/marketing-consents.ts`。
