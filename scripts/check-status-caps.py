#!/usr/bin/env python3
"""status.md の注入3欄が 6,000 バイト cap を超えていないかを測る。

★出所: product課 gw-product PR #12（2026-08-05）。当課がレビューで
ブロックスカラーの fail-open を実測して指摘し、先方が修正した版を移植した。
★複製なので drift する —— 直す時は先方にも伝えること（sha 突合の機構は当課に無い）。

★なぜ機構にするか（2026-08-05・org 全体の実測）:
  「読み返して防げた」実例が 2課・9件で 0 件だった。効いたのは全部
  「読み返さなくても出力に出る形」。★当課の status.md は本日 128 KB あり、
  注入3欄も 3,633 / 4,302 B だったが、畳めたのは「自分で測ったから」で
  機構ではなかった。∴ 心がけを機構へ移す。

★超過分は注入時に末尾から黙って切られる。量に関わらず異常。

exit: 0=cap 内 / 1=超過 / ★2=検査不成立（file 無し・欄 無し・測れない形）
"""
import io
import os
import re
import sys

CAP = 6000
FIELDS = ("current_task", "next_action", "blocked_by")
# ★YAML ブロックスカラーの指示子。この形だと値が次行以降に在り、
#   `(.*)` は指示子1〜2文字しか掴めない ＝ ★「短い」と「読めていない」が同じ 0 に潰れる。
#   ★しかも切り替える動機が「欄が長くて読みにくい」なので、
#   ★cap 超過を直そうとした操作が検査を黙らせる（緑になる条件が検査の目的と一致する）。
BLOCK_SCALAR = ("|", ">")


def main() -> int:
    repo = sys.argv[1] if len(sys.argv) > 1 else "."
    path = os.path.join(repo, "status.md")
    if not os.path.isfile(path):
        print(f"★FAIL(caps): {path} が無い — 測れていない。'cap 内' ではない。")
        return 2

    s = io.open(path, encoding="utf-8").read()

    # ★早期 return をやめて全欄を集める。1欄で降りると、残りの状態が分からない。
    missing, blockscalar, over = [], [], []
    for k in FIELDS:
        m = re.search(r"^" + k + r": (.*)$", s, re.M)
        if not m:
            missing.append(k)
            continue
        v = m.group(1).strip()
        if v[:1] in BLOCK_SCALAR:
            blockscalar.append(k)
            continue
        b = len(m.group(1).encode("utf-8"))
        if b > CAP:
            over.append((k, b))

    if missing:
        for k in missing:
            print(f"★FAIL(caps): frontmatter に {k} が無い — 形式が変わった疑い。")
        print("  → 測れていない。'cap 内' ではない。")
        return 2

    if blockscalar:
        for k in blockscalar:
            print(f"★FAIL(caps): {k} がブロックスカラー — 中身のバイト数を測れない。")
        print("  → 測れていない。'cap 内' ではない。単一行に戻すか、この検査を拡張すること。")
        return 2

    if over:
        for k, b in over:
            print(f"★NG(caps): {k} が {b} B（cap {CAP}）"
                  f"— ★超過 {b - CAP} B は注入時に★末尾から切られる")
        print("  → 直し方: 古い記述を docs/status-archive/ か Recent events へ退避"
              "（★cap を上げない。上げるのは肥大を許容して見えなくする方向）")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
