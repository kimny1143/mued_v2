# 設計: 対話フロー柔軟化 + 後決済（kimny 3 要件 + audit ②③）

作成: 2026-06-17 / mued課 / 起案: kimny（白手袋 df55abae 操作の実体験）/ **Tier3（課金 + セッション設計）→ Plan→kimny GO→実装**

> 本書 = feasibility + 設計方針 + 工数。実装はまだ。kimny GO 後に Plan モードで詳細設計→実装。

## 要件（kimny・全て必須）

1. **Mix Check 追加リテイク**: baseCycleLimit 超で MixCheck を追加可。追加分はクレジット消費 → **ユーザー承認** → **セッション終了後に集計し Stripe 決済**。
2. **Final はユーザー承認制**: ユーザー承認まで Final を生成しない。MixCheck 扱いで反復。「さっきの版で Final OK」→ **その MixCheck を Final として扱う**。現状の Hoo 自動 Final を変更。
3. **マスタリング後のミックス戻り**: マスタリングフェーズ後も MixCheck に戻れる。追加クレジット → 承認 → セッション後 Stripe。

## 現状アーキテクチャ（コード実態）

- **Phase**: `detectPhase`(lib/dial/phase.ts) が tasks から判定。`isMasteringPhase` は mix-final 存在で **sticky**(:67-69)。`selectTools`(:104) はマスタリングフェーズで **mix ツールを渡さない** → マスタリング後にミックス調整不可（要件3の壁）。
- **課金/サイクル**: `/api/dial/final`(route.ts) が mix_check / final を処理。**atomic reserve-before-charge**(:219-237): `paidCycleCount < baseCycleLimit + additionalCyclesPurchased` AND mix_check は `mixCheckCount < 2` を条件に 1 文 UPDATE で予約（#438）。
- **追加サイクル課金は既存**: `/api/dial/checkout/additional` が Stripe Checkout(`mode:'payment'`) → webhook が `additionalCyclesPurchased++`。**ただし前払い（buy-up-front）**。
- **Stripe**: 全 dial checkout が `mode:'payment'`（都度前払い）。**saved-card / off-session は未実装**。
- **Final 自動化**: Hoo がユーザー承認で `request_final` を発火 → /final が課金+ final_advanced render。

## 設計方針

### 共通の核 = 後決済モデル（3 要件すべてに跨る最大の新規）

**「消費は即・集計決済はセッション終了時」** をどう実装するか。RoEx 原価は消費時に発生、売上は終了時 → **回収保証**が論点。

| 案 | 仕組み | 長所 | 短所 |
|---|---|---|---|
| **(A) 後払い集計 Checkout + DL ゲート【推奨】** | セッションに「課金タブ」(承認済 paid cycle を accrue)。各 paid render 前に in-flow 承認(「追加ラウンド +$X、OK?」)。**最終 DL 前にタブ合計を 1 回の Stripe Checkout で決済**(既存 paymentStatus ゲート再利用) | saved-card 不要・回収は**成果物 DL をゲート**して保証・既存 payment gate 流用 | 「session 終了」の定義が要る・DL しなければ未回収(=RoEx 原価だけ被る) |
| (B) saved-card off-session | session 開始時に SetupIntent でカード保存 → 終了時 off-session PaymentIntent | 回収確実・摩擦少 | カード on-file 実装・SCA/3DS 例外処理・前段摩擦 |
| (C) Stripe usage-based subscription | metered subscription | 純粋従量 | dial は単発前提・sub 化は過剰 |

**推奨 = (A)**: 「**反復は自由（承認付き）、DL の前に accrue した分を 1 回決済**」。既存の `paymentStatus` DL ゲートと整合。RoEx 原価被りは「DL 前決済必須」で bounded（途中離脱は preview/mixcheck の試聴止まり）。新規 = セッション課金タブ + 終了時集計 Checkout + 承認 UI。

> タブの所在: `dial_sessions` に `pending_charge_cents` 等 or 新 `dial_session_charges` 台帳（承認単位で行・idempotency）。**#438 の reserve-before-charge / advisory-lock / unique-index パターンを踏襲**（二重課金防止）。

### 要件 2（Final ユーザー承認制）— 最小・最先行推奨

