# status.md の欄から退避（2026-10-17T21:44:19+09:00）

逐語。10/17 の本番（#1291・#1296・#1294）で古くなった手番。

## current_task（退避）
★★**(2026-10-15T08:10:08+09:00) PR 3 本が開いている（どれも merge は kimny がこの窓で）。#1289 $69 固定・セールなし（CCO PASS・kimny の言葉待ち）。#1291 MUEDvox 1.0.1（VOX の pkg 8963c516…・zip 4e32c98b…）＋サイトの EULA 2026.10.2（英は dsp 2fd3df69 の byte の写し・日の第 6 条は当課の訳＝kimny は未見・conductor が merge の時に見せる）＋EULA_VERSION 2026.10.2＋体験版の新しい文（LP・フォームの注・FAQ・控えのメール・日英）。VOX の step 4 は通った（conductor）。conductor (a): masterchain 1.0.3 の配布物をこの PR に足してから merge（10/17 12:00 JST までに来なければ (b)・その時は第 6 条と 1.0.2 の食い違いの扱いを conductor に聞く・EULA の文は変えない）。#1292 masterchain の期限つきの鍵（GRANTABLE_PRODUCTS に masterchain・既定 MUEDvox・90 日・画面の文）＝CCO 待ち。**

## next_action（退避）
★★**(手番 2026-10-16T10:52:30+09:00) ⓪ #1292: kimny が preview の /dashboard/admin/license-grants（muedv2-git-feat-masterchain-license-grants-glasswerks.vercel.app）で A（10 分）・B（2 日）を出す → .key の path だけ conductor へ → DSP の確認 → kimny の言葉。① #1291（1.0.3 を足して CCO 再レビュー）→ 同じ日に #1294（conductor の順）。② MUEDvox 1.0.2: VOX の「pkg と zip ができた」で 1 本の PR＝配布物の差し替え＋マニュアルを eaf37abe（後の commit を言われたらそれ）から git show で写し sha を直す（en cada0269…・ja 8ca90ac2…＝shasum -a 256・10/16 10:51 JST・その commit だけの値）。それまで #1294 は 1.0.1 の文のまま。③ #1289 は kimny の言葉待ち。**

## next_action（退避）
★★**(手番 2026-10-15T08:10:08+09:00) ⓪ #1292: CCO PASS → conductor に preview の URL と /dashboard/admin/license-grants を送る → kimny が preview で A（masterchain 10 分）と B（2 日）を kimny 自身のアドレスに出す（本番の書き込みの許しは kimny「良い。進めて」10/15 のこの 2 本だけ）→ .key の path だけを conductor へ（中身は書かない）→ DSP の確認 → kimny の merge の言葉。メールの文は conductor が docs/drafts に書く（PR に入れない）。① #1291: dsp の masterchain 1.0.3 が来たら足す＝pkg/zip・lib/masterchain/config.ts・試験の表・masterchain の体験版の文（控えのメールの limits の行 masterchainDemoDownload・/muedsp の注）・★mc-buy と mc-trial の行（lib/short-links/table.ts）に注釈「utm_content demo_expired＝体験版の幕の Buy（1.0.2 は期限切れ・1.0.3 は抜け）・名前は変えない」→ CCO の再レビュー → CI 1 回 → kimny の言葉。② #1289 は kimny の「1289 merge」待ち（copy-approval の行を足して gate）。**
