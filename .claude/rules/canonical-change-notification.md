# content課への canonical変更通知義務

本peer が以下の canonical を変更/公開した場合、**content課に claude-peers 経由で通知する義務**を持つ。

> ## ★この rule が一度 空振りした記録（2026-07-12）
>
> **Hoo Pass 退役（PR #650・merged 2026-07-12）は本 rule の発火条件（product spec 変更）そのもの**だったが、
> **通知は送られていない**（status.md の 7/12 event に「**Phase2 merge/deploy 後に content/write課 canonical 通知**」と
> **残タスクとして書かれたまま**、以降の event に実施記録が無い）。
>
> ★**原因は宛先名の陳腐化ではない。** 当時の記述は「content/write課」と**両方の名前を書いており、統合は認識されていた**。
> 落ちたのは「**merge/deploy の後でやる**」と**後ろにずらした**からで、その「後」に担い手も期限も無かった。
> ＝ **規約は書いてあったが効いていなかった**（gate があることと効いていることは別）。
>
> → **対策は名前の修正ではなく、送る時点を前に倒すこと。「merge するその手で送る」**。
> 送れない事情があるなら **status.md の `blocked_by` に残す**（`next_action` は流れて消える）。

## 通知トリガー

- 公式pricing (mued.jp / dial.mued.jp 等)
- product spec (プラン構成、機能セット、UI仕様) ― **機能の追加だけでなく退役も含む**
- 戦略docs (`_conductor/docs/strategies/` 配下)
- ロードマップ (Phase切替、機能ローンチ、廃止判定)
- kimny判断 / conductor承認決定事項のうち記事訴求に影響するもの

判断迷う場合は**過剰通知側に倒す**。過去30日以内に content課が記事化/proposal化していた場合は確実に通知。

## 通知タイミング（★2026-07-25 改訂）

★**PR を merge する、その操作と同じターンで送る。** 「merge 後に」「deploy 後に」と後ろへずらさない。

- 退役・削除系は**特に落ちやすい**（追加と違って「公開する物」が無いので、完了の実感だけ先に来る）
- 送れない事情がある場合は **status.md の `blocked_by`** に書く。`next_action` に書くと次の更新で流れて消える

## 通知手順

1. content課 peer ID = `mcp__claude-peers__list_peers` で取得
   - cwd: `/Volumes/strage/_DevProjects/_contents-writing`（母体は旧 `_contents-writing`）
   - ★**peer ID は再起動で変わる。ID をここに書き写さない**（受信時は `from_id` を正本とする）
2. **SNS課**（cwd: `.../mued/threads-api`）と**混同しない**。両方とも発信系だが、canonical 通知先は content課
3. `mcp__claude-peers__send_message` で通知

## 通知内容（必須）

- canonical名（ファイルパス or サービス名）
- 変更要点（before/after 核心差分）
- 影響範囲推定（content課の公開済記事への影響 あり/なし/不明）
- 緊急度（即時/通常/軽微）

## 緊急度基準

| 緊急度 | 条件 | 運用 |
|--------|------|------|
| **即時** | 公開済記事の数値・機能訴求が誤情報、訴訟・コンプライアンスリスク | 即時通知 + 当日中対応 |
| **通常** | 公開済記事の articulation 陳腐化 | 即時通知 + 2段階SLA |
| **軽微** | 内部参考、新規記事から反映で十分 | **即時通知不要、ログ追記のみ** |

「軽微」の即時通知不要化で notification fatigue を抑える。

## 関連

- 組織再編 v2（2026-06-11）で **write課 + LP課 + blender課 → content課** に統合。母体 `_contents-writing`
- Tier 判定: 本 rule に基づく通知自体は PR を伴わない。通知の**きっかけになった変更**の Tier で判断する
