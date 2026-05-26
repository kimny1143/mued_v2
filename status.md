---
peer: mued
department: product
activity: active
status: reviewing
current_task: LP課 AIO FAQ 320件LGTM済み (batch ZZZ PR #338)。AAAA/BBBB BLOCKER修正待ち (PR #339/#340)。350件目標 残30件。
next_action: LP課 AAAA/BBBB BLOCKER修正後の再レビュー対応。5/27 08:00 JST Phase 2 Gate Day 2 snapshot watch。
blocked_by: null
urgency: low
action_owner: peer
deadline: 2026-05-27T09:00:00+09:00
expected_next_check_at: 2026-05-27T08:00:00+09:00
last_update: 2026-05-26T23:30:00+09:00
evidence: LP課 PR #339 AAAA BLOCKER(Q321 rnb/Q324 jazz) + PR #340 BBBB BLOCKER(Q325 typo/Q326 country→ACOUSTIC) 検出・通知済み
confidence: high
lane: notification
---

## Recent events

- 2026-05-26T23:30:00+09:00: LP課 PR #340 batch BBBB レビュー完了。Q325 elecronic typo + Q326 country→ACOUSTIC BLOCKER検出。修正依頼送信済み。**12ジャンルFAQ完成待ち**
- 2026-05-26T23:00:00+09:00: LP課 PR #339 batch AAAA レビュー完了。Q321 rnb→POP + Q324 jazz→OTHER BLOCKER検出 (indirect mapping "最適化"問題)。修正依頼送信済み
- 2026-05-26T21:00:00+09:00: LP課 PR #325 batch QQQ LGTM (Q280-Q283)。**FAQ計283件 LIVE予定**。batch RRR (Q284+) 待機中
- 2026-05-26T19:30:00+09:00: LP課 PR #316 batch III LGTM。**251件達成 🎯 (250件目標超達成)**。data課 PR #116 (fal_daily_usage_report.py stub) LGTM self-merge完了
- 2026-05-26T17:00:00+09:00: LP課 PR #312/#313 BLOCKER検出 (Q239 Dub/Q241 Indie — genre key混同)。data課 PR #111 (calculate_ltv_cac.py) LGTM

## Notes

- LP課 FAQ AIO review: batch ZZZ (PR #338)まで全LGTM。**320件 LGTM済み**。AAAA/BBBB BLOCKER修正後に328件予定
- **indirect genre mapping BLOCKERパターン**: jazz→OTHER / rnb→POP / country→ACOUSTIC の3ジャンルは"最適化"表現NG。"を考慮した処理" + betaヘッジが安全。Rule 14として記録済み
- MUSICAL_STYLE_MAP user-facing keys (12種): pop/rock/hiphop/electronic/acoustic/jazz/classical/rnb/country/metal/reggae/other — 内部名(ROCK_INDIE/REGGAE_DUB等)と混同注意。LP課メモリ化済み
- data課 PR #111 (LTV/CAC計算) + #112 (n30監視) + #116 (fal COGS stub) 全merge完了
- Q3 GA backlog D: kimny手動作業手順書完成 (docs/drafts/backlog-d-migration-sync-guide.md)
- data課 PR #84: Phase 2 Gate GO後 + INTERNAL_API_KEY取得後にmerge (kimny手動)
- 5/27 08:00 JST: Phase 2 Gate Day 2 snapshot watch (data課実行)
- Hoo Pass churn分析設計: docs/drafts/hoo-pass-churn-analysis-design.md 完成 (Phase 1観察中)
