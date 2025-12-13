#!/bin/bash
# Git整理hook - 会話開始時に不要なworktree/ブランチを検知して提案
#
# 発火条件: Notification (Stop)
# 動作: 古いworktree/mainにマージ済みブランチを検知 → stderrに提案メッセージ

set -e

# mainの最新コミットハッシュ
MAIN_HASH=$(git rev-parse origin/main 2>/dev/null || git rev-parse main 2>/dev/null || echo "")

if [ -z "$MAIN_HASH" ]; then
  exit 0
fi

declare -a SUGGESTIONS=()

# 1. mainより古いworktreeを検知
WORKTREES=$(git worktree list --porcelain 2>/dev/null | grep "^worktree " | cut -d' ' -f2)
for wt in $WORKTREES; do
  # mainワークツリーはスキップ
  if [[ "$wt" == *"/mued_v2" ]] && [[ "$wt" != *"-poc" ]]; then
    continue
  fi

  # worktreeのHEADを取得
  WT_HEAD=$(git -C "$wt" rev-parse HEAD 2>/dev/null || echo "")
  if [ -z "$WT_HEAD" ]; then
    continue
  fi

  # mainにマージ済みかチェック
  if git merge-base --is-ancestor "$WT_HEAD" "$MAIN_HASH" 2>/dev/null; then
    # mainと同じ、または古い
    if [ "$WT_HEAD" != "$MAIN_HASH" ]; then
      BRANCH=$(git -C "$wt" branch --show-current 2>/dev/null || echo "detached")
      SUGGESTIONS+=("🗑️ Worktree '$wt' (branch: $BRANCH) はmainより古いです。削除を検討してください。")
    fi
  fi
done

# 2. mainにマージ済みのローカルブランチを検知（main, 現在のブランチを除く）
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "")
MERGED_BRANCHES=$(git branch --merged origin/main 2>/dev/null | grep -v "^\*" | grep -vE "^\s*(main|master)\s*$" | sed 's/^[+ ]*//' | tr -d ' ')

for branch in $MERGED_BRANCHES; do
  # 現在のブランチはスキップ
  if [ "$branch" = "$CURRENT_BRANCH" ]; then
    continue
  fi

  # worktreeで使用中かチェック
  USED_BY_WT=$(git worktree list 2>/dev/null | grep "\[$branch\]" || echo "")
  if [ -n "$USED_BY_WT" ]; then
    continue
  fi

  SUGGESTIONS+=("🌿 ブランチ '$branch' はmainにマージ済みです。削除を検討してください: git branch -d $branch")
done

# 3. リモートで削除済みだがローカルに残っているブランチを検知
git fetch --prune 2>/dev/null || true
STALE_REMOTES=$(git branch -vv 2>/dev/null | grep ": gone]" | awk '{print $1}')
for branch in $STALE_REMOTES; do
  if [ "$branch" = "$CURRENT_BRANCH" ]; then
    continue
  fi
  SUGGESTIONS+=("👻 ブランチ '$branch' のリモートは削除済みです。ローカルも削除を検討: git branch -D $branch")
done

# 提案があれば出力
if [ ${#SUGGESTIONS[@]} -gt 0 ]; then
  echo "" >&2
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
  echo "🧹 Git整理提案" >&2
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
  for suggestion in "${SUGGESTIONS[@]}"; do
    echo "" >&2
    echo "$suggestion" >&2
  done
  echo "" >&2
  echo "一括削除コマンド:" >&2
  echo "  git worktree prune && git fetch --prune" >&2
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
  exit 1
fi

exit 0
