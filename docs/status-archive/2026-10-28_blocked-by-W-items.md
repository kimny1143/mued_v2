# blocked_by の W 項目（2026-10-28 に status.md から退避・逐語）

★★**(W40 更新・2026-10-13T23:51:45+09:00) MUEDvox の発売の後も未確認のまま残っている物**: ①〜④(閉じた・10/14) 期限つきの鍵・admin の画面・本番の DB・サインインの流れ・直した後のポータルは kimny の実物の確かめで通った⑤デモのフォームの送信と控えのメールの実物⑥部分の返金・chargeback（前から）⑦客の注文での GA4 の cta_click（buy_button／cart_checkout）⑧特商法のメモリの行は MUEDvox では測っていない値のまま出している（conductor の決め 10/14・VOX が 1.0.1 で測る）⑨(閉じた・10/14 #1286) 配布中の pkg の表記。** 

★★**(W38・W39・2026-10-21 退避) MUEDlim 1.0.1 で未確認の 7 件（ポータルの以前の版の行・案内メール・Safari/Firefox/実機・Mac の戻し方・オートメーション×6・Unity・画像）と 429 の出し直し未確認の全文は docs/status-archive/2026-10-21_fields-before-logic-merge.md。違う結果が来たら文を直す。** 

★★**(W26 に追加・同じ時刻) content課への通知に MUEDlim 1.0.1 を足す**（CEILING −18〜0・1:1 スイッチ・GR のグラフ・1.0.0 のセッションで値が変わる・1.0.0 はポータルに残す・画像は 1.0.1）。16:30 JST も ListAgents に content課なし。** 

★★**(W37・W36・W34・W31・2026-10-22 退避) GA4 は 10/8 20:35 JST から同意者のみ／Colima ci は再起動で自動で上がらない（`colima start --profile ci`）／gate の 3 行は HTML コメント内も数える／masterchain Windows の倍率切替は未確認——全文は docs/status-archive/2026-10-21_fields-before-logic-merge.md。** 

★★**(W26) content課への canonical 通知が未送信（10/7 から content課が ListAgents に居ない）。送る中身の全文は docs/status-archive/2026-10-21_fields-before-logic-merge.md の末尾の W26 の段。** 


# 2026-10-28 の途中の手番（status.md から退避・逐語）

- next_action: ★★**(手番 2026-10-28T12:49:45+09:00) ⓪ #1315（チェック欄・head b6081b2b・CCO PASS 5677288885・CI 緑・conductor OK）＝★kimny の guard-change の承認待ち（e2e の demo の checkbox 0→1・conductor が kimny に聞く）→ 返事の逐語を PR 本文の guard-change 行に入れて「conductor の確認待ち」を外す → gate merge → 本番の privacy とフォームを確認 → content課通知。その後 ① #1312（base を main へ・0065 は本番に当たった 10/28・host 確認済み）＝CI 緑と最後の head の CCO PASS で merge（conductor OK・本番の行の確認は conductor が kimny に頼む・当課は本番 DB を読まない）② #1316（カートのチェック欄 (b)・head 617ee27b・CCO PASS 5677346571・base を main へ移したら CCO 掛け直し）＝CI 緑で merge（conductor OK）。buyers の名簿は (a)（本番に env なし・作る時は分割・§2 の 1 行・承認を 1 PR で）。** 

- next_action: ★★**(手番 2026-10-28T10:12:22+09:00) ⓪ #1314・#1313 は merge 済み（#1313 squash 1a58a224・10:10 JST・本番の 4 file の sha256 が main と一致・/ja /en の LP が参照）。開いている PR: #1315（同意のチェック欄・CCO PASS 5676049123・head f1d8f29a・draft）＝kimny の MUEDvox デモの文言の答えと conductor の最終 OK と CI 緑で un-draft → gate merge → 本番の privacy とフォームを確認 → content課通知。#1312（demo_signups・CCO PASS 5676049284・head 74814215・base は #1315）＝#1315 の後に base を main へ（base 変更→push）→ conductor から 0065（blob 46137433）の本番適用の知らせ → gate merge（期限 2026-11-16T04:13Z）→ 本番のデモ 1 件で行ができるかを確認。0065 の中身は変えない（変えるなら 0066）。名簿の notice-only（171 / 1,087）は触らない（kimny が決める）。** 

- current_task: ★★**(2026-10-28T12:49:45+09:00) #1315 は guard-change の kimny 承認待ちで止めている。#1316（カートのチェック欄）を出して CCO PASS。0065 は kimny が本番に当てた。** 

- current_task: ★★**(2026-10-28T10:12:22+09:00) #1313（LP 試聴 rev7）を gate で merge（1a58a224）・本番で 4 file が main と sha256 一致。conductor と CCO に報告済み。#1315・#1312 は条件待ち。** 

- current_task: ★★**(2026-10-24T20:43:24+09:00) Chief メモ d79e8c7 の security の 2 本が閉じた: #1303（rate limit をメモリで数える・advisory/slots に 60/分）squash 0b88b6b3・#1304（.npmrc ignore-scripts=true ×6・README に puppeteer の Chrome）squash 8d7f81cf。どちらも kimny の言葉で gate merge。#1304 の Sales path は 10/22 の遅い runner で 25 分の上限切れ→1 回 re-run で緑。** 


## 2026-10-28T23:20:02+09:00 に blocked_by から外した 2 件（逐語）

★★**(2026-10-28T08:00:39+09:00) EULA「ご同意いただいた場合に限り」が購入者について合っていない（カートは注記だけで名簿に入れる・kimny 10/6）。直すなら EULA 2026.10.4（注文の eula_version・trial の literal・installer に 2026.10.3）か、カートにチェック欄。kimny に (a) 版上げ／(b) カートにチェック欄／(c) 保留 を確認中（conductor と当課は b を推奨）。答えが来たら別の PR。**

★★**(2026-10-28T07:51:25+09:00) 期限 2026-11-16T04:13Z（Resend の請求期間の区切り＝解約したお知らせ用 plan が効き始める・conductor の推測）: #1310 は本番に出た（ef9a6a91）。残り: kimny が 0065（blob 46137433）を本番に適用 → #1315 merge → #1312 を main に戻して merge。間に合えば取りこぼし 0。10/27 23 時台 UTC の時点で連絡先 1262/5000＝上限はまだ効いていない（conductor が get-usage で確認）。過ぎるとデモの登録は自社のどこにも残らない。**


## 2026-10-29T01:05:29+09:00 に next_action の先頭から外した段（逐語）

★★**(手番 2026-10-29T00:56:49+09:00) ⓪ 開いている PR 2 本: #1319（MUEDvox の使い方の動画・ID 5xISWqAEzvE・Tier 2・head e3e75ab9・preview https://muedv2-git-feat-muedvox-howto-video-glasswerks.vercel.app/en/muedvox を conductor に送った）＝CCO PASS＋CI 緑＋kimny が preview を見る → conductor の OK で gate merge。#1317（試験だけ・gate が test の .ts を code と数え --tier1 を拒否＝Tier 2 に変えて CCO に peer review を依頼・CI 緑）＝PASS で gate merge。#1318 は merged cfa55e93（本番: llms.txt の hoo-mcp 0・/connect 307→/・Worker 404・Deploy Hoo MCP は走らず・Chief に 1 行）。**


## blocked_by から退避（2026-10-31T00:50:44+09:00・済み: #1316/#1315/#1312・#1317 retention 90 秒・#1318 で旧 Hoo MCP の (1)〜(3)）

★★**(2026-10-28T23:20:02+09:00) 済んで外した 2 件（EULA と購入者＝#1316 のカートのチェック欄で解決・11/16 の期限＝#1315・#1312 が本番・デモの行も確認）は docs/status-archive/2026-10-28_blocked-by-W-items.md の末尾へ逐語で退避。**

★★**(2026-10-27T22:27:12+09:00) tests/unit/plugin-download-retention.test.ts が full run で 30 秒の時間切れで落ちる（当課 1 回・CCO 2 回・単独では 3/3 緑・約 24 秒）＝CI でも落ちうる。別の PR で timeout の見直し（#1308 とは無関係）。**

★★**(2026-10-22T02:51:09+09:00) 旧 Hoo MCP を畳む残り（kimny 10/22「畳む」・conductor 経由・kimny 10/22「なんかどっちも上手くいかない。また後日にしていい？」）: (1) Registry io.github.kimny1143/hoo-mcp 1.0.0・1.1.0 は active のまま＝kimny が `mcp-publisher login github` のデバイスコードを承認 → 当課が `mcp-publisher status --status deprecated --all-versions --message "Retired. See https://mued.jp" io.github.kimny1143/hoo-mcp`。(2) Worker hoo-mcp.glasswerkskimny.workers.dev は動いたまま＝kimny が `cd workers/hoo-mcp && npx wrangler login` をブラウザで許可か、CF の画面で hoo-mcp → Settings → Domains & Routes → workers.dev を Disable → 当課は workers_dev=false（code・鍵の表は消さない）。(3) 止めた後に別の PR: middleware の /connect(.*)・Worker の server.json と server card の mued.jp/connect・app/api/mcp/test-connection（CCO 注記）。(4) 済んだら Registry・Worker・/connect の実測と mcprush の表示を 1 回見て conductor へ。今は古い鍵 2 本（30 日の利用 0）の持ち主だけが Worker に入れる。**