- **Hoo 自動 Final 廃止**: prompt から「承認で即 request_final」を除去。Hoo は常に **MixCheck を提案**し、ユーザーが**特定の版を名指しで「これを Final に」**と言った時のみ Final 化。
- **「MixCheck を Final に昇格」**: 2 案。
  - **(a) 再 render なし【要確認・推奨】**: MixCheck 出力は既に「250cr・WAV・EQ/comp 適用済」(final route コメント)。これが**配信品質 WAV ならそのまま Final 成果物として flag**（追加 cr 0）。→ 要 RoEx 確認: `mix_check` WAV == `final_advanced` WAV か。等価なら昇格は「選択+flag」で完結（コスト減・kimny の直感と一致）。
  - (b) 選択版の params で Final を再 render（現行・追加 cr）。
- 影響: prompt(dial.ts) + final route の final 意味論（render→selection）+ UI（「この版を Final にする」ボタン）。**(a) なら最小**。

### 要件 1（MixCheck 追加リテイク・後決済）

- **`mixCheckCount < 2` ハードキャップを撤廃** → soft limit + 承認制。`paidCycleCount` 上限も「承認すれば追加 accrue」に。
- 各追加 MixCheck = タブに +1 cycle 分を accrue（in-flow 承認）。reserve-before-charge は維持（RoEx 原価先行発生のため）。
- 既存 `additionalCyclesPurchased`/`additional_cycle` 課金導線は**前払い版として残す or タブ後払いに置換**（kimny 選択）。

### 要件 3（マスタリング後ミックス戻り）

- **phase 可逆化**: `detectPhase` に **reopen フラグ**（`dial_sessions.mix_reopened_at` 等）を追加 → セットされている間 `isMasteringPhase=false` を強制し mix ツール復帰（今回 df55abae で手動 DB reopen した操作の製品化）。final task は消さず flag で論理 reopen。
- `selectTools` が reopen フラグを考慮し mix ツールを返す。
- 戻って MixCheck = 追加 cycle（要件1 のタブ後払い）。仕上げ直し後に再 final→再 master。

## audit ②③ の統合（Tier3 課金 hardening）

- **③ Stripe `payment_status` 未読（最重要）**: `checkout.session.completed` を無条件 PAID 扱い + `async_payment_succeeded/_failed` handler 無し。後決済モデルは**入金確定の正確さが前提** → 本設計の中核として **`payment_status==='paid'` guard + async handler** を必ず実装。latent でも放置不可。
- **② mastering string-branch**: bare string 応答を無検証 `completed`（220cr 既消費後に不正 finalUrl）。後決済で master 課金経路を触る本設計に同梱して URL validate を入れる。

## 工数感（粗・実装フェーズで精緻化）

| 項目 | 規模 | 主作業 |
|---|---|---|
| 後決済タブ + 集計 Checkout + DL ゲート + ③ guard/async | **大** | session 課金台帳, 終了時 Checkout flow, webhook hardening(③), 二重課金 idempotency(#438 踏襲), 承認 UI |
| 要件2（自動 Final 廃止 + 昇格） | 中（昇格(a)なら小） | prompt 改修, final=selection 意味論, UI ボタン, mix_check WAV 等価確認 |
| 要件1（MixCheck 無制限 + 承認） | 中 | キャップ撤廃→soft+承認, タブ配線 |
| 要件3（mastering→mix reopen） | 中 | reopen フラグ, detectPhase/selectTools, cycle 計上 |
| ② mastering URL validate | 小 | parse hardening + test |

## 推奨フェーズ順

- **Phase 0（先行・独立の小 PR）**: ③ Stripe `payment_status` guard + async handler / ② mastering validate。課金安全性で独立価値、後段の前提。
- **Phase 1**: 要件2（自動 Final 廃止 + 承認制 + 昇格(a)）。UX 価値最大・prompt 中心で最小。ユーザーが Final を制御。
- **Phase 2**: 後決済タブ + 要件1（MixCheck 無制限）。課金 infra の核。
- **Phase 3**: 要件3（mastering→mix reopen）。metered モデルの上に。

## リスク / 要確認

- **回収**: 案(A)は「DL 前決済」で原価を bound するが、途中離脱分の RoEx 原価は被る → preview/mixcheck の試聴範囲に原価を抑える設計（既に preview は無料/低 cr）。
- **mix_check WAV == final WAV か**（要件2(a) の前提）→ RoEx 確認必須。
- **二重課金**: 後決済タブ = 新たな TOCTOU 面 → #438 の reserve-before-charge / advisory-lock / partial-unique を全経路に。
- **承認 UX**: 「追加 +$X OK?」の頻度過多は離脱要因 → A/B。
- **音質関門**（別件 feasibility `hoo-material-grounded-proposals-feasibility-20260617.md`）と連動: Final 承認制 + 素材ベース提案で「過剰適用→納得いく仕上げ」を両輪化。
