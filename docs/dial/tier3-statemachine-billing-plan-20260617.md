# 技術 Plan: MUEDial セッション状態機械 / WYSIWYG / 後決済 (Tier3)

作成: 2026-06-17 / mued課 / **Plan GO 済（kimny 2026-06-17）→ Phase 0 から実装着手**
正本設計: conductor repo `docs/inbox/tier3-design-muedial-session-statemachine-20260617.md`（kimny 決定済: ①後決済 ②WYSIWYG ハードゲートなし ③精算前 DL 不可 ④Final 後ミックスロック+明示ロールバック）
本 Plan = 正本を**現状コードに接地**し実装単位に分解 + 検証4項目に推奨を付す。料金数値は freee 並行確定 → **機構は数値を後挿し可能に組む**（DIAL_CREDIT_COSTS / 新 pricing 定数を単一ソースに）。

## kimny GO 確定（2026-06-17・本 Plan に反映済）
- **Q1**: retrievefinalmaster(220cr) = **承認時発火**（V2 推奨 a 採用）。承認＝コミット＝課金の1点。
- **Q2/ロールバック簡潔化**: ロールバックは **`mastering_review`(無料プレビュー段)→ mix のみ**（master 未コミット＝遷移自体は無料）。**`mastered_final → mix` 経路は廃止** — 確定済マスターのやり直し = **新規 mastering-only セッション**（確定 2mix を入力）。同一セッション再マスターなし → 220cr は1セッション1回。非破壊は **mix テイク**に適用。**「再マスター課金 SKU」不要**（freee 伝達済）。
- **V1 preview fidelity ヌルテスト**: ✅ **実証済（2026-06-17・220cr）**。master preview(無料 mp3 30s)と final(WAV 全長)は**同一マスター**（~-11 LUFS・1 LUFS 以内）= lossy 30s 代理であって別処理でない → **無料プレビュー承認ゲート維持で妥当**（§5 V1）。「不一致→実 retrieve 切替」は**不要**。
- **進め方**: 各 Phase 独立 PR・conductor が PR ごと Tier 判定（純追加 schema/UI=Tier2 / Stripe・価格・破壊的 schema=Tier3 escalation）。migration 0054/0055 は kimny psql 先行適用。

---

## 0. 現状コード接地（実装の出発点・file:line）

| 領域 | 実態 | 含意 |
|---|---|---|
| phase 判定 | `lib/dial/phase.ts` `detectPhase`/`isMasteringPhase`(sticky :67-69)/`selectTools`(:104)。**タスクから推測** | 明示 state 列で置換 |
| phase 消費点 | `app/api/dial/chat/route.ts`(:121,:154,:253,:357) / `lib/ai/prompts/dial.ts` `getDialTools`(:1372-91、**:1389 dialogue が mastering ツールを常時含むバグ**) / `app/dial/session/[id]/page.tsx`(:1150,1189,1706,1829,1966) / `components/dial/v2/chat.tsx` / `unified-session-player-v2.tsx`(:425) / tests | state 読取りに置換（blast radius ~40 files） |
| status 列 | `dialSessionStatusEnum`(db/schema/dial.ts:41-48,:82): uploading/previewing/mixing/mastering/completed/archived。書込=preview/final(:93,:384)/mastering/preview(:142)/mastering/final(:203)/roex webhook。`idx_dial_sessions_status` 索引済 | 新 `state` 列を並走させ status は移行窓で保持 |
| mix 課金 | `final/route.ts`: reserve-before-charge atomic UPDATE(:224-260) + payment guard(:107=402) + taskType(:132-133) + submit charge(:272)。**MixCheck 生成時 250cr** | reserve パターン流用 |
| master 課金 | `mastering/final/route.ts`: advisory lock(`4926082`:103-135)+sentinel insert-before-charge(:117-127)+`masterFinal`(:160)+payment guard(:87)。**承認時 220cr** | 非対称課金は既存実装と整合 |
| Stripe | `checkout/route.ts` mode:'payment'(:215-230) / `webhooks/stripe/route.ts` `checkout.session.completed`→`paymentStatus='paid'`(:893,free guard:897)。**§③ async_payment_succeeded/_failed handler なし** | 後決済の前提 = §③ 修正必須 |
| DL | `download/route.ts` withDialAuth(:108)+read-access(:125,:163)。**`status='delivered'` gate なし**(greenfield)。GCS 失効時 `refreshExpiredGcsUrl`(:223-239)が **!viaAdmin で最大250cr** | delivered gate を新設 |
| ledger | `dial_credit_ledger`(:204-215): id/action/credits/balanceAfter/taskId/note/createdAt。**per-call deduction 本番未配線**(greenfield)・**userId/sessionId/精算state 列なし** | 後決済台帳 = ほぼ新規構築 |
| 課金単価 | `lib/dial/pricing.ts` `DIAL_CREDIT_COSTS`(:76-83): mastering 220 / dialogue 530 / dialogue_mastering 750 | COGS 定数。ユーザー料金は別定数で freee 後挿し |
| migration | `db/migrations/` 最新 `0053`・drizzle journal は 0008 止まり=**0009+ は kimny psql 手動**・raw .sql + `IF NOT EXISTS` + `pgEnum` は `DO $$`。**migration-first → code merge → auto-deploy** (0053 header / database-operations.md) | 0054/0055 を手動先行適用 |

