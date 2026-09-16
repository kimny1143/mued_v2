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
| ★`23-done-vs-delivered` | ★**CLAUDE.md の block 名**を★違反例として引用している行（★下記） |
| ★**空白のみの token** | ★記号そのものを説明している行（★構造上 real link ではない ∴ ★検査側で常に除外してよい） |
| ★`block名` | ★**「`[[block名]]` で dangling を自作した」という ★違反の記述そのもの**（★2026-09-16 追加） |

★★**∴ allowlist は ★検査と同じ場所に置く。** ★置かないと、★次の回に ★**「dangling 1件」を "直す" ために

★★**追記（同日・★allowlist が2件 増えた理由）**: ★**規律を文章化すると、★その文章が mention を作る。**

```
★2026-09-16: ★「block 名を link 記法で書かない」という規約を memory に書いた
★★→ ★その規約文の中に ★block 名と ★記号そのものが 出てくる ∴ ★検査が2件 拾った
★★→ ★どちらも「こう書いて誤りだった」の引用 ＝ ★CLAUDE.md の但し書きが許す側
★★→ ∴ ★消さずに allowlist へ（★消すと ★実例そのものを失う）
```

★**弁別の基準は CLAUDE.md 逐語**: ★**「読む側が真似できる位置に在るか」** ——
★手順・テンプレート・出力例に在れば★違反、★「こう書いてあって誤りだった」の引用なら★正しい。
★★**∴ allowlist は増えていくのが正常**（★規律が増えるほど引用も増える）。★**件数の増加を異常と読まないこと。**

★★**そして ★この規則が ★自分で自分を確かめた（2026-09-16 同日・★2 回目）**

★上で「規律を文章化すると ★その文章が mention を作る」と書いた。
★★**その後、★その規律を memory に記録したところ、★その記録が ★allowlist の 6 本目を生んだ**
（★`block名` ——★「`[[block名]]` で dangling を自作した」という ★違反の記述）。

★∴ ★**allowlist の増加は ★失敗の指標でなく ★記録の指標**です。
★**違反例を書けば書くほど増える** ∴ ★件数を ★減らす方向の目標にしないこと。
★**減らそうとすると ★消すのは ★実例の側**になる。

★★**再発元だった「記号の規約」を明文化した**: ★**二重角括弧は memory への link だけに使う。
★CLAUDE.md の block を指す時は ★block 名を素のテキストで書く。**
★**命名だけ決めて記法を決めていなかった**ので、★「差し替え先は block 名で書く」と書いた本人が
★その block 名を ★link 記法で書いた（★2026-09-16・★当課）。
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

### (0v) — ★昇格 link の死は ★当課だけの話ではなかった（2026-09-16 実測・★owner=conductor / CCO）

★**(0t) で分かった機序**（memory の中身が共通block へ昇格すると `[[旧名]]` が残って死ぬ）は、
★**block が ★全課へ配布される物ゆえ ★構造的に cross-peer** ∴ ★他課でも同じ5名が死んでいるはず —— ★測った。

```
★測り方 … ~/.claude/projects/*/memory を ★inode で dedup（★Dropbox と /Volumes の二重計上を畳む）
          ★各 dir 内で [[X]] を集め、★X.md が同 dir に無いものを dangling とする
          ★NOISE（mention）5 token は除外 ＝ (0t) の allowlist と同一
★測った時 … 2026-09-16 ／ ★この machine のみ ／ ★読み取り専用（他課の中身は見ていない・★件数のみ）
★★可変性 … ★各課が自分の memory を触れば動く ＝ ★時点データ。★CI 予測等に使えない
```

| | |
|---|---:|
| ★raw で見えた dir | 41 |
| ★**distinct inode** | ★**25**（★差 16 ＝ Dropbox／Volumes 二重計上・★CLAUDE.md の既知 gotcha を踏みかけた） |
| ★2 file 以上を持つ peer dir | 22 |
| ★**同じ昇格5名が死んでいる課** | ★**15 / 22** |
| ★昇格名の hit 合計 | 38 |
| ★distinct dangling 合計（全課・昇格名以外も含む） | 233 |
| ★当課 mued_v2 | ★**0**（★本日 閉じた ＝ ★この 0 が対照） |

