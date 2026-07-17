# plan-brief — ユーザーポータル（無料含む全リスト更新配布ハブ）

*2026-07-17 / mued課 起案（design 段階・実装は conductor/kimny 承認後）/ 正本決定＝`_chief/decisions/mued/decision-user-portal-20260717.md`（kimny B 批准）/ conductor dispatch への回答。*

---

## 0. TL;DR（conductor review 用サマリ）

- **作るもの**: ログイン → 自分のプラグイン（MUEDsat / MUEDlim / 将来 masterchain）一覧 + 最新版 DL + バージョン表示。無料 250+人含む全リストの「メールリンク再取得 UX を排除する定着装置」。`/dashboard/plugins`（既存の Clerk 保護領域配下）。
- **新規構築ゼロ級のリスク**: 認証＝既存 Clerk 完全流用（新規 auth ゼロ）。唯一の新設＝`plugin_entitlements` テーブル1枚（`masterchain_purchases` と完全同型＝email-keyed / user_id nullable）。
- **PR 4分割 / 見積り 2〜2.5日**（backfill・案内便文面・preview 往復含む）。
- **Tier**: P-1=Tier 2（純追加テーブル+配線）/ P-2・P-4=**Tier 3**（認可境界+licenseKey 露出）/ P-3 script=Tier 2・案内便送信=kimny gate。
- **C7 との順序**: **独立・並走可**。C7＝dsp課のプラグイン側 license 検証（keyfile/auval）で codepath 非共有。ポータル P-1→P-3（無料リスト）は今すぐ着手可。P-4（有料 license 表示）は masterchain go-live gate に自然に束ねる。→ **ポータル先行を推奨**。
- **kimny 稼働**: P-2 現物 preview 1回 + P-3 案内便送信 GO のみ。それ以外ゼロ。

---

## 1. 偵察済みの土台（mued課 実コード verify・全 path）

| 層 | 実態（verify 済み file） | ポータルへの含意 |
|---|---|---|
| 認証 | `middleware.ts` が `/dashboard(.*)` を Clerk 保護。`app/dashboard/page.tsx` は `currentUser()`→未ログイン `redirect('/sign-in')`。`getUserIdFromClerkId`（`lib/utils/auth-helpers.ts`）は DB 不在なら Clerk API から自動作成。`@clerk/nextjs ^7.0.7`。Clerk = **Hobby（無料）plan**（`middleware.ts` コメント "Clerk sessions are scoped to mued.jp (Hobby plan, no satellite)"） | **新規 auth 構築ゼロ**。ポータルは `/dashboard/plugins` = 既に保護された領域に1ページ足すだけ |
| 買い手データ | `masterchain_purchases`（`db/schema/masterchain.ts:38` / migration `0057`）= email + license_key + product_id + **user_id nullable**（guest-friendly）。email index 有 | **email 突合で「自分の購入物+キー」が載る**。P-4 で接続（発売時） |
| 無料 DL データ | **DB 記録なし**。`handlePluginSubscribe`（`lib/plugins/subscribe-handler.ts`）が Resend audience 追加（`lib/plugins/audience.ts`・`RESEND_MUEDSAT_AUDIENCE_ID` / `RESEND_MUEDLIM_AUDIENCE_ID`）+ welcome email 送信のみ。DL URL は静的公開（`lib/muedsat/config.ts` / `lib/muedlim/config.ts`・`https://mued.jp/downloads/*.pkg`） | **唯一の新設＝`plugin_entitlements` 記録**。subscribe-handler に best-effort 書き込みを1本足す。既存 250+人＝Resend audience から backfill |
| プラグイン registry | `lib/plugins/registry.ts` = `PLUGIN_DIST`（`muedsat` / `muedlim`）。`downloadUrl` / `live` / `source` / `i18nNamespace` を保持。**version フィールドは無い**（バージョンは pkg ファイル名 `MUEDsat-0.1.0-alpha` に埋まっている） | ポータルの「最新版＋バージョン表示」は registry を single source にする。**version フィールドを1個足す**（下記データモデル） |
| 昇格の先例 | `app/api/dial/link-account/route.ts`（guestToken→userId 付替） | email→アカウント紐付けの型は社内前例あり（ただしポータルは token linking 不要・email match で足りる） |

