# status.md 退避（2026-09-28）

blocked_by が 6,000 バイトの注入 cap を超えたため、保留中の (W16) と恒久制約の (W0b) の本文をそのまま移した（status.md には 1 行の要約とこの path を残した）。

## (W16)

★★**(W16) 【保留・kimny 9/24「旧 MUEDial は Next のローンチまで触らない」】有料 final の R2 URL 未記録**: ★修正 #1096／#1099／#1101・script #1097 は ★全部 merged・★本番着地済（mued.jp＝`dpl_8VvViyYK…`＝main 137fad48）。★**残＝kimny が main で `npx tsx scripts/count-dial-finals-missing-r2.ts` を 1 回**（★効く数は `missing<=3d`・`missing_r2` は上限）→ ★>0 なら再コピーの要否を conductor へ。★詳細＝(1y)。

## (W0b)

★★**(W0b) 棚の剛定＝「古い file の削除」でなく「★配達済リンクの失効」**（恒久制約）: ★旧版を消すと過去の購入者のリンクが 404（無料3本も同型）。★詳細＝(1c)(1d)。 ★**blocked_by の *(W2d) 以降は `docs/status-archive/2026-09-27_current-task-ag-af_blocked-by-w2d-w12.md` へ退避（2026-09-27・byte 同一を確認）。**