★**実害は小さいが広い**: ★peer の memory が「★この file を見ろ」と指しており、★その file が無い
∴ ★**無視される（ポインタの喪失）か ★探しに行く（turn の浪費）**。★規律自体は block に在って生きている
∴ ★**動作では検出できない**（★= (0t) の機序そのもの）。

```
QUESTION: 昇格 link の死を、★全課へ配る規律 ＋ 検査として conductor / CCO が受けるか?
OPTIONS:
  - (a) ★CCO の配布 checklist に1行 追加（「memory→block へ昇格させたら `[[旧名]]` を grep して block 名へ差し替える」）＋ ★各課は自分の回に自分で直す
  - (b) (a) ＋ ★3本の検査（索引被覆／索引 link 実在／dangling link＋mention allowlist）を ★template 課が script 化して配る
  - (c) 当課の中だけに留める（★他課へは配らない）
RECOMMENDATION: ★(a)。★理由＝★死因は「昇格の手順に1行 足りない」ことであって ★検査不足ではない
  （★15/22 という広さは ★手順の欠落を示す）。★script 化 (b) は ★配布物が増え ★allowlist の版管理も要る
  ∴ ★まず手順を直し、★再発が続くなら (b)。★(c) は ★機序が cross-peer と測れている以上 不適。
```

★**当課の手番はここまで**（★測って ★形にした）。★**配るかどうかは conductor / CCO の判断** ——
★**当課から他課の memory を書き換えない**（★read-only で測った・★件数のみ・★中身は見ていない）。

### (0w) — ★`blocked_by` が 1 日に ★4 回 cap を超えた（2026-09-16・★構造の signal）

★**本日の実測**（★毎回 別の追記で超えた）:

| 回 | きっかけ | 超過/残 | 手当て |
|---|---|---:|---|
| 1 | (W8) 追記 | ★**+324 B 超過** | (W2b) を archive へ |
| 2 | 同上の続き | ★残 −45 B | (W7) を (0u)+memory へのポインタに圧縮 |
| 3 | (W9) 追記 | ★残 56 B | (W2c) を archive へ（★禁止の1行だけ残す） |
| 4 | (W9) を conductor 裁定で更新 | ★**+245 B 超過** | (W9) 自身を memory ポインタに圧縮 |

★**4回とも「畳めるものが在った」ので毎回 直せた。★だが 4回 は偶然ではない。**

★**機序**: ★`blocked_by` は「★解消されるまで残す」欄 ∴ ★**構造的に増える一方**。
★`next_action` は更新のたびに書き換わるが、★`blocked_by` は ★**足すことしかしない運用になっていた。**

★**∴ 次のセッションで構造の手当てを1回**（★incremental trim を続けない）:
- ★**W 番号の棚卸し**: ★`(W-1)`〜`(W9)` のうち ★「他者待ち」は ★1つの block に畳める（★現に (W5) がその形）
- ★**「決着済だが着手禁止」型**（(W2c) 型）は ★**禁止の1行だけ status.md・経緯は archive** が既に正解 → ★他にも適用できる
- ★**目標**: ★常時 headroom 1,500 B 以上（★1回の追記が 300-900 B ゆえ、★2回分の余裕）

★**閾値運用をここに書いた理由**: ★status.md 側に書くと ★それ自体が cap を食う（★今日の問題そのもの）。

#### ★★(0w) は ★同日 実施した（★「次のセッションで」と書いたが ★5 回目で自分の規律に当たった）

★**上で「次のセッションで構造の手当てを1回」と書いた直後、★5 回目の超過が来た。**
★**ここで 5 回目の incremental trim をすると ★自分が 1 時間前に書いた規律に反する** ∴ ★**その場で実施した。**

