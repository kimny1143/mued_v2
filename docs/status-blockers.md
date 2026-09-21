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

### (1c) — ★(W0) の .pkg gate は母集団を焼いていて、現行の無料3本を一度も測っていなかった（2026-09-16・解消済）

★**gate 自体は 9/11 に「3行とも期待どおり」で緑だった。★その緑が覆っていた範囲が違った。**

```
★焼いていた名前 … MUEDsat-0.1.1-alpha-installer.pkg  ← ★既送メール向けの ★互換 alias
                    MUEDsp-masterchain-0.1.3-installer.pkg
★canonical（lib/*/config.ts の *_DOWNLOAD_URL）… ★4 本
                    MUEDsat-0.1.2 / MUEDlim-0.1.2 / MUEDrive-0.1.2 / MUEDsp-masterchain-0.1.3
★∴ ★無料3本のうち ★測っていたのは 0 本（★alias 1 本を「MUEDsat を測った」と読んでいた）
```

★**機序は「値を焼いた」こと**。★当課の status.md は別の項で「★値でなく引き方を置く」と書いており、
★**同じ file の別の項が それを破っていた**（→ 共通block「規則と例が矛盾したら例が勝つ」）。
★**しかも alias は 200 を返すので、★gate は緑のままだった** ——★[[feedback-zero-hits-means-your-filter-not-absence]] の裏側で、
★**「1 件 当たった」が「対象に当たった」を意味しない**形。

**直した検査**（母集団を `lib/*/config.ts` から実時解決）:
- ★canonical 4 本 ＋ ★alias 1 本 ＋ ★陰性control 1 本
- ★status だけでなく ★content-type・★先頭 byte（`xar!`）・★size を見る（★200 の HTML を通さない）
- ★母集団が 4 本 未満なら ★rc 3 で「計器の死」として落ちる（★正規表現か path が壊れた時に緑にしない）

**2026-09-16 実測**: ★5/5 が 200・`xar!`・3.2〜4.1MB／★canonical 0.1.2 の sha256 は
★`lib/muedsat/config.ts` の記録値と ★完全一致（`d41d5a30…fefdb610`）／★陰性control 404。

### ★alias が 0.1.2 でなく 0.1.1 payload を配っている — ★これは欠陥ではない

★**当課は最初「Gatekeeper 警告が出るのでは」と疑った。★測って否定した。**

```
MUEDsat-0.1.0-alpha ＝ MUEDsat-0.1.1-alpha … ★byte 同一（b3ac87fc…）＝ 2026-08-27 の alias 上書き
MUEDsat-0.1.2                              … 別 payload（d41d5a30…）
★3製品すべて同じ形（alias 5 本・どれも canonical と hash 不一致）
★★しかし ★両方とも notarized + stapled で `spctl -a -t install` が ★accepted
   0.1.1-alpha … timestamp 2026-08-27 / Developer ID Installer: glasswerks inc. (F529L4WT3V)
   0.1.2       … timestamp 2026-09-10 / 同じ証明書
```

★**∴ 古いリンクを持つ利用者は ★notarized で Gatekeeper を通る ★動く build を得る。差は版だけ。**
★alias を 0.1.2 へ更新するかは ★dsp の判断（★当課は触らない）。★**当課の側の結論は「欠陥なし」。**

★**残差**: ★0.1.2 の機能差は `lib/muedsat/config.ts` が「dsp's record, NOT re-measured here」と
明記している ∴ ★**版差が利用者にとって何を意味するかは当課では測っていない**（★dsp の領分）。

### (1d) — ★互換 alias 5 本を canonical へ 302 する（dsp 判断・★着手は開店の後・owner=mued）

★**2026-09-16・conductor relay の dsp 判断**（当課の (1c) 報告への回答）:

```
★bytes を上書きしない        … alias は pin 表に無い ∴ 上書きは ★検出器の無い変更になる
★file は消さない             … config の "Never tidy public/downloads/ by deleting" を守る
★alias URL → canonical へ 302 … 名前が中身より古い版を名乗る状態を ★深めない
★pin 表は canonical 単一のまま
★MUEDrive-0.1.0-alpha（77a13bd1…）は ★dsp の dist に無い唯一の実体 ∴ ★file は必ず残す
```

★**当課の (1c) の結論は「欠陥なし」**（alias も notarized・`spctl` accepted）∴ ★**これは不具合修正でなく整理**。
∴ ★**開店の後**・急がない（conductor 明記）。★Tier 2・CCO レビュー。

**対象 5 本**（canonical と hash 不一致・`public/downloads/`）:
`MUEDsat-0.1.0-alpha` / `MUEDsat-0.1.1-alpha` / `MUEDlim-0.1.0-alpha` / `MUEDlim-0.1.1-alpha` / `MUEDrive-0.1.0-alpha`

### ★着手する前に決着している実装上の点（当課が先に測った）

★**「next.config の redirects か middleware」のどちらでも良い、ではない。**
★`public/` の実体が在る path に ★`redirects()` が効くかは ★Next.js の routing 順序に依存する
（`headers → redirects → rewrites(beforeFiles) → filesystem(public) → …`）。
★**∴ 実体が在っても redirect が勝つ「はず」だが、★これは仕様の読みであって実測ではない。**

★**measured 2026-09-16 — ★redirects は public/ の実体より勝つ**:
```
probe … next.config.ts に { source: '/downloads/MUEDsat-0.1.1-alpha-installer.pkg',
                            destination: '/downloads/MUEDsat-0.1.2-installer.pkg' } を1本 入れて build
結果 … ★HTTP/1.1 307 Temporary Redirect / location: /downloads/MUEDsat-0.1.2-installer.pkg
陽性control … redirect を入れていない MUEDsat-0.1.0-alpha → ★200 / 3,405,698 B（素の実体が返る）
陰性control … /downloads/zzz-nope.pkg → 404
★実験は revert 済（commit していない）
```
★**∴ 実装は `next.config.ts` の `redirects()` で足りる。middleware は 302 を厳密に要する時だけ。**

> ★**この節を書いた理由**: memory `feedback-workaround-must-itself-be-checked` ——
> ★**回避策は、それ自身を1回 実行してから書く。** ★「redirects で行ける」を測らずに台帳へ書くと、
> ★着手する回（開店後・おそらく別セッション）が ★仕様の読みを実装計画として受け取る。

### ★実装時の注意（2点）

1. ★**302 か 307 か ＝ ★決着した（2026-09-16・conductor）**: ★**307 で可・`next.config.ts` の
   `redirects()` でよい・middleware 不要**。★dsp の「302」は ★「一時 redirect」の意味で書かれたもので、
   ★**特定の status code を要求していなかった**（conductor が確認）。
   ∴ ★**着手の回に CCO へ問う必要はない**（★問いを残さず閉じる）。
2. ★**redirect を入れると alias の実体は HTTP から到達不能になる**。
   ★`MUEDrive-0.1.0-alpha` は ★唯一の実体 ∴ ★**「残す」は満たすが「取り出せる」は失う**。
   ★取り出し経路を1つ書き残すこと（`git show <sha>:public/downloads/…` か dsp へ dist 依頼）。

### (1e) — ★legal guard の filesystem 軸は ★depth 1 だけ（★CCO 検出・残差3・実害は今ゼロ）

★**(1b)〜#1055 で「母集団の軸を filesystem へ移して class を閉じた」と書いたが、★閉じ切っていない。**

```
★当課の実測（2026-09-16・app/[locale] 配下の page.tsx 全数 16 本）:
  depth=0 … ★★1 本 ＝ ★`app/[locale]/page.tsx`（★locale root・★dir でないので この軸の対象外）
  depth=1 … ★12 本 ＝ ★当課の test が見る母集団
  depth=2 … ★★2 本 ＝ ★story/[slug]/page.tsx（★★`story` 自身に page.tsx が ★無い）
                     redesign/studio/page.tsx（親が分類済 ∴ 実害なし）
  depth=3 … ★★1 本 ＝ redesign/studio/workspace/page.tsx（同上）
★★**1 + 12 + 2 + 1 ＝ 16**（★CCO 指摘で内訳に depth=0 を補った ——★「全数 16」と書いて内訳が 15 だと、★読む人は「1 本 見落としたのか／数え方が違うのか」を弁別できない。★★配る値は ★再構成できる形で配る）。
★∴ ★`/[locale]/story/<slug>` は ★生きた公開面だが ★分類の外
   （★`existsSync(story/page.tsx)` が false ∴ ★母集団に すら 入らない）
```

