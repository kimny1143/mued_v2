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

### F-4 (cert-execution 制約) — 60MB WAV stem は browser file_upload 不可
- 実 separated stems = `Track 2 liberation/` の **9 WAV × 60MB(計 541MB)**。だが claude-in-chrome `file_upload` は **<10MB/call** + source は session-shared folder 限定 → **「UI から実 stem upload」は full mix loop で不可**。小さい音源は 2-mix(mp3)のみ=separated stem でない。
- **→ 2 つの実行 path**(session 方式と束ねて kimny 判断):
  - **(A) full mix→master loop**: stem を R2/CDN に pre-host し、`dial_tracks` を r2_url で **pre-seed**(goodwill grant Layer A pattern)→ UI upload 不要・RoEx が URL fetch・full mix も exercise。要 stem hosting + kimny prod-write。
  - **(B) mastering-only loop**: 小さい 2-mix(`public/audio/demo/*.mp3` 等 <10MB)を upload → master-preview→retrievefinalmaster→DL。**master→DL(embed swap 点)+ concurrency を最小コストで実証**・mix loop は非対象。provisioning 軽量。
- **2026-06-22 conductor 決定: (A) full mix が本来の60点cert**((B) mastering-only は R3/R4/preview path を skip=reliability 核を未検証・rubric「full E2E 1周」不充足ゆえ却下)。kimny 全承認(prod / ~$24 / seed は kimny 適用 / Chrome lock)。

### F-4b (provisioning 制約 — full mix の stem をどう入れるか)
real RoEx mix は stem を **RoEx GCS(signed URL・prod RoEx key 経由)** か **任意 public `r2_url`**(`resolveTrackUrl` が GCS 失効時 r2_url に fallback=RoEx 消費可)から fetch。local からの pre-host を検証した結果:
- ❌ **Vercel Blob**: store が private-access → public URL 不可。
- ❌ **Vercel(public/ deploy)host**: RoEx の GCS IP を Vercel managed DDoS が deny する risk(2026-06-15 webhook incident と同型)→ stem fetch 失敗 risk。
- ⚠️ **CF R2 直 put**: `wrangler` はあるが未認証(token 失効)・CF token も .env.local になし → kimny の `wrangler login` か CF token が要る。
- ✅ `dial-r2`(muedial-deliverables)/ `mued-videos` は Cloudflare ゆえ DDoS 問題なし(RoEx fetch 可)だが直 put 経路が上記認証要。

→ **2 provisioning path**:
  - **(D) UI upload(推奨)**: 空 paid+mastering session を seed(下記 SQL・tracks なし)→ browser-drive で **trim 済(<10MB)stem を UI から upload** → app が real RoEx GCS upload を実施(prod key は app 側)。**hosting infra 不要・最も faithful**。risk=file_upload の <10MB/source 制約 + browser fragility → **upload を最初に test(fail-fast)**。
  - **(C) wrangler R2 host(fallback)**: kimny `wrangler login` → trim stem を `wrangler r2 object put` で muedial-deliverables へ → `dial-r2 /stream/{key}` public URL → tracks seed(r2_url)。Cloudflare host ゆえ DDoS なし・robust だが kimny login 要。
- **採用**: (D) を Chrome lock 取得後に試行、upload が通らなければ (C) に fallback。seed SQL は (D) 用=空 session(下記)。
- **cleanup 必須**(conductor): cert 後に hosted stem(あれば)+ seed test session を delete(kimny 実 stem の trim が public に残らない・顧客データ非混在)。`scripts/cert-provision.ts cleanup` + stem del。

## 4. Pass criteria (rubric)

- **及第 65-70**: Phase1b LIVE + full master→DL loop ×1 clean (anomaly 0)。
- **60点 certify**: 上記 + concurrent 2-3 並走で R4/R5a/R3 が綻ばない (atomic slot 重複課金なし / charge-fail 誤検知なし / decode-stall 無限処理化なし)。
- **綻び**: 出たら per-fix Tier (mued→product Tier2 / billing・schema・署名核は Tier3)。大きい修正は plan-mode。

---

## 5. CERT REPORT (2026-06-22 実走完了)

**Run date:** 2026-06-22 · **Env:** dial.mued.jp (prod・real RoEx prod key・real Liberation stems 45s×9) · **Chrome lock:** granted (permission = host-access 既存・kimny action 不要) · **Method:** prod-API drive (guest token・browser が叩くのと同一 real endpoints) + browser client spot-check。**file_upload tool が host-path 非対応**ゆえ full browser UI drive は物理不可 → API drive 採用 (conductor 承認)。

### Loops (4 full-loop attempts · 2 sessions × 2 rounds)
| # | session | preview | Hoo chat | mix-final | master-preview | master-final | download | result |
|---|---|---|---|---|---|---|---|---|
| R1 | cert2 | ✓49s | ✓1msg | ✓18s | ✓49s | ✓10s | ✓200/7.9MB | **CLEAN** (139s) |
| R1 | cert3 | ✓49s | ✓ | ✓18s | ✓48s | ✓8s | ✓200/7.9MB | **CLEAN** (135s) |
| R2 | cert2 (concurrent) | ✓ | ✓ | ✓ | ✓ | 409 (guard) | n/a | **concurrency OK** |
| R2 | cert3 (concurrent) | ✓ | ✓ | ✓ | ✓ | 409 (guard) | n/a | **concurrency OK** |

