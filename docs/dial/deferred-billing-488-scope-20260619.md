# 後決済 #488 — light scope + kimny policy checkpoint (2026-06-19)

作成: mued課 / conductor dispatch（守り#1 reliability 完了後の残）/ **read-only scope のみ — 実装着手前提なし**

> 守り#1 reliability（R3 cluster #545/#546/#547 + R4 #549 + R5a #551）= 全 prod LANDED。残 = 後決済 #488。
> 本書 = light scope（DONE/REMAINING 仕分け + kimny に escalate すべき OPEN 判断の洗い出し + Tier/工数）。
> 詳細設計は既存 [`deferred-billing-session-statemachine-design-20260617.md`](./deferred-billing-session-statemachine-design-20260617.md)（#488 の本設計）。
> **kimny GO 前に A/C/D は実装しない**（greenfield 台帳 = schema 追加 + pay-after = 課金モデル判断 → Tier3 + policy-gate）。

## DONE（Tier3 Phase 0/1a/1b・既に prod LIVE）

- **Phase 0**: Stripe `payment_status==='paid'` guard + async handler（audit ③）= #490。
- **Phase 1a**: `dial_session_state` enum 8値 + `state` 列（`db/migrations/0054`・kimny prod 適用済）= #492。
- **Phase 1b**: state machine write/read-side + **Final / master の AI ナレ自動課金を廃止（明示クリック必須＝fail-closed）** = #496/#501/#504。
  → **要件2 の core「Hoo 自動 Final 廃止 + 明示承認」は DONE**。

## REMAINING（後決済 #488 が実際に定義する内容）

| | 項目 | 内容 | schema | 規模 |
|---|---|---|---|---|
| **A** | 後決済タブ / pay-after ledger | 「消費は即・集計決済はセッション終了時」。新 `dial_session_charges` 台帳（承認単位で行・idempotency）+ in-flow 承認 + 最終 DL 前に 1 回 Stripe Checkout 集計 + DL ゲート | **新 migration 0055 + 新テーブル**（現状 grep でゼロ = greenfield 確認済） | 大 |
| **B** | 要件2 WYSIWYG free-preview unlock | 無料 preview 試聴の強制ロック廃止（「再生音源 = 実レンダー出力」= 正しさの本丸）。Final 承認は 1b で DONE | コード（selectToolsByState） | 中 |
| **C** | 要件1 MixCheck soft-limit + 承認 | `mixCheckCount < 2` ハードキャップ撤廃 → soft + 承認 + タブ accrue | コード（final/route reserve） | 中 |
| **D** | 要件3 mastering→mix reopen | mastering 後に mix へ戻る。**kimny 既決**: rollback = `mastering_review→mix` のみ・`mastered_final→mix` 廃止（再 master = 新規 mastering-only session）→ reopen フラグでなく state rollback + 新規 session 運用 | 列追加 or 運用のみ | 中 |
| **E** | ② mastering URL validate | mastering/final の bare-string 応答を無検証 `completed` にしない hardening（独立価値・policy 非依存） | コード | 小 |

### 既存 charge/credit との関係（grep 確定）
- 実課金ゲート = **paymentStatus（Stripe `mode:'payment'` 都度前払い）+ cycle（paidCycleCount/baseCycleLimit）**。
- `dial_credit_ledger` は**本番未配線**（consume insert ゼロ）→ 後決済台帳は既存 credit 台帳の再利用でなく **greenfield 新規**。
- saved-card / off-session = **未実装**。後決済 (A 案) は saved-card 不要（DL ゲートで回収）。
- 追加サイクル課金 `/api/dial/checkout/additional` = 既存・**前払い**。後決済タブに置換 or 併存は OPEN（下記 Q5）。

## kimny の既決事項（再質問しない・既存 state 優先）

- retrievefinalmaster（220cr）= **承認時発火**。
- 再 master = **新規 mastering-only session**（`mastered_final→mix` 廃止）→ 要件3(D) の方針確定。
- in-session 追加課金 = **「追加 MixCheck」1 SKU**。
- master preview = lossy mp3 30s 代理 → **無料プレビュー承認ゲート妥当**（WYSIWYG ① の根拠）。
- 3 要件そのもの（要件1/2/3）= **kimny 起案ゆえ GO 済**。

## kimny に escalate すべき OPEN 判断（strategic checkpoint）

1. **タイミング**: free15 / early-stage の現フェーズで pay-after infra（大物・Tier3）に**今**投資するか、前払い維持で他施策を先行するか。← 最大の戦略判断。
2. **Payment model / 回収**: (A) 後払い集計 Checkout + DL ゲート【doc 推奨・要件1「session 終了後集計 Stripe」と整合】/ (B) saved-card off-session。回収保証 vs 前段摩擦。
3. **回収リスク許容**: (A) は途中離脱分の RoEx 原価を被る（preview 無料・mixcheck 250cr は課金済で捕捉済ゆえ bounded）。この bounded loss を許容するか。
4. **承認 UX 頻度**: 「追加 +$X OK?」の頻度（過多 = 離脱要因）。A/B するか。
5. **既存前払い導線**: `additionalCyclesPurchased` 前払いを残すか後決済タブに置換するか（「追加 MixCheck 1 SKU」は前払い SKU か後決済タブ行か）。
6. **法務 / EULA**: 「消費は即・課金は後」モデルの利用規約影響（要 legal 確認か）。

## Tier / 工数 / 推奨フェーズ順

- **Tier3 + kimny policy-gate**（greenfield 台帳 = schema 追加 + pay-after = 課金モデル + Stripe flow + EULA）。
- 推奨順（既存 doc 準拠）: **E（② validate・小・独立・policy 非依存）→ B（WYSIWYG・中）→ A+C（後決済タブ+要件1・大）→ D（要件3・中）**。
- **E は kimny policy GO 前でも独立小 PR として先行可**（課金安全 hardening・後決済モデルに非依存）。A/C/D は kimny payment-model GO 必須。B は要件2 残ピースだが UX 的に A と連動ゆえ A 同フェーズ推奨。

## 推奨（mued → conductor → kimny）

- **A/C/D（後決済 core）= kimny policy GO まで着手しない**。本書を strategic checkpoint として escalate。
- **E（② mastering validate）= 独立小 PR で先行可能**（policy 非依存・課金安全）。kimny escalation と並行で出せる候補（conductor 判断）。
- OPEN 判断のうち最重要は **Q1（今やるか）**。GO なら Q2（payment model）を locking してから Plan モードで詳細設計。
