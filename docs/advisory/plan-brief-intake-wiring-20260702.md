# Plan Brief — Advisory #8「問い合わせ受け皿の配線」（M0 / P0）

*2026-07-02 / mued課 → conductor review / 正本＝`_chief/for-conductor/handoff-advisory-storefront-v2-20260702.md` #8 ＋ `roadmap-advisory-monetization-20260702.md`（input KPI）＋ `spec-advisory-delivery-v0-20260702.md`（既製SaaS優先の型）。本書は**技術選定＋設計**であり実装ではない。フロー＝本brief → conductor review → 実装（Tier2）／公開＝kimny。*

---

## 0. TL;DR（結論5行）

1. **予約レーン（zero kimny manual work・必須線）**＝ **Cal.com Cloud** を LP に embed。kimny の Google Calendar を1回だけ接続すれば、無料60分壁打ちが**空き枠読取り→自動確定→Meet自動発行**まで手作業ゼロで入る。`BOOKING_CREATED` webhook で自前DBに1行書く。
2. **問い合わせレーン（人手見積もり可・lean）**＝ waitlist ルートを踏襲したネイティブ小フォーム。予約でなく相談・有償tier直問い合わせ・②「上司に転送」を拾う。既存 Resend 2通メール（管理者通知＋本人確認）を再利用。
3. **KPI（input計測内蔵）**＝ Neon 単一テーブル `advisory_inquiries`（匿名可）。**問い合わせ件数＝type='inquiry'／予約件数＝type='booking'** を1テーブルに集約。insight課は**月次SQL 1行**で読む（Blob/GA4は採用しない＝正確な件数にならない）。
4. **consent文言**＝ Cal.com 必須予約質問（未同意なら予約不成立）**＋** webhook経由で Neon に再保存（policy_version/locale/timestamp・marketing_consents踏襲）。文言は content課owner・retention方針は kimny確認。
5. **要pre-approval（唯一のブロッカー）**＝ Cal.com は**新規外部SaaSアカウント＝Tier3 external-resource gate**。account作成前に kimny/conductor 承認が要る（§8-A）。

---

## 1. 要件の芯（正本からの抽出・逸脱禁止）

| 要件 | 出典 | 実装への効き方 |
|---|---|---|
| **フォーム→通知→日程調整** | handoff #8 | 3段を全部配線する |
| **無料60分予約が kimny の手を借りず入る**（zero kimny manual work） | handoff #8 / roadmap P0 | 予約はライブカレンダー読取り＋自動確定必須＝scheduler SaaS が不可避 |
| **input KPI 内蔵**（問い合わせ/予約件数が自動記録→insight課 月次1行） | handoff #8 / roadmap 設計原則2 | 「KPIを置いたのに数える者がいない」を作らない＝**自前DBが記録の正**、client計測は色付けのみ |
| **壁打ち録音の consent 定型化** | handoff #8 / roadmap P1 | 予約時に必須同意で取得＋監査可能に自前保存 |
| **面＝mued.jp／EN・JA** | handoff #1 / CLAUDE.md i18n | `app/[locale]/advisory`・messages/{en,ja}.json |
| **LP＝staged/noindex** | handoff #1 | `robots:{index:false,follow:false}`（ai-mixing踏襲） |
| **kimny稼働＝壁打ち本番＋不可逆gate＋一回性作業のみ** | roadmap 設計原則3 | 予約対応・通知捌きに kimny を寄せない（カレンダー接続の1回だけ） |

**客面禁止語（handoff必須線3）**：艦隊/モジュール/CI/マルチエージェント等は裏方。フォームUI・確認メール・consent文言でも使わない（客面はやさしい攻め・です/ます）。

---

## 2. スコープ確定（M0/P0 で何を出し切るか）

`review-advisory-audit` の open decision #5 に対する mued課の判断：

- **IN（M0必須）**
  - **A. 無料壁打ち予約レーン**：Cal.com embed → webhook → DB記録 → 管理者通知。**これが P0 の zero-manual 要件本体**。完全に通るまで #8 完了と言わない（PoC規律）。
  - **B. 問い合わせレーン（軽量）**：ネイティブフォーム → DB記録 → Resend 2通。人手返信でよい（有償tierの見積もりは元々人手＝zero-manual対象外）。KPI「問い合わせ件数」の供給源。
  - **C. KPI data path**：A/B とも同一 Neon テーブルに着地。insight課月次SQL。
  - **D. consent 取得＋保存**：予約レーンに必須同意。
