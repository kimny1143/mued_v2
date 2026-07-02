# Plan Brief v2 — Advisory #8「問い合わせ受け皿の配線」（Meet固定リンク・reuse監査版）

*2026-07-02 / mued課 → conductor review / **v1（`plan-brief-intake-wiring-20260702.md`・Cal.com案）を supersede**。契機＝kimny が Cal.com 却下（新規外部SaaS不可）＋refinement「丸ごと復活は望まない。ただ特にスケジュール・決済はほぼ流用できる可能性がある。企画に沿って落とし込め」。正本＝handoff v2 #8＋roadmap（input KPI）＋spec v0（既製優先／体制が作りkimnyゲート）＋conductor/Chief guardrails。フロー＝本brief → conductor review → kimny承認 → Tier2実装。*

---

## 0. TL;DR（v1からの差分）

- **会議手段が確定**：Cal.com embed（却下）→ **Google Meet 固定リンク1本**（kimnyが既存Googleで1回作る reusable URL・API配線ゼロ・.ics＋確認メールに埋込・ノック→kimny入室許可でgate）。**新規外部SaaSアカウントゼロ**＝kimny方針にクリーン合致。
- **設計軸が「fresh前提」→「reuse監査前提」に転換**：LMS予約stack（`739a0b69` で削除・**テーブルは温存**）を git 履歴から復元し、単一ホスト・無料・auto-confirm に adapt できる範囲を file:line で評価。fresh は「流用より明確に軽い」箇所のみ。
- **不変（v1から流用）**：KPI＝Neon単一表 `advisory_inquiries`／consent＝form必須チェック＋Neon保存／2レーン（予約＝zero-manual・問い合わせ＝Resend2通人手）／決済は#8に混ぜず paid tier 用に freee #9 と比較節。
- **Chief 3ガードレール**：(1)会議＝Meet固定リンク／(2)録音＝kimnyローカル（実装対象外・consentは取得）／(3)スコープバー厳守＝予約成立→.ics+リンク→consent→KPI行（管理UI・リスケ＝v0対象外＝メール返信運用）。

---

## 1. 確定した設計制約（conductor/kimny/Chief 決定・逸脱禁止）

| 制約 | 出典 |
|---|---|
| 無料60分予約が kimny の手を借りず入る（zero-manual） | handoff #8 / roadmap P0 |
| 新規外部SaaSアカウント作成なし・OSS/直接実装 | kimny 2026-07-02（Cal.com却下）|
| 会議＝Google Meet 固定リンク1本（kimny既存Google・1回作成・API配線ゼロ） | kimny提起＋Chief再評価 4082a10 |
| Google Calendar API（個別リンク化）＝GCP project=新規外部リソース＝**kimny明示OKまで不可**・v0対象外 | conductor判断 |
| 録音＝kimnyローカル収録（実装対象外・Jitsi/Meet録画に依存しない・consentは受け皿取得） | Chief guardrail 2 |
| スコープバー＝予約成立→.ics+リンク→consent→KPI行。管理UI/リスケ=v0対象外 | Chief guardrail 3 / handoff #8 |
| 削除済LMS UI/API/availabilityの full revive はしない（Stripe/講師生徒/Clerk baggage回避・単一ホスト無料auto-confirmに畳む） | kimny refinement / conductor |
| 面＝mued.jp／EN・JA／LP staged（ADVISORY_LIVE gate・#1 LP=PR #563済） | handoff #1 |
| middleware 無変更（isProtectedRoute=dashboard/lobe/connect のみ・locale/api/advisory は fall-through public） | content課 実読確定・訂正済 |

---

## 2. アーキテクチャ（2レーン・Meet固定リンク）