```
★13 block → ★9 block ／ ★6,267 B → ★★4,026 B（headroom ★1,974 ＝ 目標 1,500 超）
★直前の全文 … docs/status-archive/2026-09-16_blocked-by-restructure.md（★可逆）
```

★**再編の型（★次に効く分）**:
- ★**(W10) 他者待ち 一括** ← W-1 / W3(d)(e) / W4 / W5 を統合（★「起床条件」だけ残し、叙述は落とす）
- ★**(W11) 決着済・着手禁止 一括** ← W2c / W7 を統合（★禁止の1行だけ残す）
- ★**落とせない前提（W0 / W0b）と ★owner=当課の live（W2 / W2d）は ★そのまま**（★畳まない）

★★**verify（★「畳んだつもりで消えた」を起こさない形）**: ★旧 13 block の ★operative な語を ★16 個 選び、
★**status.md か archive のどちらかに在ることを1件ずつ確認**（★16/16 在り・★陰性control 0）。

★★**そして ★内部参照も測った** ——★**畳むと ★他フィールドからの `(W番号)` が dangling になる。**
★実測: ★`next_action` が ★`(W7)` を ★2 箇所で参照していた ∴ ★1件ずつ開いた:
```
★① 「dial stem DL の未修正を (W7) へ」 … ★★merge 済 commit 題名の ★逐語引用 ＝ ★変えない
★② 「正しい現在形は 下の (W7)」        … ★★live pointer ＝ ★(W11) へ修正
```
★**同じ `(W7)` で ★片方は引用・★片方は参照。★grep では弁別できない** ——★(0t) の use/mention と ★同型。
★**∴ 畳んだ回は ★必ず内部参照を grep して ★1件ずつ開く。**

### (0x) — ★自作 gate の poll が「赤い PR を merge させる」向きに壊れていた（2026-09-16・当課）

★**判定語が、別の判定語の部分文字列だった。**

```
gate の出力 … "#1046 …: 総数=6 未完=2 非success=0 → NOTREADY"
poll の判定 … grep で "READY" を探していた
★→ ★NOTREADY の中の READY に当たり、★両方 NOTREADY の回に "BOTH_READY" を印字
```

★**危険の向きが悪い**: この poll は「両方 ready になったら merge せよ」と自分に告げるための計器で、
★**誤りの向きが「進め」だった**。★実際、その時 **#1048 は `Test` が failure** だった
（`locale-page-bare-paths.test.ts` — 新設2ページの bare redirect 欠け）。
★**poll を信じて押していたら、赤い PR を merge していた。**

★**同日3件目の同型**（すべて「文字列で合否を決めた」）:
| | 何が起きたか |
|---|---|
| ① | `"Vercel"` が `"Vercel Preview Comments"` に当たり「欠けなし」を誤報 |
| ② | `grep cannot` が `Cannot do` を拾わず、能力境界を「未実装」と読みかけた |
| ③ | ★本件（`READY` ⊂ `NOTREADY`） |

★**併せて `$?` を pipe 越しに ★2回 読み違えた**（`tsc | tail` / `verify.py | tail` ＝ `tail` の rc）。
★**2回目は「RED が rc=1 を返すか」を測っている最中** ——★検査を検査する所で同じ誤りをした。

**直した形**（★`/tmp/cc-501-g4.sh` → 恒久化は未実施＝下記が残タスク）:
- ★**合否は rc で返す**（`exit 0|1|3`）。★文字列は **人が読むためだけ**に印字する
- ★**3値にする** … `0=ready / 1=まだ / 3=計器の死`（★「不足」と「計器が成立していない」を分ける）
- ★**`$?` は pipe の前に測る**（出力が見たければ file に落としてから読む）
- ★**self-RED を通す** … 「常に rc=1 を返す gate」を差し替えて、loop が合格を出さないことを見る
  （★入れ替えるのは **gate の側**。★loop 側の定数を変えても両方 直るので検出できない）
- ★**待つ loop は、非合格を見たら待たずに抜ける**（CI の failure は待っても直らない）