---

## 2. データモデル設計（設計の核）

### 2-1. ポータルが答える問い ＝「この email は何を所有しているか」

**所有の source は2つ・現在バージョンの source は1つ**。この分離が設計の要点。

| 種別 | 所有レコード（誰が持っているか） | 現在の配布物（最新版・DL URL） |
|---|---|---|
| 無料モジュール | `plugin_entitlements`（**新設**・email-keyed） | `lib/plugins/registry.ts`（code-owned） |
| 有料 masterchain | `masterchain_purchases`（既存・email-keyed・license_key 有） | registry（将来 masterchain 追加） |

- **所有（entitlement/purchase）と 配布物（version/URL）を分ける** 理由: バージョンは更新のたびに変わる（＝code PR で `downloadUrl` を差し替える現行運用と同じ）。所有レコードに version を焼き込むと更新のたびに全行 backfill が要る。所有＝「アクセス権がある」・registry＝「今の最新ビルド」。ポータルは組立時に join する。
- これは kimny の要望「無料 DL ユーザーもポータルからアップデータを DL」＝**所有（不変）× 最新版（registry が更新）** の直積で自然に満たされる。

### 2-2. `plugin_entitlements` schema（migration `0058`・純追加）

`masterchain_purchases` / `masterchain_interest` と**完全同型**（email-keyed・user_id nullable・first_touch jsonb・純追加 CREATE TABLE）。新規 schema submodule `db/schema/plugin-entitlements.ts` に定義し `db/schema.ts` から re-export（masterchain と同じ構成）。

```sql
-- db/migrations/0058_plugin_entitlements.sql（純追加・Tier 2・手書き・prod apply=kimny psql）
CREATE TABLE IF NOT EXISTS plugin_entitlements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,          -- lower-cased（所有キー）
  plugin_key  text NOT NULL,          -- 'muedsat' | 'muedlim' | 将来
  source      text NOT NULL,          -- 取得面（'muedsat_lp' 等）
  first_touch jsonb,                  -- gaClientId + utm*（他テーブルと属性 parity）
  user_id     uuid REFERENCES users(id) ON DELETE SET NULL,  -- nullable（subscribe 時は未ログイン＝NULL）
  created_at  timestamp NOT NULL DEFAULT now(),
  CONSTRAINT uq_plugin_entitlements_email_plugin UNIQUE (email, plugin_key) -- 冪等（再subscribe で重複しない）
);
CREATE INDEX IF NOT EXISTS idx_plugin_entitlements_email  ON plugin_entitlements (email);
CREATE INDEX IF NOT EXISTS idx_plugin_entitlements_plugin ON plugin_entitlements (plugin_key);
```

- `UNIQUE(email, plugin_key)` → 書き込みは `onConflictDoNothing`（冪等）。
- `user_id` は subscribe 時 NULL（email gate は未認証）。ポータルは **email match** で join するので user_id 不要。将来 link-account 型で埋めても良いが v1 スコープ外。

### 2-3. registry に version 追加（P-2）

```ts
// lib/plugins/registry.ts — PluginDist に1フィールド追加
version: string;   // 例 "0.1.0-alpha"（pkg ファイル名と一致・更新は downloadUrl と同時）
```
- **決定候補（conductor 判断仰ぐ）**: version の source を **(A) registry 定数** にするか **(B) 別テーブル `plugin_releases`（version/url/notes/released_at・更新履歴+release note 可）** にするか。
  - **mued 課推奨＝(A)**: v1 は「最新版1個表示」で足りる。version は downloadUrl と同じ code PR で1行更新（現行運用の踏襲・追加 infra ゼロ）。(B) の release note / 更新履歴は次段の enhancement。