★**今日の実害はゼロ**（story は legal 面でない）。★**効くのは次に legal 面を入れ子で置いた時**:

```
★app/[locale]/eula/page.tsx        … ★落ちる（★#1055 の meta-RED で実証済）
★★app/[locale]/legal/eula/page.tsx … ★★落ちない ——★`legal` に page.tsx が無ければ母集団の外
```

★**∴ 軸を移して閉じたはずの class（★黙って母集団の外に出る経路）の ★残り。**

### ★対処＝「今は書く・再帰はしない」（CCO 推奨・当課も同意）

- ★**docstring に射程を1行**（「★この軸は legal 面が depth 1 に在ることを仮定する」）＝ ★#1056 で実施
- ★**再帰にしない理由**: route segment の意味（`[slug]` / route group / `@slot`）を ★test が
  解釈し始め、★**別種の誤りが入る**。★`/eula` は depth 1 の予定ゆえ ★今の形で足りる
- ★**入れ子の legal 面を置く日に再帰を入れる** ——★その判断が必要になったことが分かるよう
  docstring に書いた（★「書いておく」を ★担い手の要る宿題にしない形）

### ★残差の一覧（★「閉じた」と書かないため・3 件）

| # | 残っているもの | silent か |
|---|---|---|
| 1 | ★legal 面を誤って `NON_LEGAL` に分類する | ★**silent でない**（理由を書く必要のある意識的判断） |
| 2 | ★MoR の文面と key 名を ★同時に変えた新面 | ★filesystem 軸が拾う（★#1055 で閉じた） |
| 3 | ★**入れ子（depth ≥ 2）に置かれた legal 面** | ★★**silent**（★母集団に入らない・★本項） |

★**guard が変えるのは「起きるか」ではなく「★黙って起きるか」**（CCO 逐語・当課の残差1の整理を受けたもの）。
★∴ ★**残差3 は まだ silent 側に在る** —— ★それを承知で depth 1 に留める、という判断。

### ★併せて: `toBeGreaterThanOrEqual(10)` の出所を書いた

★★**未処理（★次に この test file を触る回に直す・CCO 合意）**: `LEGAL_PAGES` の docstring に `legale` → `legal` の typo（★#1055 由来・実害ゼロ・★CCO も前回 見落とした）。★**test file は Tier 2 になるため docs 単独 PR には混ぜない。**

★CCO 所見＝`10` は magic number（★実測 12）。★面を 3 つ消すと意図せず落ちるが、
★**落ちる向きは正しい**（母集団が痩せたら止まる）∴ ★直さず ★出所を1行 添えた。
### (1f) — ★(W2d) image optimization の露出：★評価した（★「安全」と書かない・残差2件）

★**2026-09-10 から「未評価」で残っていた項目。★測れる述語まで進めた。**
★**結論を「安全」と書かない**のは元の指示どおり ——★以下は ★測れたことと ★測れていないことの区別。

**対象の advisory**（status.md 9/10 の記録）: `next` の Image Optimization API・AVIF・未認証 RCE ほか・修正域 ≥16.3.3。

### ★測れたこと（5 件）

```
① 依存は修正済 … next ★16.3.4 / sharp ★0.35.4（lock が正本・#986 で 9/10 に着地）
② 設定に images が無い … next.config.ts に ★`images` / `remotePatterns` / `domains` いずれも無し
③ ★履歴でも無い … 2026-08-01 以降 next.config.ts を触った ★4 commit すべて images 系 0
                   （★9/8–9/10 の窓を含む・★陽性control＝同じ叩き方で `redirects` は 3 件）
④ 本番の挙動 … `/_next/image?url=<外部URL>` → ★**400**（拒否）
                `/_next/image?url=/og-image.jpg` → ★200
⑤ 本番の挙動 … `Accept: image/avif,...` を送っても ★**返るのは `image/webp`**
                （★jpeg→webp の変換が起きている ∴ ★optimizer は素通しでなく ★動いている）
```

★**陽性control**: 素の `/og-image.jpg` が 200 / `image/jpeg`。★これが取れるまで ④⑤ の 4xx は解釈しない形にした
（★初回は ★存在しない `/icon-192.png` を推測で使い、★計器が成立していないと script 自身が報告した）。

### ★測れていないこと（★残差・ここが「安全」と書けない理由）

1. ★**advisory の正確な発火機構を当課は特定していない**（★AVIF を ★source として decode するのか、
   ★出力として encode するのか、★別経路か）。∴ ★**上の ④⑤ が機構を過不足なく覆うかは言えない。**
2. ★**Vercel の hosted image optimization が ★self-hosted Next.js と同じ code path かを当課は知らない**
   ——★元の項目が「Vercel 実装依存」と書いていたのはこの点。★当課が測ったのは ★**挙動**であって
   ★実装ではない（★挙動は実装の証拠にならない・→ [[gotcha-data-at-destination-is-not-proof-of-path]] と同型）。

### ★∴ 書ける形

★**「当課が名指しできた 2 つの前提（★外部 fetch の許可・★AVIF の出力）は、★設定・履歴・本番挙動の
3 面で満たされていない。★かつ依存は 9/10 から修正版。★残差は advisory の機構と Vercel の実装。」**

★**「露出なし」とは書かない** —— ★1 と 2 が開いている限り、それは ★測っていないことの主張になる。
★**開示義務の判断が必要になった場合は、★この 5 件と 2 件を そのまま渡す**（★解釈は当課の領分でない）。

### ★手順として残すもの

- ★**`next.config.ts` に `images.remotePatterns` / `domains` を足す PR が出たら、★この項を再評価する**
  （★前提②③ が変わる ＝ ★当課が「満たされていない」と言った根拠が消える）
- ★**`formats` に `image/avif` を足す変更も同じ引き金**（★前提⑤ が変わる）
- ★どちらも `next.config.ts` の変更なので、★grep 1 回で気づける: `grep -nE "images|remotePatterns|formats" next.config.ts`

### (1g) — ★(W2) の書き方が誤解を招いていた：★機構は test で覆われている。★欠けているのは本番の観測だけ

★**(W2) は「retry fix はまだ『効いた』証拠がない」と書かれており、★読むと「retry が動くか不明」に見える。**
★**実測すると、★機構は覆われていて、★欠けているのは ★本番で発火を見たことだけ。**

### ★測ったこと

```
① ★retry は本番で観測可能 … 呼び出し元2本（dial preview / dial mastering preview）が
   ★`onRetry` を渡し ★**`console.warn`** を出す。★`logger.info` ではない
   ∴ ★本番 no-op の罠（memory `gotcha-logger-info-is-noop-in-production`）に当たらない
② ★機構は test で覆われている … `tests/unit/lib/dial/retry-roex.test.ts` ＝ ★14 test
   分類側 … 5xx / 429 / 4xx / comm-timeout / raw network / app-side / 非 Error
   挙動側 … ★**初回成功で retry しない ／ transient 5xx を retry して成功（attempts=2）**
            ／ ★持続 transient で attempts を使い切って最後の error を throw
            ／ ★非 transient 4xx は即 throw ／ app-side error は retry しない ／ 任意 attempts 数
③ ★`withRoExRetry` 自身は ★一切 log を出さない（★`onRetry` hook 経由のみ）
   ∴ ★観測可能性は ★呼び出し元の渡し方に依存する（★新しい呼び出し元が hook を渡さなければ無言）
```

### ★∴ (W2) の正確な形

★**「機構は test で検証済（attempts=2 の発火を含む）。★本番で発火を観測した記録は無い。」**

★**そして本番観測は ★構造的に取りにくい**:
- ★transient な RoEx 失敗は ★稀
- ★`vercel logs` は ★**遡及しない・5 分で切れる**（★当課の 2026-09-16 実測・memory `reference-vercel-env-set-verify-gotchas`）
- ∴ ★**発火の瞬間に tail が既に立っていなければ見えない** ＝ ★運に依存する