```
mued.jp/{ja,en}/advisory  (LP #1・PR #563・staged)  単一CTA=AdvisoryPrimaryCta(#8がここをswap)
│
├─[レーンA：無料壁打ち予約 / zero-manual・必須]
│   curated slot picker（kimny設定の固定枠から選択）＋ name/email ＋ 必須録音consentチェック
│   └─(POST /api/advisory/booking)
│        ├─ zod検証 ＋ rateLimit
│        ├─ **atomic slot-claim**（既存 preview-reservation の conditional-UPDATE 流用＝二重予約防止）
│        ├─ Neon insert: advisory_inquiries(type='booking', scheduled_at, meeting_url=固定Meet, consent_*)  ← 予約件数KPI
│        ├─ **.ics 招待メール**（既存Resend＋添付・固定Meet URL を LOCATION に）→ 本人＋kimny
│        └─ （会議当日：来訪者ノック→kimny入室許可。録音=kimnyローカル）
│
└─[レーンB：その他問い合わせ / 人手見積り可・lean]
     小フォーム（name/email/product/message/consent任意）
     └─(POST /api/advisory/inquiry)→ zod＋rateLimit＋Neon insert(type='inquiry')＋Resend2通（管理者通知＋本人確認）

insight課：SELECT ... FROM advisory_inquiries（月次1行・cron不要）
```

**記録の正＝commit済DB行（persist-first, notify-second）**。Meet固定リンクは静的値ゆえ発行失敗の概念なし＝更にシンプル。

---

## 3. per-component reuse 監査 ★本brief の核（kimny refinement）

> 方針：まず流用可能性を評価（reuse-adapted / rebuild-fresh / baggage-drop）。fresh は流用より明確に軽い箇所のみ。全て file:line evidence 付き。LMS予約 UI/API は `739a0b69`（remove LMS legacy 126 files）で削除・**tables温存**・`git show 739a0b69^:<path>` で復元可。

### 3-1. スケジュール（739a0b69 git復元 adapt 評価）

`git show 739a0b69^:<path>` で復元・実読した結果（mued課 直接監査。reuse-audit workflow の schedule agent は StructuredOutput retry cap で fail→手動補完）：

| component | verdict | 評価（file:line evidence） |
|---|---|---|
| `app/api/reservations/route.ts` POST（186行・削除） | **reuse-adapted（本命）** | 予約create の骨格＝`db.transaction`内 `SELECT * FROM lesson_slots WHERE id=$ FOR UPDATE`（行ロック）→空き確認→`insert(reservations, status:'pending')`→容量アトミック++。**そのまま二重予約防止の予約API**。畳み込み: (a)`withAuth`(Clerk)除去＝匿名(name/email をフォームから) (b)mentorId/studentId 除去＝単一ホスト (c)`checkCanCreateReservation`/`incrementReservationUsage`(usage-limiter) 除去＝LMS baggage (d)price=0＝amount/Stripe 除去 (e)status pending→**即'booked'(auto-confirm)** (f)成功時 .ics+Meet email + advisory_inquiries KPI行。|
| `lesson_slots` テーブル（現存・db/schema.ts:30） | **reuse-adapted** | curated advisory 枠に流用（startTime/endTime/status[available/booked/cancelled]/capacity・FOR UPDATE claim 実績）。単一ホスト＝mentorId に kimny users 行 or 軽量 `advisory_slots` 新設。|
| `reservations` テーブル（現存・db/schema.ts:53） | **部分reuse＋匿名blocker** | status enum に既に **`completed`/`cancelled`**＋**`completedAt` 列**あり＝insight課 bookings_conducted(manual flag) に直結する precedent。但し **studentId/mentorId NOT NULL FK to users**＝匿名advisory 書けない→**booking記録は advisory_inquiries(匿名)**に、reservations の route パターン+`completed_at` 概念だけ流用。|
| `components/features/accessible-calendar.tsx`（250行・削除） | **baggage-drop/参考** | フル calendar UI は v0 過剰（スコープバー3）。curated 固定枠の簡易 slot-picker で足りる（fresh 小）。|
| `app/api/mentor-slots/route.ts`（192行）+`[id]`（250行・削除） | **baggage-drop** | mentor availability 管理＝単一ホスト不要。curated 枠は kimny が seed/config。|
| `app/dashboard/lessons/[id]/book/page.tsx`（263行・削除） | **参考** | Clerk/mentor 前提。fresh 小フォーム（waitlist 流儀・匿名）で。|