### 2-4. ポータル組立（server component・authz 核心）

```
currentUser()                        // Clerk（既存）
  → verifiedEmails = user.emailAddresses
        .filter(e => e.verification?.status === 'verified')   // ★verified のみ
        .map(e => e.emailAddress.toLowerCase())
  → entitlements = SELECT * FROM plugin_entitlements WHERE email = ANY(verifiedEmails)
  → （P-4）purchases = SELECT * FROM masterchain_purchases WHERE email = ANY(verifiedEmails)
  → 各 entitlement/purchase を registry と join → { name, version, downloadUrl, licenseKey?（P-4のみ・自分の行だけ） }
```

**認可の境界＝「認証ユーザーの verified email 集合」**（下記 verify #1 の核）。

---

## 3. PR 分割 / Tier / verify

### PR-1（P-1・配線先行）— `plugin_entitlements` 新設 + subscribe 書込み 〔**Tier 2**〕

- migration `0058`（純追加 CREATE TABLE）+ `db/schema/plugin-entitlements.ts` + re-export。
- `lib/plugins/subscribe-handler.ts`: welcome email 送信成功後に `plugin_entitlements` へ **best-effort insert（onConflictDoNothing・`.catch()` で fail-open）**。理由＝配布物（welcome email の DL リンク）が honest な deliverable であり、ポータル用の所有レコードはその convenience。書込み失敗が DL 提供を壊してはならない（audience add が best-effort なのと同じ思想）。取りこぼしは P-3 backfill が reconciliation net。**★脚注（2026-07-17 実行時に確定した恒久注記）**: reconciliation net の source は plugin ごとに異なる。**専用 audience があれば audience backfill で足りるが、無ければ delivered-log 由来で再構成すること**。muedsat は `RESEND_MUEDSAT_AUDIENCE_ID` が専用 audience ではなく **General（汎用マーケ全リストの superset）** を指すため、audience backfill すると非DL者へ over-grant になる → **将来の sat reconcile は Resend delivered-log 由来**（詳細は PR-3 の実行時訂正）。
- unit test（`tests/unit/plugin-subscribe.test.ts` 拡張）: (a) live plugin subscribe → entitlement 1行 (b) 二重 subscribe → 冪等（1行のまま）(c) DB throw しても 200 + welcome 送信は不変（fail-open 回帰）(d) `live=false` plugin は no-op（entitlement 書かない）。
- **prod 順序**: migration `0058` を **コード merge 前に** prod Neon へ kimny psql 適用（`feedback-migration-before-schema-deploy` 準拠・0050–0057 と同じ手書き運用）。
- **Tier 2 理由**: 認可境界に触れない純追加テーブル+配線（決定 §Tier「P-1 の純粋追加テーブル+配線は Tier 2」）→ **product課 review**。

### PR-2（P-2・ポータル v1）— `/dashboard/plugins` + registry version 〔**Tier 3**〕

- `app/dashboard/plugins/page.tsx`（server component・`currentUser()`・verified-email match・**無料 entitlements のみ**。masterchain は P-4）。
- `lib/plugins/registry.ts` に `version` 追加。
- ポータル組立ユーティリティ（pure・testable）: `lib/plugins/portal.ts`（verifiedEmails + entitlements → PortalItem[]）。
- `/dashboard`（home）から `/dashboard/plugins` へのカード/ナビ導線。
- **i18n 必須**（EN/JA・`messages/{en,ja}.json`・新 namespace `portal`）。
- **UI = ui-mock-fidelity 機構適用 + kimny 現物 preview 1回**（§5）。
- **Tier 3 理由**: 認可スコープ（クロスユーザー非漏洩）＝本案件の security 核心 + licenseKey 露出面（P-4 で有効化するが surface は P-2 で作る）→ **conductor/kimny gate**。
- verify: 下記 **#1 認可スコープ**（クロスユーザー漏洩テスト）+ **#3 sign-in 非回帰** を PR test plan に明示。