---

## 1. 状態機械（背骨・Phase 1）

### 1.1 schema（migration 0054）
新 pgEnum `dial_session_state` + `dial_sessions.state` 列（`NOT NULL DEFAULT 'uploading'`、index 付与）。

```sql
-- 0054_add_dial_session_state.sql （migration-first・kimny psql）
DO $$ BEGIN
  CREATE TYPE dial_session_state AS ENUM
    ('uploading','previewing','mix_review','mix_final',
     'mastering_review','mastered_final','settling','delivered');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE dial_sessions ADD COLUMN IF NOT EXISTS state dial_session_state NOT NULL DEFAULT 'uploading';
CREATE INDEX IF NOT EXISTS idx_dial_sessions_state ON dial_sessions(state);

-- 既存行 backfill: detectPhase 論理を SQL で一度だけ再現（保守側へ丸め）
-- mastering final 完了→mastered_final / mix final 存在→mix_final / mixCheck>0→mix_review /
-- preview 存在→previewing / それ以外→uploading。完了済(status='completed')は
-- mastering 経路なら mastered_final、mix のみなら mix_final（DL 済の判定は付かないため delivered には上げない）
```
`status` 列は移行窓で**残置・dual-write**（rollback 安全 + `canEditSession`/分析の後方互換）。1-2 release 後に deprecate。

### 1.2 遷移サービス（単一ソース）
`lib/dial/session-state.ts`（新規・pure + guard）:
- `type DialState`、`TRANSITIONS: Record<from, {to, guard, charge}>`（正本 §2 遷移表を機械化）。
- `assertTransition(session, tasks, to)`: ガード検査（**無言フォールバック禁止 = 不正入力は throw**・入力 URL は durable r2 で解決 Y-05）。
- `applyTransition(tx, sessionId, to)`: state UPDATE（既存 reserve/advisory-lock パターンと合成）。
- 各遷移エンドポイント（preview/final/mastering/rollback/download）が散在 `.set({status})` の代わりに本サービスを呼ぶ（status 書込み 5 箇所を集約）。

### 1.3 detectPhase 置換（blast radius）
- `getDialTools` を `selectToolsByState(state, mode)` に置換し **state で決定的に gate**（:1389 バグも同時解消 = dialogue でも mastering 入りまで mastering ツールを出さない）。
- chat/route.ts・page.tsx・chat.tsx・player の `isMasteringPhase` 推論を `session.state` 読取りに置換。
- `phase.ts` は backfill 用に一時保持 → 全置換後に削除。`phase.test.ts` を state enum テストへ書換え。

### 1.4 Hoo 状態スコープ権限（§5 / Y-06 恒久解決）
`selectToolsByState`: 変更系ツール（`adjust_preview`/`request_mix_check`/`set_reverb_preference`/`set_musical_style`/フェーダー）は **`previewing`/`mix_review` のみ**。`mix_final`/`mastering_review`（**master 未コミット段**）で変更要求 → Hoo は「ミックスに戻す（無料）」の明示ロールバック遷移を提示。**`mastered_final`（master コミット済）以降**で変更要求 → Hoo は変更せず「確定済マスターのやり直しは新規 mastering-only セッションが必要」と案内（同一セッション再マスターなし）。prompt(dial.ts) に state 別許可を明記。