**結論**：予約create の **transaction+FOR UPDATE 骨格 ＋ lesson_slots 枠モデル ＋ reservations.completedAt 概念** が reuse-adapted＝「ほぼ流用可能」(kimny) は事実。fresh は匿名フォーム＋advisory_inquiries＋.ics＋curated-slot picker のみ（数百行でなく既存パターン流用）。calendar/mentor-availability UI = drop（kimny「丸ごと復活は望まない」尊重）。

### 3-2. consent / email / slot排他 / .ics（primitive 流用 adaptation・reuse-audit workflow wyrlp2y2z）

| primitive | verdict | 適応点（file:line） |
|---|---|---|
| `reservationConfirmedStudent/Mentor` テンプレ（email.service.ts:190-302） | **reuse-adapted** | ほぼverbatim流用。`ReservationEmailData`(:63) に **`meetingUrl` 追加**＋html/text 両方に「Google Meet に参加」CTA（現状 meeting-link 欄=GAP）。壁打ち subject 追加。mentorName='MUED/kimny'・duration='60分'・price='無料'。sender wrapper(:930/:948) as-is。|
| DEAD dashboard URL（notification.service.ts:176 `${APP_URL}/dashboard/lessons`） | **small-add（修正必須）** | 指す先は 739a0b69 で削除済ページ。v0 は dashboard ボタン撤去→**meetingUrl CTA ＋「実施済みにする」ワンタップ管理リンク**（insight課 conducted flag 用）に置換。|
| `onReservationConfirmed` orchestration（notification.service.ts:145） | **reuse-adapted** | Promise.all 送信＋raw start/end Date（.ics DTSTART/DTEND供給）流用。但し booker 匿名ゆえ `userRepository.findById` 不可→name/email を advisory_inquiries から。|
| `send()` Resend wrapper（email.service.ts:883） | **small-add** | 現状 attachments 非転送。`SendEmailOptions`(:44) に `attachments?` 追加＋`resend.emails.send` に渡す。**Resend v6.1.0 が Attachment サポート確認済**（node_modules/resend index.d.mts:526/602）。.ics 添付用。|
| `preview-reservation.ts reservePreviewSlot`（lib/dial/preview-reservation.ts:39） | **reuse-adapted** | conditional-UPDATE claim を advisory_slots に：`UPDATE advisory_slots SET status='booked',inquiry_id=$ WHERE id=$ AND status='open' RETURNING`＝0行→既claim→予約拒否（:50 の null return 同型）。Postgres serialize で二重予約防止。§3-1 の lesson_slots FOR UPDATE でも可＝どちらも成立。|
| `marketing_consents`（db/schema/marketing-consents.ts:18） | **reuse-adapted（列語彙のみ）** | user_id NOT NULL FK blocker（匿名不可）→ **inline consent 列 on advisory_inquiries**（`recording_consent` bool / `consent_policy_version` / `consent_locale` / `consent_at`）。append-only 監査台帳が要る場合のみ別テーブル。|
| `.ics` 生成 | **new（小）** | ics/ical lib 不在。**`ics` npm lib 採用推奨**（依存でありアカウント新規でない・CRLF/75-octet folding/escape/date を正しく処理＝Apple Mail 厳格対応・feasibility w2kz9fii5 推奨）。single VEVENT: METHOD:REQUEST / UID=`{advisory_inquiries.id}@mued.jp`（idempotent更新）/ **DTSTART・DTEND=UTC Z 形式**（TZID より堅牢）/ LOCATION=Meet URL / ORGANIZER / ATTENDEE RSVP=TRUE。**Resend は添付として送る**（`text/calendar; method=REQUEST` body-part は張れない→Gmail rich RSVP 非保証・「カレンダーに追加」degrade＝固定枠 add-to-calendar 用途で許容）。|

