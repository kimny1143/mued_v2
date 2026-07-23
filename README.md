# data/plugin-funnel-reports — orphan data branch

**これはアプリコードのブランチではありません。** プラグイン funnel の日次集計レポート
(`reports/plugin-funnel/YYYY-MM-DD.json`) だけを持つ orphan branch です。

> ★**現状は手動 publish です（自動化は未実装）。最終手動 publish: 2026-07-23。**
> 「自動で最新化されている」と読まないでください。各レポートの鮮度は JSON 内の
> `generated_at` を、更新運用の状態はこの行を正としてください。

## 目的
- Stage A collector (`scripts/aggregate-plugin-funnel-daily.ts` on `main`) が生成する
  日次レポートの置き場。insight課 Stage B が **sparse-checkout** でこのパスだけを取得して消費する。
- mued_v2 は決済/認証の本番 repo ゆえ **main を触らない**設計 (report は main に混ぜない)。
  よって別 orphan branch に分離している。

## 系列の定義（数え方は各 JSON の `*.definition` / `counting_since` にも同梱）
- `marketing_contacts_total` = 全 audience union の distinct email（unsub 含む＝**billing exposure**・CFO 指標・**北極星に使わない**）。
- `muedsp_reachable` = ★**北極星線**。MUEDsp セグメントのみ・unsubscribed=false・distinct（kimny 2026-07-18 批准スコープ = MUEDsp 10,000人）。
- `marketing_contacts_reachable` = org 全体リーチ（別行・AND 保守側＝どの audience でも解除されていない email のみ）。
- `portal_registrations` = 認証済ポータル到達（列 0059）。`counting_since` 以降の **forward-only**・過去分は GA4 のみ（backfill 不可）。

## 中身の性質
- **PII-free**: 件数・率のみ。email 等の個票は一切含まない。
- 各レポートは自己記述的（数え方・起点日を JSON 自体に同梱・別文書の注記に依存しない）。

## 運用
- 現状 **手動 publish**（上記 最終日を参照）。
- 将来 GHA workflow で自動 push 予定（`schedule` 有効化は上流安定後・別 PR。cron の
  `if:` filter gotcha 回避のため。手動 publish と二重に走らないよう切替時に手動を止める）。
- **このブランチを main に merge しない。**