### PR-3（P-3・リスト接続）— backfill script + welcome email 導線 + 案内便 〔script=**Tier 2** / 送信=**kimny gate**〕

- `scripts/backfill-plugin-entitlements.ts`: Resend `contacts.list({ audienceId })`（muedsat + muedlim audience）→ `plugin_entitlements` へ `onConflictDoNothing` 冪等 insert。**--dry-run 既定**・件数レポート・source は audience 由来 tag or `'{plugin}_backfill'`。
- **★実行時の訂正（2026-07-17・恒久メモ）**: 上記「plugin audience → backfill」は **muedlim では成立するが muedsat では成立しない**。`RESEND_MUEDSAT_AUDIENCE_ID` は専用 audience でなく **General（汎用マーケ全リストの superset・非DL者を含む）** を指すため（timestamp で確定: env は MUEDlim audience 作成より前に set＝当時 General のみ存在）、audience backfill すると非DL者へ false ownership（over-grant）になる。→ **muedsat は Resend delivered-log 由来で再構成**（`scripts/backfill-muedsat-from-list.ts` + `scripts/compute-muedsat-rescue-diff.ts`＝delivered-log base ∪ rescue〔lim audience − lim delivered の diff ∪ 個別救済〕∪ API top-up → dedup → 冪等 insert・freeze-then-commit で照合件数==write件数）。**muedlim は専用 audience ゆえ audience backfill 成立**（209）。実績: muedlim 209 / muedsat 280。**将来の無料モジュール reconcile は「専用 audience か否か」を GET /audiences で検証し、非専用なら delivered-log 由来で再構成すること**。
- welcome email（`lib/services/email.service.ts` の muedsat/muedlim welcome）に「ポータルで更新を受け取れる」導線1行追加（copy=content課・`voice-pass-includes-email-templates` 準拠で email copy も対象）。
- 既存 250+人への **案内便**（リスト初の能動接触）: 文面＝content課・**送信＝kimny gate**（外部公開発言）。
- **Tier**: backfill script code = Tier 2。**prod audience に対する backfill 実行 + 案内便送信 = kimny/conductor gate**（mass list op + 外部発信）。
- verify: backfill dry-run 件数が Resend audience 実数と一致（honest-display）。冪等（2回流して重複ゼロ）。

### PR-4（P-4・発売時）— license key 表示 + 購入物一覧 〔**Tier 3**〕

- ポータルに masterchain_purchases 接続（verified-email match）→ license_key 表示 + 購入物カード + DL。
- **masterchain go-live gate 束に自然に同梱**（memory: masterchain go-live=kimny gate 束・migration 0057 prod 適用が前提）。
- **Tier 3 理由**: licenseKey 露出。verify #1 のクロスユーザー漏洩テストを masterchain 行でも実施。

---

## 4. ★必須 verify 3点（conductor 指定）

### #1 認可スコープ（本案件の security 核心）
- **境界**: 認証済み Clerk ユーザーの **verified email 集合** に一致する `plugin_entitlements` / `masterchain_purchases` の行**だけ**が見える。他人の licenseKey は絶対に漏れない。
- **なぜ verified 限定か**: 未検証 email で他人の entitlement を横取り試行を封じる。Clerk は OTP 検証済み email のみ `verification.status==='verified'`。→ 所有主張の唯一の正当キーは verified email。
- **クロスユーザー漏洩テスト（PR-2/PR-4 必須）**: user A(`a@x` verified) と user B(`b@y` verified・masterchain license 保有) を seed → A でログイン → ポータルに **A の行のみ表示・B の licenseKey は server response にも DOM にも一切出ない** を assert。加えて「A が `b@y` を **未検証** で account に足しても B の entitlement を得られない」を assert。
- server component で email filter が効くこと（クライアントに全行を渡して JS で絞る、をやらない）。