---

## 2. WYSIWYG（Phase 2・正本 §3）

**原則**: 「操作用＝ステム合算（フェーダー操作）」と「決定用＝実 retrieve 出力（実納品ファイル）」を分離。**強制ロックなし**・決定/コミット時に再生される音＝実納品ファイル（Y-01）。

- 現状: `session-takes.ts` は MIXED の main を `taskStreamUrl`(:139=実 retrieve 出力)、stem を `stemStreamUrlByTask`(:140) で配線。`#483`(reverb_send をステム表示に包含 :72)は**応急** — 本質は下記分離。
- 実装:
  - **操作画面**（previewing/mix_review でフェーダー調整中）: `unified-session-player-v2.tsx` のステム合算再生（`use-multi-take-player.ts` の per-stem decode :134-187）。ここは概算でよい。
  - **決定画面**（mix_review→mix_final 承認 / mastering_review→mastered_final 承認）: 再生ソースを**必ず実 retrieve 出力 `taskStreamUrl(該当 task)` に固定**し「これが納品される音」と明示。承認ボタンはロックしない（無料 preview を何度でも聴いた上での支払いコミット）。
- 決定画面 UI は既存 `ParamChangeCard`(chat.tsx:135-217) の Generate ボタン系（BUTTON_ACTIONS :82-84）を土台に「実音プレビュー + 承認」カードへ拡張。

---

## 3. 後決済（Phase 3・正本 §4）

**大原則**: 基本パッケージは前払い（現状どおり）。後決済は**追加タスク（追加 MixCheck=R-2・rollback 後の再 redo）だけ**に掛かる。未精算 0 の基本ユーザーは **Checkout スキップで即 delivered**（決済ウォール非増設）。**rollback の課金 attribution = kimny 確定**: ロールバック遷移自体は無料・**課金はレンダー時点**。in-session 追加課金は「**追加 MixCheck $X**」一本（rollback 後の再 mix も R-2）。master は1セッション1回（基本込み・承認時 220cr）・再マスター=新規セッション。

### 3.1 ledger 拡張（migration 0055・greenfield 寄り）
`dial_credit_ledger` に追加（pure additive）: `session_id uuid` / `user_id text` / `amount_cents int`（ユーザー請求額・COGS cr とは別）/ `settled boolean NOT NULL DEFAULT false` / `settled_at timestamp` / `stripe_checkout_session_id text`。`action` enum に `accrue`/`settle` を追加（`DO $$` で `ALTER TYPE ... ADD VALUE`）。
> per-call deduction は本番未配線のため、本台帳は**有料遷移のみ accrue 行を挿入**する新規配線（既存 consume route とは独立）。

### 3.2 配線
- **accrue**: 有料遷移（追加 MixCheck=R-2・rollback 後の再 redo）成立時に `accrue` 行（amount_cents=該当料金, settled=false）を atomic に挿入（reserve-before-charge と同一 tx）。基本パッケージ分は計上しない。**課金=レンダー時点・追加 MixCheck $X 一本**（kimny 確定・上記大原則）。
- **DL 分岐**（download/route.ts に追加）:
  - 未精算合計 = 0 → `applyTransition(→delivered)` で即配信（基本ユーザー）。
  - 未精算 > 0 → `settling` へ → 未精算合計で **Stripe Checkout 1 回**（既存 checkout パターン流用・mode:'payment'）。
- **DL gate（決定③）**: download は `session.state === 'delivered'` を guard（未満は 403）。**未精算 0 は即 delivered = 実質ノーゲート**。ウォーターマーク無料 DL は不採用。
- **payment guard（R-4）**: webhook で Stripe `payment_status='paid'` 検証後に `settling→delivered`（§③ 修正と同根 = 下記 Phase 0）。

---

## 4. R-1 / R-2 / R-3