★**取りに行くなら**: ★log でなく ★**durable な記録**（DB の counter か `dial_tasks` の列）が要る。
★**それは設計変更**なので、★「証拠が無い」を理由に勝手に入れない ——★**費用と価値の判断が先**。

### ★残す形（★閉じない・但し誤読を直す）

- ★**(W2) の文面を「機構は test 済・本番観測なし」に改める**（★「動くか不明」と読ませない）
- ★**新しい呼び出し元が `onRetry` を渡さないと無言になる**点を ★③ として残す
  ——★これは (W2) より広い（★retry の観測可能性が ★呼び出し側の規律に乗っている）
- ★★**(W2) の retry は ★FastSpring webhook の再送とは別機構**（★2026-09-17・★宛先訂正）。★FastSpring の再送 doc は ★(1h) に在る ——★**(1g) の一次根拠ではない**
  （★(W2)＝当課の outbound `withRoExRetry`／★doc＝FastSpring の inbound 再送）
- ★★**決着（2026-09-16・conductor）**: ★**本番発火の durable 記録（＝設計変更）は ★開店後の低優先**。★**今は起こさない。** ∴ ★(W2) は ★「機構は test 済・本番観測は開店後の低優先」で ★固定する
  ——★★問いを残さない（★宿題は担い手が消えるので、決着できる時に決着させる）

★**当課の手番は「文面の訂正」までで、★本番観測の取得は手番に含めない**
（★運に依存する待ちを owner つきの宿題にしない ——★それは [[feedback-schedule-by-event-not-date]] の形）。

### (1h) — ★FastSpring webhook 再送の一次情報（★(W2) ではない・★宛先を訂正した）

★**conductor から「(W2) の retry 機構の一次根拠として (1g) に足して」と依頼を受けたが、★★別の機構だった。**
★**一次を照合したうえで、★宛先を FastSpring webhook 側（本項）に変えて記録する。**

```
★(W2) の retry … ★当課の ★outbound retry（`lib/dial/retry-roex.ts` の `withRoExRetry`）
                  ★対象＝RoEx API の transient 5xx（★docstring「Bounded retry for TRANSIENT
                  RoEx upstream failures / Incident 2026-06-15 … preview *submit*」）
★この doc の retry … ★FastSpring が ★unprocessed な webhook を ★当課へ ★再送する（★inbound）
★∴ ★方向も vendor も別。★同じ「retry」の語で結ばれていただけ
```

★**弁別の根拠（当課の実測）**: ★`webhook_events` は ★**10 列で `attempts` 列を持たない**
（id / event_id / type / source / status / processed_at / completed_at / error_message / payload / created_at）。
★schema 内の `attempts` 列は ★ear-training と structure-training だけ。
★∴ ★(W2) の「`attempts: 1` 多数観測」は ★`withRoExRetry` 由来しかありえない。

### ★一次情報（2026-09-17 当課が実読・Kevin 返信のリンク）

https://developer.fastspring.com/reference/processed-and-unprocessed-webhook-events

```
★processed   … ★HTTP 200（bulk）＝「Consider all received events in the payload as
                successfully processed」★body は不問
                ★HTTP 202（individual）＝★body に処理した event の ID を列挙（★こちらは必須）
★unprocessed … ★**200/202 以外は すべて failure**（doc は 50X を推奨）
★再送        … ★最大 ★12 回・★7 日間（1h → 2h → 4h → 6h ×3 → 以降 24h）
★打ち切り    … ★7 日で ★permanently failed（★以後 再送されない）
```

### ★これで言えること（4 件）

1. ★**当課の 200 応答は正しい**。★`{ received: true }` は ID 列挙が無いが、★**bulk の 200 は body 不問**
   ∴ ★欠陥ではない（★当初「ID 列挙が必須では」と疑い、★一次で否定した）。
2. ★**#1041 の設計（失敗時は success を報告しない）が ★機構として裏づけられた**。
   ★parse 失敗で row を `failed` に確定 → ★tx の外で throw → ★500 → ★**FastSpring が再送する**。
   ∴ ★あの throw は ★「正直」なだけでなく ★**回復経路を開く**（★再送が来る）。
3. ★★**但し bulk 意味論ゆえ ★部分失敗は バッチ全体の再送になる**。★1 件の unparseable で 500 を返すと、
   ★同じ payload の ★成功済 event も再送される ——★冪等性が効いているので害は無い
   （★`webhook_events.event_id` UNIQUE ＋ `masterchain_purchases.order_id` UNIQUE）が、★**ログは重複する**。
   ★**設計の選択肢**: ★202 ＋ 処理済 ID の列挙にすれば ★成功分を確定でき、★失敗分だけが再送される。
   ★**今は変えない**（★開店前に webhook の応答契約を変えるのは blast radius が大きい）。
4. ★★**7 日の地平線**は新しい運用事実。★**当課側が 7 日 壊れ続けると event は permanently failed になり、
   ★以後 再送されない** ∴ ★その注文は ★webhook 経由では永久に取り戻せない（★手動 reconcile が要る）。

### ★手番

★**無し**（★記録のみ）。★3 の設計変更は ★開店後に判断する材料として置く。
★4 は ★監視の論点なので ★conductor の台帳へ回す（★当課からは起こさない）。

### (1i) — ★実装は Codex・当課は受け入れレビュー（kimny 裁定 2026-09-17）／★(W14) の受け入れ基準を先に置く

★**kimny 裁定（2026-09-17・conductor relay）**: ★**実装は Codex へ寄せ、Claude 側は計画・管理・レビューに徹する。**
★conductor が mued_v2 の ★隔離 worktree（`/tmp/codex-spawn/<task>`・branch `fix/<task>`）で 2 件 起動:

```
★① downloads-alias-redirect-20260917 … ★(W14) alias→canonical の 307 redirect
     ★射程＝`next.config.ts` の redirects() ＋ `tests/unit` のみ・★public/ app/ lib/ は不触
     ★merge は ★開店後
★② learn-batch2-20260917 … ★Learn 記事 第2弾 5 本の下書き（`content/learn`）
     ★公開しない・★kimny 目視前 ∴ ★merge は kimny の「Go」後
```

★★**当課は (W14) に着手しない**（★二重編集回避・conductor 明示）。★当課の手番は ★**受け入れレビュー**に変わった。

### ★① の受け入れ基準（★当課の実測から先に書く・2026-09-17）

★**PR が立つ前に書く理由**: ★基準を後から作ると ★実装に合わせて基準が動く
（→ [[feedback-the-check-must-not-share-an-origin-with-the-checked]]）。

**A. 射程**（`gh pr view <n> --json files` で見る・★申告と実 diff を突き合わせる）
- ★`next.config.ts` と `tests/unit/**` ★のみ。★`public/` `app/` `lib/` に 1 行でも入っていたら ★差し戻し

**B. mapping（★5 本すべて・★当課が実測した対応）**
```
MUEDlim-0.1.0-alpha-installer.pkg   → MUEDlim-0.1.2-installer.pkg
MUEDlim-0.1.1-alpha-installer.pkg   → MUEDlim-0.1.2-installer.pkg
MUEDrive-0.1.0-alpha-installer.pkg  → MUEDrive-0.1.2-installer.pkg
MUEDsat-0.1.0-alpha-installer.pkg   → MUEDsat-0.1.2-installer.pkg
MUEDsat-0.1.1-alpha-installer.pkg   → MUEDsat-0.1.2-installer.pkg
```
★**5 本とも在ること**と ★**canonical 側の綴りが `lib/*/config.ts` と一致すること**を見る
（★値を焼いた mapping は ★config が動いた日に黙って古くなる ——★(1c) で踏んだ形）。

**C. status code** … ★`permanent: false`（★= 307）。★conductor が「307 で可・middleware 不要」を確認済（(1d)）
∴ ★`permanent: true`（308）になっていたら差し戻し。