- **OUT（M0では作らない・defer）**
  - **Stripe checkout（有償¥30k/¥250k/¥200k/¥400k の決済）**＝ #9「支払いレール」（freee課主管）の領域。#8はintake止まり。有償転換は壁打ち本番内で提案（roadmap P2）→ freee請求 or 決済リンク。**#8に決済を混ぜない**（kimny価格gate・別surface）。
  - 予約後の自動リマインド/再スケジュール高度化（Cal.com標準機能で足りる範囲に留める）。

> **zero-manual の適用範囲を明示（false "要件達成" 回避）**：zero kimny manual work が成立するのは**無料壁打ち予約レーンのみ**、かつ **kimny がカレンダーを接続済みであること**が前提。有償tierの見積もり（診断/構築/並走）は本質的に人手であり、それは仕様どおり（roadmap 必須線7）。briefはこの線引きを明記した上で「Aはzero-manual／Bは人手」と分けて設計する。

---

## 3. アーキテクチャ（2レーン）

```
mued.jp/{ja,en}/advisory  (LP v7・staged/noindex・content課 copy)
│
├─ [レーン A：無料壁打ち予約 / zero-manual・必須]
│    Cal.com embed（LP内）
│      └─ 来訪者が空き枠選択＋必須consent同意＋name/email入力
│      └─ Cal.com が kimny GCal を読み自動確定＋Google Meet自動発行＋本人へ招待
│    └─(webhook BOOKING_CREATED)→ POST /api/advisory/booking
│         ├─ 署名検証（CAL_WEBHOOK_SECRET）
│         ├─ Neon upsert: advisory_inquiries(type='booking', consent_*, scheduled_at, meeting_url, external_ref)  ← 予約件数KPI
│         ├─ emailService.advisoryBookingNotify → kimny（管理者通知・任意・落ちてもKPIは無傷）
│         └─ (Cal.com が本人確認メール送信。自前確認メールは任意)
│
└─ [レーン B：その他問い合わせ / 人手見積もり可・lean]
     ネイティブフォーム（useState+fetch・next-intl・amberトークン）
       └─ name/email/product(任意)/message/consent(任意)
     └─(POST)→ /api/advisory/inquiry
          ├─ zod検証 ＋ rateLimit(request)
          ├─ Neon insert: advisory_inquiries(type='inquiry', product, message)  ← 問い合わせ件数KPI
          └─ emailService: advisoryInquiryNotify(→kimny) ＋ advisoryInquiryConfirm(→本人)  ※fail-open

insight課：SELECT ... FROM advisory_inquiries（月次1行）  ← 単一SQL・cron不要
```

**設計原則（記録の正）**：件数KPIの正は**commit済みDB行**。メール送信・client gtag・Cal.com内部の値はいずれも記録の正にしない（メールは落ちうる／GA4サーバ側は本番env未設定でno-op濃厚／SaaS内は監査不能）。→ **persist-first, notify-second**。

---

## 4. 技術選定（handoff指定＝フォーム/通知/日程調整）

### 4-1. 日程調整 ＝ **Cal.com Cloud（embed）** ★zero-manualの中核

repo横断で **Cal.com/Calendly/TidyCal/Google Calendar連携＝ゼロ**（scheduling greenfield）。既存 glasswerks 問い合わせは「メール→人が返す」＝zero-manual不成立の anti-pattern。よって scheduler SaaS 導入が必須。

| 案 | zero-manual | KPI取得 | i18n | 保守/コスト | 判定 |
|---|---|---|---|---|---|
| **(a) Cal.com Cloud embed** | ◎ GCal接続1回で完全自動・Meet自動発行 | ◎ `BOOKING_CREATED` webhook（無料tier可） | ◎ ja/JST・en | ◎ 走らせるインフラ無・embed数行 | **採用** |
| (b) Cal.com self-host | ◎ | ◎ | ◎ | ✕ 自前でCal.com+Postgres運用＝「必要な分だけコード」に反する | 却下 |
| (c) Calendly embed | ◎ | △ webhook/custom-question が有料tier依存 | ○ | ○ Next.js内テーマ性がCal.comに劣る | fallback |
| (d) 自前(Google Calendar API) | ○ | ○ | 要自作 | ✕ googleapis+OAuth+空き算出+枠UI+Meet発行+DB＝最多コード・delivery仕様に反する | 却下 |