**net 新規コード**＝ハンドロール（or `ics` lib）.ics builder ／ send() attachments passthrough ／ ReservationEmailData.meetingUrl ／ dead URL 修正 ／ 匿名フォーム＋advisory_inquiries＋curated-slot picker。**新規 SaaS/アカウント ゼロ**。

### 3-3. 会議手段（確定＝Meet固定リンク・feasibility 検証済）
- kimny が既存Google で reusable Meet URL を1回作成（一回性作業）→ `ADVISORY_MEET_URL` env/config 定数。.ics LOCATION＋確認メールに埋込。ノック→入室許可でgate。**コード側の会議発行ロジック＝ゼロ**。
- **なぜ固定リンクが正解か（feasibility w2kz9fii5 検証）**：free @gmail.com は **Calendar API で Meet リンクを自動生成できない**（`allowedConferenceSolutionTypes=['eventHangout']`・hangoutsMeet→HTTP400・Workspace必須）。だが **UI で人が作る reusable Meet リンクは free Gmail でも動く** → 固定リンクは API/OAuth/Workspace/token保守を全部回避する唯一の zero-registration 解。(ii)GCal API を却下した conductor 判断を裏付け。
- **★要kimny確認（決定的 gap）**：Meet の **guest 参加条件は host が Workspace か free Gmail かで変わる**。**free @gmail.com host → 参加者全員が Google アカウント sign-in 必須**（非技術買い手に摩擦）／**Workspace host（glasswerks.jp 独自ドメイン）→ guest はリンクのみで account-free 参加可**。→ **kimny の Google が glasswerks.jp Workspace か確認**（info@glasswerks.jp の存在から Workspace の可能性高）。free Gmail なら (a)glasswerks.jp Workspace 使用 or (b)**Jitsi link-out にfallback**（guest account不要＝free-Gmail-Meet より guest 摩擦は低いが、無名ドメイン不信＋kimny moderator login＋商用ToS caveat）。**推奨＝glasswerks.jp Workspace 確認→Meet固定リンク**。
- 録音（Chief guardrail 2）：server-side 自動録画は zero-SaaS で不可（Jibri=8x8 JaaS or self-host 要）→ **operator-side OBS/QuickTime**（kimny ローカル・実装対象外）。consent copy は保存先=MUED/kimnyローカル・保持期間・アクセス範囲を明記する義務（content課 copy に反映）。

---

## 4. 決済比較節（paid tier 用・freee #9 と握り）★#8無料予約自体は決済なし

> 対象＝有償tier（壁打ち¥30k都度／診断¥250k前払い一括／月額¥200k・¥400k）。#8の無料60分予約は決済ゼロ。最終＝kimny money gate。

**freee課(tlv43hxs) 照会7点回答（reuse-audit workflow wyrlp2y2z・payment agent・file:line evidence 付き）**：

| Q | 回答 |
|---|---|
| Q1 Stripe live? | **YES・稼働中**。`app/api/checkout/route.ts`（LMS・739a0b69 削除を**生存**）＋ dial checkout群（route/credit-pack/subscription/additional）＝実 `stripe.checkout.sessions.create`。webhook が muednote subscription も処理（別 route 存在示唆）。|
| Q2 payment type | **one-time / subscription / dynamic custom amount 全部あり**。dynamic JPY＝`checkout/route.ts:102` `unit_amount=Math.round(parseFloat(amount))`。**¥30k壁打ち・¥250k診断＝one-time dynamic で実証済パターンにそのまま乗る**（JPY zero-decimal）。月額¥200k/¥400k＝subscription＝**新規 recurring Price 2本を dashboard に作成要**（price_data 不可）。|
| Q3 entity | 法人 **株式会社グラスワークス**（全 legal/特商法 copy が operator＝glasswerks・強い推認）。**Stripe account binding（merchant/live-test/JP登録）＝要kimny確認**（コードで断定不可）。|
| Q4 手数料 | コード外の ops fact（Stripe JP 標準 ~3.6%）＝**要kimny/運用確認**。|
| Q5 Stripe→freee 記帳 | **自動化ゼロ**（connector/仕訳export なし・grep 0件）。webhook は自前Neon更新＋Resendメール＋GA4のみ。→ **新規Stripe収益＝手動記帳＝二重管理コスト**。|
| Q6 適格請求書(T番号) | Stripe は**自動 receipt メールのみ・T番号適格請求書は出さない**（invoice_creation/tax_id 未設定・FAQ「Stripe が receipt 送信」）。→ **freee 等で別途発行必須＝路線非依存で freee請求書は不可避**。|
| Q7 reuse cost | **~3–5 dev-days**（¥30k/¥250k one-time dynamic 流用 + 月額 subscription 2 Price + webhook に `service:'advisory'` 分岐で KPI行 + post-pay email）。high-ticket(¥250k+) の card 制約（issuer上限/3DS/chargeback）は**コード外**＝¥250k+ は bank-transfer/invoice 寄り。|