**D. ★file を消していないこと**（★最重要）
- ★`public/downloads/*.pkg` は ★**9 本のまま**（canonical 4 ＋ alias 5）
- ★特に ★**`MUEDrive-0.1.0-alpha`（sha `77a13bd14bb3`）は dsp の dist に無い唯一の実体**
  ∴ ★削除は ★不可逆。★1 本でも減っていたら ★差し戻し

**E. test が測っている性質**
- ★mapping 5 本の ★source と destination の対応
- ★★**destination が実在すること**（★でないと ★「redirect 先が 404」を緑にする ——★(1c) の #1048 で踏んだ形）
- ★`permanent: false` の pin

**F. drift の無いこと**
- ★`next.config.ts` に ★`images` / `remotePatterns` / `formats` が ★入っていないこと
  ——★入ると ★**(W2d) の前提②③⑤ が変わる**（★(1f) の再評価の引き金）∴ ★同じ PR に混ぜさせない

**G. 開店後**
- ★CI 緑 ＋ 上記 A〜F でも ★**merge は開店後**（conductor 明示）。★当課は ★早く押さない

### ★② の受け入れ基準（★Tier 1・kimny 目視前）

- ★`content/learn` の ★下書きのみ。★`LEARN_LIVE` や sitemap / robots に触っていないこと
  （★触ると ★「下書き」でなく ★公開になる ——★公開の機構は製品ごとに違う・memory 参照）
- ★数値（LUFS / dBTP）を書いているなら ★**一次情報の URL と確認日**が併記されていること
  （★(X) で確立した規律＝★Apple は LUFS も dBTP も公開していない・★−14 は Spotify だけ）
- ★**merge は kimny の「Go」後**

### (1j-0) — ★#1062（alias redirect）受け入れ ＝ ★A〜F 合致（2026-09-17・★G のみ残）

★**基準を先に書いた効果が出た回**。★PR head `65a61b43` に対して当課が実行:
```
A 射程   … next.config.ts ＋ tests/unit/downloads-alias-redirects.test.ts のみ／★範囲外 0
B mapping… ★alias source 5 行・★当課の実測と完全一致
C status … ★permanent: false が 5 件（＝307）
D 削除なし… public/downloads の .pkg ＝ ★PR 9 / main 9（★MUEDrive-0.1.0-alpha 健在）
E test   … ★★実行した ＝ 6 passed。★`existsSync(public/<destination>)` で ★destination の実在を測る
           ★★基準より 1 つ多い: 「canonical path 自身を redirect source にしない」も撃っている
           ★meta-RED（★alias 1 本を next.config から削除）→ ★1 test 落ちる ＝ ★咬んでいる
F drift  … images / remotePatterns / formats の追加 ★0
★G       … ★merge は ★開店後（時期の gate ∴ コードの問題ではない）
```
★**当課の検証は ★読み取り専用で行った**（★`refs/pull/1062/head` を fetch し、★test は当課の tree に
★一時 copy して実行 → ★削除して復元・未 commit 0）。★**Codex の branch は checkout していない**
（conductor 依頼どおり・★同じ branch を 2 つの worktree で持つと commit が衝突する）。

★**E が効いた点を記録する**: ★当課が E を基準に入れたのは ★#1048 で「redirect 先が 404」を
★緑のまま通した実体験から。★Codex はそこを覆った上に ★**redirect chain の芽**（canonical を
source にしない）まで塞いでいた ——★**基準は下限であって上限ではない**。


### (1j) — ★Codex 3 件（①EULA ②parser fixture ③reconcile）の受け入れ基準を先に置く（2026-09-17）

> ★★**この節は ★2 つの役を持つ**（2026-09-17・conductor 方針）:
> ★① 当課の受け入れ判定 checklist ／ ★② ★**不一致時に conductor が Codex へ ★そのまま渡す指示文**。
> ★∴ ★下の「決定事項」は ★**推奨ではなく要件**として書く（★「推奨」と書くと修正ラウンドで任意に読まれる）。

## ★★判定の前提 ——★「申告」の出所（★2026-09-17・conductor 合意）

★**A（射程）は ★「申告 ⇔ 実 diff」の突合で ★scope creep を捕まえる検査。**
★∴ ★**申告が ★commit 由来だと ★両者が同じ出所を持ち、★原理的に食い違えない**（＝検査が恒真になる）。

```
✗ ★commit から file 一覧を作って申告にする → ★diff と diff を比べる（★常に一致・creep 不可視）
✓ ★★prompt 側の射程（触ってよい path ／ 不触）を申告にする → ★実 diff と比べる（★食い違えば creep）
```

★**∴ 受け入れ判定では ★prompt 射程 ⇔ 実 diff で見る。**
★commit 由来の file 一覧は ★**別欄として併記**される（★当課の手間は省けるが ★申告として扱わない）。
★型＝[[feedback-the-check-must-not-share-an-origin-with-the-checked]]。

★**#1062 で「申告どおり」と言えたのは、★conductor が ★prompt 側の射程を ★先に書いていたから**。
★**commit 由来だったら、あの「一致」は何も言っていなかった。**

## ★★決定事項（★conductor 批准済 2026-09-17・★Codex への指示文としてそのまま渡せる形）

★**①同意 gate の機構**
- ★同意チェックと Buy ボタンは ★client component ∴ ★**`process.env.EULA_LIVE` を client から読まないこと**
- ★client 側の gate は ★**`NEXT_PUBLIC_*`（build 時 inline）か ★code 定数**のいずれか
- ★EULA ページ自身の gate（sitemap / robots・★server 側）は ★env で可（LEARN_LIVE と同じ）
- ★**どちらを使ったかを ★コメントで明記すること**

★**②`/[locale]/eula` の分類**
- ★**`NON_LEGAL_LOCALE_PAGES` に ★理由つきで入れる**（★`LEGAL_PAGES` には ★入れない）
- ★理由文は「★EULA_LIVE=false ゆえ未公開。★live 化の回に `LEGAL_PAGES` へ移す」の趣旨
- ★**`tokushoho` は触らないこと**（★`LEGAL_PAGES` に入れると cross-link が全 5 面に link を要求するため）
- ★未分類のまま出すと ★`tests/unit/legal-pages-locale-links.test.ts` が落ちる

★**③page の置き場所**
- ★**`app/[locale]/eula/page.tsx`（★depth 1）に置くこと**
- ★`app/[locale]/legal/eula/...` の ★入れ子にする場合は ★**同じ PR で分類 guard を再帰化すること**
  （★理由: guard は depth 1 だけを数える ∴ ★入れ子は ★CI 緑のまま分類の外に出る）

★**④reconcile script**
- ★**`--fixture` だけで全 test が通ること**（★credentials なしで検証できる形）
- ★**credentials 不在時は ★fail-closed で exit**（★勝手に発行しない・★発行は kimny 承認案件）
- ★**exit code は 3 値**: ★`0`=drift なし ／ ★`1`=drift あり ／ ★`3`=計器が成立していない
  （★「drift 0」と「読めなかった」を ★同じ 0 にしないこと）
- ★**`scripts/**` が tsconfig の exclude ＝ typecheck されない旨を ★PR 本文に明記すること**
- ★**`webhook_events` の ★本番読み取りは行わないこと**（★prod DB 読みは kimny 承認＋identity-strip）

★**⑤messages の `eula` namespace**（★「本文到着後は貼るだけ」の成否がここに掛かる）
- ★本文は ★`messages/{ja,en}.json` の ★`eula` namespace に置く（★page.tsx に直書きしない）
- ★**節ごとに key を分ける**（`{title, lastUpdated, <section>.{title,body}}`）
- ★★**1 本の巨大 string は禁止**（★差し替え時に diff が読めず ★kimny 目視のコストが上がる）
- ★**ja / en の key 集合が完全一致**（★片側だけ空文字は空デコレーションになる）
- ★**placeholder であることを ★本文自身に書く**（★preview を見た人が確定文と誤認しないため）
- ★**`messages/*.json` に formatter を当てない**（★手書き整形が正・CLAUDE.md）


★**(1i) と同じ形**。★**PR が立つ前に書く**（後から作ると実装に合わせて基準が動く）。
★**当課の実測で、★依頼文の前提と衝突する点が 4 つ在る** ——★先に出す（★差し戻しの理由になりうるため）。

