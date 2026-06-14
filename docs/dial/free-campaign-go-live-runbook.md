# MUEDial 無料15人施策 (Path A) — go-live 実行ランブック

作成: 2026-06-10 / mued課 / 状態: **実装完了・main merged済 (kill-switch OFF)。本書 = kimny GO 後の実行手順**

> 戦略・GO判断材料は `_conductor/docs/inbox/muedial-free-open-go-prep-20260608.md` を正本とする。
> 本書は **mued課が責務を持つ go-live ゲート (migration / env / E2E) の実行コマンド集**（structural complement）。

---

## 前提（実装状態・2026-06-10 確定）

| 要素 | 状態 |
|---|---|
| Path A 実装 | ✅ main merged (7コミット `#free-campaign 1/7→7/7`) |
| kill-switch | `DIAL_FREE_CAMPAIGN_ENABLED` **DEFAULT OFF** → 本番不可視 |
| Unit tests | ✅ 21/21 green (`tests/unit/lib/dial/free-campaign.test.ts` + grant test) |
| Auto Top-Up | ✅ OFF 確認済 (2026-06-08 conductor, RoEx dashboard `auto_topup_enabled=false`) |

実装側の追加コードは **ゼロ**。残はすべて運用ゲート。

---

## ゲート M1 — migration 0048 本番適用 (kimny 手動 psql)

`db/migrations/0048_add_dial_is_free_campaign.sql`。`is_free_campaign` 列が無いと
`/api/dial/campaign/{start,stats}` が column-missing で 500。**env ON より前に適用必須。**

### M1-a. 適用済みか先に確認（非破壊）

```sql
SELECT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_name = 'dial_sessions' AND column_name = 'is_free_campaign'
) AS column_exists;
```

- `column_exists = true` → 適用済み。M1 スキップ → M2 へ。
- `false` → M1-b を実行。

### M1-b. 適用（未適用時のみ）

```sql
ALTER TABLE dial_sessions ADD COLUMN is_free_campaign BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX dial_sessions_unique_free_campaign_per_user
  ON dial_sessions (user_id)
  WHERE is_free_campaign = true;
```

純粋追加列 (NOT NULL DEFAULT false)・後方互換・backfill 不要。partial unique index は
per-user lifetime-1 の DB backstop（API は advisory lock + check で先に弾く）。

### M1-c. 適用後の確認

```sql
SELECT count(*) AS free_grants FROM dial_sessions WHERE is_free_campaign = true;  -- 期待: 0
```

---

## ゲート M2 — env 3点設定 (Vercel Production)

> ⚠️ `echo` は末尾改行が混入する。**必ず `printf`** を使う（過去インシデント）。
> ⚠️ 本番環境設定 = escalation 対象。kimny / conductor 操作。

| 変数 | 値 | 意味 |
|---|---|---|
| `DIAL_FREE_CAMPAIGN_ENABLED` | `true` | マスターキルスイッチ（これが点火スイッチ本体） |
| `DIAL_FREE_CAMPAIGN_AUDIENCE` | `open` | cap-only 先着「演出」（既定。緊急時 `waitlist` に env だけで切替可） |
| `DIAL_FREE_CAMPAIGN_CAP` | `15` | ハードキャップ（既定15。プール 9,610 / ~480-600cr/人） |

```bash
printf 'true' | vercel env add DIAL_FREE_CAMPAIGN_ENABLED production
printf 'open' | vercel env add DIAL_FREE_CAMPAIGN_AUDIENCE production
printf '15'   | vercel env add DIAL_FREE_CAMPAIGN_CAP production
```

`AUDIENCE`/`CAP` は既定値と同じため省略も可だが、**明示設定を推奨**（後で値を動かす時の単一管理点になる）。
env 反映には Vercel 再デプロイが必要（getter は call-time read だが、env 注入はデプロイ単位）。

**重要: M2 は M1 + M3 が緑になるまで実行しない。** ENABLED=true にした瞬間に LP CTA が live 化する。

---

## ゲート M3 — 実 RoEx E2E ≈980cr verify（キャラクター gate）

