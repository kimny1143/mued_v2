# status.md から退避した blocked_by（正本）

> 退避日時: 2026-08-29T14:44:05+0900（`date` 機械生成）
> 出所: `status.md` の `blocked_by`。★注入3欄は 6,000 バイトで打ち切られるため、
> ★**近い手番が無く、内容が安定している項目**をここへ移した。★解消していない項目である。
> ★`status.md` 側には各項目1行のポインタを残してある（消していない）。
> ★**再び 5,500 B を超えたら、同じ手順でここへ足す**（cap は上げない）。

## (0i)

★★**(0i) 死んだガードが1本・削除か再配線か未決** — ローカル `validate-dangerous-ops-v2.sh` は★どの matcher からも呼ばれていない（live は template 側）。★**死重でなく罠**（追跡され・動く hook の隣・名前が `-v2` ＝ 強化する人が編集して何も変わらない）。★**詳細と手順の正本＝追跡下 `.claude/hooks/WIRING.md`**。

## (0g)

★★**(0g) smoke 行が本番に2件（★当課では消せない）** — `plugin_entitlements` の `source="smoke-test"` 2件。★**消すなら本番 write ＝ kimny の手番。放置可**（#905 の `source <> 'smoke-test'` 述語で集計から外れる）。★**正本＝insight課 `reports/plugin-funnel-automation-design-20260718.md` §10**。

## (0c)

★★**(0c) merge だけでは main の CI は走らない**（push trigger を 7/29 に外した・課金削減）。∴ ★**landing のたび `workflow_dispatch` を叩くか schedule（毎日 21:32Z）を待つ。★待つと赤に最大 24h 気づかない**。

## (0)

★★**(0) `BYPASS_UNTIL = "2026-08-09"` は期限切れのまま**（`scripts/verify/audit-prod-deps.ts:35`）。∴ ★**次に registry (B) が落ちたら全 PR が即停止**。★**今は API 生存＝手を入れない**（トリガー未到来で構造を変えるのは投機）。★**選択肢2つが食い違ったまま・conductor 保持**。

## (0b)

★**(0b) guard 配線に構造的な論点が1件（★開・詳細は非追跡 `docs/engineering/guard-posture-private.md`）**。**現況は確認済**。★**手番=当課／conductor と要相談**（選択の記録が当課に無い）。

## (0)

★★**(0) SLOT-2（masterchain 販売URL）＝特商法の販売URL 行 + 共通欄 (b) 移行は、★発売日に実行する**。★**日付でなく事象で書く**（型＝[[feedback-schedule-by-event-not-date]]）。★**freee 特商法 draft §9 に「この日付は他と別物」が明記済＝触る前に読む**。★**買えない製品の販売URL が法定表記に載る**のが本件。

## (4)

★**(4) masterchain の律速は kimny** — ★**正本＝MEMORY.md セッション引き継ぎ（毎回 注入）**。★**C1 parse は実物と未突合＝形が違えば null で静かに失敗**。

## (0o)(ii) — 孤立した branch: `origin/docs/status-defer-decided`

> 退避日時: 2026-09-01T18:26:28+09:00（`date` 機械生成）。★2026-09-01 の memory 監査中に発見。

★**PR #557 は MERGED なのに、その branch には main に無い commit が 20本 在る**（その後 push されたぶん）。
★**9 file が main に一度も入っていない**:

```
docs/dial/cert-60pt-shakeout-runbook-20260622.md
docs/dial/cryo-phase-a-report-20260622.md
scripts/cert-drive-loop.ts
scripts/cert-find-drivable-sessions.ts
scripts/cert-provision.ts
scripts/cert-shakeout-observe.ts
scripts/cert-upload-stems.ts
scripts/cryo-phase-a.ts
scripts/cryo-phase-b.ts
```

★**「PR merged」を「中身が main に在る」と読まないこと**——これが誰も気づかなかった理由。

**測り方**（再確認する時）:

```
git merge-base --is-ancestor origin/docs/status-defer-decided origin/main   # ★偽
git rev-list --left-right --count origin/docs/status-defer-decided...origin/main   # 20  374
git diff --name-only origin/main...origin/docs/status-defer-decided | while read -r f; do
  git cat-file -e origin/main:"$f" 2>/dev/null || echo "main に無い: $f"
done
```

