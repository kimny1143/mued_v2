# next_action 退避 2026-09-29（Windows 早期展開・EULA (W18) の日）

> status.md の next_action から 2026-09-29T14:46:04+09:00 に退避。★原文のまま・1 段 1 段落。

★★**(手番 2026-09-29T14:44:31+09:00) (W18) の PR＝#1158（head 9e78f1f0・CI 全件緑・CCO レビュー待ち）。★merge は #804（dsp head ec3646cb・CCO PASS・880980862 から作り直し済＝conductor 確認）と一緒に 9/30 の conductor の合図で・`npm run verify:pr-gate -- 1158 --merge` のみ。★merge 後: 本番 /ja,/en/eula を curl（16 条・版 2026.09・noindex のまま）→ 9/30 の回に施行日が決まったら effectiveDate の 1 キーだけの小さな PR → EULA_LIVE/NEXT_PUBLIC_EULA_LIVE（kimny）後に noindex が消えたことを curl → conductor へ。★この status の commit は local の branch docs/status-20260929-eula（#1158 の head を動かさないため・次の PR に同梱）。**

★★**(手番 2026-09-29T13:50:43+09:00) 発売便＝conductor の下書き（_conductor docs/drafts/newsletter/nl-launch-a-issue05.md）に Windows の段・UTM（campaign=email_nl-launch-a-issue05・content=windows）・鍵はポータル・demo の訂正を conductor が反映済（kimny の文面確認待ち）。★[EULA URL]＝/en,/ja/eula は (W18) 本文の着地＋EULA_LIVE（kimny）の後。当課は着地と noindex が消えたことを curl で確かめて conductor へ報告する。**

★★**(手番 2026-09-29T13:48:47+09:00) #1157 merged 04:47Z・本番着地を curl で確認（ja/en 200・id=windows・陰性 /ja/muedsat 0）→ conductor へ報告済＝発売便は送れる状態。★次に当課が動くきっかけ: ①(W18) EULA 変換＝conductor の合図待ち（第3条・第8条を kimny 確認中）②10/1 dsp の zip＋sha256 到着 → 1 本の PR（portal の windows 口・#windows の DL 化・DL 取引メールの Windows リンク・無料 3 種の OS 表記＋特商法 windows 行・鍵 path・Smart App Control の 1 行・format-claims の除外を外すか見直す）③10/14 masterchain の表記。この status は次の作業 PR に同梱（未 push）。**

★★**(手番 2026-09-29T13:29:53+09:00) conductor 回答済＝(a) 採用・DL 取引メールに Windows リンク（10/1 に beta 実物が出てから有効化）・OS 表記 2 段・portal の windows 設計 OK。#windows の段は本 PR（feat/muedsp-windows-section）。★(W18) の変換は conductor の合図まで待つ（第3条・第8条を kimny 確認中）。★10/1 以降に入れる dsp 追記: ①Windows の鍵の置き場 %LOCALAPPDATA%\\glasswerks\\MUEDsp\\license.key をポータルの鍵の案内へ（10/14 まで）②未署名 beta の案内に「Smart App Control がオンの PC では未署名の DLL が止められる場合がある」1 行。**

★★**(手番 2026-09-29T13:27:47+09:00・Windows 早期展開 conductor 依頼) ①返信済（EULA 第3条の Windows 追記は #804 RTF 再生成・1.0.0 bake・当課 (W18) 変換より前に draft へ＝9/30 の順序・kimny が文言確認）②conductor の答え待ち＝発売便のリンク先 (a) /muedsp#windows（フォームなし）を推奨 → 了承されたら 9/30 までに #windows の段を作る ③10/1〜 PluginDist に windows{downloadUrl,version,channel:beta}＋ポータルの 2 つ目のボタン（dsp の zip と sha256 待ち）④OS 表記の書き換えは 10/1（無料 3 種・tokushoho の windows 行）と 10/14（masterchain）の 2 段。一覧は conductor への返信（2026-09-29 13:3x）に。**

