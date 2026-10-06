---
peer: mued
department: product
activity: active
status: active
current_task: ★★**(2026-10-07T01:11:41+09:00) 10/6 の依頼はすべて本番（kimny の許可・CCO PASS・gate）。いま走っている PR は無い。** 本番で実測済: #1238 カートの形式に「／Windows · VST3」・購入者をお知らせ（MUEDSP_AUDIENCE_ID）へ＝カートの告知＋marketingConsent true の注文だけ・照会してから追加・配達メールの後に各 3 秒で打ち切り。#1239 source-map-js 1.2.2（監査）。#1240 /muedlim に masterchain の 1 行（?from=muedlim-lp#demo）・3 つの無料 LP からチェック欄の句を削除。#1241 /learn 10 本の CTA 2 行（?from=learn-<slug>）。#1242 外報の画像 4 枚を固定 URL（https://mued.jp/press/masterchain-1.0.1_screen_{2x,1x,16x9_2x,16x9_1x}.png・変えない・消さない）。#1243 masterchain の画像を LICENSED の画面に（4 か所）・「（デモ）」削除。★内部リンクに UTM を付けない（GA4 の流入元を上書きする）＝?from=。★客の経路は sales-impact・守りは guard-change・承認文は copy-approval。
next_action: ★★**(手番 2026-10-07T01:11:41+09:00) ① 依頼待ち。** ② content課の canonical 通知（blocked_by の W26・セッションが居ない）。③ 10/8: Chief の計測（/muedlim・/learn の organic 着地 → from= 付きで /muedsp → デモ／購入）は conductor 経由。④ #1208（Cookie の同意）は 10/8 の集計の後に kimny の許可で。#1062 は開店後。⑤ 次に守りを触る PR で HTML コメントの中の行を数えない（W34）。⑥ 最初の新しい購入で、購入者が MUEDsp のお知らせに入ったかを Resend で 1 回確かめる（buyers リストの env は本番で未確認＝無ければ warn だけ）。⑦ MUEDvox 発売の PR: 表の muedvox 行・muedvox.* を G3・EULA・特商法・Buy（BUY_BUTTON_CLASS・カート）・デモ・鍵の画面（MUEDvox のプラグインの Buy URL＝/{en,ja}/muedvox#buy・鍵＝/dashboard/plugins を伝え済）。★merge は gate だけ。本番に出る PR は kimny の許可。★status は中身の PR と分ける。
blocked_by: ★★**(W34・2026-10-04T12:28:19+09:00) gate の 3 つの行（sales-impact・copy-approval・guard-change）は HTML コメントの中の行も数える**（CCO #1229 の注記）＝`<!-- guard-change: … -->` だけで ok になり、画面では見えない。次に守りを触る PR で withoutFences と同じ所で <!-- --> も除く（guard-change 行は kimny の承認が要る）。** ★★**(W32 閉じた・2026-10-02T00:32:46+09:00) #1207 は本番に出た（22:27 JST・ja/en の新しい文あり・旧文 0 件・どの deploy で出たかは未確認）。** ★★**(W33・2026-10-01T22:19:20+09:00) #1208 Cookie の同意は 10/8 の後に merge**（発売の 7 日集計の連続性・conductor）。** ★★**(W30・2026-10-01T14:54:22+09:00) ポータルの masterchain の Windows のボタンは本番で未確認**（購入者でないと見えない・今ある購入は kimny の確認購入 1 件で返金済み＝ボタンを出さない行）。★最初の本当の購入が入った時に、購入者の画面で「Windows 版」のボタン・同じ鍵の注記を確かめる（conductor 10/1）。コードは test 済み（windows-launch-prep）。** ★★**(W31・2026-10-01T14:54:22+09:00) masterchain の Windows の倍率の切り替え（開いたまま 50→100→150→75）は未確認のまま出した**（kimny 逐語「いや、もう縮尺はいいから。デプロイすすめて」）。効かない報告が来たら PLUG_HOST_RESIZE 1＋ConstrainEditorResize で新しい zip（lib/masterchain/config.ts の注釈）。** ★★**(W28) 閉じた: 発売便は 2026-09-30T22:13:13.198Z に送信（07:13:06 の queued は送信の直前）。**（created 21:54:16Z・sent_at null・07:13 JST に 2 回確認）。送信の操作は kimny の手番。LAUNCH_AT はこれ待ち。** ★★**(W26) content課への canonical 通知が未送信**（セッションが居ない・2026-10-07T01:11:41+09:00 も ListAgents に content課なし）。送る内容（10/6 分を追加）: カート（#1231・EULA はボタンの文で同意）・形式に Windows VST3（#1238）・購入者をお知らせへ（#1238・カートで告知）・masterchain の画像が LICENSED の画面に（#1243）・外報の画像の固定 URL（#1242）・/muedlim と /learn から masterchain への導線（#1240・#1241）・無料 LP のチェック欄の句を削除（#1240）。以前の分: EULA 2026.10・返金ポリシー・masterchain 1.0.1（keyentry の版）・MUEDsat 1.0.1（THD の実測・画像）・FAQ q11・購入の開始と購入の流れ（#1191）・llms.txt（#1188）・案内メールの言語（#1193）・鍵の入れ方（ドロップが主）。** ★★**(W29) 返金で本番未確認の形: partial・chargeback・「作成」の後の Cancel**（台帳 2a）。#1197 以降、completed でない return.created は記録だけ（processed＋注記）＝最初の 1 件で、Confirm の後に別の event が来るかを照らす。** ★★**(W27) サポートの注意: 同じファイル名の版が複数（/downloads/・ui-2026.10・keyentry-2026.10）。見分けは URL。** ★★**(W0c) 特商法の表示価格と FastSpring の突き合わせ（conductor / kimny）。** ★★**(W22) remaining_to_1000 の削除（次の funnel PR）。** ★★**(W16) 【保留】有料 final の R2 URL。** ★★**(W15) 版の parser の 1 本化。** ★★**(W0b) 旧版の file を消さない。** ★全文＝退避ファイル。
urgency: low
action_owner: peer
deadline: null
expected_next_check_at: null
last_update: 2026-10-07T01:11:41+09:00
evidence: #1207 merged 487bae6b（13:05:04Z）・本番の /ja/privacy・/en/privacy で NEXT_LOCALE・2026-10-01 を確認、旧文 0 件（22:27 JST）。#1208 head 4d734ff9・CCO review 5379897935（PASS・条件つき）。#1206 merged（09:39:04Z）。Resend の audience 1,087 件（09:21Z 取得・funnel の値と一致）。
confidence: high
lane: delivery