**未決**: 拾い上げる / 捨てる のどちらか。
★**`scripts/cryo-phase-b.ts` は実購入（financial action）を行う＝Tier 3**。
★cryo memory（[[reference-cryo-phase-a-method]]）は所在つきで既に訂正済み。


## 2026-09-03T23:19:34+09:00 に退避（cap 超過 7,178B → 退避）

### (0l)

★**(0l) MUEDrive 告知 — ★決着**（一括付与は却下・#927 で導線が入った）。★**残 = conductor がテスト垢で「LP 入力 → 棚に増える」を1件 通す**（当課は「コード上は繋がっている」までしか言っていない）。★**表の意味は未確立**（lim の backfill script が main に無い・`source` は live 経路ではリクエスト由来＝provenance にならない）＝確定クエリは insight課 へ渡し済・実行は kimny gate。

### (0k)

★**(0k) 短リンク器 = ★#921 merged・本番着地済（sha `ebbdb8bb`）。★次は conductor の手番（表の移植）**。 ★**本番で確認できたのは「route が在る」までで、★307 を出した実績はゼロ**——表が空なので `verify:short-links` は rc=2（検査不成立）。 ★**弁別は `x-matched-path`**（`/l/[slug]` ⇔ 陰性対照 `/[locale]`・★両方 404）。 ★**移植を受けたら当課が本番へ verify → 307 を確認**（★行を入れて回すまで表の正しさは誰も知らない）。 ★**canary の utm taxonomy は insight課 PR #177 側＝conductor が照会中**。★**gate ⑤ = GA4 到達**（product 立ち会い・クリック前 0件の陰性対照を同じ回に）。

### (0j)

★**(0j) `git clean -x` が消す disk唯一 = 15件 2.32GB**（8/29 保全調査・★詳細の正本＝**PR #919 本文**）。★**未決2つ**: ①**off-machine の写しの要否＝kimny 判断** ②★**ロゴ `.ai` の出所が判定不能**（`kMDItemAuthors=null`）＝**kimny に1問**。



## 2026-09-05T09:48:40+09:00 に status.md `blocked_by` から退避

### (0q)

★★**(0q) locale が★実際に書かれるかの到達確認**（当課では測れない）。★**migration 0061 は kimny が 9/1 に本番適用済（★kimny 申告・当課は本番 DB を読めないので自分で測っていない）**、writer も #947 で merged。★**残るのは「本番で1件 subscribe が通った後に `locale` 列が埋まるか」**——★これは kimny か collector 側の手番。★**読み方の正本＝`lib/plugins/entitlements.ts` の docstring**（ja=正確 / en=上界 / 0061 前は NULL / 再 subscribe は埋め直さない）。

### (0o)

★★**(0o) memory 監査の★残2件**: **(i) 未索引 memory 26件**（★母集団は `ls memory/`）／**(ii) 孤立 branch 1本＝正本 `docs/status-blockers.md`**。



## 2026-09-10T11:37:37+09:00 に追記 — memory の file 参照 全数スイープ

### (0s) 完了 — 2026-09-16（索引なし ★13 → ★0）

★**母集団 120 file・索引なし ★0**（★陽性control 2件 indexed=True ／ ★陰性control＝存在しない名で False）。★**MEMORY.md の 122 link すべて実在。**

★★**13件を1件ずつ判定した。★索引を生やしたのは ★2件だけ。**

| 判定 | 件数 | 対象 |
|---|---:|---|
| ★**索引した** | 2 | `project-analytics-conventions`（★MUEDear 側イベントは別リポ＝★ここが唯一の記録）／ `project-muedsat-dl-launch`（★**indexed な2 memory が「詳細=」で指していた**＝★消すと dangling を作る） |
| ★**削除**（完了記録・★repo と git が既に記録している） | 10 | muednote-v1.1.0 / v1.2.0 / dashboard-v120-cleanup / dialMessages-tooluse-fix / hoo-v2-tasks / clerk-duplicate-users / free15-muedjp-promo / dial-reference-track-poc / ★**dial-subscriptions** / ★**mued-strategy-confirmed-20260426** |
| ★**畳んで型だけ残した** | 1 | dial-v2-player-decode-hang → ★新 `gotcha-dial-stem-url-must-be-task-scoped`（★初版は誤りを含んでいた——下記 (0u)） |

