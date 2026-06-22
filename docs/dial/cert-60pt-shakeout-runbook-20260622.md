# MUEDial 60点ゲート certify — multi-user E2E shakeout runbook + cert report

**Owner:** mued課 · **Dispatch:** conductor (Chief relay / kimny) 2026-06-22 · **Type:** verification (no PR; cert is evidence)
**Gate:** 守り#1 reliability arc (8PR + E#554) prod merged ＝実装完了。残る唯一の60点ゲート = multi-user で full-loop を real に通す実証 (stability report #④ close)。後決済 Phase2 は park＝ゲート外。

---

## 1. Method (なぜこの形か)

- **real deployed path 必須** ([[feedback_verify_real_deployed_path_not_proxies]]): unit/script proxy 不可。
- **real RoEx は prod のみ**: local `ROEX_API_KEY` は dev/prod どちらとも不一致 (確認済 2026-06-22)。preview deploy も RoEx key / webhook (CF off-Vercel) 忠実性が不明 → **唯一の real path = `https://dial.mued.jp` を test guest session で browser-drive**。real user data には触れない (guest/abandoned のみ)。
- **concurrency 実現法**: Chrome は single-instance 共有 → OS 並走不可。だが RoEx render が分単位ゆえ **tab-interleave** (A の final render 中に B/C の render を start → server-side で実際に時間的に重なる) で R4(atomic preview-slot reservation) / R5a(charge-failure detection) / R3(decode-stall) の同時利用 path を実際に exercise できる。sequential 単発でない要件を満たす。
- **計測**: `dial_tasks.credits_consumed` (authoritative COGS) + `task_type` + `roex_task_id` + `r2_final_url`。`scripts/cert-shakeout-observe.ts` で baseline→watch→report。

## 2. 対象 session (real-user 除外)

| session | mode | mastering | cyc | 用途 |
|---|---|---|---|---|
| `e2e7e57e-…-0003` | dialogue | なし | 0/5 | mix loop (master→DL 不可) |
| `02f09d4d-…` | dialogue | omakase | 0/5 | **master→DL full loop (April 放置, 0 tasks)** |
| 2026-04-16 guest | dialogue | omakase | 0/5 | concurrency 2本目 |

- **除外**: Yuu/goodwill (`df55abae` / `e3688b24` 等) = real-user-adjacent。
- guest_token は `scripts/cert-shakeout-observe.ts urls <ids>` で **runtime 解決** (repo/docs/memory 非永続)。

## 3. 実行手順 (per loop)

upload 済 session を使う場合は 4 から。

