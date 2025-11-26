#!/bin/bash
# CLAUDE.md育成hook - git commit後に構造変更を検知して追記提案
#
# 発火条件: PostToolUse (Bash: git commit)
# 動作: 重要なファイル追加を検知 → stderrに提案メッセージ → exit 1 (警告表示)

set -e

# 直前のコミットで変更されたファイル一覧を取得
CHANGED_FILES=$(git diff-tree --no-commit-id --name-status -r HEAD 2>/dev/null || echo "")

if [ -z "$CHANGED_FILES" ]; then
  exit 0
fi

# 検知パターンと提案メッセージ
declare -a SUGGESTIONS=()

# 1. MCPサーバーの追加（ルートからマッチ）
if echo "$CHANGED_FILES" | grep -qE "^A[[:space:]]+scripts/mcp/.*\.js$"; then
  NEW_MCP=$(echo "$CHANGED_FILES" | grep -E "^A[[:space:]]+scripts/mcp/.*\.js$" | awk '{print $2}')
  SUGGESTIONS+=("📡 新しいMCPサーバーが追加されました: $NEW_MCP → CLAUDE.mdの「MCP Server実装ルール」セクションに追記しますか？")
fi

# 2. マイグレーションファイルの追加（ルートからマッチ）
if echo "$CHANGED_FILES" | grep -qE "^A[[:space:]]+db/migrations/.*\.sql$"; then
  NEW_MIGRATION=$(echo "$CHANGED_FILES" | grep -E "^A[[:space:]]+db/migrations/.*\.sql$" | awk '{print $2}')
  SUGGESTIONS+=("🗄️ 新しいマイグレーションが追加されました: $NEW_MIGRATION → CLAUDE.mdの「Neon PostgreSQL」セクションに追記しますか？")
fi

# 3. 新しいディレクトリ構造（apps/, app/, components/, lib/ 配下 - ルートからマッチ）
if echo "$CHANGED_FILES" | grep -qE "^A[[:space:]]+(apps?|components|lib)/[^/]+/"; then
  NEW_DIRS=$(echo "$CHANGED_FILES" | grep -E "^A[[:space:]]+(apps?|components|lib)/[^/]+/" | awk '{print $2}' | cut -d'/' -f1-2 | sort -u)
  SUGGESTIONS+=("📁 新しいディレクトリ構造: $NEW_DIRS → CLAUDE.mdの「コンポーネント分離」セクションに追記しますか？")
fi

# 4. 設定ファイルの追加・変更（ルート直下のみ、.bakを除外）
if echo "$CHANGED_FILES" | grep -qE "^[AM][[:space:]]+[^/]+\.(config\.(js|ts|mjs)|json)$" | grep -vE "\.bak$|package"; then
  CONFIG_FILES=$(echo "$CHANGED_FILES" | grep -E "^[AM][[:space:]]+[^/]+\.(config\.(js|ts|mjs)|json)$" | grep -vE "\.bak$|package" | awk '{print $2}')
  if [ -n "$CONFIG_FILES" ]; then
    SUGGESTIONS+=("⚙️ 設定ファイルが変更されました: $CONFIG_FILES → CLAUDE.mdの関連セクションを更新しますか？")
  fi
fi

# 5. 新しいhookスクリプトの追加（ルートからマッチ）
if echo "$CHANGED_FILES" | grep -qE "^A[[:space:]]+\.claude/hooks/.*\.sh$"; then
  NEW_HOOK=$(echo "$CHANGED_FILES" | grep -E "^A[[:space:]]+\.claude/hooks/.*\.sh$" | awk '{print $2}')
  SUGGESTIONS+=("🪝 新しいhookが追加されました: $NEW_HOOK → CLAUDE.mdに使用方法を追記しますか？")
fi

# 6. 新しいスクリプトの追加（scripts/配下、MCP以外 - ルートからマッチ）
if echo "$CHANGED_FILES" | grep -qE "^A[[:space:]]+scripts/[^/]+\.(sh|js|ts)$" | grep -v "mcp"; then
  NEW_SCRIPT=$(echo "$CHANGED_FILES" | grep -E "^A[[:space:]]+scripts/[^/]+\.(sh|js|ts)$" | grep -v "mcp" | awk '{print $2}')
  if [ -n "$NEW_SCRIPT" ]; then
    SUGGESTIONS+=("📜 新しいスクリプトが追加されました: $NEW_SCRIPT → CLAUDE.mdの「開発コマンド」セクションに追記しますか？")
  fi
fi

# 提案があれば出力
if [ ${#SUGGESTIONS[@]} -gt 0 ]; then
  echo "" >&2
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
  echo "💡 CLAUDE.md 更新提案" >&2
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
  for suggestion in "${SUGGESTIONS[@]}"; do
    echo "" >&2
    echo "$suggestion" >&2
  done
  echo "" >&2
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
  # exit 1 = 警告表示（ブロックなし）
  exit 1
fi

exit 0