> 注: free15 の cycle 予算は #461 で **baseCycleLimit 1→3**（full dialogue journey = mix_check×2 +
> final）に更新済。当初 6/10 go-live は baseCycleLimit=1 / ≈480cr の旧仕様で実施した（その実行記録は
> status/memory 側）。以下の cr 図は現行仕様（≈980cr）に同期。canonical 値は
> `lib/dial/free-campaign.ts`（`baseCycleLimit` + `roexCrEstimate`）。

機械テストで拾えない。**実音源・実 RoEx cr 消費**を人間が確認する一線。

### ★環境 = 制御 prod soft-launch（preview は使えない）
- **preview は分離サンドボックスでない**: DATABASE_URL は全 scope 同値 = **prod Neon DB**、preview の ROEX_API_KEY = **production 実キー**（≠ dev key, `isRoExDevKey()` false）→ preview deploy も実 RoEx を呼び **prod プール(9,610cr)を実消費・prod DB に行を書く**（[[reference-vercel-preview-shares-prod]]）。よって preview E2E は prod soft-launch と副作用が同等。
- **E2E 方式 = 制御 prod soft-launch**（owner+kimny 承認 2026-06-10）: operator=user#1、**二段点火**で公開を封じる。
- **operator account**: 内部 test Clerk アカウント（実顧客でない）。AUDIENCE=waitlist gating ゆえ operator email を **waitlist 登録**（`lib/storage/waitlist-blob`）→ E2E 窓で他者は `not_waitlisted` で構造排除。operator email は kimny/conductor が確定（auth=escalation）。
- **test 音源 = multi-stem 必須**（dialogue mix は stem 分離前提・ステレオ2-mix 不可）: `docs/sunogen_audio/muedial/multitracks/Track 2 liberation.zip`（既存 Liberation デモの元 stem・RoEx 通過実績あり）。

### ★二段点火（kimny「点火」= ENABLED toggle でなく cap 1→15 公開）
```
1. conductor が prod env 設定: DIAL_FREE_CAMPAIGN_ENABLED=true / DIAL_FREE_CAMPAIGN_AUDIENCE=waitlist / DIAL_FREE_CAMPAIGN_CAP=1
   （cap=1 + waitlist で operator 以外は claim 不可＝公開封じ）
2. operator が full journey 実行（下記フロー）→ CCO が証跡検証
3. operator session を DELETE（onDelete cascade で tasks も削除）
4. ★count=0 gate: SELECT count(*) FROM dial_sessions WHERE is_free_campaign=true; が 0 を確認（clean start 構造検証）
5. [kimny「点火」] conductor が cap 1→15 / AUDIENCE waitlist→open に変更（=公開）
```
data cohort は `is_free_campaign=true AND created_at >= <switch_on_ts>` の時間fence でも保護（cleanup 漏れに非依存）。点火前に RoEx dashboard 実残高 snapshot を data baseline へ（baseline ≈ 9,610 − E2E実消費 ≈ 9,100cr）。

### フロー（実コード trace 確定の cr 内訳）
1. operator サインイン → `/dial` の無料CTA (`data-testid="dial-free-campaign-start"`) → `POST /api/dial/campaign/start`
   → `paymentStatus='paid'` + `is_free_campaign=true` セッション発行（baseCycleLimit=3 #461）。