- **R-1（自動 Final 廃止）**: `chat.tsx:363-365` の `adjust_preview & phase===3 → request_final` 自動昇格を**削除**。`request_final` は常に ParamChangeCard のボタン明示クリック必須。prompt は既にユーザー明示発話前提（dial.ts:493）なので prompt 変更は最小。遷移 mix_review→mix_final = 明示承認のみ。
- **R-2（追加 MixCheck 後決済）**: `final/route.ts` の `mixCheckCount < 2` ハードキャップ(:235)を撤廃 → soft limit + 承認制。2 回目以降の MixCheck 成立時に accrue（$X・freee 確定）。COGS 250cr は生成時発生（reserve 維持）。
- **R-3（ロールバック）= kimny 簡潔化確定**: 新エンドポイント `POST /api/dial/session/[id]/rollback`。**`mastering_review`(無料プレビュー段)→ `mix_review` のみ**（mix_final からの pre-commit 戻りも同様に許容）。**`mastered_final → mix` は廃止** → 確定済マスターのやり直しは**新規 mastering-only セッション**（確定 2mix 入力）。意味論(§5 V3): master 未コミット段ゆえ **mix テイクに非破壊適用**・mix ロック解除・reverb 含む mix params 再編集可。**「再マスター課金 SKU」不要**。課金 attribution=kimny 確定（rollback 遷移無料・課金はレンダー時点・追加 MixCheck $X 一本）。

---

## 5. 検証4項目（conductor 指定）+ 推奨

### V1. 無料 preview の音 == 有料 final の音（preview fidelity）— ✅ 実証済 2026-06-17
- **実測（prod・220cr 消費・`scripts/v1-master-preview-fidelity.ts`・taskId 065aaf63…）**: master preview(無料)=**mp3・30秒**・I=**-10.8 LUFS**・true-peak 0.1 dBFS / final(220cr)=**WAV・163秒(全長)**・I=**-11.1 LUFS**・peak 0.5 dBFS。
- **判定**: ビット非一致だが**同一マスター**。非一致の正体は「無料プレビュー=30秒 lossy mp3 代理／有料 final=全長 lossless WAV」というフォーマット+尺差。loudness/limiting は一致（全計測 ~-11 LUFS・1 LUFS 以内、peak 天井付近）= 同一マスタリングチェーン。Y-01 の「dry≠wet」構造的ミスマッチとは別物（プレビューは実マスター出力の忠実な lossy 縮約）。
- **設計結論**: 「承認段で実 retrieve 提示」案は不可能（RoEx は無料では 30秒 lossy しか出さない・全長 lossless は 220cr=決定前課金の矛盾）。∴ **無料プレビュー承認ゲートを維持**（唯一かつ妥当）。ユーザーは 30秒 mp3 で実マスターのキャラクター（音圧/EQ/空間）を忠実に聴いて承認→220cr→同一マスター全長 WAV。**「不一致→実 retrieve 切替」分岐は不要**。
- **mix/master 非対称**: mix の決定は MixCheck(=250cr 実 retrieve 出力=納品物そのもの)再生＝ビット厳密 / master の決定は 30秒 lossy プレビュー＝キャラクター厳密。両者承認に十分。
- **UX 推奨**: 承認画面に「プレビューは約30秒・参考音質、承認後に全長・高音質マスターを納品」と明示。

### V2. retrievefinalmaster(220cr) 発火点: 承認 vs DL
- **kimny 確定 = (a) 承認時発火**（推奨採用）。承認＝コミット＝課金の1点。理由: ①master preview(`/masteringpreview`)は無料 → 承認前に WYSIWYG 担保可（V1 master 版が前提）②COGS は「この master にコミット」の承認で発生が自然 ③DL 発火だと mastered_final 状態が実ファイル不在で成立し WYSIWYG/状態整合が崩れる。
- **離脱 COGS（残存・小）**: 承認(220cr 発火)後 DL 前に離脱すると 220cr COGS を MUED が被る。基本 master は前払いゆえ実 risk は限定的・離脱率低で bounded。`mastered_final → mix` 廃止で re-master 起点の重複 COGS risk は消滅。

### V3. ロールバック意味論（kimny 簡潔化確定）
- **確定**: ロールバックは **`mastering_review`(無料プレビュー段)→ `mix_review` のみ**（mix_final からの pre-commit 戻りも許容）。master 未コミットゆえ ①**mix テイクに非破壊適用**（確定マスターは存在しない＝破棄でなく無料プレビュー再生成可）②**mix ロック解除**（Hoo mix ツール再有効）③**reverb 含む mix params 再編集可**。
- **`mastered_final → mix` 廃止**: 確定済マスターのやり直し = **新規 mastering-only セッション**（確定 2mix 入力）。→ 220cr は1セッション1回・「再マスター課金 SKU」不要・mix テイク非破壊保持で「どの mix から再マスターするか」も明確。
- **課金 attribution = kimny 確定**: ロールバック遷移は無料・**課金はレンダー時点**。in-session 追加課金は「追加 MixCheck $X」一本（rollback 後の再 mix もこれ＝R-2）。二重課金回避で綺麗。

