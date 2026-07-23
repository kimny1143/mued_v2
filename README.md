# data/plugin-funnel-reports — orphan data branch

**これはアプリコードのブランチではありません。** プラグイン funnel の日次集計レポート
(`reports/plugin-funnel/YYYY-MM-DD.json`) だけを持つ orphan branch です。

## 目的
- Stage A collector (`scripts/aggregate-plugin-funnel-daily.ts` on `main`) が生成する
  日次レポートの置き場。insight課 Stage B が **sparse-checkout** でこのパスだけを取得して消費する。
- mued_v2 は決済/認証の本番 repo ゆえ **main を触らない**設計 (report は main に混ぜない)。
  よって別 orphan branch に分離している。

## 中身の性質
- **PII-free**: 件数・率のみ。email 等の個票は一切含まない。
- 各レポートは自己記述的: `portal_registrations.counting_since` / `*.definition` 等、
  数え方・起点日を JSON 自体に同梱している (別文書の注記に依存しない)。

## 運用
- 現状は **手動 publish** (2026-07-23 初回・配線 end-to-end 疎通の証明)。
- 将来 GHA workflow で自動 push 予定 (`schedule` 有効化は上流安定後・別 PR。
  cron の `if:` filter gotcha 回避のため)。
- **このブランチを main に merge しない。**