★**決めた＝repo に置かない**（2026-09-16・その日に決めて持ち越さない）。
★**理由**: 守りたいのは「★合否を rc で返す」という ★**性質**であり、script はそれを ★**1つの値（file）で買う**形になる
——★self-RED を別に維持する義務が付き、★腐っても誰も気づかない
（★型＝memory `feedback-do-not-buy-a-property-with-a-value`）。
★∴ ★**性質は memory が持ち**（`feedback-read-the-verdict-by-rc-not-by-string`）、★gate は要る回に 5 行 書く。
★**次に書く人が踏まないための判別軸も memory 側に在る**（★語彙を prefix-free にする／★`$?` は pipe の前で測る）。
★型の正本＝memory `feedback-read-the-verdict-by-rc-not-by-string`。

### (0y) — ★`masterchain-order-handler.test.ts` に unused な eslint-disable が 6 件（2026-09-16・低優先）

★`// eslint-disable-next-line @typescript-eslint/no-explicit-any` が **6 件** 効いていない。
★機序＝**test は `no-explicit-any` が off**（MEMORY.md に既記）∴ ★**最初から不要だった**。
★当課の #1039 / #1041 / #1045 がこの行を触っているが、★**当課が持ち込んだのではなく既存の型**。

★**lint rc=0**（warning 止まり）ゆえ CI は緑。★**#1049 に混ぜない**
（特商法は kimny 目視に出す面なので、diff を読む負荷を上げない）。
★次に `lib/masterchain/fastspring-webhook.ts` 系を触る回に一緒に消す。

### (0z) — ★`/terms`・`/refund` は「作ったのに繋がっていない」状態で出荷しかけた（2026-09-16・#1048 → #1049 で解消）

★#1048 で新設した2面は、**サイト内から辿れる導線が 0** だった（sitemap と FastSpring 側だけ）。
★**tsc も lint も 2,313 本の test も緑** ——★到達性は型エラーにならない。

★**そして検査の側も同じ形をしていた**:
`legal-pages-locale-links.test.ts` の `LEGAL_PAGES` は ★**包含リスト**で、新設2面を覆っていなかった
∴ ★**cross-link 検査の母集団の外**。★**同じ file の header が `/muedrive` の取りこぼしを
「registry は filesystem の部分集合にしかなれない」と書いているのに、★この配列自身が同じ形だった。**

★**#1049 で閉じた**: 5面が互いに4面を張るようにし、リストを 5 件へ拡張。
★加えて ★**リストに依存しない述語**を足した ——「MoR を宣言している namespace は全部リストに入っている」
（messages 側から機械的に引くので、★6つ目の legal page を足した日に落ちる）。
★meta-RED＝`LEGAL_PAGES` から `terms` を外して、新しい述語が検出することを確認済。

### (1a) — ★特商法に書いた価格の正本は FastSpring 側であって repo ではない（2026-09-16・owner=conductor / kimny）

★#1049 は特商法の販売価格に **`$69`** と書いた。★**出所は kimny 決定と `lib/masterchain/*.ts` のコメント**
（`audience.ts` / `config.ts` / `license.ts` / `fastspring-webhook.ts` に散在）で、
★**typed な定数は存在しない**（`grep` で値としての 69 は `messages/ja.json` の `priceNote` のみ）。

★**しかし FastSpring が MoR なので、★実際に買い手へ表示される価格は FastSpring の商品設定**。
★**∴ repo 側をいくら揃えても、一致は保証されない。**

★**そして activation 要件そのものが「表示価格の一致」を含む**
（#1048 の `app/[locale]/terms/page.tsx` の header コメントに逐語で書いた条件）。
∴ ★**ずれた状態で開店すると、★特商法の表示としても、★FastSpring の審査としても問題になる。**

★**当課には測れない**（dashboard を見られない）。★**開店直前に画面で1回 突き合わせる**のが唯一の手段で、
★これは `NEXT_PUBLIC_FASTSPRING_STOREFRONT` を Production へ投入する回と ★**同じ画面・同じ手番**。
∴ ★status.md (W0c) に置き、★env 投入の手順に束ねた（★別の宿題にすると担い手が消える）。