1. `cert-shakeout-observe.ts baseline <ids>` で pre-run snapshot。
2. drive URL を `... urls <ids>` で取得 (terminal のみ)。
3. Chrome で session を開く → 必要なら stem upload (`docs/sunogen_audio/muedial/multitracks/Track 2 liberation/`)。
4. Hoo と会話 → mix preview 生成 → 承認 → **mix final** (paid render, RoEx ~数分)。
5. mastering 要求 → master preview → 承認 → **retrievefinalmaster** (paid render)。
6. **download** final master (★MUEDsp embed Tier1 swap 点 = ここが clean か確認)。**★undici watch (F-3/#559)**: master→DL が clean に抜けるか = undici 6.27 bump の実 DL runtime 確証も兼ねる。DL/R2 で 404 / 壊れ / stall が出たら undici regression を疑い即報告(blast radius は @vercel/blob のみ・DL は global fetch ゆえ低リスクだが最終確証点)。
7. concurrency: A の final render 待ち中に別 tab で B/C の step 4-5 を start (server-side overlap)。
8. 走行中は別 shell で `... watch <ids>` で task status 遷移を live 観測。
9. 完走後 `... report <ids>` で delta + COGS + anomaly。

## 3.5 Pre-flight findings (read-only prep, before any live drive)

### F-1 (FIXED, Tier1, PR #558) — dial-reconcile-cron unit test broken by R5a
- `tests/unit/api/dial-reconcile-cron.test.ts` 2 tests failing on clean `origin/main`.
- 真因: R5a (#551) が reconcile route に `detectChargeFailures()` を追加 (`dialSessions`/`dialCompLedger` + `and/gt/gte` 参照) したが companion test の mock 未更新 → route throw → POST 500 (expected 200)。**prod は無影響** (実 schema は両 table を export)。test-only maintenance gap。
- fix: schema/drizzle mock 補完 + runReconcile を detectChargeFailures path から isolate。full unit suite **1719/1719 green** (was 2 fail)。

### F-2 (OPEN, Tier2/3 — conductor/kimny 判断) — CI が unit test の ~36% しか実行していない
- **evidence**: #551 commit (99dc90d2) 時点で `tests/unit/**` = **101 files** 存在 (dial-reconcile-cron.test.ts 含む)。だが #551 の CI "Test" job log = **36 files / 580 tests passed**。→ CI は 101 中 36 file しか collect していない。
- 機構: CI の `npm run test:unit` = `vitest run --dir tests/unit` は **default `vitest.config.ts` (testcontainers)** を使う (本来 unit は `vitest.config.unit.ts`、project memory 既知)。`--dir` + default config の multi-pattern `include` 相互作用で大半の unit file が collection から脱落。
- **影響**: 「unit green in CI」は信頼できない。R3/R4/R5a など守り#1 reliability arc の unit test が CI gate されていない可能性。F-1 が #551 で素通りしたのが実証。**60点 cert は CI unit signal に依拠できない** (full local unit config 実行が必要)。
- 朗報: F-1 fix 後 full unit suite (correct config) = 1719/1719 green → CI collection を直しても pre-existing failure の洪水は出ない。clean remediation 可能。
- **推奨 remediation**: `package.json` の `test:unit` を `vitest run --config vitest.config.unit.ts` に変更 (全 101 file / 1719 test を no-Docker で実行)。CI gate 変更ゆえ Tier2/3 = conductor/kimny 判断。F-1 (#558) 着地後に別 PR。

## 4. Pass criteria (rubric)

- **及第 65-70**: Phase1b LIVE + full master→DL loop ×1 clean (anomaly 0)。
- **60点 certify**: 上記 + concurrent 2-3 並走で R4/R5a/R3 が綻ばない (atomic slot 重複課金なし / charge-fail 誤検知なし / decode-stall 無限処理化なし)。
- **綻び**: 出たら per-fix Tier (mued→product Tier2 / billing・schema・署名核は Tier3)。大きい修正は plan-mode。

---

## 5. CERT REPORT (走行後に記入)

**Run date:** _TBD_ · **Env:** dial.mued.jp (prod) · **Chrome lock:** _granted? _

### Loops
| # | session | mode | preview | mix-final | master-preview | master-final | download | result |
|---|---|---|---|---|---|---|---|---|
| A1 | 02f09d4d | dlg+master | | | | | | |
| B1 | (concurrent) | | | | | | | |
| B2 | (concurrent) | | | | | | | |

### Concurrency behavior (R4/R5a/R3)
- R4 atomic preview-slot (cap-bypass race): _observed?_
- R5a charge-failure detection (false alert?): _observed?_
- R3 decode-stall (0-stems / long-wait): _observed?_

### COGS
- total credits_consumed (this run): _TBD_ cr (from `... report`)
- per-loop avg: _TBD_

### Verdict
- estimated score: _TBD_ / 100
- rubric 充足: _及第? 60cert?_
- 綻び list (per-fix Tier 付き): _TBD_

### Next
- _TBD_ → kimny-pending + patrol で kimny/Chief へ。

---

## Appendix A — clean test-session seed (DRAFT, option (i); kimny prod-write 専管)

**条件**: kimny が「(i) DB-seed(Stripe 課金なし・RoEx COGS のみ)」を選んだ場合のみ適用。`…0003` の実 row 構造に倣った空 paid+mastering guest session を 3 本立てる(Round A 単発 + Round B 2-3 並走)。**guest_token は適用時に `gen_random_bytes` で生成**(file には書かない)。track は seed せず — drive 時に UI から実 stem(`docs/sunogen_audio/muedial/multitracks/Track 2 liberation/`)を upload(=実 R2 hosting + upload path も exercise)。**未適用**(kimny 承認後・本人 or conductor 経由)。

```sql
-- 3 dedicated cert test sessions (guest, paid, dialogue+omakase mastering, empty/uploading).
INSERT INTO dial_sessions
  (id, user_id, mode, status, state, musical_style, title, guest_email,
   guest_token, guest_token_expires_at, payment_status, is_free_campaign,
   mix_check_count, paid_cycle_count, preview_count,
   base_cycle_limit, additional_cycles_purchased, additional_cycle_limit,
   mastering_mode, draft_number, created_at, updated_at)
SELECT
  gen_random_uuid(), NULL, 'dialogue', 'uploading', 'uploading', 'POP',
  'E2E 60pt cert ' || n || ' (TEST — safe to delete)',
  'e2e-cert-' || n || '@mued.invalid',
  encode(gen_random_bytes(32), 'hex'),          -- fresh 64-char guest token
  now() + interval '7 days',
  'paid', false,
  0, 0, 0,
  5, 0, 5,
  'omakase', 1, now(), now()
FROM generate_series(1, 3) AS n;

-- read back drive URLs (token shown ONLY in psql output — do not persist):
SELECT 'https://dial.mued.jp/dial/' || id || '?token=' || guest_token AS drive_url, title
FROM dial_sessions WHERE guest_email LIKE 'e2e-cert-%@mued.invalid' ORDER BY title;

-- cleanup after cert (run once all loops done):
-- DELETE FROM dial_sessions WHERE guest_email LIKE 'e2e-cert-%@mued.invalid';
```

- **要確認(初回 drive 時)**: seeded `mastering_mode='omakase'` + `payment_status='paid'` のみで mix→master 全 paid render gate を満たすか(ゲート=paymentStatus+cycle ゆえ満たす想定・[[reference-muedial-credit-cost-architecture]])。満たさなければ Stripe (ii) 方式へ。
- `scripts/cert-shakeout-observe.ts urls <ids>` でも drive URL を runtime 解決可(seed 後の id を渡す)。