---

## ★★衝突①: 「EULA_LIVE は LEARN_LIVE と同じ機構」は ★client 側では成立しない

```
★実測 … lib/learn/config.ts:8  export const LEARN_LIVE = process.env.LEARN_LIVE === "true"
         ＝ ★env var（★8 つの *_LIVE のうち ★env はこれだけ・残り 7 は code 定数）
★★問題 … ★同意チェックと Buy ボタンは ★client component（interactivity が要る）
         ★`use client` から import されるフラグは ★literal でなければ inline されない
         （★memory `reference-live-flag-gates-different-surfaces-per-product`）
```
★**∴ 面ごとに機構が分かれる**:
- ★**EULA ページの gate（sitemap/robots・server 側）** … ★env で可（LEARN_LIVE と同じ）
- ★★**同意チェックの gate（client 側）** … ★**env 不可**。★`NEXT_PUBLIC_*`（build 時 inline）か ★code 定数
- ★**受け入れ基準**: ★どちらを使ったかが ★コメントで説明されていること。
  ★**「LEARN_LIVE と同じ」だけで client 側に env を使っていたら ★差し戻し**

## ★★衝突②: `/[locale]/eula` を `LEGAL_PAGES` に足すと ★tokushoho を触らざるを得ない

```
★実測 … tests/unit/legal-pages-locale-links.test.ts:86-89
         siblings = LEGAL_PAGES.filter(p => p !== page) → ★各 page が ★他の全兄弟を link すること
★∴ eula を LEGAL_PAGES に足すと ★既存 5 面すべてに eula への link が要る
★★但し 依頼文の「不触」に ★tokushoho が入っている ＝ ★矛盾
```
★**受け入れ基準（どちらかを選び、理由を書くこと）**:
- ★(a) ★`NON_LEGAL_LOCALE_PAGES` に ★理由つきで入れる（★「EULA_LIVE=false ゆえ未公開・live 化の回に LEGAL_PAGES へ移す」）
  → ★tokushoho 不触のまま通る。★**当課の推奨はこちら**
- ★(b) ★`LEGAL_PAGES` に足し、★5 面に link を追加（★tokushoho も触る）→ ★依頼文の射程を超える ∴ ★conductor 合意が要る
- ★**どちらでもなく未分類のまま出したら ★CI が落ちる**（★#1056 の分類 test）∴ ★実装者は必ずどちらかを選ぶ

## ★★衝突③: `app/[locale]/legal/eula/page.tsx` に置くと ★分類 guard を素通りする

```
★実測 … app/[locale]/legal は ★存在しない（★依頼文の触る範囲には在る）
★★(1e) の残差3 … 分類 guard は ★depth 1 だけ。★`legal` 自身に page.tsx が無ければ ★母集団に入らない
★∴ ★app/[locale]/legal/eula/page.tsx は ★黙って分類の外に出る（★CI は緑）
```
★**受け入れ基準**: ★**`/[locale]/eula`（depth 1）に置くこと**。
★入れ子（`legal/eula`）にするなら ★**同じ PR で分類 guard を再帰化する**か、★**やらない**。
★★**「CI が緑だから分類されている」と読まないこと** ——★ここは緑になる穴だと ★当課が (1e) に書いてある。

## ★★衝突④: ③ の script は ★typecheck されない ＋ ★credentials と prod DB 読みが要る

```
★実測 … tsconfig.json exclude に ★"scripts/**/*" が在る
★∴ ★scripts/ops/reconcile-fastspring-orders.ts は ★`npm run typecheck` の対象外
★（★型＝memory `feedback-green-covers-only-what-it-executes`＝当課が同じ穴で 1 日 3 件 壊した）
```
★**加えて 2 つ、当課の権限外**:
- ★**Orders API を叩くには ★API credentials の新規発行が要る ＝ ★新しい秘密情報 ＝ kimny 承認案件**
  （★conductor は同じ理由で Sessions API の credentials 作成を見送っている）
- ★**`webhook_events` を読むのは ★prod DB 読み ＝ kimny 承認 ＋ identity-strip**
  （★memory `reference-dial-prod-db-direct-query`）

★**受け入れ基準**:
- ★**`--fixture` だけで全 test が通ること**（★credentials なしで検証できる形）
- ★**live 経路は ★inert**（★credentials 不在なら ★fail-closed で ★exit・★勝手に作らない）
- ★**exit code は 3 値**（★0=drift なし / 1=drift あり / ★3=計器が成立していない）
  ——★「drift 0」と「読めなかった」を ★同じ 0 にしないこと（★当課が本日 3 度 踏んだ形）
- ★**typecheck されないことを PR 本文に書く**か、★`tsconfig` の exclude を外す提案を ★別 PR に分ける

---

## ★① eula-page-and-consent の受け入れ基準（Tier 2）

**A 射程** … 依頼文の通り（app/[locale]/eula, components, lib/legal, messages, tests/unit/legal）。
★`next.config.ts` / `public/` / `content/` / `migrations` / `tokushoho` / live guard に ★1 行でも入れば差し戻し
（★但し ★衝突② で (b) を選ぶ場合のみ tokushoho が要る ∴ ★その時は先に conductor 合意）

**B messages のキー設計**（★conductor が明示的に見てほしいと言った点・★「貼るだけ」の成否）
- ★**本文は ★`messages/{ja,en}.json` の `eula` namespace に置くこと**（★page.tsx に直書きしない）
  ——★理由: ★terms / refund / tokushoho がすべてこの形で、★弁護士本文が来た時に ★**JSON の値を差し替えるだけ**になる
- ★**節ごとに key を分けること**（`{title, lastUpdated, <section>.{title,body}}`）。★1 本の巨大 string にしない
  ——★1 本だと ★差し替え時に ★diff が読めず、★kimny 目視のコストが上がる
- ★**placeholder であることが ★本文自身に書かれていること**（★「弁護士本文の到着待ち」等）
  ——★`EULA_LIVE=false` で非公開でも、★preview を見た人が ★確定文と誤認しないため
- ★**ja / en の key 集合が完全一致**（★片側だけ空文字は ★空デコレーションになる・memory `feedback-i18n-empty-key-unconditional-render`）
- ★**formatter を当てていないこと**（★`messages/*.json` は手書き整形が正・CLAUDE.md）

**C 同意の記録**
- ★`tags.eula_version` → 0057 の `eula_version` / `eula_accepted_at` へ保存
- ★**eula_version の値の出所が ★1 箇所**（★`lib/legal` の定数）であること。★複数箇所に焼いたら差し戻し
- ★**tags 不在でも 500 にならないこと**（★実測で `data.tags` は ★不在だった ＝ ★popup 非経由なら来ない）
  ——★★**「同意が取れていない注文」を ★どう扱うかが設計判断**。★null 許容で通すなら ★その旨をコメントに

**D test**
- ★同意なしでは Buy が ★disabled であること（★DOM でなく ★props/state の性質で）
- ★`EULA_LIVE=false` で ★sitemap / robots に出ないこと（★面ごとに見る）
- ★分類 test が緑（★衝突②③ を満たしている証拠）

## ★② fastspring-parser-fixture-tests の受け入れ基準（Tier 2・tests のみ）

**A 射程** … ★`tests/` のみ。★**本番コード不変更**（★conductor 明示）。1 行でも入れば差し戻し

**B ★fixture の出所が ★doc だけでは不足**（★これが最重要）
```
★当課の実測（memory `reference-fastspring-webhook-payload-shape`・★実注文 1 本）:
   ★data.account は ★**string**（∴ `account.contact.email` は ★常に MISSING）
   ★canonical な email は ★`data.recipients[0].recipient.email`
   ★`data.tags` は ★不在だった（★popup 非経由の注文）
★★∴ ★doc の sample と ★実測が食い違う可能性が在る。
★★doc だけを写した fixture は ★doc の形を固定し、★本番で落ちても緑になりうる
```
- ★**fixture は ★実測形と突き合わせること**。★食い違いは ★FINDINGS.md に（conductor 指示どおり）
- ★**`tags` 無し fixture が ★`account` を string で持つこと**（★実測の形）

