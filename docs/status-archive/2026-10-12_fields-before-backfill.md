# status.md の 3 欄から退避した分（2026-10-12T21:23:15+09:00・逐語）

## current_task

★★**(2026-10-09T16:32:57+09:00) MUEDlim 1.0.1 は本番に出た（#1255 と #1256）。conductor の告知メール待ち・次の依頼待ち。** #1255: merge 80ea8243（10/9 14:51 JST・head 9cb5537f・CCO PASS・kimny がこの窓で「#1255 を merge」）・Vercel success 14:53 JST。中身＝既定を 1.0.1 に（Mac pkg sha256 3a1a49d2…2360・3,302,225 B／Windows zip 3b853018・sha256 d17e6820…2aa7・1,142,661 B）・1.0.0 の 2 file は消さずポータルに「以前の版」（lib/plugins/previous-versions.ts・besideVersion が今の版と一致する間だけ出る）・/muedlim のフォームの前に 1 行＋「1.0.1 で変わったこと」の節（CEILING −18〜0・オートメーション × 6・1:1・戻し方）。本番で実測（14:53 JST・Chromium・サインアウト・計測は abort・フォームは送っていない）: 4 file が 200 で sha256 と bytes が一致・取り下げた zip 701c0f2a は 404・versions.json が 1.0.1・ja/en × 1280/390 で 1 行がフォームの前・節に −18／−6.0／1:1／Unity・古い数字なし・フォームは最初の画面内（ja 390 で下端 743 px）・/muedsat と /muedrive は変化なし。 #1256: merge 664059c0（10/9 16:29 JST・head 0811747b・CCO PASS・kimny がこの窓で「#1256 を merge」）・Vercel success 16:31 JST。中身＝製品の画像を 1.0.1 の画面に（public/muedlim/faceplate-1.0.1.webp・★同じ path の上書きは古い絵が出続けるので版を file 名に）・1:1 オンの画面（faceplate-1.0.1-unity.webp）を節の 1:1 の段落の下に。本番で実測（16:31 JST・同じ条件）: 2 file が 200 で sha256 一致（b594a304…8917・37,896 B／d67dd99f…4591・41,088 B）・/ja|en/muedlim（1280・390）・/ja|en/muedsp・/ja・/en の MUEDlim の画像がすべて新しい file・古い file を引く所 0・1:1 オンの画像が節の中に 1 枚・フォームの下端は #1255 と同じ（576／743／699 px）・横のはみ出し 0。古い faceplate.webp は残っている（200）。★未確認は blocked_by の W38。★事実の元は mued-dsp main 27284478 の release note。★文に file 名を書かない（dsp）。

## blocked_by

★★**(W39 更新・2026-10-12T21:08:16+09:00) #1258 は merge 済み。残り＝data branch に 10/8 分と 10/9 分の report が無い（下流でこの 2 日が欠ける）・429 の出し直しは実際の Resend で未確認。**