→ **(a) Cal.com Cloud**。delivery仕様 v0 §2「既製SaaS＋AI API優先・保守できる形だけ」に最も忠実。webhook-native でKPI data path が素直。**ただし新規外部SaaSアカウント＝Tier3 gate（§8-A）**。

**embed実装**：`@calcom/embed-react`（or inline script）を `WallhitBooking.tsx` にラップ。locale は next-intl の現在locale を渡す（ja→JST）。1つのイベントタイプ「無料60分壁打ち」を単一ホスト（kimny）で用意。

**録音（consent対象の実体）**：Cal.com は日程/Meet発行までを担うが、**録音自体**（Meet/Zoom cloud録画・retention・保存先）は運用側の設定。consent文言を真実に保つため、録音方式・保持期間・保存先を kimny/content課が確定する必要（§9 missing）。intake配線のブロッカーではないが consent文言の前提。

### 4-2. フォーム ＝ waitlist ルート踏襲（ネイティブ・レーンB）

- **参照実装**：`app/api/research/waitlist/route.ts`（zod＋`rateLimit(request,'research')`＋dedup＋Resend fail-open）＋ `app/dial/waitlist/page.tsx`（useState+fetch・native HTML validation・amberトークン・done-state成功画面・privacy注記）。
- **repo規約遵守**：react-hook-form は不使用（repo全体で未使用）。client=native属性検証、server=zod。**off-pattern回避**。
- **配置**：LP が `app/[locale]/advisory` 配下なので、フォームは next-intl `useTranslations`（`NextIntlClientProvider` は `[locale]/layout.tsx` が供給済）。dial の cookie/localStorage locale方式とは別（[locale]ルートはURL-locale方式）。
- **設計トークン**：`app/globals.css` の `--amber:#f5a524` 系を手書きTailwindで（dial LP と同流儀）。`components/ui/*` primitives は default が brand-green のため、amber面では手書き優先。

### 4-3. 通知 ＝ 既存 Resend `emailService` 再利用（新チャネル追加しない）

- **土台**：`lib/services/email.service.ts`（Resend・inline HTML・`isConfigured()`＝`!!RESEND_API_KEY`・`send()`はthrowしない）。既存 `sendGlasswerksInquiryNotify/Confirm`（管理者通知＋本人確認・EN/JA分岐）が **#8とほぼ同形**。
- **追加テンプレ**（同ファイルにメソッド追加）：
  - `advisoryInquiryNotify`（→kimny・レーンB）／`advisoryInquiryConfirm`（→本人・「1-2営業日で返信」EN/JA）
  - `advisoryBookingNotify`（→kimny・レーンA・確定日時/Meet/consent値を載せる。`reservationConfirmedStudent` の日時/リンク表現を流用）
- **信頼性設計**：予約webhookは **persist-first-email-second**＝DB upsert 成功＝予約成立、メールは best-effort（Resend障害でも予約件数KPIは無傷）。glasswerksの fire-and-forget（worker `.catch(()=>{})`・route常に`ok:true`）は**KPIがDB行だから許容**するが、本#8では webhook route内で **await＋失敗ログ**。人手通知を critical path にしない。
- **宛先**：`ADVISORY_NOTIFY_EMAIL`（default `kimny1143@gmail.com`）を新設 or 既存 `GLASSWERKS_INQUIRY_EMAIL` 流用。from＝既存default `MUED <noreply@mued.jp>`。

---

## 5. KPI hook（data path・insight課連携）★handoffの肝

### 5-1. 記録先 ＝ Neon 単一テーブル `advisory_inquiries`（新規・匿名可）

既存 `glasswerks_inquiries`・`marketing_consents` は **`user_id NOT NULL`（Clerkユーザ必須）** のため匿名LPフォームに使えない（確認済）。新テーブルを起こす。