★★**(手番・checkout 2026-09-26T11:59) ★当課の手番は 0 件。★再起動したら: ① この status と台帳 (2j) を読む ② open PR は ★#1062（開店後）など（#1116 は close 済・後継 #1150/#1151） ③ 引き金を待つ＝★conductor が EULA の文面（仮 2026.09 か弁護士版）を確定 → ★当課が draft の Markdown を messages へ機械変換して本文 PR（`blocked_by` (W18) の 4 点を同じ PR で）→ dsp の 1.0.0 bake（(W15)）。★merge は必ず `npm run verify:pr-gate -- N --merge`（手組みの gh で merge しない・#1132 の教訓）。★旧 MUEDial は ★Next のローンチで止めるまで触らない（kimny 9/24）∴ (W16) は保留。**

★★**(方針・2026-09-23 conductor 便・kimny 逐語「Claudeのみで稼働しすぎかも。いい感じにCodexに振ってね。向こうはまだ9/26までの間で70%も残ってるので」) ★実装・test・文書の下書きは Codex へ。★当課は 依頼文・結果の独立確認・判断に集中。★本番 DB・secrets・Vercel 本番操作は Codex に振らない（kimny の手）。★#1062 の作り直し（destination を `*_DOWNLOAD_URL` から導出）も 0.1.3 の URL 確定後に Codex で**（★9/23 18:40 時点で conductor の記録にこの逐語は未着地＝grep 0 件・陽性対照あり）。 ★本日 merged: dial の R2 修正 4 本（#1096/#1097/#1099/#1101・★本番着地済・台帳 (1y)）／ CLAUDE.md block 04（#1102・CCO へ通知済）。 ★open PR は ★#1062（★開店後 merge・着手禁止）のみ。 ★**待っているもの＝★EULA 本文 → dsp が 4 本まとめて bake**（★当課の 5 項目＝`blocked_by` (W15)・★台帳 (1v)）。★それが来るまで ★版・URL・parser は 触らない。 ★★**`masterchain_interest` は ★0 行**（★kimny 実行 2026-09-23 10:59 JST・★台帳 (1w)）。★★**この 0 は「需要ゼロ」でなく ★未計測**——★`MASTERCHAIN_INTEREST_LIVE=false` で ★insert の手前で return・★撃つ UI も 0 件 ∴ ★誰にもフォームが出ていない。★**「潜在的な有料顧客」の分母に この列を使わない**（★使えるのは /muedsp の GA4 到達・無料 3 本の DL 実数）。★★**conductor は 再起動（Opus 5.5）して ★引き継ぎ便を送ってきた ＝ ★この status と矛盾なし**（★EULA の順序を コードで照合済・★便に無かった env の真値 `"1"` を補った＝(1x)・★返信不要）。 ★**script は #1093 → `7d26c9a8` で main に着地**（★CCO PASS・★日付は "(UTC date)" 表示・★main でそのまま `npx tsx scripts/count-masterchain-interest.ts` が打てる・★台帳 (1w)(1x)）。 ★★**P-4 は本番着地済み**（#1086 → `0274be24`・deploy READY・alias に `mued.jp`）。★本番の 307 は ★門の証拠で 面の証拠ではない ∴ ★弁別は deploy の sha/alias（★(1t)）。★配布 URL は ★4/4 本 live 実測（★(1u)）。 ★**content課 通知＝開店の便に畳む**（★軽微・単独送信しない）。★**`inquiry` enum＝form の回に同じ PR で**。


## blocked_by (W18) の退避（#1158 で 4 点とも済）

