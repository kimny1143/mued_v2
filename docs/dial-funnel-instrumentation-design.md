# Q3 GA ファネル計測 instrumentation 設計 (draft)

**Status:** draft / 着手前 (実装は CI billing block 6/1 復帰後)
**Author:** mued課
**Date:** 2026-05-31
**関連:** [dial-funnel-fixes.md](./dial-funnel-fixes.md) (sprint#001 funnel fix, PR #396-405), `docs/drafts/q3ga-research-beta-toggle-checklist.md` (local draft)

---

## 目的

Q3 GA に向けて、流入→無料診断→有料転換ファネルの **各段ドロップ率を GA4 で可視化** し、改善ループを回せる状態にする。本ドラフトは「何が既に計測されているか」「どこに穴があるか」「埋めるための最小実装」を確定し、6/1 の CI 復帰直後に着手できるよう設計を前出しする。

> **重要な前提（誤認回避）:** ファネルの**前半〜中盤は既に instrumented**。「計測ゼロ」ではない。穴は**転換テール（sign-in 完了 → mix_diagnosis アクティベーション → 無料→有料）**に集中している。

---

## 1. 現状の funnel event map（検証済み・file:line）

`lib/analytics/gtag.ts` が GA4 custom event 層。UTM は `page_view` で自動捕捉。

| 段 | event | 発火箇所 | 状態 |
|----|-------|---------|------|
| dial top → readiness CTA | `cta_click(muedial_readiness_check, dial_top_checkout)` | `app/dial/page.tsx:533` | ✅ |
| readiness 開始 | `readiness_start` | `app/dial/readiness/page.tsx:93` | ✅ |
| readiness 完了 | `readiness_complete{score,qualified,has_email}` | `app/dial/readiness/page.tsx:103` | ✅ |
| readiness → waitlist CTA | `cta_click(waitlist_from_readiness, result_qualified/raw)` | `app/dial/readiness/page.tsx:216` | ✅ |
| readiness qualified → try | `cta_click(muedial_try_now, readiness_qualified)` | `app/dial/readiness/page.tsx:295` | ✅ |
| waitlist 表示 | `waitlist_view` | `app/dial/waitlist/page.tsx:40` | ✅ |
| waitlist 送信 | `waitlist_submit{dtm_years,has_pain_point,from}` | `app/dial/waitlist/page.tsx:55` | ✅ |
| waitlist 登録成功 | `waitlist_success{qualified}` | `app/dial/waitlist/page.tsx:81` | ✅ |
| **waitlist → sign-in CTA** | `cta_click(muedial_signup_qualified_waitlist, waitlist_thankyou_qualified)` | `app/dial/waitlist/page.tsx:111` | ✅ (クリックのみ) |
| pricing → checkout | `checkout_view{checkout_type,item}` | `app/dial/pricing/page.tsx:96,121` | ✅ |
| checkout 離脱 | `checkout_abandoned` | (cancel_url 復帰時) | ✅ |

ファネル文脈は `funnel: 'research_beta'` / `'dial_checkout'` で分離済み。

---

## 2. 計測ギャップ（検証済み・穴の所在）

### Gap A — sign-in 完了が未計測
- `cta_click(muedial_signup_qualified_waitlist, ...)`（クリック）は取れているが、**Clerk sign-in を実際に完了して `/dial` に着地したか**の event がない。
- 影響: 「sign-in CTA クリック → 実サインアップ」のドロップが見えない。waitlist の qualified が **本当にアカウントを作ったか**が不明。
- 遷移先: `app/dial/waitlist/page.tsx:110` `href="/sign-in?redirect_url=/dial"`

### Gap B — mix_diagnosis アクティベーションが完全に未計測 ★最重要
- `mix_diagnosis` は `app/api/dial/credits/consume/route.ts` / `lib/roex/analysis.ts` / `lib/dial/pricing.ts` にのみ存在。**`gtag.ts` に `trackMixDiagnosis*` は皆無**。
- consume は**サーバー側**で `/api/dial/chat` フロー内から呼ばれる（client から直接 `credits/consume` を叩く箇所なし＝grep 0 件）。無料トライアル時は consume レスポンスに `freeTrial: true` が返る（`route.ts:176`）。
- 影響: **無料診断＝waitlist 会員を掴む中核アクティベーション**が GA4 に一切現れない。「サインアップ → 初回診断実行」「初回診断 → 完了」という**最も重要なファネル段**が観測不能。
- client 起点: `/api/dial/chat` POST（`components/dial/v2/chat.tsx:309`, legacy `components/dial/chat-panel.tsx:190`）

### Gap C — 無料→有料の連結マーカー欠如
- `checkout_view` は段としては存在するが、「**この user は無料診断を経て購入したか**」を結ぶ identifier/marker がない。
- 影響: アクティベーション→収益化の転換率（free→paid）が算出できない。GA4 で同一 user の `mix_diagnosis_complete` → `checkout_view` のパス分析ができない。

---

## 3. 提案する新規 event（`lib/analytics/gtag.ts` 追加・既存スタイル踏襲）

```ts
/** Track sign-in completion landing back into the dial app (Gap A) */
export function trackSignInComplete(params: { from: string; qualified?: boolean }): void {
  trackEvent({
    action: 'sign_in_complete',
    params: { from: params.from, qualified_waitlist: params.qualified ?? false, funnel: 'research_beta' },
  });
}

/** Track mix_diagnosis activation: first diagnosis request fired (Gap B) */
export function trackMixDiagnosisStart(params: { is_free_trial: boolean }): void {
  trackEvent({
    action: 'mix_diagnosis_start',
    params: { is_free_trial: params.is_free_trial, funnel: 'dial_activation' },
  });
}

/** Track mix_diagnosis completion: diagnosis result returned to the user (Gap B) */
export function trackMixDiagnosisComplete(params: { is_free_trial: boolean; success: boolean }): void {
  trackEvent({
    action: 'mix_diagnosis_complete',
    params: { is_free_trial: params.is_free_trial, success: params.success, funnel: 'dial_activation' },
  });
}
```

> Gap C は新 event 不要。`checkout_view` に `prior_free_diagnosis: boolean` パラメータを追加し、GA4 側で `mix_diagnosis_complete` → `checkout_view` のシーケンスをファネル探索で連結する方が低コスト（既存 `trackCheckoutView` シグネチャ拡張）。

---

## 4. 実装フック候補（要・実装時再検証）

| event | フック候補 | 確度 |
|-------|-----------|------|
| `sign_in_complete` | Clerk `afterSignInUrl=/dial` 着地ページ（`app/dial/page.tsx` の mount 時に `?from=signin` 等で判定）or Clerk `<SignIn>` の `afterSignIn` callback | 中（Clerk 構成の確認要） |
| `mix_diagnosis_start` | `/api/dial/chat` POST 直前（`v2/chat.tsx:309` + legacy `chat-panel.tsx:190`）。診断トリガーとなる message 種別の判定要 | 中（chat の中で診断要求をどう識別するか確認要） |
| `mix_diagnosis_complete` | 上記 fetch の success ハンドラ。consume レスポンスの `freeTrial` を読んで `is_free_trial` に渡す | 中 |
| `checkout_view{prior_free_diagnosis}` | `app/dial/pricing/page.tsx:96,121` の既存 `trackCheckoutView` 呼び出し | 高（既存箇所拡張） |

> consume がサーバー側のため、client での「診断実行」判定は chat フローのどの message が `mix_diagnosis` を起こすかに依存。実装初手で `api/dial/chat` → consume の呼び出し経路を 1 本追跡してから event を置く。

---

## 5. GA4 funnel report 定義（`mcp__ga4__run_funnel_report` 用）

完成後の理想ファネル step（research_beta + dial_activation 連結）:

1. `page_view`（dial top, utm_source 付き）
2. `readiness_start`
3. `readiness_complete`（qualified=true で分岐）
4. `waitlist_success`
5. `sign_in_complete` ← **新規 (Gap A)**
6. `mix_diagnosis_start` ← **新規 (Gap B)**
7. `mix_diagnosis_complete` ← **新規 (Gap B)**
8. `checkout_view{prior_free_diagnosis=true}` ← **拡張 (Gap C)**

各 step 間のドロップ率を週次でモニタ。特に **5→6（サインアップ→初回診断）** と **7→8（無料診断→有料）** が改善対象の主戦場。

---

## 6. 実装シーケンス（CI billing block 制約反映）

| 項目 | 種別 | 6/1 前に可能か |
|------|------|---------------|
| 本設計ドラフト | docs-only (Tier 1) | ✅ 今着手可（#406-409 self-merge 先例） |
| GA4 custom dimension / event 登録（GA4 管理画面側） | 外部設定（コード非依存） | ⚠️ kimny/GA4 権限要・要確認 |
| GA4 funnel exploration 定義の文書化 | docs-only (Tier 1) | ✅ 本ドラフト §5 |
| `gtag.ts` への event 追加 + フック実装 | **コード変更 (Tier 2)** | ❌ 6/1 CI 復帰後（merge HOLD） |

→ **6/1 前は本ドラフト確定 + GA4 設定要件の洗い出しまで**。コード実装は CI 復帰後に即着手し、設計済みなので実装時間を圧縮する。

---

## オープン項目（実装時に解消）

1. Clerk の sign-in 完了をどこで捕捉するのが最も確実か（middleware redirect か client mount か）
2. `/api/dial/chat` のどの message が `mix_diagnosis` consume を起こすか（診断要求の識別子）
3. GA4 側で `prior_free_diagnosis` を user-scoped で持たせるか event-scoped で持たせるか
4. `dial_activation` funnel と `research_beta` funnel の GA4 上での連結方法（同一 session/user キー）