---


## Recent events
- 2026-10-07T01:11:41+09:00 10/6〜7: #1238・#1239・#1240・#1241・#1242・#1243 を merge（各 kimny 許可・CCO PASS）・本番で実測。10/1 の購入者はリスト内（7/15 から・発売便をクリック）＝Chief に返答。
- 2026-10-04T22:18:42+09:00 10/4 夕: #1232（スマホの商品行・本番で実測）・#1233（その試験・陽性対照で赤を確認）を merge。peer-checkout（kimny 休み・未保存 0・push 済み）。
- 2026-10-04T14:10:58+09:00 10/4 午後: 実購入 2 行とも eula_version・eula_accepted_at あり（本番 DB を 1 回読み・kimny 承認）。#1231（カート）を merge・本番で実測。スマホの商品行を Chief (c) で直す PR を出した。
- 2026-10-04T12:28:19+09:00 10/4 昼: #1229（guard-change 行・CCO PASS・kimny「認める・通ったら merge」）を gate で merge。#1228（status）を merge。status.md の Recent events 66 件（8/1〜9/21）を docs/status-archive/ へ退避（144KB→約 11KB）。
- 2026-10-04T11:27:53+09:00 10/4 昼: #1227（購入ボタンだけ #ffbe3d＋glow・kimny 決定・CCO PASS・kimny 許可）を gate で merge・本番で色を実測。#1229（guard-change 行）を出した。
- 2026-10-04T10:58:09+09:00 10/4 朝: #1222（G2）・#1223（G3）・#1224（G1）を gate で merge（kimny の許可「順に merge してよい」・各 head で CCO PASS・main 向け CI の log で該当の試験が走ったのを確認）。#1222 は base 変更前に push して Test が走らず、reopen で同名の check-run が重複して VOID→同じ tree の 1 commit にして出し直した。購入ボタンの色（#1227）を出した（D4 の mock と比べて購入の領域は最大 Δ3/765・デモは 0）。
- 2026-10-04T04:25:25+09:00 10/4: kimny 直命で、ボタン（#1220）・チェック欄を外す（#1221）・売る経路の仕組み G1〜G4（#1222〜#1225）の PR を出した。CI の sales-path job は自前の runner で 10/10（Clerk の偽の key は pk_live_ の形が要る＝実測）。
- 2026-10-04T01:29:28+09:00 10/4 夜: #1216（CCO PASS）・#1218（conductor のコード PASS）。muedsp-vox のストアの path を本番で実測・#1214 が本番に入っていることを Vercel で確認・dsp: masterchain は鍵ファイルの名前を見ない。checkout。
- 2026-10-04T00:59:53+09:00 10/4: #1214 merged（kimny 許可・本番 c75d7cc2 READY を Vercel で確認）・#1216（MUEDvox の staged ページ・Codex が書き当課が直した）を出した・MUEDvox の鍵の値が確定（product=MUEDsp・scope=muedvox）・muedsp-vox を本番のストアで実測。
- 2026-10-04T00:11:48+09:00 10/3〜10/4: MUEDvox の発売の準備に着手（kimny 直命）。#1214（有料の製品の振り分け・Tier 3）を出した。本番 DB の webhook_events を items の形だけ読んだ（kimny の許可）。10/2 の「cron が起動しなかった」は誤りで、6 時間遅れて走っていた（conductor に訂正）。
- 2026-10-02T12:22:17+09:00 10/2 午前: #1211 merged（メールタブの自動化・gw-dash #143 が先）・cron が起動せず dispatch 1 回（03:15Z・success・newsletter file と funnel 10/1 分を publish）・チェック率（新しい人 0/15）を conductor へ。
- 2026-10-02T00:32:46+09:00 10/1 夜: #1206（掲載の効果: 購読が止まったのは #1166 の opt-in・過去の掲載は毎回 +119〜150/週・BPB の 7 月の読者は戻らない）・#1207（privacy 第 6 項・本番で確認）・#1208（Cookie の同意・draft・10/8 の後）・#1209。

