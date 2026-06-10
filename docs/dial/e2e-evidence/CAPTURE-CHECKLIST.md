# free15 soft-launch E2E — 証跡 capture チェックリスト (CCO 軸C contract)

**目的**: 実 RoEx cr 消費の soft-launch を **初回一発で CCO 判定通す** (再 run 回避)。journey 実行中に各項目を埋め、スクショ/SQL出力/log を本ディレクトリに保存。
**operator**: `glasswerkskimny+free15test@gmail.com` (waitlist登録済・data E2E_OPERATOR_EMAILS 一致)
**実行**: mued (Chrome) / **判定**: CCO / **方式**: 制御 prod soft-launch (ENABLED=true / AUDIENCE=waitlist / CAP=1)

## 0. 前提 snapshot (journey 開始前)
- [ ] RoEx プール実残高 snapshot (開始前) … `____ cr` (data baseline 用) → `pool-before.png`
- [ ] switch_on_ts (= ENABLED=true 設定時刻) … `____` (data time-fence 用)
- [ ] operator userId (grant 後に判明) … `____` → data へ共有 (除外用)

## ① 5層封じ (公開されていない証拠)
- [ ] `campaign/stats` (admin) で `cap=1` … → `stats-cap1.png`
- [ ] `campaign/stats` で `audience=waitlist`, `enabled=true` … → 同上
- [ ] ★negative: **非waitlist user で campaign/start を1回** → `403 INELIGIBLE_NOT_WAITLISTED` … → `negative-not-waitlisted.png`
- [ ] LP #830 (告知コピー) **未マージ** 確認 … → PR状態
- [ ] SNS 投稿ゼロ / dial 直URL のみ (公開告知なし) 確認

## ② 8項目 (operator journey・dialogue mix + master + diag)
- [ ] **grant**: campaign/start 応答 or DB行 = `payment_status=paid` + `is_free_campaign=true` … → `grant-row.txt`
- [ ] **preview 0cr**: 対話 mix preview 反復が RoEx Recent Activity で **課金なし** … → `preview-0cr.png`
- [ ] **final 250cr** (1回) … → `final-250.png`
- [ ] **master 220cr** (omakase) … → `master-220.png`
- [ ] **diag 10cr** … → `diag-10.png`
- [ ] **合計 ≈480cr** (final250+master220+diag10) / ★**stems +50 なし** (free=stems-off) を Recent Activity 実数で … → `total-480.png`
- [ ] **2回目 final** = `402 CYCLE_LIMIT_REACHED` (baseCycleLimit=1) … → `final-2nd-402.png`
- [ ] **additional cycle** 購入導線 = 出ない / 叩けば `ADDITIONAL_CYCLE_LIMIT` … → `additional-blocked.png`
- [ ] **reference endpoint** = block (free は reference 無効) … → `reference-block.png`
- [ ] **無限処理中なし・完走** (#434 効く) … → session log
- [ ] ★**並行 double-charge 無し** (#438 本番裏取り): final 連打 + mastering の poll/webhook を**意図的に並行発火** → RoEx 実数で **final 250×1 + master 220×1 を超えない** (reserve-before-charge / mastering sentinel が弾く) … → `concurrent-no-double-charge.png` + 操作log

## ③ analyze (TOCTOU は別issue #441 だが rate-limit は確認)
- [ ] 日次上限 (5/day) 超え = **6本目で `429 RATE_LIMIT_DAILY`** (fail-open でない) … → `analyze-429.png`
  - ※ Upstash 未設定だと fail-open になる点に注意 (conductor が env 確認中)。429 が出れば rate-limit 有効。
- [ ] 並行 analyze で pool が rate-limit bound (≤~50cr/day) を超えない … → 実数

## ④ count=0 gate (点火前・cohort clean start)
- [ ] journey 証跡取得 **完了後** に operator session を DELETE (cascade で tasks も)
  - `DELETE FROM dial_sessions WHERE id='<operator_session_id>' AND is_free_campaign=true;`
- [ ] `SELECT count(*) FROM dial_sessions WHERE is_free_campaign=true;` = **0** を **点火 (cap 1→15) 前に** 確認 … → `count-0-gate.txt`
- [ ] ※ waitlist Blob (operator email) は test ゆえ残置 (data は E2E_OPERATOR_EMAILS + time-fence で除外)

## 完了後
- 全スクショ/SQL/log を本ディレクトリに保存 → CCO へ「軸C 証跡 ready」通知 → CCO 5層+②③④ 判定 → 「軸C PASS → 点火可」→ kimny live nod → conductor が cap 1→15 / AUDIENCE open → 発射。
- pool 実残高 (after) snapshot → data baseline (≈ before − 実消費)。