**決定＝(A) HYBRID・kimny 承認済（2026-07-02）**：
- **¥30k 壁打ち（2回目以降）** → **Stripe**。★**独立検証 correction（conductor）＝「~1d 流用」は誤り・実際は ~3-5 dev-days の新規実装**：既存 `app/api/checkout/route.ts` は (a)`reservation` レコード必須（:90 status='approved'/'pending' 前提）(b)LMS branding receipt（:105-106 `レッスン予約: 〇〇先生`）(c)`getCurrentUser()` gate＝**drop-in 不可**。再利用できるのは **dynamic `price_data`（currency:'jpy'・unit_amount 任意・:102-109）のパターンのみ**。→ 必要作業：**advisory 専用 checkout route（匿名/軽認証・reservation 非依存・任意 JPY 額）＋ `service:'advisory'` webhook 分岐で KPI行 ＋ advisory product_data/description/metadata（receipt が LMS branding にならない）＋ post-pay email ＋ tests**。effort = **~3-5 dev-days**（brief §4 Q7 の全体見積と整合・旧「~1d」記述は本 correction で撤回）。
- **¥250k 診断・月額¥200k/¥400k** → **freee 適格請求書＋銀行振込**（① 適格請求書は路線非依存で freee 必須 ② Stripe→freee 記帳自動化ゼロ＝二重管理 ③ high-ticket card 制約 ④ B2B 前払い一括/月初請求は振込が自然）。
- **refund/chargeback（無形役務）**：¥30k 低額ゆえ簡易 refund フロー（**Stripe 手数料は返却されない前提**）。
- **entity**：glasswerks法人 強推認・**Stripe account binding／実効手数料は要kimny確認**（freee と Stripe account 表示を握る）。
- **#8 の無料60分予約自体は決済ゼロ**＝本節は paid tier 用。5軸確定＝**freee課(tlv43hxs) 主管**（draft→conductor /codex→kimny money gate・進行中）。決済実装は **#8 の全 kimny gate クリア後**に #8 実装へ含める。

---

## 5. KPI hook（insight課(rjiuakoj) と確定・2026-07-02）

記録の正＝Neon 単一表 `advisory_inquiries`（匿名可・user FK無）。**Blob/GA4 不採用**（正確件数にならない・記録の正＝commit済DB行＝persist-first）。