```sql
-- db/migrations/0055_advisory_inquiries.sql（kimny が prod 手動適用＝prod-DB専管）
CREATE TABLE advisory_inquiries (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type              text NOT NULL,               -- 'inquiry' | 'booking'
  product           text,                        -- 'wallhit'|'diagnosis'|'build'|'run'|NULL（相談対象tier）
  name              text,
  email             text NOT NULL,
  locale            text NOT NULL DEFAULT 'ja',  -- 'ja'|'en'
  message           text,                        -- 問い合わせ本文（bookingはNULL可）
  status            text NOT NULL DEFAULT 'new', -- 'new'|'booked'|'contacted'|'closed'
  source            text,                        -- referrer/utm_source等
  utm_source        text, utm_medium text, utm_campaign text,
  scheduled_at      timestamptz,                 -- 予約枠時刻（booking）
  meeting_url       text,                        -- Meet/Zoom（booking）
  external_ref      text,                        -- Cal.com booking uid（冪等キー）
  consent_recording boolean NOT NULL DEFAULT false,
  consent_policy_version text,
  consent_locale    text,
  consent_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_advisory_inquiries_external_ref ON advisory_inquiries(external_ref) WHERE external_ref IS NOT NULL;
CREATE INDEX idx_advisory_inquiries_type       ON advisory_inquiries(type);
CREATE INDEX idx_advisory_inquiries_created_at ON advisory_inquiries(created_at DESC);
```
＋ `db/schema/advisory-inquiries.ts`（Drizzle module・additive Tier2）。

**なぜNeon単一テーブルか**（audit open decision #2への判断）：
- insight課の要件＝「月次1行dashboard」。それに最短なのは `count(*) FILTER (...)` の**1本SQL**。
- Blob（waitlistの前例）は list+parse で重く、SQL COUNT が無い。GA4はclient-only＋consent/sampling＋サーバMP env未設定で正確件数にならない → **記録の正には不適**。
- 問い合わせと予約を**別ストアに割ると単一dashboardが作れない**（split-source anti-pattern）。→ 1テーブル・`type`列で両方数える。

### 5-2. insight課の月次読取り（1行SQL・cron不要）

```sql
SELECT
  date_trunc('month', now())                                                   AS month,
  count(*) FILTER (WHERE type='inquiry')                                        AS inquiries,
  count(*) FILTER (WHERE type='booking')                                        AS bookings
FROM advisory_inquiries
WHERE created_at >= date_trunc('month', now());
```
- 将来 pre-aggregate が要れば `app/api/cron/rag-metrics` 方式（Vercel Cron＋history table＋`CRON_SECRET`）に拡張可。M0はSQL直で足りる。
- **insight課(rjiuakoj)と合わせる点**：①この読取り方式（直SQL / 月次snapshot納品 / どちら）②列名（inquiries/bookings/product別内訳の要否）。→ §8-D で協調（brief配布と並行して提案送付済）。

### 5-3. GA4（funnel色付けのみ・記録の正にしない）

`lib/analytics/gtag.ts` に `advisory_form_submit` / `advisory_booking` / `advisory_cta_click` を追加（既存 `mcp_inquiry_submitted` 等と同流儀）。流入/導線分析用。**件数の正はNeon**。

---

## 6. consent文言（録音同意・取得と保存）

**取得場所（audit open decision #4への判断＝両取り）**：
1. **Cal.com 必須予約質問**（required booking question）＝未同意なら予約が完了しない＝hard gate。
2. **webhook で Neon に再保存**（`consent_recording=true, consent_policy_version, consent_locale, consent_at`）＝自前で監査可能に。SaaS内だけに置かない（APPI/GDPR・marketing_consents踏襲）。
- レーンB（問い合わせ）は録音無しなので consent 任意（メール返信のみ）。

**文言（ドラフト・最終は content課owner／kimny retention確定後に固定）**：
- JA（case）：「この60分の相談は、品質向上と記録のために録音させていただきます。録音は◯◯に保管し、△△の範囲でのみ利用します。ご同意のうえご予約ください。」
- EN：「Your 60-minute session will be recorded for quality and record-keeping. The recording is stored in ◯◯ and used only for △△. Please consent before booking.」
- ◯◯（保存先）／△△（利用範囲）／保持期間 ＝ **kimny/content課確定**（§9 missing）。文言が実体と食い違うと同意瑕疵になるため、録音方式確定が前提。
- policy_version 文字列は privacy policy の版に紐付け（既存 `tokushoho`/privacy と整合）。

---

## 7. 実装ブレークダウン（Tier2・review後）

