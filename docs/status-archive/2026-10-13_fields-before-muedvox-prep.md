# status.md の 3 欄から退避した分（2026-10-13T15:37:35+09:00・逐語）

## current_task

★★**(2026-10-12T21:08:16+09:00) #1258 は merge した（c55024a0・10/12 21:01 JST・head ac66fedb・CCO PASS・kimny がこの窓で「#1258 を merge」）。開いている手番は無い＝conductor の次の依頼待ち。** Vercel success 21:05 JST。集計を 1 回 dispatch（run 38246838927・main c55024a0・日付なし）→ success・集計の step 22 秒（同じ日の定時は 39 秒）・data branch の LAST_PUBLISH 2026-10-12T12:07:12Z・report 10/11 分。★log に「Resend 429 — retry」の行は 0＝この回は 429 が 1 度も来ていない∴出し直しの道は実際の Resend では通っていない（間隔をあけた読みが通る事までを見た）。★10/11 と 10/12 の定時は直しの前でも成功していた＝この 1 回の成功は直しが効いた証拠にはならない。次に 429 が来た日の log で分かる。★10/11 分の report は dispatch で上書きされた（合計の欄は 21:07 JST 時点の値・定時の版は data branch の a352e208）。★10/8 分と 10/9 分の report は無いまま。

★★**(2026-10-11T21:46:36+09:00・peer-checkout) kimny は 10/12 まで休み。開いている手番は #1258 だけ＝kimny がこの窓で直接「#1258 を merge」と言うまで止める（conductor 10/11）。** #1258（funnel の集計の Resend の読みに間隔と 429 の出し直し）: OPEN・head ac66fedb・CI 通過・CCO PASS（注記 5 つは次に触る PR で）。★集計の実際: 10/9（2 回）と 10/10 は同じ 429 で失敗・★10/11 の定時は #1258 なしで成功（run 38122299794・LAST_PUBLISH 2026-10-11T07:44:38Z・report 10/10 分）＝429 は毎日は出ない。★data branch に 10/8 分と 10/9 分の report が無い（21:45 JST に ls-tree で確認）。#1258 は実際の Resend では未確認。 MUEDvox 0.8.0 のベータ配布: conductor の問いにコードを読んで返事した（10/11・読むだけ・本番 DB は読んでいない・配布の go は出ていない）。要点＝「ベータ権利」という物は repo に無い（候補 4 つ: masterchain の購入者・閉じている試用・無料 plugin の登録者・MUEDial の waitlist）・購入なしで権利を付ける道は無い・scope が muedvox の鍵の発行は無い・download の URL は空・渡した鍵は取り消せない。

## next_action

★★**(手番 2026-10-13T11:54:33+09:00) ⓪ conductor の次の依頼を待つ。★merge の道具が変わった（kimny 10/13・この窓）: CCO の PASS 済み PR は `_conductor/scripts/check-mergeable.sh <N> kimny1143/mued_v2 --merge`。先に `npm run -s verify:pr-gate -- <N>`（読むだけ）を通す＝この前置きは当課の判断で、kimny の返事待ち。Tier 1 の self-merge は `npm run verify:pr-gate -- <N> --merge` のまま。Tier 3 は conductor へ。下の「merge は gate だけ」はこの読みで。**

★★**(手番 2026-10-12T21:23:15+09:00) ⓪ conductor の次の依頼を待つ。★次に集計を日付指定で dispatch する時は、最後に日付なしでもう 1 回（最新の指し先を戻す）。集計が次に失敗したら log の「Resend 429 — retry」の行を先に読む。**

★★**(手番 2026-10-12T21:08:16+09:00) ⓪ conductor の次の依頼を待つ。集計が次に失敗したら log の「Resend 429 — retry」の行を先に読む（行が在って落ちた＝4 回の出し直しでも足りない／行が無くて落ちた＝別の原因）。10/8 分・10/9 分の穴を埋めるか（日付を指定した dispatch 2 回）は conductor の判断待ち＝報告に書いた。次に集計を触る PR で CCO の注記（試験を強める・案内メールの 30 ページで黙って終わる所）。**

★★**(手番 2026-10-11T21:46:36+09:00) ⓪ kimny がこの窓で「#1258 を merge」と言ったら: head が ac66fedb のままかを見る → gate で merge → Vercel の commit status → 集計を 1 回 dispatch（日付なし）→ log の「Resend 429 — retry」の行を読む → data branch の LAST_PUBLISH を読む → conductor へ報告 → status の PR。言われるまでは merge しない（conductor 経由の許可では通らない）。★10/8 分と 10/9 分の report の穴を埋めるか（日付を指定した dispatch 2 回）は conductor に聞いてから＝まだ聞いていない。MUEDvox のベータは conductor の次の依頼待ち（go なし・何も変えない）。#1247（10/7 の status の PR）が OPEN のまま残っている＝中身は後の status の PR で古くなったはず・閉じる前に差分を 1 回見る。**

## blocked_by

★★**(W35 閉じた・2026-10-08T16:13:33+09:00) #1245 の経路は #1251 で消した・本番で /_not-found の 404 を実測。**

★★**(W32 閉じた・2026-10-02T00:32:46+09:00) #1207 は本番に出た（22:27 JST・ja/en の新しい文あり・旧文 0 件・どの deploy で出たかは未確認）。**

★★**(W33 閉じた・2026-10-08T20:38:35+09:00) #1208 は 10/8 に merge・本番で実測。**

★★**(W28) 閉じた: 発売便は 2026-09-30T22:13:13.198Z に送信（07:13:06 の queued は送信の直前）。**（created 21:54:16Z・sent_at null・07:13 JST に 2 回確認）。送信の操作は kimny の手番。LAUNCH_AT はこれ待ち。**