★★**削除10件のうち2件は「古い」のではなく ★★今日の事実と食い違っていた**（★索引なしの危険そのもの）:

```
★project-dial-subscriptions         … Basic $19.99 / Pro $34.99 / Studio $49.99 を ★live として記述
★project-mued-strategy-confirmed-…  … 「既存MUEDial維持: Basic/Pro/Studio プラン変更なし」
★★実測 lib/dial/pricing.ts … ★4 tier すべて deprecated:true（★code コメント「Retired as a purchasable tier (2026-07)」）
★★∴ recall が拾えば ★退役した価格を現在形として出す。★しかも索引に無いので ★誰も見つけられない
   ＝ pr-design-notes-20260416（★5ヶ月・価格誤り・索引ゼロ）と ★同型
```

★**削除の前に3つ測った**（★dangling を新規に作らないため）:
①★inbound `[[wiki-link]]`（★11件すべて 0 ／ ★muedsat だけ ★2 ＝∴ 削除せず索引へ回した）
②★repo 側からの参照（★2件 ＝ 下記 (0r) の行）
③★scratchpad へ全文 archive（★repo には入れない ——★ずれた行番号を repo に持ち込まないため・11 file / 52KB）

★**(0r) の行を2つ 訂正**: `components/features/landing-content.tsx` → `project-free15-muedjp-promo` ／ `docs/muedial/reference-track-poc.md` → `dial-reference-track-poc` は、★**9/10-11 に「註記」で閉じた**が ★**本日 memory ごと削除した**。
★★**∴ 註記は延命であって解決ではなかった** ——★**引用先の artifact が全部 消えていて、★かつ memory 自体が完了記録なら、★答えは「註記」ではなく「捨てる」。**

### (0t) — ★memory → memory の dangling `[[wiki-link]]` ＝ ★7件（2026-09-16 新規検出）

★**(0r) が memory→file、★(0s) が MEMORY.md→memory、★(0t) は ★memory→memory。★同じ機構の3面目。**

★★**11 hit のうち ★4件は grep のノイズだった**（★use と mention の区別が grep には付かない）:

```
★[[...sign-in]]      … Next.js の catch-all route path（`app/(auth)/sign-in/[[...sign-in]]/page.tsx`）
★[[link]] / [[…]]    … ★wiki-link の書き方 ★そのものを説明している散文
★[[既存 state 優先]] … CLAUDE.md 共通block の ★原則名（★file ではない）
★★∴ ★件数で閉じると ★引用を消して実例そのものを失う
   （CLAUDE.md「規則と例が矛盾したら例が勝つ」の ★但し書きと同型 ——★ヒットしたら1件ずつ開く）
```

★**genuine 7件のうち1件を解消**: `feedback_audio_output_kimny_judgment_required`（★inbound ★4）
→ ★**引用文そのものが規則を持っていた**（「audio correctness(出音)は kimny 判断領域」）・★**かつ live な正本は CLAUDE.md 共通block「キャラクター gate」**（dsp＝試聴／★最終判断は構造的に人間のもの）
→ ★**file を復活させず、正本を指す文へ差し替えた**（★4箇所・★差し替え後 0件を再測）

★**残 6件も同日に閉じた ＝ ★(0t) は 0 件**（★genuine 7 / 7 解消・★noise 4 は対象外）。

★★**閉じてみて分かった機序 ——★7件のうち ★5件は「消えた」のではなく ★CLAUDE.md 共通block へ昇格していた。**

| 死んでいた link 先 | 実際の所在（★2026-09-16 実測） |
|---|---|
| `feedback_audio_output_kimny_judgment_required` | ★共通block「キャラクター gate」（dsp＝試聴／最終判断は人間） |
| `feedback_design_to_native_exact_pixel_transplant` | ★共通block「UI モック忠実性 DoD」＋ `ui-mock-fidelity` skill |
| `feedback_mass_production_default` | ★共通block「量産が default」 |
| `feedback_peer_session_continuity` | ★共通block「稼働の前提」（dormant 自己宣言禁止／自己終了禁止） |
| `feedback_zero_kimny_manual_work` | ★共通block「peer self-judgment 境界（kimny 手動作業ゼロ原則）」 |
| `reference_pricing_canonicals_v2` | ★**当課に正本なし**（★値＝`lib/dial/pricing.ts`／形＝`reference-dial-pricing-shape`／★粗利率 policy は conductor・freee 側）→ ★link を落とし「この行が持つ写し」と明記 |
| `reference-muedlim-audience-resend` | ★**当課に正本なし**（★audience ID の正本＝Vercel env と Resend 側）→ ★同様に明記 |

