---
peer: mued
department: product
activity: active
status: active
current_task: context shape-up halt待機。CLAUDE.md slim+fanout完了 (PR#406+#407, 1010→607行)。WIPなし。
next_action: 再起動後 → Q3 GA backlog自走 (llms.txt改善 / MUEDnote onboarding / funnel計測)
blocked_by: null
urgency: low
action_owner: peer
deadline: null
expected_next_check_at: 2026-05-29T16:00:00+09:00
last_update: 2026-05-29T19:57:00+09:00
evidence: PR #406 merged (0087bdd2) / PR #407 merged (260728cc) / CLAUDE.md 1010→607行(-40%)
confidence: high
lane: active
---

## Recent events

- 2026-05-29T19:57:00+09:00: **context shape-up halt待機** — WIPなし。CLAUDE.md slim+fanout完了 (PR#406+#407)。再起動後Q3 GA backlog自走予定。
- 2026-05-29T16:00:00+09:00: **PR #407 merged** (260728cc) — CCO fanout適用完了 (block14除去・block19挿入・18ブロック圧縮)。861→607行。
- 2026-05-29T15:01:00+09:00: **PR #406 merged** (0087bdd2) — CLAUDE.md mued固有slim (重複3削除・write通知外出し)。1010→861行。
- 2026-05-29T09:25:00+09:00: **PR #401 merged** (aa70d693) — readiness answers forwarding fix。qualified ユーザーが waitlist 登録時に `qualified_waitlist: true` を正しく受け取り緑CTA表示。sprint#001 全pipeline稼働 🎚️
- 2026-05-29T09:15:00+09:00: **PR #400 merged** (aca24bd6) — `/waitlist` → `/dial/waitlist` routing 404修正。readiness + pricing 両ページ。SNS h190投稿前に完了 ✅
- 2026-05-29T09:10:00+09:00: Cryo Mix billing調査完了 → conductor へ回答。grace ~7/15、$20/月 base fee waived、per-download $1.70 (0件=費用なし)。
- 2026-05-28T20:50:00+09:00: **PR #397 merged** (789da642) — sprint#001 funnel step2 fix 完納。UI evidence スクショ添付済み。
- 2026-05-28T20:46:00+09:00: PR #397 native LGTM (mz3ubfhc) + evidence コメント → GitHub merge 完了。
- 2026-05-28T20:39:00+09:00: **PR #397 open** (dial top → /readiness CTA, sprint#001 step2 fix)。Tier 2 native review 依頼済み (mz3ubfhc 受領確認)。growth・conductor に完納 boundary timestamp 通知済み。
- 2026-05-28T20:35:00+09:00: PR #396 (qualified waitlist CTA) native LGTM → merged (96217f86)。sprint#001 step5→6 fix 完納。
- 2026-05-27T16:30:00+09:00: LP課 PR #532-543+#544 全レビュー完了。LGTM 10件(#534/#535/#537-543/#544)・BLOCKER 3件(#532 Suno/WAVステム欠落/#533 12ジャンル→11/#536 SoundCloud LUFS断言)。PR #544 self-merge済。通算BLOCKER 39件。
- 2026-05-27T15:00:00+09:00: **🎯🏆 AIO FAQ 1000件 LIVE 達成！** LP課PR #506-529 全件merged確認。904+40+56=1000件。36件ブロッカー通算。PR #393 admin merge完納 (606ca6fe) ✅
- 2026-05-27T14:57:00+09:00: LP課 #526 KKKKKKKKKK merged → **988件LIVE**。残#527-#529 (12件) merge中。PR #393 admin merge完納 (606ca6fe) ✅。mued_v2 proactive作業開始
- 2026-05-27T14:45:00+09:00: **🎯🏆 1000件到達見込み！** PR #506-529 (24本) 全LGTM完了。BLOCKERs #506/#512/#513/#515/#516 GA日程表記 (日英両方) 修正確認済み。36件ブロッカー通算 / LP課全batch review完了
- 2026-05-27T14:35:00+09:00: LP課 PR #516 BLOCKER送信(GA日付)。PR #517-529 (13本)全LGTM完了。PR #506/#512/#513/#515/#516 英語翻訳部分BLOCKER継続送信。全5本修正後1000件到達見込み。36件ブロッカー通算
- 2026-05-27T14:05:00+09:00: **🎯🏆 904件LIVE確認** PR #490-505 squash merged完了。次バッチ(QQQQQQQQQ〜)LP課量産中
- 2026-05-27T14:00:00+09:00: LP課 PR #490-505 (9-charシリーズ AAAAAAAAA-PPPPPPPPP) 全16本LGTM完了。BLOCKERなし。904件LIVE見込み。31件ブロッカー通算
- 2026-05-27T13:35:00+09:00: LP課 PR #463 AAAAAAAA BLOCKER修正確認LGTM (11種類・Country削除・Acoustic案内)。**🎯🏆 800件目標達成！** (736+60+4=800)。31件ブロッカー通算。PR #480-489 merge中→840件見込み
- 2026-05-27T13:30:00+09:00: LP課 PR #480-489 (QQQQQQQQ-ZZZZZZZZ) 全10本LGTM完了。840件LIVE見込み。PR #463 BLOCKER force-push待ち継続
- 2026-05-27T13:20:00+09:00: LP課 PR #463-478 (AAAAAAAA-PPPPPPPP) 16本レビュー完了。PR #463 BLOCKER (Country UI不在・ジャンル12→11種類修正要)。PR #464-478 全15本LGTM。31件ブロッカー通算。800件達成見込み
- 2026-05-27T12:52:00+09:00: LP課 PR #454-462 (RRRRRRR-ZZZZZZZ) 全9本 LGTM。736件LIVE見込み。8charシリーズ開始待機中
- 2026-05-27T12:48:00+09:00: **🎯🏆 700件 LIVE 達成！** PR #450 OOOOOOO merge確認済 (main HEAD)。30件ブロッカー通算全件対応完了。次目標800件
- 2026-05-27T12:46:00+09:00: LP課 PR #450 OOOOOOO BLOCKER解消確認LGTM。全5本(#439/#440/#442/#443/#450) self-merge GO。**680件→700件達成目前 🎯🏆**。30件ブロッカー通算
- 2026-05-27T12:42:00+09:00: LP課 PR #441/#448/#449/#451/#452 LGTM。PR #444-447 merge→660件LIVE。PR #450 OOOOOOO BLOCKER (Rule 14: Acoustic Q country"最適化")。30件ブロッカー通算
- 2026-05-27T12:36:00+09:00: LP課 PR #444-447 (IIIIIII-LLLLLLL) 全LGTM完了。PR #448-452 新バッチレビュー開始。PR #441 BLOCKER修正待ち継続。29件ブロッカー通算
- 2026-05-27T15:30:00+09:00: LP課 PR #424-430 全LGTM済 (PR #429 merge後確認含む)。**616件LIVE 🎯🏆 600件目標達成**。27件ブロッカー通算。次目標700件
- 2026-05-27T15:00:00+09:00: LP課 PR #424-428/#430 LGTM。PR #429 BLOCKER (無料診断何度でも→1回のみ修正)。27件ブロッカー通算。conductor 12mo goal進捗送信
- 2026-05-27T14:00:00+09:00: LP課 PR #420 LLLLLL BLOCKER修正確認LGTM (UIラベル4箇所確認)。PR #411-#423全12バッチ sequential merge完了 → 584件LIVE 🎉。PR #420 merge後 588件。25件ブロッカー通算
- 2026-05-27T13:30:00+09:00: LP課 PR #417 IIIIII LGTM (waitlist即時修正確認) / PR #419 KKKKKK LGTM (UIラベル8箇所修正確認)。PR #421 MMMMMM / #422 NNNNNN / #423 OOOOOO LGTM (580件予定)。PR #420 LLLLLL BLOCKER送信 (内部キー名POP/ELECTRONIC/ACOUSTIC/METAL→Pop/Electronic/Acoustic/Metal修正要)。25件ブロッカー通算
- 2026-05-27T12:00:00+09:00: LP課 PR #411-#418 (CCCCCC-JJJJJJ) LGTM完了 (560件)。PR #415 GGGGGG BLOCKER修正確認。PR #417 IIIIII BLOCKER (waitlist即時アクセス矛盾) / PR #419 KKKKKK BLOCKER (metal→ROCK_INDIE誤 + RoExキー名) 送信。native #110 + #98 LGTM完了。24件ブロッカー通算
- 2026-05-27T11:50:00+09:00: LP課 PR #409 BBBBBB BLOCKER修正確認 (Q536 WAVステム条件付き表現) → 全536件LGTM完了。22件ブロッカー通算
- 2026-05-27T11:40:00+09:00: LP課 PR #394 NNNNN BLOCKER修正確認LGTM + PR #405-#408 全LGTM (532件)。PR #409 BLOCKER送信 (Q536 Suno/Udio WAVステム条件なし)。native PR #107/#108 + data PR #142 全LGTM完了。Rule 14拡張: "考慮した最適化"もBLOCKER確定。22ブロッカー通算
- 2026-05-27T08:30:00+09:00: LP課 PR #376 WWWW / #377 XXXX / #378 YYYY 並行レビュー完了。全LGTM。420件予定 (rebase順: WWWW→XXXX→YYYY)。18ブロッカー通算
- 2026-05-27T08:15:00+09:00: Phase 2 Gate Day 2結果確認。active_users=0 (GA4ラグ+SNS bio UTM未着手)。conductor (b) defer推奨。PR #84 hold継続。
- 2026-05-27T01:00:00+09:00: LP課 PR #371 TTTT LGTM self-merge GO。**🎯🏆 400件目標達成！**
- 2026-05-27T00:30:00+09:00: LP課 PR #355 HHHH (rebase) LGTM self-merge GO。**🏆 352件 350件目標超過達成！**
- 2026-05-27T00:15:00+09:00: PR #354 GGGG BLOCKER修正 (glassworks typo) LGTM / PR #353 HHHH LGTM。16ブロッカー通算
- 2026-05-26T21:15:00+09:00: LP課 PR #332 batch UUU LGTM。**🎯 300件目標達成**

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