★**なぜ「後で気づける」と思わない方がよいか**: ★価格は ★**両方が「正しく」表示される**。
★片方が 404 になるわけでも、型が合わないわけでもない ——★**2つの数字が並ぶことが無い**ので、
★誰かが意識して並べるまで一致も不一致も観測されない（→ memory `feedback-shipped-but-unreachable-is-silent`
の「2つの母集団のうち片方だけが機能した」と同じ形）。

### (1b) — ★MEMORY.md が上限を超え、末尾 6 行が context に載っていなかった（2026-09-16・当課・解消済）

```
harness 警告 … "MEMORY.md is 24.9KB (limit: 24.4KB) … 6 of 185 lines were cut off, starting at line 180"
★単位は ★文字数 … chars 25,461 / 1024 = 24.86KB ＝ 警告と一致
                   bytes 39,337 / 1024 = 38.4KB ＝ ★警告の数と合わない（byte で判定すると見誤る）
★落ちていた行 … 「masterchain の律速は kimny」／「後決済 #488」／「## Pending (kimny手動 required)」節
```

★**報告する価値があるのは「書いた人と消える人が違う」ため。**
当課はその日、索引行を**太らせる**編集をしていた（memory 1 本 追加 ＋ 既存 2 本に 9/16 追記）。
★**消えたのは太らせた行ではなく、★末尾の無関係な3項目** ∴ ★**編集した本人には何も壊れて見えない**
（→ memory `feedback-retirement-is-fail-silent` の「昇格は完了の実感しか残さない」と同型）。
★**しかも落ちた1行は「masterchain の律速」＝その日の作業に直接 関係していた。**

**対処（済）**: 索引 12 行を 200 char 以内へ畳み、**25,461 → 23,093 chars**（22.6KB・余裕 1,893）。
★**detail は topic file 側に在ることを ★概念レベルで照合してから**畳んだ。
整合＝126 file / 128 link / missing 0 / unindexed 0。型＝memory `gotcha-memory-md-is-truncated-tail-first`。

★**照合を token 一致でやって危うく誤った**: 索引行の末尾語を topic file に exact match で当て、
「3 本は本文に無い ＝ 索引にしか存在しない」と読みかけた。★**実際は言い換えで在った**
（★索引は要約なので語は一致しない ∴ ★token 一致は偽陰性を出す計器）。
★**概念レベルで測り直して初めて、畳んでよいと分かった。**

★**trim script は fail-closed にした**（1 行でも 200 超なら★何も書かない）。★**3 回 止まり、3 回とも正しく止まった**
——★部分適用されていたら索引が中途半端に壊れていた。

### ★cross-peer は測った ＝ 現時点で他課の手番は無い

★**22 課（inode dedup 済）で limit 超は 0 件。** 当課が唯一の被弾で、今も最も近い（22.6KB＝90%）。

★**そして「200 char 超の行数」は ★予測子にならない**（★これを混同しないこと）:

| 課 | 200 超の行数 | 総 chars |
|---|---:|---:|
| template | ★47 | 15.3KB |
| contents-writing | 34 | 19.6KB |
| chief / product / threads-api | 29 / 29 / 29 | 17.2 / 15.8 / 12.0KB |
| ★**mued** | ★**13** | ★**22.6KB** |

★**当課は行数が少ない側で超えた** ∴ ★**効く述語は総文字数**。
★配るなら `len(open('MEMORY.md').read()) > 24986` の1行で、★**行の本数を目標にしない**
（→ (0t) の allowlist と同じ形＝件数で閉じると消すのは実例の側になる）。

★**残差**: ★上限を超えたのは本日の当課の編集が原因で、★harness が警告するまで気づいていない。
∴ ★**それまで何セッション「末尾の無い context」で判断していたかは ★事後に測れない**
（→ memory `feedback-counts-built-from-records-have-a-biased-denominator`）。