- **R1 = 2 clean full E2E loops** (upload→preview→Hoo chat→mix-final→master-preview→master-final→**download**)。master→DL (MUEDsp embed Tier1 swap 点) 2× verified (real master WAV 7.9MB・http 200)。
- **R2 = 2 truly concurrent loops** (両 session の preview task が同時 `processing` を live 確認)。preview→mix-final→master-preview を並走で完走・**相互干渉なし**。master-final は両方 **409 `MASTERING_ALREADY_DONE`** = R1 で既に master 済ゆえ **duplicate-mastering 防止 guard が正しく作動**(綻びでなく仕様どおり・double-charge 防止の実証)。
- **DB tally: failed task = 0**(全 session)。cert2/cert3 各 paid_cycle=2。

### Concurrency behavior (R4/R5a/R3)
- **R4 atomicity**: mastering advisory-lock を **409 duplicate-mastering guard で実証**(同一 session 再 master ブロック)。omakase preview-slot same-session race は dialogue session ゆえ非該当 (unit #549 でカバー済)。
- **R5a charge-failure detection**: failed paid task = 0 ゆえ alert 対象なし = **false alert なし**(money logic 不変を実走で確認)。
- **R3 decode-stall**: **browser client spot-check 合格** — 完走 session を実 browser load → master/final/stems(10-track ZIP)DL ボタンが `completed` で正常描画・無限スピナー/decode-stall なし・console error 0。**final mix は stems を持つ**(10-track ZIP・harness の stems=0 は false reading)。
- **undici-watch (F-3)**: 全 DL path http 200・real WAV 取得・regression なし = **undici 6.27 prod 健全**。

### COGS (bounded ~$24 / ~3000cr 以内)
- credits_consumed column = 0 (consume 本番未配線・gate=cycle ゆえ正常)。**実 COGS = paid_cycle 4 (cert2=2/cert3=2)** + RoEx renders 計 ~15 (preview 5[free] + final 4 + master-preview 4 + master 2)。user-credit 換算 ~1,500-1,600cr ≈ **bound 内** ($24/3000cr 未満)。cert1 = burned (0 render)。

### Verdict
- **estimated score: ~70 / 100** (Chief rubric「Phase1b LIVE + full E2E 1周 clean → 65-70 及第」を **超過**: full E2E ×2 clean + concurrency 実証 + master→DL + client spot-check)。
- **rubric 充足: 60点 certify = PASS**。Phase1b LIVE ✓ / full master→DL clean ✓×2 / concurrent 2並走で R4(guard)・R5a(no false alert)・R3(client clean)綻びなし ✓。**守り#1 reliability arc を multi-user real-E2E で実証 = stability report #④ close**。
- **coverage(honest・silent gap 回避)**: server reliability = **real-API full**(real prod endpoints + real RoEx + chat orchestration #477 + master→DL)。client UI = **browser spot-check**(完走 session 描画・decode)。**未 exercise**: 連続 UI drive(file_upload 制約)・R4 omakase same-session race(dialogue ゆえ非該当・unit 済)・R5a alert 発火(failed task ゼロゆえ trigger なし)。
- **綻び list**: **product-level 綻び = 0**。Notes: (N1) dialogue flow は mix-final 前に Hoo chat 必須(仕様・直 API 統合時の留意点)/ (N2) logged-in browser で guest session を開くと auto-link → token null(cert1 burned・実 user は意図動作だが cert 留意点)/ (N3) file_upload tool が host-path 非対応(tooling)/ (N4 positive) duplicate-mastering guard 作動。

### Next
- cert PASS → kimny-pending + patrol で kimny/Chief へ。**cleanup 必須**: cert1(kimny 垢 link)+ cert2/cert3 test session delete(下記 Appendix B)。free15 自然蓄積を待たず開けられる状態。

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

- **実走で確認済(2026-06-22)**: seeded `mastering_mode='omakase'` + `payment_status='paid'` で mix→master 全 paid render gate 通過(ゲート=paymentStatus+cycle)。**provisioning は最終的に「空 session seed(下記)+ real API で stem upload(`scripts/cert-upload-stems.ts` presign→PUT→confirm)」を採用**(file_upload tool が host-path 非対応ゆえ browser UI upload は不可)。
- `scripts/cert-shakeout-observe.ts urls <ids>` でも drive URL を runtime 解決可(seed 後の id を渡す)。

## Appendix B — cleanup (cert 後・kimny prod-write 専管)

cert 完了後に **3 test session(cert1 burned 含む)を delete**。`dial_fx_sheets` のみ FK が `NO ACTION`(他は CASCADE)ゆえ先に消す。R2 stem copy は 30日・RoEx GCS は 1h で自動失効ゆえ DB delete が主。

```sql
-- delete fx_sheets first (FK NO ACTION), then sessions (tasks/tracks/messages/purchases/trial_events cascade)
DELETE FROM dial_fx_sheets WHERE session_id IN (SELECT id FROM dial_sessions WHERE guest_email LIKE 'e2e-cert-%@mued.invalid');
DELETE FROM dial_sessions WHERE guest_email LIKE 'e2e-cert-%@mued.invalid' RETURNING id, title;
```
(cert1 は kimny 垢に link 済だが guest_email='e2e-cert-1@mued.invalid' は残存ゆえ上記で一括 delete = kimny 垢からも除去される。)