**C live guard の test**
- ★`live=false` … ★`SKIPPED_TEST_MARKER` が入り、★**row を `processed` で封じないこと**
  ——★CCO が指摘した形（★封じると ★修復経路が閉じる）
- ★`live=true` … 通常処理

## ★③ fastspring-reconcile-script の受け入れ基準（Tier 2・開店後）

**A 射程** … ★`scripts/ops/` ＋ `tests/unit/ops` ＋ `docs/ops`。★`app/` `lib/` 不触

**B** … ★衝突④ の 4 点（`--fixture` で全 test／live は inert／exit 3 値／typecheck 外を明記）

**C** … ★**credentials を新規発行していないこと**（★秘密情報の新規作成は ★kimny 承認案件）。
★script が「credentials を作れ」と指示する文書を含むのは可・★作るのは不可

---

★**当課は ①〜③ の実装に着手しない**（★kimny 裁定＝実装は Codex）。★手番は ★受け入れレビューのみ。

### (1k) — ★Codex 5 件の受け入れレビュー実績と、そこで出た型（2026-09-17）

> ★★**着地（2026-09-17）**: ★5 件すべて決着。★#1064 #1066 #1067 #1065 merged ／ ★#1062 は受け入れ済で ★merge は開店後。
> ★**#1065 は kimny 逐語「Go」で merge → ★本番に公開された**（★下記「公開の検収」）。

### ★公開の検収 — ★merge は公開ではない（Learn 第2弾）

★**merge 直後に測ると ★5 本すべて 404 だった**（★deploy 未着）。★∴ ★**「merged」を「公開」と報告しない。**
```
★merge 直後 … 新 5 本 ★404 ／ index ★0 本 ／ sitemap ★0 本 ／ ★陽性control（既存 pillar）200
              ★検収 script の rc=1 ＝ ★**「公開」とも「非公開」とも報告しない**（3 値）
★deploy 着後 … 新 5 本 ★200 ／ index ★5/5 ／ sitemap ★5/5 ／ 陽性control 200 ＝ ★rc=0
```
★**3 面（記事本体・index・sitemap）で測った理由**: ★記事が 200 でも ★index に出なければ読者は辿れず、
★sitemap に無ければ検索から入れない ——★**「公開」は 1 つの述語では決まらない**（→ [[feedback-shipped-but-unreachable-is-silent]]）。

### ★Tier の判定（★conductor の script が正しく、★label が誤っていた）

★#1065 は ★conductor が Tier 1 と申告したが、★実 diff に `.ts` が ★2 本
（★`lib/learn/articles.ts` ＝ ★**本番コード**／`tests/unit/learn-articles.test.ts`）。
★∴ ★**Tier 1（docs・データ・コピー・テスト追加のみ）には当たらない。**
★conductor の merge script が ★Tier 1 self-merge を拒んだのは ★正しい挙動で、★label の方が誤っていた。
★**「content の PR だから Tier 1」ではなく ★registry の 1 行が本番コードか**で決まる
（→ [[feedback-tier-is-decided-by-parse-not-by-counting]]）。

★**kimny 裁定（9/17）＝実装は Codex／Claude は計画・管理・レビュー**の初日の記録。
★**基準を PR が立つ前に書く**（(1i)(1j)）を実践した結果を、★数で残す。

```
#1062 alias redirect  … ★受け入れ（A〜F）・merge は開店後      ／ 修正ラウンド 0
#1064 parser fixtures … ★条件付き受け入れ → 1 行追加で merged ／ 修正ラウンド 1
#1066 reconcile       … ★受け入れ → merged                    ／ 修正ラウンド 1（exit 0/1/2→0/1/3）
#1067 EULA scaffold   … ★受け入れ → merged                    ／ 修正ラウンド 1（②⑤ 違反）
#1065 learn batch2    … ★★差し戻し 1 回 → 修正後 受け入れ・merge は kimny Go 待ち
★★基準が閉じた defect ＝ ★5 件（①client env／②LEGAL_PAGES 誤分類／⑤単一 string／
   exit code 意味論／★新 blocking＝placeholder への無 gate リンク）
★そのうち ★2 件（②⑤）は ★**PR になる前**に閉じた（conductor が決定事項をそのまま渡した）
```

### ★型1 — 「申告射程が狭すぎて CI を通せない」という差し戻し（★#1065・新しい形）

★**Codex の失敗ではなかった。★brief の射程が ★自己矛盾していた。**
```
★`learn-articles.test.ts` は ★LEARN_SLUGS を ★完全一致で 5 要素に pin（設計どおり）
★∴ slug を足せば ★必ず落ちる
★★しかし 申告射程に ★tests/ が無い ∴ ★test を直すと `Verify declared paths` が落ちる
★★どちらを選んでも赤 ＝ ★**射程内では通せない PR**
```
★**∴ 差し戻しの理由を「test が落ちた」で止めない。★「射程では直せない」まで書く。**
★**そして ★content architecture の判断（第 2 cluster か 1 cluster の拡張か）は ★Codex に決めさせない**
——★conductor へ「意図を渡してください」と返し、★conductor が明示の判断を与えた（★これが正しい順序）。

### ★型2 — ★基準は下限であって上限ではない

★**Codex が当課の基準を上回った例が 3 件**:
```
#1062 … ★E（destination の実在）を覆った上に ★「canonical を redirect source にしない」
        ＝ ★redirect chain の芽まで塞いでいた（★当課は要求していない）
#1064 … ★fixture の email を ★recipient=john / customer=jane と ★意図的に違う値にし、
        ★canonical path の取り違えが ★原理的に検出できる形にしていた
#1067 … ★①で「どちらの flag か明記」しか要求していないのに、
        ★「取り違え禁止」と ★「両方の有効化が公開条件」まで書いていた（★2 鍵）
```
★∴ ★**受け入れ判定は「基準を満たしたか」で止めず、★上回った点も記録する**（★次の基準の材料になる）。

### ★型3 — ★gate の欠陥 2 つを自分で踏んだ

```
★① 同名 check の ★重複 run … PR 本文を直して re-run すると ★古い failure が残る
   ★実測（#1064）… failure 02:28:18 / success 02:31:33 が ★同居
   ★件数で数えると ★永久に赤 ∴ ★**name ごとに started_at 最新の 1 本だけを見る**形へ直した
★② `mkdir -p` は ★dir が新規かを教えない
   ★`rm -rf docs/ops` で ★既存 5 file を削除（★git checkout で復旧・push はしていない）
   ★∴ ★**持ち込んだ file だけを名指しで消す**
```

### ★型4 — ★レビューは detached worktree で行う

★**当課の tree に 21 file を copy する形は ★事故る**（★型3② がまさにそれ）。
```
git worktree add --detach <tmp> refs/pull/<n>/head
★→ ★branch を checkout しない ∴ ★Codex の worktree と衝突しない
★→ ★当課の tree は無変更 ∴ ★片付けの取り違えが起きない
★→ ★node_modules を symlink すれば ★全 suite も typecheck も回る
```
★**#1067（21 file）と #1065 でこの形を使い、★どちらも当課の tree は未 commit 0 のまま済んだ。**

### ★型5 — ★「申告」の出所は ★prompt 側（★repo が既に機械化していた）

★**当課は「申告を本文に」と依頼したが、★repo には既に `scripts/ci/check-codex-scope.ts` が在った**
（★`- 編集を許した path: ['…']` を ★本文に ★ちょうど 1 回・★`fix/codex-` branch 限定・
★**base branch 側から実行**＝PR が checker を弱められない設計）。
★∴ ★当課の依頼は ★半分 既存機構の再発明。★**但し出所の規律は残る**
——★commit から作った一覧を宣言にすると ★checker も恒真になる（→ [[feedback-the-check-must-not-share-an-origin-with-the-checked]]）。

### (1l) — ★advisory 価格 分岐 A 確定（kimny 裁定 2026-09-21）／★#1069 新 head の受け入れ基準を先に置く

★**kimny 逐語（conductor relay・2026-09-21）**:
> ★**「Aで。advisory は小規模事業者に絞って展開しよう。旧来のadvisory はマーケティングに的にもスキーム的にも失敗である。なぜなら売り上げがゼロだからだ」**

