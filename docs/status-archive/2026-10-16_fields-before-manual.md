# status.md の欄から退避（2026-10-16T10:52:30+09:00）

逐語。

## current_task（退避）

★★**(2026-10-14T07:49:06+09:00) MUEDvox の LP の聴き比べのプレイヤー（#1281）は本番に出た（abd26432・10/14 07:45 JST・kimny がこの窓で「マージして」「1281マージ」）。本番の /ja/muedvox・/en/muedvox を実ブラウザで確かめた: Sample #1（001・20 秒）と Sample #2（003・kimny が切った区間・26.3 秒）・注記は「Before と After は同じ音量に揃えています。」の 1 文だけ・曲名と Suno は 0 件・2 曲とも 4 通りの切り替えが鳴る・配られている mp3 8 本は repo の file と同じ。音の出所は lp/audio-final-20261014-rev4。開いている手番は無い＝conductor の次の依頼待ち。**

★★**(2026-10-13T23:51:45+09:00) MUEDvox 1.0.0 は 10/13 の夜に発売した（kimny がこの窓で「MUEDvox を今夜開ける。」）。告知（名簿・SNS・外報・/muedsp の link・llms.txt）は約 1 週間後（仮 10/20）で、まだ出していない。10/13 の夜に main に入った 3 本（どれも kimny がこの窓で直接言ってから script で）: #1275 発売（flag 3 つ・表の enabled・配布物 2 つ・画面の絵・EULA 2026.10.1・/licenses の MUEDvox・特商法・preset の FAQ・無署名の 1 文・a96594a4）／#1277 ポータルの MUEDvox の購入の行の崩れの直し（左の絵が無く文が 96px の列に入っていた・c3c0bdc6）／#1276 テスター向けの期限つきの MUEDvox の鍵（admin の画面 /dashboard/admin/license-grants・表 plugin_license_grants・ポータルの「テスト用ライセンス」の行・282654c6・migration 0064 は kimny が適用済み）。kimny の確認購入（live・注文 k6D9k0AHQ6GhSBNat7KvFg）: webhook → 鍵 → ポータルの行 → plug-in の LICENSED → 購入メール（Mac と Windows の 2 つ・無署名の 1 文）まで実物で通り、全額返金済み。開いている PR は #1247・#1062 だけ（どちらも前から）。**

## next_action（退避）

★★**(手番 2026-10-14T07:49:06+09:00) ⓪ LP の試聴（#1281）は本番。残り: kimny の耳・Safari・Firefox・iPhone（誰も見ていない）／003 の末尾の fade 20 ms（耳に付けば scripts/muedvox/encode-lp-audio.sh）。★曲名は画面にも記録にも書かない（kimny 10/14・番号で呼ぶ）。発売の後の PR＝CCO #1281 の注記（LP の字の試験・曲ごとの長さ・再生の端）。**

★★**(手番 2026-10-13T23:51:45+09:00) ⓪（2026-10-14T00:46:34+09:00 更新）テスターの鍵は kimny の確かめで通った。kimny が 3 人に 14 日の鍵を出し（期限 2026-10-27 15:40 UTC）、個人のメール 3 通を送った。決まり: 最初 14 日・切れる前に感想をくれた人に ＋30 日（kimny が admin の画面で）・招待制・テスターの募集は 10/14 以降・発売の告知は約 1 週間後（仮 10/20 17:00 JST）。admin の画面で使いにくい所が出たら直す。① 発売の後の PR（急がない・束ねる）: lib/masterchain/internal-orders.ts に確認購入（k6D9k0AHQ6GhSBNat7KvFg・Vercel の log の issued と return の行と突き合わせてから）／CCO の注記＝「表の行を無効にすると鍵が出ない」の試験を足し直す（#1275 注記 1）・特商法の MUEDvox の行と /licenses の MUEDvox を試験で固定（注記 3）・third-party.ts の古い注釈（注記 4）・admin の page の関所の試験・鍵の自己検証・email の制御文字（#1276 注記 1・2・4）／購入メールとポータルの「Paste license key」を MUEDvox の小窓の語（Paste from clipboard）に（VOX に語を確かめてから・文の承認が要る）／ポータルの Windows の説明が MUEDvox でも「ベータ」と出る／funnel の発売の数。② 告知の日の PR（仮 10/20）: /muedsp の 1 行の link・llms.txt の行・content課への canonical 通知・top の製品の棚。③（決まった・2026-10-14T01:02:08+09:00・kimny が conductor に任せ conductor が決めた）特商法の「メモリ 8GB 以上（16GB 以上推奨）」は MUEDvox にもそのまま掛ける・文は変えない（VOX が 1.0.1 で測って 8GB で足りなければ直す）。★旧 EULA 2026.10 をサイトで読めるように残す: /eula の末尾に「以前の版: 2026.10（2026 年 10 月 1 日）」／"Previous version: 2026.10 (October 1, 2026)" の link を 1 行・旧版のページは noindex・英語の正文と日本語の参考訳・2026.09 も同じ形で足せるなら一緒に（手間が大きければ 2026.10 だけ）＝Tier 3（CCO と conductor）・発売の後の PR で。④ 見た目: スマホ幅の MUEDvox の絵・masterchain の行の絵が MUEDsat（決めてもらえば直す）。⑤（済・#1286）⑥ 売り場を急いで閉じる時: MUEDVOX_PURCHASE_LIVE と MUEDVOX_DEMO_LIVE を一緒に false（検査がデモだけを止める）・最も速いのは kimny が FastSpring で muedsp-vox を非公開に。⑦ merge の道具と条件＝memory feedback-merge-only-through-the-repo-gate（本番に出る merge は kimny がこの窓で直接）。**