★★**(W18) EULA の本文を貼る PR（引き金＝conductor が仮 EULA か弁護士版の文面を確定）**: ★★9/30 の変換は conductor の main の draft（#3747 merge 後・第 3 条＝デモまたは期間限定の試用・禁止事項 2＝デモ・試用の制限の回避）を使う。★試用の条件の EULA 条項も 9/30 の確定と一緒に見る。 ★器は #1134 で main に着地（本文なし・noindex・EULA_LIVE unset）。★本文の PR で必ず同時に: ①★`EULA_VERSION`（lib/legal/eula.ts）を仮版の版文字列へ（★dsp の RTF は `2026.09`・★PENDING のままだと同意記録が本文を区別できない＝CCO 所見 A） ②★日英の比較を条ごとの blocks 数・list 項目数まで広げる（CCO 所見 B） ③★施行日は決まるまでキーを置かない（空文字列は i18n test が落とす） ④ draft の Markdown → messages は機械変換でできる（当課）。★merge は `npm run verify:pr-gate -- N --merge` のみ。


## blocked_by (W17) の退避（ロゴ・#1118・#1119・#1120・#1150/#1151 は済）

★★**(W17) 購入者のメール（9/24 conductor）**: ★ロゴ＝#1115 → 本番の URL 着地（sha256 一致）・conductor へ報告済。★#1118（特商法の動作環境・受付時間）＝ merge・★本番の 4 面で確認済。★#1116 は close（kimny 9/28「鍵はメールに載せない」）→ ★後継＝#1150（鍵はポータルだけ・Copy と license.key のダウンロード・conductor PASS）＋ #1151（利用規約と特商法・draft・契約の成立の定義は kimny 判断）＝★2 本を同じ deploy で merge。★連絡先はすべて support@mued.jp（kimny 9/24）＝#1119 merge・★本番 5 面で確認済。#1120（test が public/ も走査・Tier 1）→ CI 緑で merge。★content課への通知＝★置き便・★未送信（content課のセッションが無い）: ★文面は台帳 (2g)・★連絡先の変更は既に live ∴ 開店を待たず conductor 経由で渡す。★詳細＝(2f)(2g)。


## blocked_by (W22) の退避（PWA 5,000 は着地済）

★★**(W22・2026-09-29T18:41:51+09:00) PWA「5,000 まであと」＝着地済（gw-dash #137 merged 09:39:55Z・deploy 成功・deploy の URL で 3,966／18:37 JST を確認・kimny の本番の画面は未確認）。★残＝remaining_to_1000 とその test を消す PR（当課・次の funnel の PR に束ねる）。


## blocked_by (W0c) の退避（owner＝conductor / kimny・内容は不変）

★★**(W0c) 特商法の表示価格と FastSpring の商品価格を ★開店前に1回 突き合わせる**（owner＝conductor / kimny・★当課は dashboard を見られない）: ★値の正本は FastSpring 側の商品設定で、★activation 要件が「表示価格の一致」を含む。★詳細＝(1a)。


## blocked_by (W23) の経緯の退避

★★(W23) gw-dash の <hash>.gw-dash.pages.dev が Cloudflare Access の外で /api/conductor が 200（conductor の非公開 repo を返す）→ conductor が (c) を決定（2026-09-29T18:44）: (b)＝gw-dash #138（/api/* の middleware で hostname 完全一致以外は 403・CORS を本番 origin・Tier 3・head 603a9ea・CCO レビュー待ち・merge は conductor）／(a) Access を preview にも＝kimny（conductor から依頼）。★#138 merged（conductor・b640defb）→ 2026-09-29T18:49 測定: 新 deploy fbcf4d36 の /api＝403・過去 85750568＝200・本番＝302 → conductor へ報告済。★残＝Access を *.gw-dash.pages.dev に（kimny）→ 入ったら 85750568 の / と /api が 302 になったことを当課が curl。他の file の中身は読まない。★CCO（2026-09-29T18:48）: #138 はコード PASS（bundle した worker で hash の host は 403・本番は handler へ）。ただし ①過去の hash URL の /api は今も 200 ②hash URL の静的 JS bundle に conductor の非公開文書（src/data/conductor の ?raw import と deploy 時の取り込み）＝403 では閉じない → どちらも閉じるのは (a) Access を *.gw-dash.pages.dev に（kimny）。CCO が conductor へ報告済。
