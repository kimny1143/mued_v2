#!/usr/bin/env bash
# SessionStart: status.md の注入3欄が cap を超えていないかを★起動時の出力に出す。
#
# ★なぜ hook か（2026-08-05）: 規律は CLAUDE.md にも status.md にも書いてあるが、
#   org 全体の実測で「読み返して防げた」実例が 2課・9件で 0 件だった。
#   効いたのは全部「読み返さなくても出力に出る形」。∴ 心がけを機構へ移す。
#
# ★条件: 何があっても起動を止めない（exit 0 で終わる）。
#   検査の失敗は「出力に出す」だけで、セッションを妨げない。
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CHK="$REPO/scripts/check-status-caps.py"

echo "── status.md cap 検査 ──"
if [[ ! -f "$CHK" ]]; then
  # ★「検査ファイルが無い」を沈黙にしない。沈黙は「異常なし」と読まれる。
  echo "★FAIL(caps): 検査ファイルが無い ($CHK) — 測れていない。'cap 内' ではない。"
elif ! command -v python3 >/dev/null 2>&1; then
  echo "★FAIL(caps): python3 が無い — 測れていない。'cap 内' ではない。"
else
  OUT="$(python3 "$CHK" "$REPO" 2>&1)"; RC=$?
  case "$RC" in
    0) echo "✓ 注入3欄はすべて cap 内（6,000 B）" ;;
    1) echo "$OUT" ;;
    2) echo "$OUT"; echo "  → ★測れていない。'異常なし' と読まないこと。" ;;
    *) echo "★FAIL(caps): 想定外の終了コード $RC"; echo "$OUT" ;;
  esac
fi

exit 0   # ★起動は止めない