### V4. state migration → deploy 順序
- **migration-first 厳守**（0053 header / database-operations.md）: 0054(state)/0055(ledger) を **kimny が psql で Neon prod に先行適用** → コード PR merge（=Vercel auto-deploy）。pure additive ゆえ旧コードは新列を無視（forward-compatible）。逆順は 42703 undefined_column の本番断（migration 0048/PR#426 教訓 [[feedback-migration-before-schema-deploy]]）。
- Plan に**適用前 pre-check SQL**（enum 衝突 `SELECT typname FROM pg_type WHERE typname LIKE 'dial_%'` / 列存在確認）を同梱。drizzle journal は 0008 止まりのまま（0009+ 同様に手動 .sql）。

---

## 6. フェーズ順 / 工数 / 順序

| Phase | 内容 | 規模 | migration | 依存 |
|---|---|---|---|---|
| **0**（先行・独立小 PR） | §③ Stripe `payment_status` guard + `async_payment_succeeded/_failed` handler / 全レンダー遷移の入力ガード原則化（#484 を一般化）/ download GCS 失効 250cr 経路の見直し | 小-中 | なし | 独立・後段の前提 |
| **1** | 状態機械: 0054 migration + `session-state.ts` 遷移サービス + detectPhase 全置換 + Hoo state 権限 + R-1（自動 Final 廃止） | **大** | 0054（先行適用） | Phase 0 |
| **2** | WYSIWYG: 操作用/決定用 再生分離 + 決定画面（実 retrieve 音提示） | 中 | なし | **V1 実証 gate** + Phase 1 |
| **3** | 後決済: 0055 ledger + accrue 配線 + settle Checkout + delivered DL gate + payment guard + R-2 + rollback(mastering_review→mix・無料遷移)+ mastered_final やり直し=新規 mastering-only セッション導線 | **大** | 0055（先行適用） | Phase 1, Phase 0(§③) |

各 Phase は独立 PR。Phase 1 が背骨（state）で全土台。Phase 2 は **V1 実証合格を着手 gate**に。料金数値（基本パッケージ内訳 / 追加 $X）は freee §8 確定後に pricing 定数へ後挿し（機構は数値非依存に組む）。

---

## 7. リスク / kimny・conductor 決定待ち

1. ~~**★V1 preview fidelity 未実証**~~ → ✅ **解決済(2026-06-17)**: prod ヌルテストで preview=同一マスターの lossy 30s 代理と確定。無料プレビュー承認ゲート維持で妥当（§5 V1）。
2. **V2 retrievefinalmaster 発火点**（承認 推奨 / DL）= kimny 決定。
3. **後決済の COGS 回収**: 追加タスク承認後 DL 前離脱の COGS 被り（基本前払いゆえ追加分のみ・bounded）。許容可否 = kimny。
4. **state backfill の正確さ**: detectPhase 論理を SQL 再現する一度きり backfill。保守側へ丸め + 既存セッション少数ゆえ手動検証可。
5. **status 並走期間**: dual-write 期間の不整合 risk → 遷移サービス単一ソース化で抑制。
6. **料金 canonical**（freee）: 数値未確定でも機構は組める。確定後 pricing 定数差替 + write課通知。

## 8. 次工程
本 Plan → **kimny GO** → Phase 0 から実装（各 Phase 独立 PR・migration は kimny psql 先行）。freee §8 料金マトリクス並行確定。

## 関連
- 正本: conductor `docs/inbox/tier3-design-muedial-session-statemachine-20260617.md`
- 既存設計: `docs/dial/deferred-billing-session-statemachine-design-20260617.md`（WYSIWYG ゲート確定反映済）
- memory: [[reference-muedial-credit-cost-architecture]] / [[reference-dial-prod-debug-gotchas]] / [[reference-roex-retrievefinalmix-needs-ready-preview]]