> 2026-09-21 以前の Recent events（2026-08-01〜2026-09-21・66 件）は [`docs/status-archive/2026-08-01_2026-09-21_recent-events.md`](docs/status-archive/2026-08-01_2026-09-21_recent-events.md) へ退避（逐語・行数と行 diff で全数 verify）。★status.md が 50KB を超えたら再退避。

## Notes

- **Sprint#001 全funnel接続済み**: Threads bio UTM → dial top (PR#397) → readiness → qualified → waitlist (PR#400, #401) → green sign-in CTA (PR#396) → mix_diagnosis
- **SNS課 h190-h196**: 5/29 09:00 JST〜6/4 manual dispatch GO。bio UTM完納
- **Phase 2 Gate Day 3**: 5/29-30 data課スナップショット待機。threads bio UTM完全反映ポイント
- **Phase 2 Gate Day 2 (5/27)**: active_users=0 (全campaign)。主因: GA4 24-48hラグ + SNS bio UTM未着手。conductor (b) defer推奨。5/28-29 SNS bio UTM完納 → Day 3 (5/29-30) 再Gate
- **PR #84 (data課)**: Phase 2 Gate GO後 + INTERNAL_API_KEY取得後にmerge。現在defer中
- LP課 FAQ AIO review: **🎯🏆 1000件LIVE達成！(PR #506-529全merged)**。PR #532-543+#544レビュー完了。LGTM 10件・BLOCKER 3件(#532/#533/#536)。**通算BLOCKER 39件**。1036件LIVE見込み(BLOCKER修正後)
- **GA日程公表禁止ルール (PR #485 evidence)**: 「具体的な時期は公表されていません」が確立方針。英語翻訳部分の「(~November 2026)」「(until approximately November 2026)」「(planned until November 13, 2026)」「(through 2026-11-13)」= BLOCKER
- **新BLOCKER Rule (PR #463 evidence)**: UIジャンル選択肢は**11種類**のみ。「Country」はUI上に存在しない (country→ACOUSTIC内部マッピング)。"12種類"や"Country"の表記=BLOCKER
- **Rule: 内部RoExキー名NG** (UI表示名との不一致BLOCKER): Pop/Electronic/Acoustic/Metal (UIラベル) vs POP/ELECTRONIC/ACOUSTIC/METAL (内部キー) — FAQ表記はUIラベル統一
- **MUEDial i18n確認**: `lib/i18n/locale-context.tsx` = 'en'|'ja' 両対応。"日本語のみ" 断言BLOCKER (Q402で検出・修正済み)
- **Rule 14 (indirect mapping "最適化"NG拡張)**: jazz→OTHER / rnb→POP / country→ACOUSTIC は"考慮したAIミキシング処理"/"考慮した処理"が安全。**"考慮した最適化"もBLOCKER** (Q477/Q478 NNNNN確定)
- **Suno/Udio FAQルール**: "WAVステムを準備できる場合に限り" 条件付き必須 (Q362 + Q536 evidence)
- **LUFS断言ルール**: Spotify/Apple Music/YouTube/Tidal/Amazon/Broadcast/Podcastのみ断言可。TikTok/Instagram/Xはhedge必要
- **waitlist即時アクセス確認**: `lib/storage/waitlist-blob.ts` = Blob存在確認のみ、手動承認なし → 断言OK
