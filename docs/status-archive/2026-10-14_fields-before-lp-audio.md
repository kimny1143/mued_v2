# status.md の 3 欄から退避（2026-10-14T03:06:13+09:00・MUEDvox の LP の聴き比べの PR の前の、末尾の古い段）

## current_task

★★**(2026-10-12T21:23:15+09:00) funnel の集計の穴（10/8 分・10/9 分）を埋めた（conductor の判断 (a)・10/12）。開いている手番は無い＝conductor の次の依頼待ち。** 日付を指定した dispatch 2 回（run 38248001171＝10/8・38248197941＝10/9）＋日付なし 1 回（38248422067）＝3 回とも success・429 の出し直しの行は 0。★3 回目の理由: 日付を指定した実行は LAST_PUBLISH と funnel-numbers（kimny の PWA が読む数）の指し先も古い日にする∴最後に日付なしで 10/11 分に戻した（古い日を指していたのは 21:18〜21:22 JST の約 4 分）。data branch 2f958f7b・report は 10/3〜10/11 が揃った。★実物で見た事（conductor の条件）: 埋めた 2 日の「その日」の欄は日ごとに違う値（登録の増分 10/8＝4・10/9＝5、案内メールの到達 6・39、ポータル登録 1・7）で、MUEDsp の総数の差（10/7 分 1118 → 10/10 分 1136＝+18）と 3 日の増分の和（4+5+9＝18）が一致。ポータル登録は累計の差 10 に対して和 11＝1 ずれる（累計は実行時刻・日は UTC の 0 時で切るので窓が約 8 時間ずれる。原因は確かめていない）。★埋めた 2 日の report で「その日の値でない」欄: 総数（total・reachable・cumulative）・all_time・last_24h（窓は 10/11〜10/12）・newsletters・launch。各 report の generated_at と from／until に実行時刻が入っている。

## next_action

★★**(手番 2026-10-09T16:32:57+09:00) ⓪ MUEDlim 1.0.1 は出し終えた＝conductor の告知メール（conductor の手番）と次の依頼を待つ。kimny の Mac の入れ直し（Uninstall → 1.0.0）の結果・AAX／AU の実物の結果が文と違えば、文を直す PR を出す。dsp が file を作り直したら、file と固定の値を差し替えて CCO の再レビュー。次に MUEDlim の版を上げる時は previous-versions.ts の besideVersion と「変わったこと」の文を一緒に見る（古い明記は自動で消える）。**

★★**(手番 2026-10-09T00:36:38+09:00) ① conductor の次の依頼を待つ（#1208・#1253 は本番で確認して報告済み）。手元で進められるもの: ⑤ content課の通知（セッションが居れば）・⑨ MUEDvox 発売の PR の下調べ。** K1/K2 の照合を売る鍵の発行（lib/masterchain/key-issuance.ts:68 は署名鍵が在るかだけを見る）に足す案は、MUEDvox 発売の PR の時に conductor が判断（CCO の提案・一覧は #1251 で消した＝正本はプラグインの LicenseVerifier.h）。② ★本番に出る merge は、conductor 経由の許可ではこの窓の権限が通らない＝kimny がこの窓で直接言う（10/8 の #1248・#1245 で実測）。③ ★merge の後は Vercel の commit status を見る（success まで）。failure なら build log を読む＝font の取得の失敗は再 deploy で通った（再 deploy はダッシュボード＝kimny）。④ ★CI が queued のまま動かない時は先に `colima list`。profile ci が Stopped なら `colima start --profile ci`（Mac の再起動では自動で上がらない）。⑤ content課の canonical 通知（W26）。⑥ #1062 は開店後。⑦ 次に守りを触る PR で HTML コメントの中の行を数えない（W34）。⑧ #1238 より後の最初の購入で、購入者が MUEDsp のお知らせに入ったかを Resend で 1 回確かめる。⑨ MUEDvox 発売の PR（表の muedvox 行・EULA・特商法・Buy・デモ・鍵の画面）。★merge は gate だけ。本番に出る PR は kimny の許可。★status は中身の PR と分ける。