**読取り＝直SQL共有でなく GET API endpoint**（insight課決定）：
- `GET /api/advisory/kpi-monthly`（**X-Internal-API-Key 認証**＝既存 welcome-email-trigger パターン転用・新規credential不要・blast radius 狭）。サーバ側で集計SQL実行→JSON返却。cron rollup 不要（live count・将来 rag-metrics 式拡張で合意）。
- **最小契約**：`{ inquiries, bookings_created, bookings_conducted }` × **(当月分 + M0からの累計)** の2セット。product/locale/utm 別内訳は**列は全persist するが API では返さない**（small-n noise 回避・後で ad-hoc SQL 遡及可）。
- **数え方**：`inquiries`=type'inquiry' created_at 基準／`bookings_created`=type'booking' 自前 booking API の form submit 時 insert（Cal.com webhook でない）／**`bookings_conducted`=`completed_at` IS NOT NULL（kimny manual completed flag のみ・attendance heuristic 不採用＝Chief判断）**。予約通知メールに「実施済みにする」ワンタップ管理リンクを配線。
- **status enum**：`new|booked|completed|cancelled`（cancellation も webhook でなく kimny manual/one-tap）。`completed_at` 列＝削除済 reservations テーブルの `completedAt` precedent 流用（§3-1）。
- migration 0055＝**kimny専管**（テーブル先行→受付開始 の順序厳守）。insight課 KPI設計doc＝`_data-analysis/docs/advisory-kpi-measurement-design-20260702.md`（正本）＋ measure script `scripts/measure_advisory_kpi.py`（endpoint 実装後着手）。

## 6. consent（不変・v1流用）

form 必須チェックボックス＋Neon保存（`consent_recording`/`consent_policy_version`/`consent_locale`/`consent_at`・marketing_consents 踏襲）。**copy＝content課 supply済**（`_contents-writing/drafts/inbox/advisory-consent-copy-20260702.md`・レーンA必須/レーンB任意・ja/en）。録音方式/保存期間/保存先＝kimny placeholder（Chief guardrail 2＝kimnyローカル収録前提）。

---

## 7. 実装ブレークダウン（Tier2・kimny承認後）

reuse監査確定後の file 一覧（reuse-adapted/small-add/new を明示）：
- `db/schema/advisory-inquiries.ts` ＋ `db/migrations/0055_*.sql`【new・kimny prod適用】：type('inquiry'|'booking') / status('new'|'booked'|'completed'|'cancelled') / name/email/locale/message / scheduled_at / meeting_url / **completed_at**（conducted flag・reservations.completedAt 流用）/ inline consent 列（recording_consent/consent_policy_version/consent_locale/consent_at）/ utm_* / created_at。＋ curated 枠＝`advisory_slots`【new・軽量】 or `lesson_slots` 流用【reuse-adapted】。
- `app/api/advisory/booking/route.ts`【reuse-adapted】：reservations/route.ts の transaction＋FOR UPDATE（or preview-reservation conditional-UPDATE）claim パターン流用・匿名・auto-confirm・.ics+Meet email。
- `app/api/advisory/inquiry/route.ts`【small・waitlist流儀】：zod＋rateLimit＋Neon＋Resend2通。
- `app/api/advisory/kpi-monthly/route.ts`【new・小】：GET・X-Internal-API-Key・§5 契約（insight課用）。
- `app/api/advisory/booking/[id]/complete/route.ts`（or 署名付きワンタップ管理リンク）【new・小】：kimny conducted flag（completed_at set）。
- `lib/services/ics.ts`【new・`ics` lib 採用推奨】。
- `lib/services/email.service.ts`【reuse-adapted+small-add】：advisory テンプレ（reservationConfirmed 流用＋`meetingUrl` 欄）＋ send() attachments passthrough。
- `lib/services/notification.service.ts`【small-add】：dead `/dashboard/lessons` URL 修正。
- curated-slot picker component【fresh 小 or accessible-calendar 部分流用】。
- `lib/analytics/gtag.ts`【small-add】advisory funnel events。
- `.env`：`ADVISORY_MEET_URL`／`ADVISORY_NOTIFY_EMAIL`／既存未記載の `INTERNAL_API_KEY`・`EMAIL_FROM`。

**paid tier（kimny HYBRID 承認 2026-07-02・#8 全 kimny gate クリア後に含める・§4 correction 反映）**：
- `app/api/advisory/checkout/route.ts`【new・~3-5d】：¥30k壁打ち Stripe（匿名/軽認証・reservation 非依存・任意 JPY・advisory product_data/description/metadata＝LMS branding 回避・dynamic price_data パターンのみ流用）。
- `app/api/webhooks/stripe/route.ts`【small-add】：`service:'advisory'` 分岐＝advisory_inquiries KPI行更新（paid）＋ post-pay email。
- `app/api/advisory/refund/*`【new・小】：無形役務 簡易 refund（Stripe 手数料非返却前提）。
- ¥250k診断・月額¥200k/¥400k = **freee 適格請求書＋振込**（freee課主管・#8 決済コード対象外・freee #9）。