### #2 Clerk MAU 課金階層（原価影響）
- **試算**: Clerk 無料枠 = **10,000 MAU**。現行 Hobby（無料）。250+人が全員アカウント化しても ~250–500 MAU 増 → **10k に遠く及ばず＝$0 incremental**。tier 跨ぎなし。
- **tripwire**: 総 MAU が 10k に接近した時のみ Pro（$25/mo + 従量）→ その時点で **CFO(freee課)一言**。現状はその水準に無い。
- **conductor 確認1点**: Clerk Dashboard で現行 plan が無料（Hobby）のままか裏取り（本 plan は無料前提）。有料階層に既にいるなら CFO ping。

### #3 sign-in ループ非回帰（7/12 Codex 指摘）
- 7/12 の loop は **dial pricing 面**。ポータルは **mued.jp/dashboard**（既に稼働中の保護ルート・`currentUser()`→`redirect('/sign-in')`）。dial.mued.jp サブドメイン branch（`middleware.ts` の `/dashboard` 強制リダイレクト）は**別 origin**なので非該当。
- **非回帰 verify**: welcome email の「ポータルを開く」リンク → `/sign-in?redirect_url=/dashboard/plugins` → サインイン → `/dashboard/plugins` 着地、を prod 相当環境で通し、**loop しない**ことを確認（E2E or 手動）。未ログイン直アクセスも同経路で1回で着地。

---

## 5. UI / デザイン方針

- **kimny「ここはちゃんと作ろう」= 品質最優先面**。DAW/プロオーディオ寄りの尖ったデザイン（CLAUDE.md デザインポリシー）+ glasswerks design system（amber `#f5a524` / Sora / dark surface `#111113`）。
- **ui-mock-fidelity 機構適用**: 承認 mock → pixel-faithful 実装。**kimny 現物 preview 1回**（PR-2 で mock 提示 → 承認 → 実装 → render×mock diff 添付）。
- 画面構成（v1）: プラグインカード列（各カード＝アイコン / 名称 / 現在バージョン / 「最新版 DL」ボタン / 取得日）。空状態（まだ何も持っていないユーザー）も設計。P-4 で license key 行 + 購入物カードを追加。
- i18n（EN/JA）必須。空文字キー無条件描画の罠（`i18n-empty-key-unconditional-render`）回避。

---

## 6. 見積り

| PR | 内容 | 見積り |
|---|---|---|
| P-1 | table + subscribe 配線 + unit | 0.5日 |
| P-2 | ポータル v1 UI + authz + registry version + mock/preview 往復 | 1〜1.25日 |
| P-3 | backfill script + welcome 導線 + 案内便文面調整 | 0.5日 |
| P-4 | license 表示（masterchain launch 時・別束） | 0.25日（発売束に同梱） |

**P-1〜P-3 で 2〜2.25日**（kimny preview 往復・案内便文面調整含む）。P-4 は masterchain go-live に同梱。Chief 読み「全体 2-3日」と整合。

---

## 7. C7 との順序（conductor への提案）

- **C7 = dsp課** のプラグイン側 license 検証（keyfile-at-known-path / Ed25519 offline / auval）＝ポータル（mued課・web 表示面）と **codepath 非共有・別課**。
- ポータル **P-1→P-3（無料リスト 250+人の定着装置）は masterchain launch に依存しない** → **今すぐ独立着手・並走可**。
- ポータル **P-4（有料 license 表示）は masterchain go-live gate 束に自然合流**（migration 0057 + prod secret + flag flip と同じ kimny gate 束）。
- → **推奨: ポータル先行（P-1→P-3）を今 dispatch。P-4 は masterchain 発売束。** C7 の dsp 進行を待たない。

---

## 8. conductor 判断を仰ぐ点（実装着手前）

