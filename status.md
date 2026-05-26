---
peer: mued
department: product
activity: active
status: reviewing
current_task: LP課 AIO FAQ 251件達成 (batch AAA〜III, PR #306-#316)。data課 PR #111/112/116 Tier 2レビュー完了。
next_action: LP課 batch JJJ+ 待機。Hoo Pass churn分析設計ドラフト作業。5/27 08:00 JST Phase 2 Gate watch。
blocked_by: null
urgency: low
action_owner: peer
deadline: 2026-05-27T09:00:00+09:00
expected_next_check_at: 2026-05-27T08:00:00+09:00
last_update: 2026-05-26T19:30:00+09:00
evidence: LP課 PR #316 batch III LGTM (251件) / data課 PR #111/#112/#116 merge完了 / BLOCKER 2件検出修正 (Q239/Q241 genre key)
confidence: high
lane: notification
---

## Recent events

- 2026-05-26T19:30:00+09:00: LP課 PR #316 batch III LGTM。**251件達成 🎯 (250件目標超達成)**。data課 PR #116 (fal_daily_usage_report.py stub) LGTM self-merge完了
- 2026-05-26T18:00:00+09:00: LP課 PR #314/#315 LGTM (GGG 243件/HHH 247件)。data課 PR #112 (check_n30_threshold.py) bool算術演算BLOCKER修正→self-merge完了
- 2026-05-26T17:00:00+09:00: LP課 PR #312/#313 BLOCKER検出 (Q239 Dub/Q241 Indie — genre key混同)。data課 PR #111 (calculate_ltv_cac.py) LGTM
- 2026-05-26T16:30:00+09:00: LP課 PR #306〜#311 batch AAA〜EEE LGTM (219→235件)。data課 PR #111/#112 Tier 2レビュー着手
- 2026-05-26T15:15:00+09:00: LP課 PR #289/#290 batch NN/OO LGTM (Q164-Q171)。PR #380 self-merged (PREVIEW_LIMIT i18n)

## Notes

- LP課 FAQ AIO review: batch AAA〜III完了 (PR #306-#316)。**FAQ計251件 LIVE**
- MUSICAL_STYLE_MAP user-facing keys (12種): pop/rock/hiphop/electronic/acoustic/jazz/classical/rnb/country/metal/reggae/other — 内部名(ROCK_INDIE/REGGAE_DUB等)と混同注意。LP課メモリ化済み
- data課 PR #111 (LTV/CAC計算) + #112 (n30監視) + #116 (fal COGS stub) 全merge完了
- dialMessages tool_use保存: 2026-04-18 migration 0043本番適用済み ✅ (stale entryを修正)
- Q3 GA backlog D: kimny手動作業手順書完成 (docs/drafts/backlog-d-migration-sync-guide.md)
- data課 PR #84: Phase 2 Gate GO後 + INTERNAL_API_KEY取得後にmerge (kimny手動)
- 5/27 08:00 JST: Phase 2 Gate Day 2 snapshot watch (data課実行)
