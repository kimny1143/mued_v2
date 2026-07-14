# C2 — MUEDsp masterchain interest 計測分離（設計ドラフト）

*mued課 / 2026-07-14 / 設計のみ（実装は別 GO）。正本設計 = `_chief/decisions/mued/brief-paid-line-design-20260714.md`・執行計画 = `_conductor/docs/inbox/paid-line-execution-plan-20260714.md`（C2）。Codex 監査 P2。*

## 目的

masterchain（$69・発売前）の **有料 interest** を、無料モジュール（MUEDsat / MUEDlim）のダウンロード・リストと **分離して計測**する。発売前予告期間の高意図シグナル＝**90日判定の分母**（interest → purchase の転換率を同一 GA4 プロパティで測るための基準面）。

## ★現状の問題（一次確認・grounding）

`components/features/muedsp-landing/muedsp-landing-content.tsx:190`:

```
{isJa ? "発売時に知らせる（MUEDsat のリストに登録） ↓" : "Get notified at launch (join the MUEDsat list) ↓"}
```

- masterchain §1 の「発売時に知らせる」CTA は **§2 の MUEDsat 無料DLフォームへスクロールする anchor**＝masterchain 有料 interest が **MUEDsat 無料リストに混入**している。
- 結果: 「masterchain に $69 出す気がある人」と「無料サチュを試したい人」が同一リストに落ち、**masterchain interest を独立に数えられない**（分母が汚染）。Chief brief の「$69 買い手だけリスト外に落ちる自己矛盾」の interest 版。
- masterchain Buy 自体は inert（`disabled`・`buyLabel`）＝発売時に FastSpring popup 化（C1）。

## 設計原則

1. **intent で分ける**: 無料DL（試用意図）と masterchain interest（購入意図予告）は別シグナル。**別 Resend audience + 別 DB 記録 + 別 GA4 event**。email で cross-join は可能に保つ（「interest lead の X% が無料DL済」等の相関は測れる）が、リストとしては混ぜない。
2. **棚は借りる・客は所有する**（7/5 恒久）を interest にも: Resend（配信=借りる）＋ 自前 DB（分析台帳=所有）の2層。plugin の `audienceEnvName` + first-touch パターンを踏襲。
3. **staged flag**: `MASTERCHAIN_INTEREST_LIVE`（`lib/muedsp/` の既存 flag 群と同型）で公開を1点 gate。実装 merge ≠ 公開。

## 計測面（capture surface）

masterchain §1 の CTA を **専用 interest フォーム**に置き換え（現状の「MUEDsat リストへ scroll」を廃止）:
- email input + submit（「発売時に知らせる / Notify me at launch」）。DLリンクは**渡さない**（無料ゲートと違い、これは"発売告知の予約"）。
- 送信後: 「登録しました。発売時にお知らせします」。
- copy は content課 canonical（provenance 文法・「棚は借りる」トーン）。C3（転換面）と整合。

## ストレージ（2層）

### (a) 専用 Resend audience（配信リスト）
- 新 env `RESEND_MASTERCHAIN_INTEREST_AUDIENCE_ID`（dedicated audience "MUEDsp masterchain — interest"）。
- MUEDsat/MUEDlim の audience とは**別**。発売告知 list便の宛先。
- 作成・env set は prod-config gate（kimny/conductor・MUEDlim audience #648 と同手順）。

### (b) 自前 DB interest 台帳（分析・分母）
新テーブル `masterchain_interest`（migration 0057 候補・append-only）:

| column | type | 備考 |
|---|---|---|
| id | uuid pk | |
| email | text notNull | dedup 用 unique index（同一 email 再送は upsert or 無視） |
| locale | text | 'ja'/'en'（表示言語） |
| source | text | 捕捉面（'muedsp_masterchain_s1' 等・将来 in-plugin 面 C3 も） |
| firstTouch | jsonb | gaClientId + utm*（`lib/dial/first-touch.ts` shape 流用）＝**チャネル別分母** |
| userId | uuid null | 認証時のみ link（guest 可・dial guest と同型） |
| createdAt | timestamp | |

- **なぜ Resend に加えて自前 DB**: Resend は配信リスト（count/attribution/cohort/dedup が弱い）。自前 DB = 分析可能な台帳（channel 別 interest 数・GA4 と join・無料DL との email 相関）。90日判定の分母はここから query。

## GA4 計測

- interest 送信時に GA4 event 発火。**推奨 = `generate_lead`**（GA4 recommended event・conversion 化可能）＋ UTM params（source/medium/campaign）で**チャネル別 interest**を可視化。
  - client-side `gtag('event','generate_lead', {...})`（`lib/analytics/gtag.ts`）で十分（フォームは client）。server 側計測が要れば ga4-server に `trackServerEvent` を足す（今回は client で足りる）。
- 90日判定: **分母 = masterchain interest 数（channel 別）**／**分子（後）= 実 $69 購入（C+ の GA4 purchase）**。同一 GA4 プロパティゆえ interest→purchase funnel が測れる。

## API

新 route `POST /api/masterchain/interest`（plugin subscribe handler と別・DLリンク無しゆえ welcome-email deliverable が無い）:
1. rate-limit（既存 `lib/middleware/rate-limit`）。
2. zod validate（email + locale + firstTouch＝`firstTouchInputSchema` 流用）。
3. `MASTERCHAIN_INTEREST_LIVE` gate（false→ no-op 200・plugin の not-live gate と同型）。
4. DB upsert（email unique）→ Resend audience add（best-effort・失敗は operator alert）→ 200。
5. marketing consent 記録（`marketingConsents` パターン・source='masterchain_interest'）。
- GA4 `generate_lead` は client 側でフォーム送信成功時に発火（server 二重発火を避ける）。

## 開いた論点（conductor / kimny）

1. **CTA 置換の範囲**: §1 の「MUEDsat リストへ scroll」を interest フォームに完全置換で良いか（content課 copy 確定要）。
2. **GA4 event 名**: `generate_lead`（推奨）vs 独自 `masterchain_interest`（GA4 custom）。
3. **consent**: interest 登録は marketing consent 対象（`marketingConsents` に記録）で良いか＝プライバシー整合（発売告知 = marketing）。
4. **無料DL との関係の見せ方**: 同一 email が両方に居るのは自然（分けるのはリストであって人ではない）。UI 上「既に無料DL済でも masterchain interest は別登録」を暗黙で OK か。
5. **実装 owner の粒度**: capture 面 copy = content課 / route + DB + audience = mued課 / audience 作成 + env set = prod-config gate（kimny/conductor）。

## 依存・順序

- C3（free→paid 転換面）と CTA copy を共有＝content課 canonical 待ち。
- audience 作成 + env set = prod-config gate（実装 merge 後の公開時・#648 手順）。
- 実装は非gate（route/DB/flag は今書ける）だが**公開は GO 後**（`MASTERCHAIN_INTEREST_LIVE` flip）。

## 再利用（新パターンなし）

- first-touch 捕捉: `lib/dial/first-touch.ts` + `first-touch-client.ts`（gaClientId + utm）。
- audience: `lib/plugins/audience.ts`（`audienceEnvName` + `resend.contacts.create`）。
- not-live gate / rate-limit / zod: plugin subscribe handler（`lib/plugins/subscribe-handler.ts`）。
- consent: `db/schema/marketing-consents.ts`。
- GA4: `lib/analytics/gtag.ts`（client `generate_lead`）。