★★**∴ 機序は「memory を消した」ではなく ★「memory の中身が block へ昇格した時、★inbound link が更新されない」。**
★**昇格は前進なので、★誰も壊れたと思わない** ——★**そして link だけが静かに死ぬ**（★退役が fail-silent なのと同じ向き）。

★**∴ 規律**: ★**memory の内容を共通block / skill へ昇格させたら、★同じ回に ★`[[旧名]]` を grep して指し先を block 名へ差し替える。**
★**差し替え先は file でなく ★block 名で書く**（★block は配布物ゆえ path が課ごとに違う・★名前なら腐らない）。

#### ★この検査には ★mention-allowlist が要る（★検査を書いた側が同じ回に踏んだ）

★**検出は `[[…]]` の grep** ∴ ★**use（実リンク）と mention（書き方の説明・placeholder）を区別できない。**
★**(0t) を閉じた直後、★当課は memory に ★`grep -rn '[[旧名]]'` という ★手順そのものを書き、★自分の検査に引っかけた。**

★**allowlist（★2026-09-16 時点・★全件 mention であることを1件ずつ開いて確認済）**:

| token | なぜ mention か |
|---|---|
| `...sign-in` | ★Next.js catch-all route path（`app/(auth)/sign-in/[[...sign-in]]/page.tsx`） |
| `link` ／ `…` | ★wiki-link の書き方 ★そのものを説明している散文 |
| `既存 state 優先` | ★CLAUDE.md 共通block の ★原則名（★file ではない） |
| ★`旧名` | ★**昇格時に撃つ grep の placeholder**（★上の規律の本体・★消すと手順が消える） |

★★**∴ allowlist は ★検査と同じ場所に置く。** ★置かないと、★次の回に ★**「dangling 1件」を "直す" ために
★正しい例を消す**（★CLAUDE.md「件数で判定すると引用を消して実例そのものを失う」の実演）。

★**未着手の候補**: ★この検査は毎回 手で組んでいる（★索引被覆・★index link 実在・★dangling link の3本）。
★**script 化すれば allowlist も一緒に version 管理できる** が、★`scripts/` への追加は ★code ＝ Tier 2
∴ ★**本 PR（Tier 1・docs のみ）には入れない。★次に memory 監査を回す回に、★script 化を先に判断する**
（★[[feedback-automate-before-writing-a-runbook]] の「手順書を書く前に自動化を問う」に該当）。


### (0s) 進捗 — 2026-09-12（第2便）

★**索引なし ★15 → ★13**。★**CLAUDE.md 共通block と重複する2件を畳んだ** —— `feedback-no-self-termination` / `feedback-continuous-operation-vocabulary`。

★**単なる重複ではなく ★memory 側の方が★粗かった**（★実測）:
```
★CLAUDE.md … 「★task区切り報告（「PR #X merged」）はOK、★session終了宣言と区別」
              「★『stand-by + observation継続』表現はOK、★self-promoted dormant はNG」
★★memory   … ★この区別を持たない（「終了表現を避ける」だけ）
★★∴ 粗い方が recall されると ★正当な区切り報告まで抑制しうる ＝ ★残す方が害
```

★★**併せて「型を status.md の『常設』行に置いていた」問題を直した。**

★**機序**: ★`status.md` は更新のたびに前へ足されるので、★**古い記述は毎回 末尾へ押し出される** ∴ ★**「常設」と自分で書いても、機構は常設を保証しない**（★注入は各欄 6,000 B で打ち切り）。

★**常設行を実測したら、★正本が memory に無いものが2件 在った**:

| 常設行 | memory の正本 | 対応 |
|---|---|---|
| 測る時の3軸 liveness/aim/fidelity | ★在り | ★既にポインタ表記だった |
| (a) collector は `workflow_dispatch` 先行 | ★在り | — |
| (b) HTTP 200 が証拠にならない | ★在り | — |
| ★**(c) flip の機構は製品ごとに違う** | ★**0件** | ★新規 `reference-live-flag-gates-different-surfaces-per-product` |
| ★**Tier の根拠は parse** | ★**0件** | ★新規 `feedback-tier-is-decided-by-parse-not-by-counting` |
| ★**外部コマンドは実物を1回 撃つ** | ★**0件** | ★新規 `feedback-the-check-must-not-share-an-origin-with-the-checked` |