| # | 成果物 | 種別 | owner |
|---|---|---|---|
| 1 | `db/schema/advisory-inquiries.ts` ＋ `db/migrations/0055_advisory_inquiries.sql` | 新規（additive） | mued課／**prod適用＝kimny専管** |
| 2 | `app/api/advisory/inquiry/route.ts`（zod＋rateLimit＋Neon insert＋Resend2通・fail-open） | 新規 | mued課 |
| 3 | `app/api/advisory/booking/route.ts`（Cal.com webhook・署名検証＋Neon upsert(external_ref冪等)＋通知） | 新規 | mued課 |
| 4 | `lib/services/email.service.ts` に advisoryInquiryNotify/Confirm ＋ advisoryBookingNotify 追加 | 追記 | mued課 |
| 5 | `app/[locale]/advisory/_components/InquiryForm.tsx`（client・next-intl・amber） | 新規 | mued課 |
| 6 | `app/[locale]/advisory/_components/WallhitBooking.tsx`（Cal.com embed wrapper・locale連動） | 新規 | mued課 |
| 7 | `lib/analytics/gtag.ts` に advisory_* イベント追加 | 追記 | mued課 |
| 8 | `middleware.ts` isPublicRoute に `/:locale/advisory` ＋ `/api/advisory(.*)` 追加（Clerk保護回避） | 追記 | mued課 |
| 9 | `app/[locale]/advisory/page.tsx`（LP本体・noindex metadata）＋ `messages/{en,ja}.json` の `advisory` namespace | 新規 | **content課(copy/構成)** ＋ mued課(intake配線) |
| 10 | `.env.local.example` に CAL_WEBHOOK_SECRET / ADVISORY_NOTIFY_EMAIL / NEXT_PUBLIC_CAL_LINK ＋ 既存未記載の INTERNAL_API_KEY / EMAIL_FROM を追記 | 追記 | mued課 |

**content課 ↔ mued課 分界（audit missing）**：content課＝LP copy（messages namespace）＋ページ構成＋consent文言確定。mued課＝intake配線（form/embed/routes/table/webhook/middleware/KPI）。#1 LP実装PR（content主管）と #8 intake配線PR（mued主管）は**別PR**、mued課が #1 を repo owner として Tier2 review。

**環境変数**：
- 再利用（設定済）：`RESEND_API_KEY` `DATABASE_URL` `UPSTASH_REDIS_REST_URL/TOKEN` `NEXT_PUBLIC_GA_MEASUREMENT_ID` `GLASSWERKS_INQUIRY_EMAIL`
- 新規（Vercel設定要）：`CAL_WEBHOOK_SECRET`（Cal.com署名）／`NEXT_PUBLIC_CAL_LINK`（イベントリンク）／`ADVISORY_NOTIFY_EMAIL`（既存流用可）
- 既存だが `.env.local.example` 未記載で必要：`INTERNAL_API_KEY` `EMAIL_FROM` `EMAIL_SUPPORT`（webhook auth・from整合）

---

## 8. Gates & 連携（事前宣言・review をmid-flightで止めない）

### 8-A. ★Cal.com＝Tier3 external-resource gate（唯一のブロッカー・要pre-approval）
- 新規外部SaaSアカウント作成＝CLAUDE.md「外部リソース gate」＝**URGENCY:high・kimny/conductor 事前承認必須**。account作成前に握る。
- 併せて kimny 一回性作業：**Google Calendar を Cal.com に接続（≈15分・roadmap の一回性枠に収まる）**。これが zero-manual を"真"にする唯一の依存。
- account所有：kimny個人Google or glasswerks（要指定）。無料tier想定。

### 8-B. kimny gate（不可逆）
- **3面公開GO**（handoff据置・LP live＝kimny）。
- **公開LPの canonical pricing 表示**（¥30k/¥250k/¥200k/¥400k）＝kimny gate（LP課ルール）。#8は価格を新設せず**既存確定値を表示するのみ**（改定なし）。

### 8-C. prod DB migration（kimny専管）
- `0055_advisory_inquiries.sql` は **kimny が手動適用**（auto-migrate無し・prod-DB write は kimny専管・migration-first）。SQLは conductor 経由で提示。**テーブルが本番に存在する前にLP/webhookを公開すると初回予約が500で記録欠落**（§9 sequencing）。