1. **version source (A) registry 定数 / (B) `plugin_releases` テーブル** → mued 推奨 **(A)**（§2-3）。
2. **ポータル配置**: 専用ルート `/dashboard/plugins`（推奨・welcome email deep-link 先・既存複雑 dashboard を触らない）で確定か。
3. **P-3 案内便**: 文面 owner=content課 で発注して良いか（送信は kimny gate）。
4. **Clerk plan 裏取り**（verify #2）＝conductor が Dashboard 確認 or mued に委譲か。
5. PR-2/PR-4 の Tier 3 review 経路（conductor 直 or kimny gate batch 同梱）。

---

## 9. 反対仮説・不確実性

- 「1日で終わる」＝認証流用+テーブル1枚+ページ1枚なら現実的。backfill・案内便・preview 往復込みで 2〜2.25日と読む（実装見積は mued 課が正）。
- backfill の Resend `contacts.list` ページング上限（audience が大きい場合）＝250+人規模なら1〜数ページ・問題なし。honest-display で件数照合。
- 定着率仮説（ポータル > メール UX）＝kimny 一次体験由来。数値化は audience→ポータル login 転換率で定点観測に1行追加可能。
- masterchain_purchases（0057）は prod 未適用（kimny psql 待ち）。P-2 は無料 entitlements のみ＝**0057 に依存しない**（P-4 で 0057 済み前提）。

---

## 10. conductor review 確定事項（2026-07-17・GO）

conductor が全文精読・**判定=(a) GO。ポータル先行 P-1→P-3 で着手可**。以下は確定（本 doc を self-contained にするため追記）。

### §8 判断（確定）
1. **version source = (A) registry 定数**（v1 は最新1個で十分・downloadUrl と同 PR 更新・infra ゼロ。(B) plugin_releases は release note/履歴段の enhancement）。
2. **配置 = `/dashboard/plugins`**（既存 dashboard 非侵襲・welcome deep-link 先）。
3. **P-3 案内便 文面 owner = content課**。ただし **dispatch は P-2 preview 承認後**（実 URL/画面を正確に指せる状態で書く＝手戻り回避）。conductor が P-2 承認時に content課へ発注。
4. **Clerk plan 裏取り = mued課に委譲**（Dashboard で現行 plan=無料 を確認・**1行 evidence を PR に**。既に有料階層なら即 CFO(freee課) ping）。
5. **Tier3 review 経路**: PR-2 = **conductor 直レビュー**（認可 filter + クロスユーザー漏洩テストの evidence 必須・必要なら conductor が Codex 2nd opinion）+ UI = **kimny 現物 preview 1回**。PR-4 = **masterchain go-live の kimny gate batch に同梱**。

### 非交渉の受け入れ条件（PR-2 / PR-4）— Tier3 の核
- §4#1 クロスユーザー漏洩テストを **test で明示・PASS evidence を PR 添付**: A ログインで B の licenseKey が **server response にも DOM にも一切出ない** + 「**未検証 email 追加で他人 entitlement を得られない**」。
- **P-2 の server response に licenseKey フィールドを一切含めない**（P-2 は無料 entitlements のみ・licenseKey 導入は P-4）。→ P-2 の `PortalItem` 型に licenseKey を持たせない設計で担保。
- **email 突合は server component 内**（クライアントに全行を渡さない）。

### 軽微確認（回答済）
- migration **0058 = 未競合 確認済**（最高番号 0057・0058 空き・`db/migrations` 未 commit 差分なし）。繰上げ不要。

### kimny 手番（batch 化して後で surface・今ゼロ）
(i) prod 0058 psql 適用〔P-1 merge 直前・conductor が zero-friction な1行を用意〕 (ii) P-2 UI preview 1回 (iii) 案内便 送信 GO (iv) P-4 = masterchain go-live 束。**今は着手可・kimny 不在で P-1→P-3 を進めてよい**。

### C7 順序（確定）
並走。ポータル先行で進める（C7=dsp課 別 codepath）。