★**3件とも memory へ移し、★status.md 側は ★正本名を指すだけに落とした**（★型は memory・現在形は status.md）。

★**削除後の監査**: ★畳んだ5件への dangling 参照 ★**0件** ／ ★MEMORY.md の全リンク ★**112件すべて実在**（★(0r) と同種の負債を新たに作っていないこと）。

### (0s) 進捗 — 2026-09-12

★**索引なし ★23 → ★15**（2026-09-12T14:54:15+09:00 実測）。★内訳:

| 回 | 何をしたか | 索引なし |
|---|---|---:|
| 1 | ★到達経路ゼロの2件に frontmatter + 索引（`muedlobe-game-tests` / `remotion-game-animations`） | 25 → 23 |
| 2 | ★durable な5件を索引（下記） | 23 → 18 |
| 3 | ★「解決済み」記録3本を★畳んで1本に集約 | 18 → ★**15** |

★**2回目に索引した5件**（★とくに1件目は索引に無いのが危険だった）:
- ★**`reference-vercel-preview-shares-prod`** — ★**preview deploy は prod Neon を読み書きする／RoEx key も prod。「preview だから安全」は偽**
- `feedback-hook-matcher-required` — matcher 無しの PostToolUse は全ツールで発火し、SendMessage が3回ブロックされた
- `feedback-plan-approval-flow` ／ `feedback-profile-collection-ux` ／ `user-communication-preferences`

★**索引しなかった2件と理由**: `feedback-no-self-termination` / `feedback-continuous-operation-vocabulary` ＝ ★**CLAUDE.md 共通block の「自己終了禁止」「dormant自己宣言禁止」と同内容** ∴ ★**索引に足すのでなく畳む候補**（★repo が既に記録しているものを memory に持たない）。

★★**3回目＝「解決済み」記録3本を畳んだ。★畳む根拠を実測で取った。**

★3本（`dial-analyzer-take-switch-bug` / `dial-naming-final-vs-mixcheck` / `dial-preview-flow-improvement`）は ★**2026-04-27 に「直っていることを確認した」と書き、★根拠に行番号を引いていた。★4.5ヶ月後に測ったら全部ずれていた**:

```
★use-audio-analyzer.ts          … memo 55  → ★実際 56（1 ずれ）
★lib/ai/prompts/dial.ts         … memo 773 → ★実際 789（16 ずれ）
★★app/dial/session/[id]/page.tsx … memo 307 の `sublabel:` が ★★0 件
   ＝ ★その code は refactor で消えた（★表示は `app/api/dial/chat/route.ts` へ移り、
      ★「Final Mix」「Mix Check」を区別するという ★結論は今も真）
★陽性control … 3 file とも ★実在する（★不在で 0 になったのではない）
```

★★**∴ 「確認した」の記録は ★根拠の側から腐る。★結論は真のまま、★根拠が偽になる** ——★**そして読む側は根拠を辿るので行き止まりに着く。**

★**durable な1点だけ残した** → `gotcha-webaudio-source-once-per-element`（★`createMediaElementSource()` は element × AudioContext ごとに1回・★Take 切替は graph を組み直す）。★**行番号でなく★壊してはいけない制約を書いた**（★制約は refactor で動かない）。
★**元の3本は session scratchpad へ退避**（★repo には入れない ——★ずれた行番号を repo に持ち込まないため）。

★**残 15 件**は引き続き1件ずつ。★**一括で索引を生やさない。**

### (0s)

★★**(0s) memory の索引被覆 = ★23 / 128 が MEMORY.md に索引行を持たない**（2026-09-11T16:33:56+09:00 実測）。

★**(0r) を閉じる過程で出てきた、★同じ機構の別の面。** ★**(0r) は「memory → file」の dangling ref**、★**(0s) は「MEMORY.md → memory」の被覆**。

★**なぜ効くか**: ★**MEMORY.md は SessionStart で毎回 注入される索引**で、★**索引に無い memory は「recall が拾えば出る」だけになる。**
★**実例（本日）**: ★`pr-design-notes-20260416.md`（210行）は ★索引行ゼロ・★他 memory からの `[[link]]` もゼロで、★**5ヶ月 誰にも読まれないまま ★価格が誤ったまま残っていた**（`$8`/`$15` ⇔ 正本 `749`/`1399`）。★**畳むまで、それが在ることに気づく経路が無かった。**

