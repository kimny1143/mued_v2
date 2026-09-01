#!/usr/bin/env bash
# SessionStart: dsp の license-vector set が、この repo が vendor した世代より先へ進んでいないか。
#
# ★なぜ必要か（2026-09-01 実測）:
#   vendored の写しは★自分の manifest としか照合しないので、1世代 遅れても内部整合して緑のまま。
#   実際に v2/14case のまま★35日 遅れ、その間 85 tests は全部 緑だった。
#   気づいたのは★無関係な調査が上流を1回 引いたから。★受け止めた機構は1つも無かった。
#
# ★なぜ CI ではなく hook か（実測）:
#   この repo の workflow 4本のうち mued-dsp を checkout するものは★0件。
#   CI に置くなら別 private repo の token（＝secrets）が要り、token 無しなら
#   「dsp が無いので skip」＝★中身の無い緑。∴「gate を取るか theatre を作るか」の二択。
#   ★#915 で同じ穴に落ちている（clone は tracked file だけなので、ignored を探す検査は CI で必ず 0件）。
#
# ★なぜ「ここ」に出すか（配達先の選び方）:
#   ★新しい配達先を作らず、★読まれていることが確認済みの場所に相乗りする。
#   status-caps-notice.sh / skill-durability-notice.sh は★実際にセッション冒頭で読まれている。
#   「鳴るはず」ではなく「★鳴っているのを見た」場所に足す。
#
# ★何を検出しないか:
#   これは監視であって保証ではない。gh が引けなければ★上流は見えない。
#   その時は 0 ではなく★2 を返す（＝「差分なし」ではなく「答えが無い」）。
#   検査自身が network に出るので、★8秒で打ち切る（起動を人質に取らない）。
#
# ★条件: 何があっても起動を止めない（exit 0 で終わる）。
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CHK="$REPO/scripts/verify/vector-drift.ts"

echo "── license vector 上流ドリフト 検査 ──"
if [[ ! -f "$CHK" ]]; then
  # ★「検査ファイルが無い」を沈黙にしない。沈黙は「異常なし」と読まれる。
  echo "★FAIL(vectors): 検査ファイルが無い ($CHK) — 測れていない。'問題なし' ではない。"
elif ! command -v npx >/dev/null 2>&1; then
  echo "★FAIL(vectors): npx が無い — 測れていない。'問題なし' ではない。"
else
  # 0=最新（1行）/ 1=再 vendor 期限 / 2=上流が見えていない。★どれも黙らせない。
  (cd "$REPO" && npx tsx "$CHK" 2>&1)
fi
exit 0
