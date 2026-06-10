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

## ゲート M3 — 実 RoEx E2E 480cr verify（キャラクター gate）

機械テストで拾えない。**実音源・実 RoEx cr 消費**を人間が確認する一線。

### 環境
- preview/staging で kill-switch ON にして実施するのが安全（prod 本番枠を1つ消費しない）。
  - staging が無い場合は prod で1枠だけ消費して検証 → cap を一時 16 にして本番15枠を守る案も可。
- 必要素材: テスト用 WAV 1本（`reference-muedial-demo-assets` 参照）、Clerk テストアカウント1つ。

### フロー（実コード trace 確定の cr 内訳）
1. サインイン → `/dial` の無料CTA (`data-testid="dial-free-campaign-start"`) → `POST /api/dial/campaign/start`
   → `paymentStatus='paid'` + `is_free_campaign=true` セッション発行（baseCycleLimit=1）。
2. 対話 mix の各調整（"vocals up" 等）= `/mixpreview` = **0cr・無制限**。
3. 最終 commit（final WAV 取得）= **250cr**（1回のみ。baseCycleLimit=1 が縛る）。
4. mastering（omakase）= **220cr**。
5. mix diagnosis = **10cr**。
6. → 合計 **≈480cr** 消費を RoEx dashboard の Recent Activity で実数照合。

### 確認項目（evidence 必須・スクショ/ログ）
- [ ] grant セッションが `paid` + `is_free_campaign=true` で生成された
- [ ] preview 反復が課金されない（0cr）
- [ ] final が **1回で打ち止め**（2回目 final が baseCycleLimit で拒否される）
- [ ] retake 購入導線が出ない（additionalCycleLimit=0）
- [ ] reference-track / compareMixes が無効（隠れ従量オフ）
- [ ] RoEx 実消費 ≈480cr（±診断/stem 有無で 480-530 レンジ）
- [ ] **stuck-processing 再発なし**（PR#434 comm-timeout + cron backstop が効く）

### 軸B TOCTOU pool 実測（CCO 監査要件 2026-06-10・金銭neutralだが pool 上振れ実測）
free 文脈は Stripe 非経由（pool 建て）で金銭 neutral だが、`final/route.ts:131` の cycle guard が
check/increment 非atomic（既存 TOCTOU・Tier3 fast-follow 本丸）。E2E で実際に pool 二重消費が
起きるかを裏取りし、Codex 軸B(a) 判断の実測材料にする。
- [ ] ①正常完走後の RoEx pool 消費が **480cr 近傍か（上振れ無し）** を Recent Activity で実測
- [ ] ②**final を意図的に並行/連打** → 2回目が `final/route.ts:131`（paidCycleCount >= baseCycleLimit+additionalCyclesPurchased=1+0）で弾かれるか。弾かれず RoEx submit が2回飛んだら **pool 二重消費を実数記録**
- [ ] ③mastering の `MASTERING_ALREADY_DONE`(409, `mastering/final/route.ts:87`) dup-guard が並行時に効くか
→ 「並行でも弾かれた（pool 上振れ無し）」なら Codex 判断がより固くなる／「弾かれず二重消費」でも free=金銭neutral 範囲を実数確認。どちらでも判断材料が増える（CCO 見解）。

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
| M3 実 RoEx E2E 480cr | 30-60分 (RoEx律速) | mued | 実cr ~480消費 |

**律速 = kimny の prod psql/env 操作 + E2E 観測時間。実装追加ゼロ。半日で go-live ready。**
LP 告知コピー声チェック / kimny go-live うなずき は本書スコープ外（LP課 / kimny）。