★★**本日 2件だけ 直した ——★★二重に見えなくなっていた分**:
| file | 直す前 | 直した内容 |
|---|---|---|
| `muedlobe-game-tests.md`（87行） | ★**frontmatter 自体が無い**（description 空）＋ ★索引行も無し | frontmatter + 索引行 |
| `remotion-game-animations.md`（90行） | ★同上 | frontmatter + 索引行 |

★★**`description` が空だと ★recall が関連性を判定する手掛かりが無い** ∴ ★**索引にも無い ＋ description も無い ＝ ★到達経路がゼロ。** ★**この2件だけは「被覆が薄い」でなく「★不在」だったので先に直した。**
★**再監査**: ★description 空 **2 → 0**／★索引なし **25 → 23**（★陽性control: description を持つ file 126 件）。

★★**残 23 件は ★まだ判定していない。** ★**一括で索引を生やすのは誤り**——★中身を見ると ★`RESOLVED` / `完了記録` の project memory が多く（★2026-03〜04 の dial・muednote 系）、★**索引に足すのでなく ★畳む対象の可能性が高い。** ★**1件ずつ「まだ真か」を見るのが手順**（→ [[feedback-a-filled-in-value-hides-the-defect]] と同じで、★件数で処理すると中身を失う）。

### (0r)

★★**(0r) memory が名指しする file の dangling ref = 32 / 162**（2026-09-10T11:37:37+09:00 実測・母集団は `grep -rhoE` で memory 全件から抽出した distinct path・★symlink なので起点に末尾 `/` を付けて叩いた・陽性対照 `package.json` 通過）。★**手法の正本＝memory [[feedback-memory-refs-reveal-unlanded-work]]**。

★**内訳（32件）**:

| 区分 | 件数 | 扱い |
|---|---:|---|
| ★**#987 で解消**（cert 3 + cryo 2 + backfill 2 + yuu doc 1） | **8** | ★merge されたら再スイープで 0 になるはず |
| ★**当課の repo でない**（conductor `docs/inbox`・`docs/drafts` / MUEDear `docs/muedear-*`・`components/Screens` / template `docs/templates`・`docs/design-system-changelog.md`） | **11** | ★対象外（別 repo の path を当 repo に照合しているだけ） |
| ★**散文中のプレースホルダ**（`lib/y.ts` / `scripts/x.ts`） | **2** | ★対象外（`gotcha-git-add-aborts-on-deleted-pathspec` の例示） |
| ★**本日 訂正済** | **2** | `scripts/rescue-dial-yuu-final.ts`（★main に無い＋★その r2-first は製品が revert 済 ＝ 写すと危ない、を本文と索引に明記）／`tests/unit/api/checkout-subscription.test.ts`（★file 自体が削除済 ＝「探しに行かないこと」を追記） |
| ★**未処理（当 repo・要判定）** | **9 → ★8**（うち1件は同日 判定・訂正済） | 下記 |

★★**未処理 9件 → 2026-09-11 に ★0件。★1件ずつ判定し、★memory 側を直した。**

| path | 判定（`git log --all --diff-filter=AD`） | 直した先 |
|---|---|---|
| `components/dial/before-after-player.tsx` | ★**在って消えた** — `b8ce8efd`「integrate UnifiedSessionPlayer, remove legacy players」 | ★新 memory |
| `components/dial/stem-player.tsx` | ★**一度も commit されていない**（0件） | ★新 memory |
| `components/dial/waveform-player.tsx` | ★同上 | ★新 memory |
| `lib/utils/waveform.ts` | ★同上 | ★新 memory |
| `db/migrations/0041_trial_events.sql` | ★同上 | ★新 memory |
| `components/features/landing-content.tsx` | ★**削除済**（#655「remove dead v1 landing chain」）・★`isFree15PromoActive` も **0件**（陽性control `IntegratedLandingContent` 3件） | ~~`project-free15-muedjp-promo` に註記~~ → ★**2026-09-16 に memory ごと削除**（完了記録） |
| `docs/muedial/reference-track-poc.md` | ★**一度も commit されていない**（0件） | ~~`dial-reference-track-poc` に註記~~ → ★**2026-09-16 に memory ごと削除**（完了記録・★実装は main に在る） |
| `scripts/_yuu-monitor.ts` | ★**一度も commit されていない**（0件・陽性control `scripts/*.ts` 60件） | `project-dial-stuck-processing-fix` の★自己矛盾を除去 |
| `app/[locale]/ai-mixing/page.tsx` | ★**未 merge の branch `feat/seo-lp-ai-mixing` 限り**（`a10ac2de` は main の祖先でない） | ★既に正しく註記済＝変更不要 |