### 8-D. insight課（rjiuakoj）＝データ経路協調
- 提案：Neon `advisory_inquiries` ＋ §5-2 の月次SQL。読取り方式（直SQL / snapshot納品）と列名を合わせる。→ brief配布と並行して proposal 送付。

### 8-E. content課＝consent文言＋LP copy
- consent文言（§6ドラフト）確定＋録音retention前提の確定。LP copy（messages namespace）。conductor が #1 dispatch と併せて調整。

### 8-F. write課＝canonical通知
- #8は pricing/spec を**変更しない**（既存値の受け皿を作るだけ）ため即時通知トリガーには非該当。ただしLP公開で canonical articulation が動く場合は content課側で write課通知（過剰通知側）。mued課は記録追記のみ。

---

## 9. Sequencing / rollout checklist（順序を誤ると記録欠落）

1. **[gate]** Cal.com account pre-approval（§8-A）→ account作成 → kimny GCal接続 → イベントタイプ「無料60分壁打ち」作成 → 必須consent質問設定。
2. **[kimny]** `0055` migration を prod 適用（テーブル先行）。
3. **[deploy]** middleware allow-list ＋ webhook route ＋ inquiry route ＋ env（`CAL_WEBHOOK_SECRET`等）を Vercel に反映。
4. **[test]** webhook 疎通（Cal.comテスト予約→DB行確認）／inquiryフォーム→DB行＋2通メール／consent値の保存確認／i18n EN・JA両方描画（片側空キー描画gotcha回避・i18n-key-diff）。
5. **[embed last]** LP に Cal.com embed を有効化（＝実予約受付開始）。**feature-flag で 1-4完了まで embed を伏せる**のを guard に。
6. **[verify＝キャラクターgate]** 実ブラウザで「実際に予約が入り、Meetリンクが発行され、kimnyカレンダーに載り、DBに1行＋consent＋通知が着く」を録画/スクショで確認。型/lint/build通過だけを「通過」にしない。

---

## 10. Effort 見積もり（review後・実装）

- DB(1)＋routes(2,3)＋email templates(4)＋KPI events(7)＋middleware(8)＋env(10)：mued課 ≈ 1–1.5日（既存パターン濃厚流用）。
- form/embed components(5,6)：≈ 0.5–1日（embed疎通＋consent配線が肝）。
- LP page/copy(9)：content課主管（copy量依存）。
- **クリティカルパス＝Cal.com gate承認＋kimny GCal接続**（コード量でなく承認待ち）。

---

## 11. 判断要請（conductor review / kimny）

```
QUESTION: 無料壁打ち予約の zero-manual を満たす scheduler として Cal.com Cloud（新規外部SaaS＝Tier3）の account作成＋kimny GCal接続を承認するか？
OPTIONS:
  - (a) Cal.com Cloud 承認（無料tier・kimny GCal接続15分・本briefの本線）
  - (b) Calendly を採用（fallback・webhook/質問が有料tier依存）
  - (c) scheduler を入れず「予約リクエスト→人が確定」に留める（zero-manual要件を満たさない＝P0未達）
RECOMMENDATION: (a)。zero-manual必須線を満たす最小コスト・webhook-nativeでKPI data pathが素直・delivery仕様「既製SaaS優先」に忠実。(c)はP0要件を落とすため不可。
```

補助決定（conductor review で確定したい）：
- **スコープ**：M0＝無料壁打ち予約（zero-manual）＋軽量問い合わせフォーム、Stripe決済は #9 に defer。→ 推奨：この線でGO。
- **録音方式・retention・保存先**（consent文言の前提）：kimny/content課確定。→ 推奨：Meet/Zoom cloud録画＋保持期間明示、利用範囲＝内部ディレクション向上のみ。
- **insight課データ経路**：直SQL 1本で月次dashboard可か、列名合意。→ 推奨：直SQL＋必要なら後日 rag-metrics式rollup。
- **Cal.com account所有**：kimny個人 or glasswerks。→ 推奨：glasswerks名義（客名義主義と整合）。

---

*一次＝handoff v2 #8 / roadmap（input KPI・P0）/ delivery仕様 v0（既製SaaS優先）/ mued_v2 infra recon（form/notify/schedule/KPI 4次元＋completeness critic）。実装は本brief conductor review 後に着手（Tier2）。*
