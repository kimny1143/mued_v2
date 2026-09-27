# status.md 退避（2026-09-27）

6,000 バイトの注入 cap を超えたため、下記フィールドの末尾をそのまま移した。

## current_task（末尾）

★★**(AG) 2026-09-23 午前 ― ★#1094（(1w) 台帳・Tier 1）と ★#1093（script・Tier 2・CCO PASS）を merge。★conductor の再起動便を一次で照合し ★EULA env の真値 `"1"` を補った。★memory 索引を 190→107 行に畳んだ（リンク 130/130）。★手番は 0 件のまま・★台帳 (1x)。** ★★**(AF) 2026-09-23 ― ★P-4 着地 ＋ ★版の道筋の確定。★当課の手番は 0 件で ★EULA 待ち。** ★★**着地 6 本**: #1086（P-4・Tier 3）／#1087 (1t)／#1088 (W15)／#1089（版 guard）／#1090 (1u)／#1091 (1v)。 ★★**この日 測って分かったこと 3 つ**: ★① 指定された「307 → sign-in」は ★陰性対照も同じ値 ＝ ★弁別力ゼロ（★門は測るが 面は測らない）∴ ★deploy の sha/alias に撃ち直した。★② 姉妹 test が ★実定数を mock していて ★dsp の版が変わると ★版だけ静かに消える経路が開いていた（#1089 で塞ぎ ★meta-RED 3/3 赤）。★③ 配布 URL は ★4/4 live（★`200` でなく ★`xar!` ＋ size ＋ 陰性対照で判定）。 ★★**自分の計器の失敗（同日 3 度目の同型）**: ★meta-RED の注入を ★分岐の★通らない側に撃ち ★値が変わらず緑。★★∴ ★no-op は「file が変わらない」でなく ★**「観測される値が変わらない」**（★memory に反映済）。 ★★**引き金が 同じ日に 2 度 動いた**: ★無料 3 本を EULA 前に配信 → ★kimny 訂正「EULAは次回のユーザーリリースで全ての製品に反映する。無料も有料もだ。」∴ ★4 本まとめて。★(W15) は ★1 本に畳んだ（★2 本持つと片方が古くなる）。 ★**(AC)(AD)(AE) は `docs/status-archive/2026-09-23_current-task-ac-ae.md` へ退避（★byte 同一を確認済）。★手番の正本＝`docs/status-blockers.md` (1l)〜(1v)／★教訓の型＝memory。**

## blocked_by（末尾）

★★**(W2d) 監視のみ**: ★再評価の引き金＝`next.config.ts` に images/formats が入る変更（★本文＝`docs/status-archive/2026-09-23_blocked-by-w2d.md`・(1f)）。 ★★**(W14) #1062 は 1.0.0 前提で作り直し＝(W15)**（★旧 head の受け入れ記録＝`docs/status-archive/2026-09-23_blocked-by-w14.md`）。 ★★**(W12) FastSpring: ②③④ は完了（(2c)〜(2e)）。★残り＝⑤ live storefront env（kimny）→ EULA・1.0.0 → ⑥ kimny の本番購入で ★貼り付け → LICENSED**。旧記述＝`docs/status-archive/2026-09-23_blocked-by-w12.md`・`docs/status-archive/2026-09-24_blocked-by-w12.md`。 ★★**(W6)(W10)(W11) 退避＝`docs/status-archive/2026-09-26_blocked-by-w6-w10-w11.md`**（他者待ち・決着済・追跳下。正本は conductor 台帳／`docs/status-blockers.md`）。