★**逆引きは `grep -F` で撃ち直した** ——★前回 `[locale]` が文字クラスとして解釈されて失敗していた所。★今回は9件すべて逆引きできた。

★★**5件を1つの memory に畳んだ**: 出所の `pr-design-notes-20260416.md`（210行）は ★**MEMORY.md に索引行が無く**・★**他 memory からの `[[link]]` も 0**・★**価格が誤り**（`$8`/`$15` ⇔ 正本 `lib/dial/pricing.ts` は `749`/`1399`）。
★∴ ★**`reference-dial-player-design-superseded` に置き換え、★索引行を追加した**（★索引に無いものは索引からは永久に辿れない＝ [[feedback-shipped-but-unreachable-is-silent]] の memory 版）。★元文は session scratchpad へ退避（★誤った価格を repo に持ち込まないため repo には入れない）。

★★**そして今回いちばん効いた1行**: ★**`app/[locale]/ai-mixing/page.tsx` は「消えた」のではなく ★未着地だった。** ★**dangling ref のスイープが、★未 merge の作業を1件 掘り当てた**（★手法 memory [[feedback-memory-refs-reveal-unlanded-work]] が主張していたとおりの効き方）。

★**再スイープ（2026-09-11T16:23:57+09:00）**: 9 path すべて ★『名指す memory = 1件・かつ その1件が判定を持つ』。★陽性control（`package.json` を含む memory 7件）通過。

★**注意**: ★**この 32 という数は「そのフィルタで見えたもの」**（→ [[feedback-zero-hits-means-your-filter-not-absence]]）。★抽出の正規表現が拾う拡張子は `ts|tsx|md|sql|json|mjs` のみで、★**バッククォート無しで書かれた path や、拡張子の無い dir 参照は母集団に入っていない**。

### (0u) — ★畳む時に、畳む元の stale な主張を新 memory へ継承した（2026-09-16・★当課の自己検出）

★**(0s) で畳んだ `project-dial-v2-player-decode-hang` は「take 単位 URL はフルリファクタへ回した」と書いていた。**
★**当課はそれを真として、★新 memory に「未修正の欠陥」として書き、★status.md (W7) と PR #1031 本文にも書いた。**

★★**誤り。★PR-A（2026-06-12）で修正済**だった:

```
★lib/dial/session-takes.ts … ★各 MIXED take に `stemStreamUrlByTask`（taskId-scoped）を与える
★route の sessionId+stemKey  … ★意図された fallback（★自 task に stems が無い take・poll desync）
★tests/unit/dial/session-takes.test.ts … ★「Preview 2 ≠ Preview 1」を名指す case ／ ★11/11 green
★★畳んだ記録は 6/11 産・★修正は 6/12 ＝ ★1日ずれたまま ★3ヶ月 残っていた
```

★★**機序（★(0s) の手順に足す分）**: ★**callee の形だけを見て「欠陥」と断じた。★caller を読まなかった。**
★**route に「最初の preview」の形は ★今も実在する** ——★∴ ★**形の一致は挙動の証拠ではない。**

★★**∴ 畳む時の追加手順**: ★**畳む元が「未実装 / 未修正 / 保留」と書いていたら、★それは ★記録された日の主張**
＝ ★**新 memory へ写す前に ★今日 測る**（★grep なら ★helper 名で ★呼び出し元を引く・★test 名を読む・★実行する）。
★**畳みは「要約」ではなく「★再検証」** ——★stale な主張は、★畳むと ★新しい日付を着て出てくる。

★**検出に効いたもの**: ★修正 scope を測ろうとして撃った `grep` の隣に ★test 名と helper の docstring が出た。
★**∴ scope measurement が結果的に検査になった**（★最初からそう設計したのではない）。