★**∴ 旧 3 段（診断 250,000／構築 200,000〜／並走 400,000〜）は ★販売終了。** ★advisory は 小規模事業者向けの新体系のみ。
★**撤退下限（6/29 構築 ¥150k）との関係は「旧線の販売終了」で解消**＝別商品の議論は不要（conductor 整理）。

★**当課の手番は ★受け入れレビューのみ**（kimny 裁定 9/17＝実装は Codex）。★同 branch に積まれる・PR は #1069 のまま。

---

## ★新体系（PR head `de9f5185` の `advisory.pricing` から実測）

```
★初回相談          … 無料（60分）                      values.initialConsultationYen = 0
★3ヶ月 業務改善・自走化プログラム … 月額100,000円（税込110,000円）／総額300,000円（税込330,000円・分割可）
★社内お守りプラン    … 月額30,000円（税込33,000円）        ★月単位で解約可
★スポット相談       … 30,000円（税込33,000円）／90分
```
★**`advisory.pricing.values` に ★数値が在る**（0 / 100000 / 300000 / 30000 / 30000）
∴ ★**tokushoho 側の期待値は ★ここから導出できる**（★焼くと片方だけ動いた日に黙って古くなる）。

## ★★測定 —— ★旧価格は ★3 つの層に残っている（PR head `de9f5185`）

```
★advisory namespace … ★0 件（ja/en とも）        ← ★conductor の申告と一致
★tokushoho         … ★6 数すべて（ja/en とも）   ← ★法定表示に旧価格
★app/llms.txt      … ★3 数（★税抜のみ）          ← ★¥250,000／¥200,000／¥400,000
★他の namespace     … ★0 件（main / PR head 双方で確認）
```
★**∴ 母集団を「ja/en 全 namespace」へ広げても ★偽陽性は出ない**（★これが広げてよい根拠）。

## ★★① `RETIRED_PRICES` 自体が不足していた（★母集団と別の欠陥）

★現行 = `[250000, 220000, 440000]` の ★**3 数のみ**。★旧 3 段は 税抜/税込 で ★**6 数**:
```
250,000 / 275,000   ・   200,000 / 220,000   ・   400,000 / 440,000
```
★★**llms.txt は 税抜しか書いていない** ∴ ★**現行 3 数では 200,000 と 400,000 を ★原理的に検出できない**（250,000 だけが咬む）。
★**母集団を広げるだけでは足りない** ——★**列が足りなければ 広げた先でも 緑になる。**

★**偽陽性の不在を測った**: 6 数のいずれも 新価格の文字列（0／100000／300000／330000／110000／30000／33000）の ★部分文字列にならない。
★★**但し `30000` を RETIRED に入れてはならない**:
```
★旧 壁打ち 30,000 は ★新 spot 30,000 として ★生き残る（★同じ値が 退役側と現行側に在る）
★かつ ★"300000"（新 総額）は ★"30000" を ★部分文字列に含む
```
★**そして `replace(/[\s,，]/g,"")` の圧縮は ★隣接する数値を連結しうる**
（★例「100,000 200,000」→「100000200000」は ★"200000" を含む）∴ ★**桁区切りを保った照合か、数値トークン比較の方が強い。**

## ★★② 法定表示が新体系と矛盾する（★最重要・ja/en 両方・★当課の観点）

★`tokushoho.advisory.cancellation` は逐語で「★**月額サービスはいつでも解約できます**…翌契約月以降の課金は停止します」。
★**新体系は「3ヶ月プログラムは3ヶ月契約です」。**

```
★∴ ★法定表示 が 中途解約権を 与え、★製品面 が 否定する
★★向きが 会社に 不利（★法定表示の方が 効く）
★かつ ★総額300,000円「分割可」 ∴ ★中途解約時の ★残額精算基準が 表示対象
★★現行の控除条項は ★診断（単発）向け ∴ ★3ヶ月プログラムを 射程していない
```

## ★★③ 支払方法が placeholder のまま（★ja/en 両方・★2 箇所が別の言い方）

```
★advisory.paymentTiming … 「※ 支払方法（請求書または決済リンク）は決済設計の確定後に記載します。」
★tokushoho.payment      … 「MUED advisory: 個別にご案内します」
```
★**「後で記載します」は ★未表示の自認。** ★販売を開始するなら確定表示が要る・★「分割可」なら回数と時期も。
★**2 箇所在るので ★片方だけ直すと食い違う**（→ [[feedback-retirement-is-fail-silent]] の層またぎ grep）。

---

## ★新 head の受け入れ基準（★A〜G・★PR が立つ前に置く）

★**理由**: ★基準を後から作ると ★実装に合わせて基準が動く（→ [[feedback-the-check-must-not-share-an-origin-with-the-checked]]）。