---

## 8. Gates & 連携

- **migration 0055 = kimny専管**（prod write）。テーブル先行→受付開始 順序。
- **決済（paid tier）= kimny money gate**（#9 freee主管・#8はintake止まり）。
- **録音方式/retention = kimny確定**（consent文言の前提・Chief guardrail 2＝ローカル収録）。
- **insight課(rjiuakoj)**：データ経路（Neon表+月次SQL）列名確定。
- **content課(t8ojer2i)**：consent copy 供給済／LP #1=PR #563（merge待ち）。
- **freee課(tlv43hxs)**：決済比較5軸（照会7点回答を素材に）。
- **write課**：#8はpricing/spec不変＝即時通知非該当（LP公開時は content課側で対応）。

## 9. Sequencing（順序厳守＝記録欠落回避）

1. kimny：Meet固定リンク1回作成（`ADVISORY_MEET_URL`）＋（承認後）migration 0055 prod適用（テーブル先行）。
2. deploy：routes＋env＋（reuse監査確定の）scheduleコンポ。
3. test：予約→slot-claim二重予約防止／.ics 各クライアント（Gmail/Apple/Outlook）RSVP／consent保存／i18n EN・JA／KPI行。
4. embed last：LP CTA を booking flow へ swap（AdvisoryPrimaryCta 差替・#1 LP unlock とは独立）。
5. verify＝キャラクターgate：実ブラウザで「予約が入り Meetリンク付き .ics が届き kimnyに通知＋DB行＋consent」を録画/スクショ。

## 10. 判断要請（conductor review / kimny）

reuse監査で確定済＝下記は conductor review で承認 or redline を仰ぐ点：

1. **★Meet固定リンクの guest 条件（要kimny確認・決定的）**：kimny の Google は glasswerks.jp Workspace か free @gmail.com か？ Workspace なら guest はリンクのみで account-free 参加可（clean）／free Gmail なら **参加者全員 Google sign-in 必須**（非技術買い手に摩擦）。→ **推奨＝glasswerks.jp Workspace 確認→Meet固定リンク**。free Gmail 判明時のみ Jitsi link-out fallback（guest account不要）を検討。
2. **スケジュール＝(a)復元adapt** で確定（reservations/route.ts の transaction+FOR UPDATE + lesson_slots + reservations.completedAt が reuse-adapted＝「ほぼ流用可能」kimny 読み当たり）。calendar/mentor UI は drop。→ 承認求む。
3. **決済＝HYBRID**（¥30k壁打ち=Stripe dynamic JPY 流用／¥250k診断・月額=freee 適格請求書+銀行振込）。適格請求書は路線非依存で freee 必須＋Stripe→freee自動化ゼロ＋high-ticket card 制約。→ **freee課主管で5軸確定・kimny money gate**。
4. **.ics 実装**：`ics` npm lib（依存・非アカウント）採用＋DTSTART/DTEND=UTC Z＋ORGANIZER=noreply@mued.jp / ATTENDEE=booker email。→ 推奨承認。
5. **録音方式/retention**（consent copy 前提）：kimny ローカル収録（OBS/QuickTime・実装対象外）＋ consent copy に保存先(MUED/kimnyローカル)・保持期間・アクセス範囲を明記。→ kimny 確定。

---

*一次＝handoff v2 #8 / roadmap / spec v0 / conductor・Chief guardrails（Meet固定リンク・録音ローカル・スコープバー）/ reuse-audit workflow wyrlp2y2z / feasibility workflow w2kz9fii5。実装は conductor review→kimny承認後（Tier2）。*
