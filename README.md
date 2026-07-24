# data/plugin-funnel-reports — orphan data branch

**これはアプリコードのブランチではありません。** プラグイン funnel の日次集計レポート
(`reports/plugin-funnel/YYYY-MM-DD.json`) だけを持つ orphan branch です。

> ★**最終 publish の日時と、それが自動か手動かは `LAST_PUBLISH.json` を見てください。**
> ここに日付を書かないのは意図的です。散文の日付は必ず古くなり、しかも古くなったことが
> 誰にも分からないまま「最新のはず」と読まれます（実際、上流の台帳に「日次で自動監視」と
> 書かれる一方で運用は手動 publish、という乖離が起きました）。
>
> **現在: GitHub Actions `plugin-funnel-collector` が publish します。ただし `schedule` は
> 未有効で、走るのは手動 dispatch の時だけです。**＝ 放っておいても最新化されません。
> 各レポート自体の鮮度は JSON 内の `generated_at` を正としてください。

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
- publish は GitHub Actions `plugin-funnel-collector`（`main` 上）が行う。**`schedule` は未有効**で、
  現状は **手動 dispatch のみ**。無人化は別 PR（受入条件＝消費側が `LAST_PUBLISH.json` の鮮度を読む
  reconciliation 型の監視 / DB 資格情報の least privilege / 下記フィールド集合の凍結）。
- **`LAST_PUBLISH.json`** = 更新運用の正本（機械可読）。フィールド:
  `last_publish_at`（UTC）/ `trigger`（`workflow_dispatch` or `schedule`）/ `workflow` /
  `workflow_run`（実行ログ URL）/ `report`（この run が書いたレポートのパス）。
- **このブランチを main に merge しない。**