2. 対話の各「調整」= `/mixpreview`（preview 反復）= **0cr・無制限**（方向決め）。
3. 本格ミックス（mix_check×2 + final）= **各 250cr**（stems-off）= **750cr**。⑤(#463)後は各回が実 fresh
   render。`baseCycleLimit=3` + `mixCheckCount<2` ガードが mix_check×2 + final の計3回を funds する。
4. mastering（omakase）= **220cr**。
5. mix diagnosis = **10cr**。
6. → 合計 **≈980cr** 消費を RoEx dashboard の Recent Activity で実数照合（canonical=`free-campaign.ts` roexCrEstimate）。

### 確認項目（evidence 必須・スクショ/ログ）
- [ ] grant セッションが `paid` + `is_free_campaign=true` で生成された
- [ ] preview 反復が課金されない（0cr）
- [ ] **計3回 render（mix_check×2 + final）で打ち止め**（4回目の paid render が baseCycleLimit=3 で拒否される。mix_check は `mixCheckCount<2` でも縛られる）
- [ ] retake 購入導線が出ない（additionalCycleLimit=0）
- [ ] reference-track / compareMixes が無効（隠れ従量オフ）
- [ ] RoEx 実消費 ≈980cr（mix_check×2 500 + final 250 + master 220 + diag 10・stems-off）
- [ ] **stuck-processing 再発なし**（PR#434 comm-timeout + cron backstop が効く）

### 軸B 並行課金ガード 実測（PR #438 修正の本番検証・CCO/Codex 要件）
PR #438 で reserve-before-charge + mastering 予約 sentinel + omakase FX after-reserve を投入済。
E2E は「修正が本番条件で効く」ことを実測確認する（バグ計測でなく fix verify）。
- [ ] ①正常完走後の RoEx pool 消費が **≈980cr 近傍**（上振れ無し）を Recent Activity で実測
- [ ] ②**final を並行/連打** → 2本目が atomic reservation（`UPDATE ... WHERE paid_cycle_count < limit` 0行）で **402・RoEx submit 前に弾かれる**ことを確認（pool 二重消費が起きない）
- [ ] ③**mastering POST を並行** → 2本目が advisory lock + unique index で **409・charge 前に弾かれる**
- [ ] ④★**mastering の poll/webhook 並行**（round-2 検証）: charge 前の予約行（sentinel roexTaskId）を GET /session・RoEx webhook・mastering GET が拾って二重 charge **しない**ことを確認（poll-skip guard）
- [ ] ⑤**omakase final を上限到達後に再試行**（有料 path・operator が omakase セッションで）→ 125cr FX 取得が走らず 402（FX after-reserve）
- [ ] ⑥（go-live 後 fast-follow 候補・LOW）analyze 並行 → 各10cr 課金の有無を実測（CCO doc v3 指摘・別 issue）
→ ②〜⑤ が「並行でも弾かれた（pool 上振れ無し）」なら #438 の本番有効性が実証され軸B 解除材料に。

### wall-clock 注意
prod preview 実測 **8-22分**（`reference-dial-generation-hang-diagnosis`）。
1 journey の verify は **30-60分**見込み（RoEx 処理待ちが律速）。env ON はこの完走確認後。

---

## 点火後スモーク（env ON 直後）

```
GET /api/dial/campaign/stats   (admin)
```
- `freeGrants`, `estMaxPoolCr (= freeGrants × 480)`, `cap`, `audience`, `enabled=true` を確認。
- LP `/dial` で無料CTA が表示され、サインイン済みユーザーに `eligible:true` が返ることを確認。

## プール監視（go-live 後・当面 手動）
- 自動 1000cr 割れアラート = Path B（roex_credit_ledger 新設）= **未実装**（16名規模に過剰 / no_mamagoto）。
- 当面: `campaign/stats` の `estMaxPoolCr` + RoEx dashboard 残高の目視。`9610 − estMaxPoolCr` が概算残。
- 有料が混在するとプールが想定より早く枯れる → `is_free_campaign=false` の paid セッション数も併読。

## 緊急停止 / ロールバック
- abuse・異常消費時: `DIAL_FREE_CAMPAIGN_ENABLED` を `false` に戻す（**即停止・再デプロイ不要なら次リクエストから効く**）。
- audience を `open`→`waitlist` に env だけで切替 → waitlist 登録者限定に絞る（再アーキ不要）。
- 既存 grant セッションは有効のまま（途中ユーザーの体験は壊さない）。

---

## mued課 go-live ゲート要約

| ゲート | 所要 | owner | 不可逆 |
|---|---|---|---|
| M1 migration 0048 | ~5分 | kimny psql | 追加列（後方互換・rollback容易） |
| M2 env 3点 | ~5分 | kimny/conductor | env のみ（即 revert 可） |
| M3 実 RoEx E2E ≈980cr | 30-60分 (RoEx律速) | mued | 実cr ~980消費 |

**律速 = kimny の prod psql/env 操作 + E2E 観測時間。実装追加ゼロ。半日で go-live ready。**
LP 告知コピー声チェック / kimny go-live うなずき は本書スコープ外（LP課 / kimny）。