```
★A 射程    … ★申告と実 diff の突合（`gh pr view 1069 --json files`）
★B 旧価格   … ★6 数が ★ja/en 全 namespace ＋ llms.txt で ★0 件
★C 新価格   … ★`tokushoho.advisory` に ★在ること（★不在の assert だけでは 空にしても緑）
★D locale  … ★ja/en の key 集合が ★完全一致（★片側空文字は 空デコレーション）
★E 法定表示 … ★6 項目（価格・税・★支払方法・★解約条件・役務提供時期・連絡先）が
              ★★新 3 メニューすべてを 射程しているか（★②③ が閉じたか）
★F 整形    … ★`messages/*.json` に formatter が当たっていないこと
★G meta-RED … ★★当課が撃つ。★`tokushoho` を旧文言に戻して ★新 test が 赤くなることを見る
              ★★test 側の定数を壊してはならない（★両方 直るので 検出にならない）
```

★**merge は ★kimny 目視の後**（★機械検査が全緑でも押さない）。

## ★★落とせない後続 —— ★content課 への canonical 通知

★**旧 3 段の販売終了 ＝ ★product spec の退役 ＋ ★価格改定** ∴ ★`canonical-change-notification` の発火条件そのもの。
★★**この rule の実例が まさに Hoo Pass 退役で落ちた件**で、★原因は ★「merge 後にやる」と後ろへずらしたこと。
★**∴ ★押す者が その手で送る。** ★担い手は conductor へ確認中（(a) 押す者／(b) conductor 一括・★当課推奨は (a)）。
★**`next_action` でなく `blocked_by` に置く**（★退役は構造的に fail-silent）。

### (1l-1) — ★全レイヤー sweep の 2 件（★`--include` を付けずに撃った・2026-09-21）

★**CLAUDE.md「価格改定は全レイヤーを網羅する（Stripe定数 → UI → 翻訳 → ★AIプロンプト → テスト期待値）」**に従い、
★`--include` を ★付けずに repo 全体を撃った（→ [[feedback-zero-hits-means-your-filter-not-absence]]）。

## ★★① Codex が基準を上回った —— ★JSON-LD が ★焼き値から 導出へ（★型2）

★**main には ★構造化データに旧価格が ★焼かれていた**（★当課は これを criteria に挙げていない）:
```
★main  app/[locale]/advisory/page.tsx … price: "275000" / "220000" / "440000"
★★＋ 生文言も … "22万円〜／月（税込）" / "44万円〜／月（税込）"
★PR head … ★literal 0。★`tPricing.raw("values")` からの導出:
   price: String(taxIncluded(priceValues.programTotalYen))
   priceSpecification.price: String(taxIncluded(priceValues.programMonthlyYen))
```
★**∴ ★構造化データが messages から ★乖離できない形になった。**
★**効く理由**: ★JSON-LD は ★AI/検索が読む面で ★人の目視では見つからない
（→ [[feedback-shipped-but-unreachable-is-silent]] の裏＝★見えないから壊れても報告されない）。

★**残差（★差し戻しではない・★手番は次に触る回）**:
```
★`taxIncluded = (p) => Math.round(p * 1.1)` ＝ ★税率 10% が ★code 側にも在る
★`advisory.pricing.taxNote` にも「消費税10%」が在る ∴ ★税率が動く日に ★2 箇所
```

## ★★② ★母集団を ★repo 全体へ広げてはいけない（★数値の部分一致・★実測）

★conductor の射程（★ja/en 全 namespace ＋ llms.txt）は ★偽陽性 0（★当課 実測）。
★**但し「広い方が安全」と読んで ★repo 全体へ広げると 壊れる**:

```
★550e8400-e29b-41d4-a716-446655440000 （★UUID・booking/interview の test）→ ★"440000"
★86400000  （★1 日 の ms）  → ★"400000"
★259200000 （★3 日 の ms）  → ★"200000"
★7200000   （★2 時間 の ms）→ ★"200000"
★（新価格側は衝突なし … 330000 / 100000 とも 0 件）
```
★**∴ ★射程は 今のまま が正しい**（★広げないことが ★手抜きではなく ★測った上の判断）。
★★**将来 広げるなら ★裸の数字でなく ★`円` / `¥` と桁区切りを含む形で照合する。**
★★**さもないと「除外リストを足す」方向に行き、★母集団が静かに縮む**
——★**これは #1049 で踏んだ「包含リスト」の ★裏返し**（→ [[feedback-check-population-exclusion-not-inclusion]]）。

### (1l-2) — ★①② の文言に ★durable な guard が付いた（★conductor が Codex へ追加投函・2026-09-21）

★**当課の指摘**: ★③ が assert するのは ★価格（数値）だけ ∴ ★①②（法定表示の文言）は
★**直った瞬間から無防備**——★次に特商法を触った日に ★黙って戻りうる。
★**当課の検証器は ★session 限りの script** ∴ ★durable な guard にならない。

★**conductor が投函した 2 本**:
```
★(a) cancellation が「いつでも解約 / at any time」を含むなら ★「3ヶ月 / 3-month」も含むこと
★(b) tokushoho.payment と advisory.paymentTiming に ★placeholder 文言
     （確定後に記載 / will be stated once）が ★無いこと
★いずれも ★圧縮前の生文字列に当てる ＋ ★ja/en の発火数一致も assert
```
★**∴ ★当課の E2 ＝「★repo の test が 赤くなるか」を ★新 head で測る**
（★`tokushoho.advisory.cancellation` に「いつでも解約」を戻して ★赤を見る）。
★**緑なら ★unguarded として `blocked_by` に残す**（★conductor と合意）。

★**当課が この作業中に ★自分の計器で 2 回 踏んだ形**（★申し送り済）:
```
★① ★空白を落とした文字列に ★語を含む EN の pattern を当てていた
   （"arranged individually" → "arrangedindividually" ∴ ★永久に一致しない）
★② ★"cancelled at any time" を ★"cancel at any time" で撃って ★EN を取りこぼした
★★どちらも ★tell は「★ja だけ発火して en が沈黙する非対称」
★★∴ ★数値は圧縮して可・★語は raw に当てる・★ja/en の発火数一致を見る
```

### (1m) — ★#1069 新 head `519ecd8e` の判定：★内容 PASS・★merge 不可が 2 件（2026-09-21）

★**基準は head が立つ前に置いた**（(1l) の A〜G）。★以下は ★その基準で測った結果。

## ★内容 —— ★PASS

```
★検証器（B/C/D/E）    … ★rc 0 ／ ★self-RED が旧 head の ★11 件を検出（＝計器は生きている）
★★E2 meta-RED ★5/5 赤 … ★壊したのは ★対象側（messages / llms.txt）・★test 側の定数は壊していない
★全 unit suite        … ★167 file / ★2,371 test 緑（★2,353 → +18）／ ★tsc rc 0
★F 整形               … ja 78 / en 76 行（全 2,650 行）＝ ★局所・formatter 痕跡なし
★preview              … /ja/advisory と /ja/tokushoho とも ★新価格 6 種・★旧価格 ★0 件
```

★**Codex が基準を上回った点**（★型2）: ★`docs/advisory/legal-pricing-review-20260921.md` が
★**「回答を得て表示を確定するまで ★販売開始・法定表示確認完了とは扱わない」**と自ら書き、
★**「meta-RED は mued 課の検収担当。Codex は本補正でその検収を代行しない」**と ★検証の代行を辞退した
（→ [[feedback-the-check-must-not-share-an-origin-with-the-checked]] を ★実装側が守った形）。
★旧包括文「月額サービスはいつでも解約できます」を削除し ★お守りプランだけに限定・
★3ヶ月の中途解約を ★可とも不可とも断定していない（★創作しない側に倒した）。

## ★★merge 不可 ① —— CI が赤（`Verify declared paths`）・★当課は宣言を書けない

```
★逐語 … Codex scope check failed: the PR body has no single parseable '編集を許した path' line.
★★旧 head `de9f5185` でも 04:20:15Z に failure ＝ ★新 commit が壊したのではない
★CI 本体（Build / Test / Validate）は ★緑。★落ちているのは "Codex scope" workflow だけ
★★当課の前回判定はこれを見落とした（★check-runs を name ごとに引いていなかった）
```
★★**当課が宣言行を書いてはいけない。** ★根拠は ★checker 自身の docstring:
> `Check a Codex-authored PR against the path allowlist written into its body by the ★ordering [party]`

★**∴ 宣言の出所は ★発注側。** ★**実 diff から作ると `findOutOfScopeFiles` が空になることが保証され、
★checker が ★恒真になる**（→ ★(1k) 型5 に当課が書いた形そのもの）。
★**新 head で 2 path 増えた**（`app/llms.txt/route.ts` ／ `docs/advisory/legal-pricing-review-20260921.md`）
——★**実 diff を写すのでなく ★発注に含めたかで書く。**

## ★★merge 不可 ② —— ★`[kimny 確認]` が ★客に見える側に出る（★merge ＝ 公開）

★**特商法ページは ★すでに本番 live**（#1049）∴ ★**merge が公開**。

```
★preview /ja/tokushoho を ★script と ★描画 DOM に分けて数えた:
   ★script（RSC payload）内 … 10 件
   ★★描画 DOM 内           … ★★5 件 ← ★客に見える側
★★囲みタグは ★<p> ＝ ★可視テキスト（★hidden 属性や payload だけではない）
★→ [[gotcha-innertext-is-not-visibility]] の逆向き ＝ ★今回は ★本当に見える
```
★**Codex の docs は「販売開始とは扱わない」で ★売る側を止めているが、★ページの公開は止まらない。**
★**当課の推奨＝(a)**: ★kimny の 2 点（支払方法・分割／中途解約）回答 → ★マーカーを確定文へ置換 → merge。
★(b) 今 merge ＝ ★法定表示ページに社内マーカー ／ ★(c) flag で伏せる ＝ ★売るなら表示義務は残るので先送り。

## ★★当課の計器が 3 回 壊れた（★同じ session 内・★申し送り）

```
★① ★空白を落とした文字列に ★語を含む EN の pattern を当てた
   （"arranged individually" → "arrangedindividually" ∴ ★永久に一致しない）
★② ★"cancelled at any time" を ★"cancel at any time" で撃って ★EN を取りこぼした
★★③ ★meta-RED の case が ★no-op だった（★"¥30,000" で注入・新 head は ★全角「円」）
   ★→ ★test は正しく緑 ★→ ★「llms.txt は母集団の外＝unguarded」と ★報告しかけた
   ★→ ★実際は ★source の readFileSync ＋ ★GET 応答の ★2 本で咬んでいた
```
★**①② の tell は ★「ja だけ発火して en が沈黙する非対称」。**
★**③ は ★向きが悪い** ——★**存在しない欠陥を他課へ報告する側**に倒れる。
★**型は memory へ**: [[feedback-a-red-case-that-no-ops-reports-unguarded]]
（★陽性対照は ★計器を検査するが、★★RED case 自身は 誰も検査しない）。

★**手当て（★以後 meta-RED を書く時）**:
```
★注入対象の文字列が ★実在することを ★先に assert（★無ければ「この case は無効」と印字して ★合否を出さない）
★★「壊した」を ★git diff で確かめてから ★合否を読む
★★「unguarded」と書く前に ★test が その file を読んでいるかを ★grep で 1 回 逆から測る
```
