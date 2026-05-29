# write課 canonical変更通知義務

本peer が以下の canonical を変更/公開した場合、変更決裁完了タイミングで **write課に claude-peers 経由で通知する義務** を持つ。

## 通知トリガー

- 公式pricing (mued.jp / dial.mued.jp等)
- product spec (プラン構成、機能セット、UI仕様)
- 戦略docs (`_conductor/docs/strategies/` 配下)
- ロードマップ (Phase切替、機能ローンチ、廃止判定)
- kimny判断 / conductor承認決定事項のうち記事訴求に影響するもの

判断迷う場合は**過剰通知側に倒す**。過去30日以内にwrite課が記事化/proposal化していた場合は確実に通知。

## 通知手順

1. write課peer ID = `mcp__claude-peers__list_peers` で取得（cwd: `/Users/kimny/Dropbox/_DevProjects/_contents-writing`）
2. SNS課（cwd: `mued/threads-api`）と混同しないよう注意
3. `mcp__claude-peers__send_message` で通知

## 通知内容（必須）

- canonical名（ファイルパス or サービス名）
- 変更要点（before/after核心差分）
- 影響範囲推定（write課公開済記事への影響あり/なし/不明）
- 緊急度（即時/通常/軽微）

## 緊急度基準

| 緊急度 | 条件 | 運用 |
|--------|------|------|
| **即時** | 公開済記事の数値・機能訴求が誤情報、訴訟・コンプライアンスリスク | 即時通知 + 当日中対応 |
| **通常** | 公開済記事のarticulation陳腐化 | 即時通知 + 2段階SLA |
| **軽微** | 内部参考、新規記事から反映で十分 | **即時通知不要、ログ追記のみ** |

「軽微」即時通知不要化で notification fatigue リスク抑制。

## 関連

- write課 workspace memory: `feedback_canonical_change_notification.md`
- Tier 判定: mued/native/template/conductor の 4peer 内 = Tier 2
