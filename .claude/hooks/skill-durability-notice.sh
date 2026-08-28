#!/usr/bin/env bash
# SessionStart: .claude/skills に「復旧経路の無い skill」が居ないかを★起動時の出力に出す。
#
# ★なぜ CI ではなく hook か（2026-08-29・実測で判明）:
#   この検査が探すもの＝★ignore された skill は、★clone に存在しない。
#   CI は tracked file だけを checkout するので、★CI からは原理的に見えない。
#   実際に CI へ入れて赤くなり、そこで気づいた（★clone では manifest の9件が全部「消えた」に見える）。
#   ∴ ★CI の緑を安全と読むのは theatre。★見えるのは working tree だけ。
#
# ★なぜ hook か（status-caps-notice.sh と同じ理由・2026-08-05 の org 実測）:
#   規律は .gitignore にも書いてあるが、★次に skill を足す人は .gitignore を読まない。
#   効いたのは全部「読み返さなくても出力に出る形」。∴ 心がけを機構へ移す。
#
# ★条件: 何があっても起動を止めない（exit 0 で終わる）。
#   検査の失敗は「出力に出す」だけで、セッションを妨げない。
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CHK="$REPO/scripts/verify/skill-durability.ts"

echo "── skill 復旧経路 検査 ──"
if [[ ! -f "$CHK" ]]; then
  # ★「検査ファイルが無い」を沈黙にしない。沈黙は「異常なし」と読まれる。
  echo "★FAIL(skills): 検査ファイルが無い ($CHK) — 測れていない。'問題なし' ではない。"
elif ! command -v npx >/dev/null 2>&1; then
  echo "★FAIL(skills): npx が無い — 測れていない。'問題なし' ではない。"
else
  OUT="$(cd "$REPO" && npx tsx "$CHK" 2>&1)"
  RC=$?
  case "$RC" in
    0) echo "$OUT" | tail -2 ;;
    # ★1 = 未分類 or リスト陳腐化。★2 = 検査自身が信用できない。どちらも全文を出す。
    *) echo "$OUT" ;;
  esac
fi
exit 0
