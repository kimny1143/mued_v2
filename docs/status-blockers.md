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

### (1n) — ★#1069 の確定文を当課が適用（★kimny 確定回答 2026-09-21）／★conductor の完了条件に 1 つ穴が在った

★**conductor が実装を当課へ差し戻した**（★kimny 9/17 裁定＝実装は Codex だが、★task の割り振りは conductor の委任範囲）。
★**blocker ① は conductor が処理**（★PR 本文に ★発注側の射程で宣言行を追記 →★`Verify declared paths` は ★05:24:28Z に ★success）。

★**kimny 確定回答（conductor relay・逐語の要点）**:
```
★1. ★中途解約なし。★一括払いもしくは分割払いのみ
★2. ★支払方法は Stripe で商品作成済。★但し Stripe CLI は API key 期限切れ ∴ ★分割の各回の支払期日は未確認
```

## ★★conductor の完了条件① が ★locale 盲目だった（★当課の検出）

```
★conductor の完了条件 … 「`git grep "kimny 確認"` が PR branch で 0 件」
★conductor の申告     … 「en.json にマーカーは 0 個」
★★当課の実測          … ★ja.json 5 個（`[kimny 確認:`）／★★en.json 5 個（`[kimny confirmation:`）
★★∴ ★完了条件を満たしても ★EN の特商法ページは ★マーカーを出し続ける
```
★**綴りが locale で違うので、★片方の述語では ★もう片方が ★永久に見えない。**
★**当日 3 度目の同型**（→ [[feedback-a-red-case-that-no-ops-reports-unguarded]] の周辺・★tell はいつも「ja だけ発火して en が沈黙」）。
★**∴ ★述語を ★`/\[kimny (?:確認|confirmation):/` の ★1 本にして ★locale 非依存にした。**

## ★★test は マーカーの ★存在 を assert していた（★消すと赤くなる）

```
★line 151 … expect(globalMethod).toMatch(/未確定.*\[kimny 確認:/ : /not yet confirmed.*\[kimny confirmation:/)
★line 172 … expect(program).toMatch(/\[kimny 確認:.*中途解約の可否/ : /…early termination is permitted/)
★line 180 … expect(paymentTiming).toMatch(/分割の回数・各回の金額と支払期日/ : /…due date of each installment/)
★∴ ★確定文へ置換するには ★test も同じ回に付け替える必要が在った（★`tests/unit` は宣言射程内）
```
★**足した検出子 2 つ ＋ ★陽性control 1 本ずつ**:
```
★pendingMarker   … ★2 綴りを locale 非依存で（★上の穴を ★test 側で塞ぐ）
★inventedDueDays … ★「14日以内」/「within N days」＝ ★発明された日数
   ★理由＝★kimny は ★支払期日を確定していない ∴ ★書いてはならない。
   ★conductor の指示「日数を発明しないこと」を ★散文でなく ★assert にした
```

## ★確定文（★両 locale・★行単位置換のみ・formatter 非適用）

```
★支払方法（有料3メニュー共通）… クレジットカード（Stripe 経由）又は銀行振込（請求書）
   ★★payment.value と paymentTiming の先頭行に ★同一文字列で入っている
   ∴ ★global 置換で 2 箇所が同時に直る（★test が両者の ★一致 を assert している）
★3ヶ月プログラムの支払時期 … 一括又は分割。★分割は 月額100,000円（税込110,000円）を ★3 回、各契約月の初め
   ★支払期日は ★「請求書に記載の支払期日まで」（★日数は書かない）
   ★★3 回 は ★公開済の価格表（月額100,000円 × 契約期間3ヶ月 ＝ 総額300,000円）から ★導出される ∴ ★発明ではない
★スポット相談 … 都度請求・★請求書に記載の支払期日まで
★中途解約 … ★契約成立後の中途解約及び返金は不可。★分割払いの未払残額は ★契約期間満了まで存続
★社内お守り（月単位解約）／スポット（前日までキャンセル・全額返金）… ★既存文のまま
★連絡先 … ★メールのみ（★電話番号は書かない）
```

## ★検収（★当課が測った）

```
★マーカー   … ★2 綴りで ★ja 0 / en 0（★messages・★preview の DOM・★script payload とも）
★meta-RED  … ★★6/6 赤（★① ja だけマーカー ★② ★en だけマーカー ★③ 14日以内 ★④ 中途解約なしを消す
              ★⑤ 支払方法を placeholder へ ★⑥ 分割3回を消す）
              ★★② が ★conductor の完了条件では拾えなかった側
★suite     … ★167 file / ★2,373 test 緑 ／ ★tsc rc 0
★整形      … ja / en とも ★6 行 変更・★行数 2,650 不変 ＝ ★formatter 痕跡なし
★preview   … ★/ja/tokushoho ・/en/tokushoho とも ★マーカー 0 ／ 旧価格 0 ／ 新価格 6/6
              ★★status ではなく ★本文の述語で判定（★deploy 未着なら旧内容が 200 で返る）
★★leaflet PDF … ★旧価格 0 ／ マーカー 0 ／ 電話番号 0 ／ support@mued.jp 在り
              ★★陽性control＝新価格 6 種すべて 見える（★これが無いと 0 は無意味）
★leaflet HTML … ★電話欄は ★空欄（`aria-label="手書き用の空欄"`）＝ ★kimny 指示どおり
              （★web はメールのみ・★商工会議所 行き PDF に ★後で手書き追記）
★/refund   … ★矛盾なし（★§5 が「購入時点で表示される条件」へ委ねている・★plugins は FastSpring MoR 範囲）
```

★★**PDF は「再生成」ではなく「★成果物を直接 検証」で閉じた。**
★前回 当課は ★`qrcode` 不在で ★再生成できず ★「検証不能」と報告した。★**再生成は手段であって目的ではない**
——★`pdftotext` で ★中身を読めば足りる。★**但し ★自作の zlib 抽出では ★旧も新も 0 件になった**
（★= ★陽性control が落ちた ∴ ★あの 0 は ★証拠ではなく ★計器の死）。

## ★★残件 1 つ（★merge を止めない・conductor 合意）

★**分割の各回の具体的な支払期日**は ★Stripe で確認後に必要なら追補。
★**「請求書に記載の支払期日まで」で ★特商法上は成立する**（★期日を ★書面で特定する形）。
★**Stripe CLI は API key 期限切れ**（`stripe login` 未実施）＝ ★当課は ★API key を作らない（★秘密情報の新規作成は kimny 承認案件）。

## ★当課が添える ★法務上の注記（★差し戻しではない・★kimny 判断の材料）

```
★① ★「中途解約なし」は ★事業者間契約（★対象＝小規模事業者）を前提に ★開示として適法
   ★特商法 通信販売 に ★役務の法定クーリングオフは無い ∴ ★条件を ★開示すれば足りる
★★② ★但し ★購入者が ★消費者（非事業者）の場合、★消費者契約法 10 条 で
   ★絶対的な不返金条項の ★一部が 効力を争われうる（★開示義務とは別の層）
★★③ ★今回は ★着手前キャンセルも 不可 の ★一本化（★conductor 明示・kimny 回答が「中途解約なし」の一本）
   ＝ ★最も強い形 ∴ ★争われるとすれば ★ここ。★当課は ★指示どおり適用し、★事実として添える
```

### (1n-1) — ★開示は「書いてある面」で決まる（★conductor 追記・2026-09-21）

★**conductor が head `2b9084f4` を ★独立に実測して承認した上で、★1 件 足した。**
★**指摘（要旨）**: ★中途解約不可は ★今回の条件で最も強く、★買い手の判断を変える。
★**それが ★価格表と同じ画面に出ず ★特商法ページにしか無いのは ★開示として弱い。**

```
★before … advisory.pricing.cancellation は ★「3ヶ月プログラムは3ヶ月契約です」だけ
          （en は "a fixed three-month engagement"）
          ★★＝ ★契約期間は言うが ★中途解約不可も 未払残額の存続も 言っていない
★after  … ★両 locale に 1 文 追加（★tokushoho 側と ★同一句）
```

## ★★同一句にしたのは ★意図（★言い換えると検出できなくなる）

```
★tokushoho … 「契約成立後の中途解約及び返金はお受けできません」
★LP        … ★同じ句を使う
★★∴ ★1 本の regex が ★両面に当たる ＝ ★cross-surface guard が ★成立する
★★片面を ★言い換えると ★guard が死ぬ（★実測＝meta-RED ③）
```

## ★test は ★方向を持つ implication guard

```
★tokushoho が 述べている        → ★assert（★左側）
★★∴ 価格表も 繰り返している      → ★assert（★右側）
★★どちらの面から 落ちても 赤くなる
★＋ LP 側に ★未払残額 が在ること ／ ★お守りの月単位解約が残っていること ／ ★マーカー 0
```

## ★meta-RED（★対象側を壊す・★4/4 赤）

```
★① ja LP から 中途解約不可を落とす      → ★赤
★② en LP から落とす                    → ★赤
★★③ ja LP を ★言い換える（同一句でなくする）→ ★赤 ＝ ★同一句の設計判断が ★効いている証拠
★④ ja tokushoho から落とす（★implication の左側）→ ★赤
```

## ★検収

```
★suite … ★167 file / ★2,375 test 緑（★2,373 → +2）／ ★tsc rc 0
★整形  … ja / en とも ★2 行 変更・★行数 2,650 不変 ＝ ★formatter 痕跡なし
★head  … `8f6856e6`（★2b9084f4 から fast-forward）
```

## ★★待ち方の計器で 1 つ 直した（★aim）

★**deploy の着地を待つ述語に ★「マーカー 0」を使っていたが、★それは ★前 head でも真**
∴ ★**この回の deploy を ★弁別できない**（★= ★aim が合っていない・★液性は生きているが 向きが違う）。
★**直した形**: ★この commit が足した ★1 文（`/ja/advisory` と `/en/advisory` の描画 DOM）を述語にした。
★**型**: → [[feedback-instrument-liveness-aim-fidelity]] の ★aim。
★**「0 件」を待つ述語は ★変化の前後で同じ値を取りうる** ——★待つなら ★変わる側を見る。

## ★★conductor 側の自己申告（★記録として残す）

★**conductor 逐語**: ★**「完了条件に『en.json にマーカーは 0 個』と書いたのは ★私の grep が `kimny 確認` の
1 綴りしか見ていなかったためです。★綴りが locale で分かれることを見落としました。」**
★**∴ ★同じ穴が ★検査する側（conductor の完了条件）と ★される側（当課の計器 3 件）の ★両方に出た**
——★(1n) に書いた「当日 4 度」の ★4 件目が ★他課の側だった、という記録。

## ★残件（★merge を止めない・★owner＝kimny / conductor）

★**Stripe**: ★`stripe login` を kimny が実行したが ★ブラウザ確認が行われず ★`exceeded max attempts` で失敗。
★**∴ 分割の各回の支払期日は ★未確定のまま**。★「請求書に記載の支払期日まで」で ★特商法上は成立。
★**当課は ★API key を作らない**（★秘密情報の新規作成は kimny 承認案件・★conductor も「正しい」と確認）。

### (1n-2) — ★支払方法をメニュー別に分けた（★kimny 確定 2026-09-21）／★guard を壊さずに分ける形

★**kimny 逐語**: ★**「じゃあ30万については請求書払いにしよう。他二つはstripeもあり。」**
★**「税別で登録してるから請求は10%加算されるはずだよ」**

★**機序（conductor 実測）**: ★Stripe 本番に ★`¥100,000 × 3 回` の ★価格オブジェクトが ★存在しない
∴ ★**3ヶ月プログラムは ★カードで請求できない** → ★kimny が ★全体を請求書払いへ寄せた。

```
★3ヶ月プログラム   … ★銀行振込（請求書）★のみ
★社内お守りプラン   … カード（Stripe 経由）又は 銀行振込（請求書）
★スポット相談      … 同上
★MUEDial・MUEDsp  … ★不変
★分割（月額100,000円 を 3 回・各契約月の初め）… ★そのまま成立（★請求書払いなので）
★支払期日 … ★「請求書に記載の支払期日まで」を維持（★日数は発明しない）
```

## ★★cross-surface guard を ★壊さずに分けた形

★**問題**: ★従来は ★`payment.value` の行と ★`paymentTiming` の先頭行を ★**行全体で `toBe`** していた。
★**メニュー別にすると ★前置き（`MUED advisory: ` / `支払方法: `）が違うので ★行全体は一致しない。**

★**解**（★conductor が形は任せると明示）:
```
★payment.value  … ★"MUED advisory: " ＋ ★COMMON
★paymentTiming  … ★"支払方法: "     ＋ ★COMMON      （en は "Payment method: "）
★★test は ★前置きを剥がした ★残りの byte 一致を assert する
★★∴ ★前置きは違ってよく、★substance は 1 文字も違えない
```
★**これは ★従来より強い**: ★行全体の `toBe` は ★前置きの一致まで要求していた（★本来 不要な制約）。

## ★★meta-RED 5/5 赤（★① は conductor 指定）

```
★★① ja 3ヶ月に ★カードを書く → ★赤（★決定が後から戻された時に咬む）
★★② en 同じ                → ★赤
★③ ★片側だけ書き換える      → ★赤 ＝ ★共通部分の一致が効いている
★④ 3ヶ月から「のみ」を落とす → ★赤（★排他が消えるのを検出）
★⑤ 他2つから カードを落とす  → ★赤
```

## ★検収

```
★suite … ★167 file / ★2,375 test 緑 ／ ★tsc rc 0
★整形  … ja / en とも ★4 行・★行数 2,650 不変 ＝ formatter 痕跡なし
★preview（描画テキスト）… ★3ヶ月の節に カード ★無し／★他2つの節に カード ★在り（★両 locale）
★支払方法を述べている面の全数 … ★`tokushoho.payment.value` と ★`tokushoho.advisory.paymentTiming.value` の ★2 つだけ
   ★`advisory.pricing` … ★支払方法の記載なし（conductor の確認と一致）
   ★`app/llms.txt` … ★0 件 ／ ★`tokushoho/page.tsx` … ★直書きなし（★コメントに語が在るだけ）
```

## ★★当課が添える 2 件（★差し戻しではない）

### ★① ★税の不確かさの ★射程が ★狭まった（★kimny の決定の副作用）

```
★3ヶ月プログラム … ★請求書払いのみ ∴ ★税額は ★当社の請求書 で決まる ＝ ★当社の統制内
★お守り / スポット … ★カード経路が在る ∴ ★税額は ★Stripe Tax が計算する
★★∴ ★「10% 加算」が未実測であることの影響は ★カード払いの 2 メニューに限られる
★★`txcd_20060048` が入っていることは ★税コードの割当を示すが、
   ★Stripe Tax が ★有効であることや ★JP 顧客に 10% が ★実際に乗ることは ★別の事実
★★∴ ★開店前に ★JP の test 顧客で ★¥33,000 が ★実際に請求されるかを 1 回 見る（★owner＝conductor / kimny）
```

### ★② ★plan の ★key 名が ★退役メニューのまま（★低優先・★将来の罠）

```
★`tokushoho.advisory.price.plans` の key … ★`diagnosis` / `build` / `companion`
★★中身は ★3ヶ月プログラム / 社内お守りプラン / スポット相談（★新体系）
★∴ ★`diagnosis` を grep した人は ★3ヶ月プログラムに当たる
★★ja/en で key は一致しているので ★壊れてはいない（★描画もされない）。★誤導だけが残る
★→ [[feedback-retirement-is-fail-silent]]（★値は変わったが ★名前は退役しなかった形）
★★改名は ★page component と ★key 一致 test に及ぶ ∴ ★別 PR。★今回の射程（支払方法）では触らない
```

### (1n-3) — ★リーフレットの確定文と ★PDF 再生成（★kimny Go 2026-09-21）／★pdftotext の折り返し

★**kimny 逐語**: ★**「いいね。ただ、かつては、だとカッコよすぎる。そこは前職では、に直しておいて。あとはgoです」**
★**再指定**: ★**「会社員じゃなくて個人で受けてたな。どれもしっくり来ないし前職で通じると思うんだけど」**
★**conductor が代替 4 語（会社員時代は／もとは／20代の頃は／以前は）＋構成変更案を出し、★kimny が全て却下** ∴ ★「前職では」で確定。
★（★当時は 雇用でなく ★個人受託 ——★「前職」は ★前の仕事 という普通の用法の範囲・conductor 確認済）

## ★★保留の扱い（★1 語が未確定だった 20 分間）

★conductor が ★1 語だけ保留し ★「HTML は進めて可・PDF は待て」と指示。
★★**当課は ★当該 1 文を ★旧文言のまま残した**（★他は適用）。★**placeholder を入れなかった**:
```
★理由 … ★[kimny 確認] マーカーが ★客に見える側へ出た件（(1m) 不可 ②）と ★同じ形になる
★★かつ ★語を発明しない（★conductor 指示「日数を発明しない」と同じ規律）
★★∴ ★HTML は常に ★shippable な状態を保った
```
★**その間 ★HTML と ★committed PDF が乖離していた**（★実測: PDF 側に 目黒区青葉台 ×2・実働拠点 ×1）。
★**当課は これを blocked_by へ上げる準備をしていたが、★語の確定が先に来たので ★HTML と PDF を ★1 commit で landed**
∴ ★**乖離は ★repo に入っていない。**

## ★確定文（★両面）

```
★MUED advisory アドバイザー　木村篤史（株式会社glasswerks 代表取締役）
★商業音楽制作20年以上。2021年に株式会社glasswerks（グラスワークス）を設立。
★制作業務の傍ら、音楽サービス mued.jp を AI で自ら作り、日々運用しています。
★前職ではPCサポートを月200件ペースで担当。八王子市在住。
★★locations 2 行（実働拠点・本社）… 削除
```
★**判断の記録**（conductor 経由）: ★代表取締役を残したのは ★読み手が小規模事業者の経営者だから
（★同じ立場が伝わる語を落とさない）／★目黒の本社を八王子の読み手に並べると ★地元の線が弱まる（kimny）。
★**web との整合**: ★`advisory.who.body1` の「毎日AIに任せながら自分の手で作り、運営しています」と ★矛盾しない。

★**当課の judgment 1 件（★指示外・★conductor へ返して可否を仰いだ）**: ★dead になった `.locations` の CSS 規則を除去。
★理由＝★class 使用が 0 になり、★残すと「拠点を書く枠が在る」と読めて ★kimny の判断と食い違う。

## ★★PDF —— ★commit != 配信（★3 値で測った）

```
★未実行      … —
★実行済・未着地 … ★commit 直後は ★配信側が ★旧版（★2dc0f2c1…／589,709 B）を返していた
★★着地確認済   … ★配信 PDF の sha が ★5502fe64…／591,324 B で ★commit blob と一致
```
★**∴ ★「PDF を再生成した」を ★完了と書かなかった** ——★conductor へ ★「測るのは待ってください」と先に送った
（→ [[feedback-notify-at-merge-not-after]] の隣・★やった ≠ 届いた）。
★**落として読み直した全段**: ★commit → deploy → 配信 → 可読 ／ ★陽性control ★7/7 ／ ★旧語・旧価格 ★0 ／ ★電話 ★0。

## ★★`pdftotext` の折り返し（★当日 7 件目・★族は同じ）

```
★「（グラスワークス）」                      … ★生=0 件 ／ ★★改行除去後=在り
★「前職ではPCサポートを月200件ペースで担当」  … ★生=0 件 ／ ★★改行除去後=在り
★「前職では」単独                            … ★生でも 1 件 ←★★短い語だけ当てると ★通ってしまう
★機序 … ★日本語は ★任意位置で折り返す ∴ ★PDF 側で ★語の途中に改行が入る
★★手当て … ★照合は ★改行を除去してから。★absence の判定も ★除去後の方が 厳しい
```
★**族**: → [[feedback-bilingual-predicates-diverge-asymmetry-is-the-tell]]（★述語の形が ★媒体の形と合っていない）。
★**今回の tell は ★非対称ではなく ★「陽性control が 1 件だけ落ちた」** ——★**0 件を疑う癖が効いた形。**

## ★検収（★完了条件 1〜5）

```
★① HTML 差し替え ＋ locations 削除 … ★済
★② PDF 再生成 ＋ pdftotext         … ★済（★陽性control 7/7）
★③ PDF の電話番号 0                … ★済
★④ test / tsc / CI                … ★167 file / 2,375 test 緑 ／ tsc rc 0 ／ ★CI 全 7 本 緑
★⑤ 既存 guard                      … ★advisory guard 27 件 緑
★`qrcode` … ★`npm install --no-save qrcode@1.5.4`（★PR の lock と同版）。
   ★`package.json` / `package-lock.json` は ★不動（★git status 空で確認）
   ★★前回「PDF 検証不能」と報告した原因は これの不在だった
```

## ★★conductor の独立実測と ★残件 (a) の訂正（2026-09-21）

★**conductor が ★配信 PDF を自分で落として全段 測り、★当課の報告と一致**（★写しではない）。
★**conductor は ★旧語を 7 種で撃っており、★当課の 6 種より 1 つ多い**:
```
★当課が撃っていなかった 2 語 … ★「mued.jpを運営」 ／ ★「月200件担当」
★★当課の copy でも 0 件を確認（★後追いで撃った）
★★紛れやすい対 … ★新語「月200件ペースで担当」は ★「月200件」を含むが ★「月200件担当」は ★含まない
   ∴ ★旧語の側を ★正確に列挙しないと ★「消えた」を ★誤って主張しうる
```

### ★★残件 (a) は ★現在形でなかった（★conductor 訂正）

```
★当課の記述 … 「分割 各回の支払期日は ★Stripe の `stripe login` 再実行 待ち」
★★実態     … ★kimny は ★既にログイン完了。★conductor が ★本番の商品 3 件を確認済
   ★業務改善3ヶ月自走プログラム `prod_VIaaBsuBuZzqtt` ¥300,000 一回きり
   ★社内お守りプラン           `prod_VIafrvOhaeWFc5` ¥30,000 毎月
   ★スポット相談90分           `prod_VIaicBI24NxagV` ¥30,000 一回きり
★★¥100,000 × 3 回の価格は ★存在しない ＝ ★3ヶ月を請求書払いへ寄せた ★理由そのもの
★★∴ ★分割の各回の支払期日は ★Stripe 側では決まらない ——★当社の請求書で決まる
★★∴ ★残件 (a) は ★「Stripe 待ち」でなく ★「運用で決める」
```
★**型**: ★**当課は「待ち」を ★他者の作業状態として書いたが、★その状態は ★当課が観測していない**
（→ [[feedback-timestamps-must-be-measured-not-narrated]] の隣・★「待ち」は ★現在形ゆえ ★書いた瞬間から腐る）。
★**status.md に「〜待ち」と書く時は ★誰の手番かだけでなく ★★最後に観測した時点を併記する。**

★**残件 (b) の税**: ★owner＝conductor（★kimny に Stripe ダッシュボードの自動税計算を 1 画面 見てもらう依頼済）。★当課の手番ではない。
★**残件 (c) plan の key 名**: ★別 PR・★今日は触らない（conductor 明示）。
★**`.locations` の CSS 除去**: ★conductor が ★「指示より良い判断」として ★そのまま採用。

### (1o) — ★#1069 merged・★本番反映 確認・★通知は ★出せていない（2026-09-21）

★**kimny 逐語: ★「Go」**（★目視対象＝web 4 面 ＋ 配信 PDF の 5 本・head `81a0ef46`）。

## ★merge 前の確認（★conductor 依頼）

```
★origin/main は ★動いていた（★当課の docs/status を 8 本 merge したため）
★★但し ★#1069 との ★file の重なりは ★0 件（★`comm -12` で実測）
   ★main 側 … docs/ops ／ docs/status-archive ×2 ／ docs/status-blockers.md ／ status.md
   ★#1069 側 … app ／ components ／ messages ／ print ／ public ／ scripts ／ tests ／ docs/advisory ／ package*
★∴ ★目視が当たった本文は ★main の更新で変わらない ∴ ★rebase せず 押した
★mergeable=MERGEABLE state=CLEAN ／ CI 全 7 本 緑 ／ ★PDF blob sha が 目視対象と同一
★main = `0a6f9f07`
```
★**型**: ★**「main が動いた」を ★branch 名や 件数で判断せず ★file 集合の重なりで判断した。**
★★**重なり 0 なら ★rebase は不要**（★重なりが在れば ★内容が変わりうるので 止める）。

## ★★merge ≠ 公開 ——★押した直後は 未反映だった（★実測）

```
★押した直後 … ★/ja /en の tokushoho・advisory に ★旧価格が ★まだ live ／ ★PDF は ★★404
★反映後    … ★4 面とも ★旧価格 0 ／ 新価格 6/6 ／ マーカー 0 ／ 中途解約不可 在り ／ 請求書のみ 在り
★★本番 PDF … ★591,324 B ／ sha256 `5502fe64…` ＝ ★commit blob と一致
   ★★preview → main → 本番 の ★3 点で 同一
   ★落として pdftotext … ★陽性control ★12/12 ／ ★旧語・旧価格 ★13 種すべて 0 ／ ★電話 0
```
★**∴ ★「merge した」を ★完了と書かなかった。** ★conductor へ ★「台帳を done にしないでください」と先に送った。
★**来週 kimny が商工会議所へ持っていく実物なので、★本番ドメインで sha 一致を見るまで「在る」と書かない。**

## ★★main は ★CI で守られていない（★今日 8 本 merge した）

```
★`test.yml` は ★push trigger を ★意図的に持たない（★重複課金の削減・★日次 schedule が代替）
★∴ ★squash-merge 後の main は ★次の schedule まで ★未 test
★★今日は ★8 本を 順に merge ＝ ★各 PR の CI は ★動く前の base に対して回っている
★∴ ★当課が main を 自分で測った … ★2,348 → ★2,375 test 緑 ／ ★tsc rc 0
   ★差 27 = ★advisory-pricing-locales の test 数 ＝ ★差分が全部 説明できる
```

## ★★content課 通知が ★出せていない（★手番は 残っている）

```
★`ListAgents` 実測 … ★DSP / CCO / MCP / conductor / chief / MUEDoccur ＋ offline 2
★★content課（母体 _contents-writing）は ★居ない ∴ ★宛先が解決できない
★★dormant な相手へ送っても ★黙って消える（★送信側にも受信側にもエラーが出ない）
   ∴ ★「送った」と書けない
```
★**「merge するその手で送る」を守れなかった** ∴ ★**同じターンで ★conductor へ relay を依頼した**
（★後ろへずらすと落ちる形なので・→ [[feedback-notify-at-merge-not-after]]）。
★**`blocked_by` (W15) は ★開いたまま維持する。** ★**当課が送るのは ★content課 が起動した時。**

★**本文の状態**（★当課が確認済・★main に在る）:
```
★逐語 6 句が ★正本（messages）と ★byte 一致
★影響範囲 ★2 軸 … ★公開済記事 0 ／ ★drafts ★7 file（★価格 6 ＋ ★文言のみ 1）
★「記事で書いてはいけないこと」4 点 … いつでも解約 ／ 3ヶ月にカード ／ 日数 ／ 電話番号
★リーフレットは ★含めない（★content課 の射程外・conductor 承認）
★Hoo Pass / MUEDial の「いつでも解約」ヒットは ★無関係と明記（★混ぜて直されないため）
```

## ★申し送り

```
★`fix/codex-advisory-price-hachioji-20260921` の ★local branch が ★消えていない
   ★理由 … ★Codex の worktree が ★checked out のまま
   ★★当課は Codex の worktree を ★勝手に消さない ∴ ★片付けは conductor 側
★残件 … ★(a) 分割の支払期日＝運用判断（★Stripe 待ちではない）／
        ★(b) カード 2 メニューの税＝owner conductor ／ ★(c) plan key 名＝別 PR
```

### (1p) — ★(W15) を閉じた（★担い手が conductor へ移った）／★plan key 改名（2026-09-21）

## ★★(W15) 通知 —— ★当課は「送れなかった」で終わり、★conductor が引き取った

```
★当課の状態 … ★#1069 merged ＋ 本番反映済 ∴ ★通知の条件は成立していた
★★但し ★`ListAgents` に content課 が居ない ∴ ★宛先が解決できない
★★conductor 側の `ListAgents` でも ★同じく不在（★conductor が独立に確認）
   ＝ ★★「当課の環境の問題」ではなく ★content課 が起動していない
★★∴ ★(a)（conductor が SendMessage で配る）も ★成立しなかった
```
★**conductor が採った形 ＝ ★(c) に近い**: ★本文を ★**相手の workspace が読む場所**へ置いた
（`_contents-writing/docs/inbox/URGENT-advisory-price-canonical-change-20260921.md`）。
★**conductor が明記したこと**（★当課の指摘をそのまま採用）:
```
★★「置いただけでは『届いた』にならない」 ∴ ★台帳の行は ★blocked のまま
★★content課 からの ★返信を得るまで 閉じない（★Hoo Pass の前例）
★★content課 の ★未コミット作業には 触っていない（★M 3 件が unstaged のまま・commit もしない）
```
★**∴ ★(W15) は ★当課の手番としては 閉じる。★担い手＝conductor。**
★**型**: ★**「送れない」は ★完了でも 失敗でもない ★第三の状態**
——★★**「送った」と書かず、★同じターンで 所有者へ上げる**のが正しい終わり方だった。

## ★worktree —— ★所有の境界を守った判断が 正しかった

★当課は ★Codex の worktree を ★消さず ★持ち主（conductor）へ上げた。★conductor が ★押す前に確認したこと（★記録）:
```
★未 commit 0 ／ untracked 0 ／ ★stash は この worktree のものでない（repo 共有）
★★`519ecd8e` は `81a0ef46` の 祖先 ／ ★`81a0ef46` と `origin/main` の ★#1069 全 path の diff が 空
   ＝ ★★squash でも 取りこぼしなし ／ ★lease も残っていない
```
★**∴ ★「消してよいか」は ★祖先関係と ★diff の空 で 判定する**（★branch 名や ★merged ラベルでは判定しない）。

## ★★plan key 改名（★退役が fail-silent だった一形）

```
★diagnosis → program ／ build → guardian ／ companion → spot ／ consult 不変
★★値は 1 文字も変えていない。★key 名だけ
★★機序 … ★値は新体系に替わったのに ★key 名が旧メニューのまま
   ∴ ★`diagnosis` が ★3ヶ月プログラムを保持していた
★★かつ ★LP 側は 既に新名 ∴ ★同じ 3 サービスが ★2 つの名前を持っていた
```
★**取り違え防止**: ★新 key が ★期待するメニューを指していることを ★値の先頭で assert してから置換（★順序に頼らない）。
★**`t()` は tsc で守られない** ∴ ★page が要求する 4 key の実在を 別途 確認。

★**追加した cross-surface guard**:
```
★plans の key 集合 == ★`advisory-pricing-section.tsx` の `PLAN_KEYS`
★★`PLAN_KEYS` は ★component の source から読む（★test に写すと 写しが drift しても誰も気づかない）
★★既存の ja/en parity では守れない ——★両 locale を 揃えて改名すると parity は保たれる
   ★meta-RED ② で 実証（★両 locale 改名 → ★新 guard だけが咬んで 赤）
★meta-RED 3/3 赤 ／ 2,376 test 緑 ／ tsc rc 0
```

## ★★当課が 同じ失敗を ★2 度 した（★meta-RED の順序）

```
★★`restore()` が `git checkout --` を使う ∴ ★未 commit を 捨てる
★★∴ ★commit する前に meta-RED を回すと ★自分の編集が消える
★1 度目 … #1069 の確定文（★再適用して復帰）
★2 度目 … ★本件（★messages が旧 key へ 戻っていた）
★★手当て（★記憶に頼らない形）… ★script の restore の前に
   ★「未 commit が在れば ★回さずに exit 3」を 埋めた
```
★**型**: → [[feedback-make-it-show-up-not-remember-it]]（★★1 度目に「順序に気をつける」で済ませたので 2 度 踏んだ）。

## ★別件（★触っていない・報告のみ）

```
★`app/api/advisory/inquiry/route.ts` の product enum … ["wallhit","diagnosis","build","run","other"]
★live bug ではない（★form は wallhit しか送らない・`.optional()`）
★★但し 2 方向に stale … ★① 送られない名を受ける ／ ★★② ★新体系の名を 拒否する
★★∴ ★将来 メニュー別 form を作ると 400（★「新しい方が弾かれる」ので 原因に当たりにくい）
★当課の推奨 … ★今は放置。★form を作る回に ★同じ PR で直す
```

### (1q) — ★配布 CLAUDE.md の Tier 2 行と組織表が ★正本と食い違う（2026-09-21・★当課は直さない）

★**きっかけ**: ★当課が #1078 の review 先を ★「product課 が居ないので CCO へ」と書き、★conductor が
★**「代替ではなく正規の経路」**と訂正した。★**正本を 1 回 引いたら、★写しが古かった。**

```
★配布された写し（当課 CLAUDE.md:31）
   「Tier 2 レビュー担当: ★mued↔product／dsp→template/CCO／…」
★★正本（_conductor/.claude/rules/current-organization.md:38・mtime 2026-09-15 12:28）
   「レビュー担当は案件の専門性で選ぶ。dsp は CCO、★★mued は CCO（DSP 変更は dsp）、
     conductor と CCO は互いまたは Codex が既存経路」
```

## ★★食い違いは Tier 行だけでない ——★組織表そのものが 1 世代 古い

```
★正本の「担当の所在」… ★_conductor / _mued-dsp / mued_v2 / hoo-mcp /
   claude-code-template / threads-api / _contents-writing / freee-MCP
★★product課 は ★表に無い（★「起動していない」ではなく ★★現行の構成に無い）
★★写しは ★2026-06-11「組織再編v2」の ★11課 体制を載せたまま
★正本は ★9/13 kimny 承認の ★zero-base ∴ ★写しは 1 世代 前
★★正本は「occur / video や休止した席を ★古い一覧を根拠に起こさない」と明記
   ∴ ★★写しの古い一覧が ★まさにその「古い一覧」として働く
```

## ★★当課は直さない（★理由 2 つ）

```
★① ★CLAUDE.md は ★配布物（★正本＝claude-code-template・「直接編集しない」と明記）
★② ★peer の依頼は ★CLAUDE.md 編集の根拠にならない（★恒久制約）
★∴ ★直しは ★CCO（claude-code-template / 共通基盤 owner）の手番。★conductor へ上げた
```

## ★当課の側の手当て（★記憶に頼らない形）

★**Tier の routing を ★配布の写しから読まない。★案件ごとに ★正本を引く。**
★**型**: → [[feedback-relayed-claims-keep-confidence-lose-evidence]] ／ 共通block「一次を 1 回 照合する」。
★★**今回 効いたのは ★当課の照合ではなく ★conductor の訂正**だった
——★当課は ★写しを信じたまま報告していた。★**照合は ★指摘を受けてから 走った。**
★∴ ★**「正本が在る」と書いてある文書を読んだ時点で ★引くのが正しい順序**（★写しの冒頭に そう書いてある）。

## ★正本が 裏づけた点（★1 つ）

★正本 line 39: ★**「レビュー相手が常設していると仮定しない。★作成者による自己承認で独立レビューを代替しない。」**
★∴ ★#1078 を ★self-merge せず ★routing を依頼したのは ★正本どおりだった。

## ★併せて受領（★当課の手番でない）

```
★#1078 … ★CCO レビュー待ち（★観点 4 点・★中継不要で CCO から直接）
★enum  … ★`advisory-inquiry-enum-stale-20260921` rev1 / owner mued / received / 意図的に保留
   ★conductor の言い方（★当課より正確）: ★**「使う側が無い状態で API の契約を単独で変えると、
     確かめられないまま入る」**
★masterchain … ★FastSpring 最終審査のみ。★乗り換えは選ばない（★4 層・約 30 file・審査 1〜2 週）
★残件 2 件 … ★通知（返信待ち）／ ★カード 2 メニューの税（kimny ダッシュボード確認が入口）＝ ★conductor 所有
```

### (1r) — ★「写しだと名乗る写し」でも 勝つ（★CCO 実測・2026-09-21）／★分母の条件

## ★★注記は 試されていて 効かなかった（★当課が その実例）

★共通 block `04-org-structure:8` に ★逐語で:
> ★**「この一覧は写しである。正本は `_conductor/.claude/rules/current-organization.md`。食い違ったら正本が勝つ。」**

```
★★配布済 ★13/13 件すべてに ★この 1 行が在った（★当課が grep で確認）
★★それでも 表は ★2 ヶ月 古いまま（★9/13 zero-base が来ていない・★11課 体制のまま）
★★★読み手（当課）は ★写しを読んで「mued の review 先は product課 が正規」と理解し ★他課へそう報告した
   （★正本は「mued は CCO」）
★気づいたのは ★conductor の訂正 ——★当課の照合は ★指摘の後に走った
★陽性control … 「正本は」を含む CLAUDE.md は 20 件（★計器は生きている）
```

## ★★機序（★CCO の言葉が正確）——★availability が precedence に勝つ

```
★写しは ★起動時に ★自動で context に載る ／ ★正本は ★行かないと読めない
★★∴ ★優先順位を 書いても ★読まれるのは 写しの方
★★そして 注記の文が 自分で前提を壊している:
   ★「食い違ったら正本が勝つ」は ★食い違いに気づいた人にしか効かない
   ★気づくには ★両方を読む必要が在る ∴ ★注記は ★代替するはずの作業を前提にしている（★循環）
```
★**∴ ★層 3 の設計は ★「同期する」でも「注記を強める」でもなく ★★消してポインタにする。**
★**実例＝層 2 が既にその形に直された**（★表を消し・★「書き戻さないこと」＋★理由を逐語で残す）。
★**型は memory へ**: [[feedback-availability-beats-precedence-delete-the-copy]]

## ★★分母が 3 通りに割れた（★条件なしで件数を配れない）

```
★maxdepth 1 → 1 ／ ★maxdepth 2 → 28（★当課の root 直下）／ ★★maxdepth 3 → 34（★CCO の数え）
★maxdepth 4 → 38 ／ ★★全深さ → 62（★当課の全数）
★★3 つとも 正しく、★違うのは 条件だけだった
★CCO の自己申告 … ★`-maxdepth 3` を付けて測り ★それを書かずに「34 件」と渡した
   ＝ ★共通block「値を渡す時は 成立条件を同じメッセージに書く」の ★正本を持つ側が 破った形
```
★**分子の差（13 / 12）は ★worktree 1 件で説明が付いた**:
```
★★`_mued-dsp/.claude/worktrees/develop/CLAUDE.md` は ★depth 5
   ∴ ★CCO の `maxdepth 3` では ★構造的に見えない
★切り分け … ★配布先 ★12 件（配布器が当てる面）／ ★worktree ★1 件（★repo を直せば pull で追従）
★★但し ★pull されなければ ★そこで起動した session は 旧表を読む
   ＝ ★「配布した ≠ 着地した」が ★1 段 深い所に在る
```

## ★★復帰述語を 直した（★当課の述語が ★正しい手当てを 拒否していた）

```
★旧: ★層 2 の行が ★正本 :38 と ★同じ担当を示す
★★→ ★実際の手当ては ★「表を消してポインタにする」∴ ★旧述語は ★★偽になる
★★新: ★層 2 が ★routing の表を ★持たない（★または 正本と同じ担当を示す）
★★後半（層 3 の product課 が 0 件）は ★未達 ∴ ★当課は ★まだ正本を引く運用
★★戻すのは ★当課が 自分で grep した回（★「直りました」と言われて戻さない・CCO も同意）
```

## ★★context と disk（★配布の最終段）

```
★live は ★09-21 17:20 に変わった（sha ★6e633c50… → ★27f747ef…・★当課が確認）
★★但し ★起動中の session の context は ★起動時の注入 ∴ ★旧版を持つ
★★∴ ★disk に届いても ★読む主体に届くのは ★次の起動
★当課は ★disk を見て判断している。★再起動の依頼は ★CCO も当課も しない（★稼働中の作業を止める）
★conductor へ ★申し送り済（CCO）
```

## ★CCO の計器が 2 回 外れた（★族は同じ・★記録）

```
★1 回目 … marker を `COMMON-BLOCK-BEGIN` で grep → ★BEGIN 0 / END 12
          ★実際は `COMMON-BLOCK-START`。★非対称が不自然で気づいた
          ★★0 と 12 が並ばなければ「marker が無い」と報告していた
★2 回目 … source ↔ 配布済 が ★12/12 不一致 → ★1 件 開いたら ★配布器の header 2 行を
          ★正規表現が飛ばしていただけ。★中身は同一
★★CCO の手当て … ★**「全数が同じ向きに外れたら、まず自分を疑う」**を手順に足す
★当課の同型 … ★PDF で ★陽性control が 1 件だけ落ちた件（★(1n-3)）
```

### (1s) — ★納品メールの欠陥を直し、★試験送信は ★経路を替えて 着地（2026-09-21〜22）

## ★欠陥（★conductor が 実装を読んで検出）

```
★メールの手順文 … 「-----BEGIN と -----END の行を含めて」コピーせよ
★★issueLicense() … ★その行を 発行しない（★MUEDSP-LICENSE-v2 … sig=<base64>・armour 無し）
★★license.ts:16 の コメント自身が ★「以前の版が BEGIN/END armour を発明したが誤りだった」と 破棄を記録
★∴ ★退役が fail-silent の一形 ——★実装は直ったが ★メールだけが 旧い想定を持ち続けた
★★実害 … ★買った人が 最初に読む文 で「その行が 無い」＝ ★コピー範囲が 分からない
```

## ★手当て（#1082 / #1083 / #1084）

```
★手順文 … ★「1 行目の MUEDSP-LICENSE-v2 から最終行の sig= まで」（★実在する目印）
★★形式名は ★書き写さず ★`LICENSE_MAGIC` を import ——★打つと ★3 つ目の写しになり ★v3 の日に古くなる
   （★CCO 実測: ★license.ts 内の `sig=` は 4 箇所以上・★export 定数なし ∴ ★email の literal は ★5 つ目）
★fixture … ★架空 armour → ★`issueLicense()` の実出力（★throwaway pair）
   ★旧 fixture と 手順文が ★同じ誤った想定を共有 ∴ ★食い違えなかった
★env … ★退避/復元を 姉妹 test に揃えた（★`isolate` は config に ★一度も書かれていない＝寄りかかる対象が 未明文）
```

## ★★当課が 恒真な guard を 1 度 書いた（★meta-RED だけが 捕まえた）

```
★初版 … ★`expect(surface).toContain(LICENSE_MAGIC)`（surface ＝ 描画メール全体）
★★機序 … ★メールには ★キー本体が埋まり ★その 1 行目が magic・★最終行が sig=
   ∴ ★★手順文を 丸ごと消しても ★データ側だけで 満たされる
★実測 … ★meta-RED ★4 case すべて ★緑
★★同時に ★meta-RED script も 壊れていた（★`$4` 未渡し ＝ ★置換でなく削除
   ＝ ★「BEGIN を戻す」case を ★一度も撃っていなかった）
★★2 つが 同じ向きに重なって ★「全部 緑」に見えた
★修正 … ★キーの位置で slice し ★手順文の領域だけを見る → ★4/4 赤
★★∴ ★meta-RED を回さなければ ★「guard を足した」と報告して ★守らない物を出していた
```

## ★★CCO の 2 段の指摘（★どちらも 非 blocking・★どちらも 実在）

```
★① ★slice は ★download ブロックを含む ∴ ★署名付き URL（?exp=…&sig=…）になると
   ★`sig=` が ★URL だけで満たされ ★assertion 1 本が 黙って死ぬ
   ★★かつ ★この test は URL を mock する ∴ ★本番の変化は 見えない
   ★手当て … ★CCO 案（fixture への assert）ではなく ★**URL を除いてから assert**
      ★理由 … ★fixture への assert は ★守りたい変化で ★発火しない（★CCO も撤回）
      ★実測 … 署名＋削除で ★旧版 sig=True / ★新版 sig=False
★② ★strip は ★完全一致依存 ∴ ★HTML escape（&amp;）で ★空振りして sig= が復活
   ★手当て … ★**描画結果に対して** URL が逐語で在ることを assert（★#1084）
      ★meta-RED … ★署名＋escape → 赤 ／ ★署名のみ（escape 無し）→ 緑 ＝ ★陰性対照つき
```

## ★★試験送信 —— ★当課の環境からは 送れなかった（★迂回しない）

```
★kimny 逐語「なんでもいいならkimny1143@gmail.comでいいよ」＝ 本人指定
★★当課の送信 … ★ja / en とも ★success=false ／ ★message id ★無し
★切り分け … ★api.resend.com は ★到達する（★認証なし 403）／ ★mued.jp・api.github.com は 200
   ★key は 在り（長さ 36・`re_` 始まり・★値は出力せず）
   ★★認証つき GET → ★403 ／ body ★「error code: 1010」＝ ★★Cloudflare の code
   ★★Resend 公式 SDK（★自前 UA）も 同じく落ちた ∴ ★client の問題でなく ★この環境の egress
★★迂回しない … ★UA 偽装は ★bot 防御の回避 ／ ★通っても「本番が送る経路」ではない
★★当課の script の欠陥 … ★`console.log` だけで ★assert せず ∴ ★success=false でも ★「Tests 1 passed」
   ★★「送った」は ★rc でも passed でもなく ★**message id が出たか**で読む
```

★**採った形**: ★conductor の Resend 連携（★egress が別・★接続先は ★本番と同じ Resend アカウント）。
★**当課は ★描画 file 6 本を 出し、★送信は conductor。**
```
★★着地 … ★ja id 01a0c966-e4cc-7654-96cc-ebd928a22303 ／ ★en id 01a0c967-0fbb-7612-8d7e-28b08dc65115
★アカウント同一性 … ★送信前の list-emails に ★本番の過去送信（MUEDlim/MUEDrive/MUEDsat）が並んだ
   ＝ ★鍵の値を 比較せずに ★確定
★★既知の差（記録）… ★本番の code path（email.service.ts → SDK）は ★通っていない
   ★Reply-To も 付いていない（★連携の制約・★本番は SUPPORT_EMAIL 既定）
   ∴ ★**描画結果までは 本番と同一・★送信経路だけが 別**
```

## ★★From メモを 本文 file に 入れなかった（★依頼の形を 変えた）

```
★依頼 … ★「file の冒頭にコメントで書き添えて」
★★やったこと … ★body 6 本は ★byte 完全 ／ ★メモは `_meta.txt` へ 分離
★理由 … ★本文 file に メモを混ぜると ★貼り付けた時に ★本文として 送られる
   ＝ ★★注記が payload になる形（★本日 何度も見た型）を ★構造で 避けた
★★conductor 側でも 効いた … ★彼らの grep が ★`_meta.txt` を母集団に含み
   ★★検査語の一覧そのものに 当たって ★6 語が「1」と出た（★本文 6 本で撃ち直して 0）
   ＝ ★分離していたので ★誤検出が ★安全側に 倒れた
```

## ★★sha を 渡す時は ★アルゴリズムも（★当課が 受け手側で 踏みかけた）

```
★conductor 申告 … ★ja.html 052760e5 / en.html b6289a50 / ja.txt c8981b4f / en.txt 5d9bf3da
★★当課の 最初の照合 … ★`shasum`（★既定 sha-1）→ ★4 本とも 不一致
★★あやうく ★「payload が違う」と報告するところだった
★測り直し … ★sha-1 / ★sha-256 / sha-512 / md5 / cksum を 並べた
   ★★sha-256 が ★4 本とも 一致 ＝ ★payload は ★byte 同一
★★型 … ★共通block「値を渡す時は 成立条件を同じメッセージに書く」の ★受け手側
   ★★memory に ★同型の前例が 在り（★「受け手が sha1 で測って『合わない』と報告しかけた」）
   ★★∴ ★今回は ★記録が 効いた（★朝の CLAUDE.md の注記は 効かなかったのと 対照的）
```

## ★★本日の 同族 6 件（★3 課・★逆向きの失敗は 0 件）

```
★当課 ① 恒真 guard ＋ ② meta-RED script の `$4` 落ち（★同時・相殺）
★当課 ③ `console.log` だけで assert せず ★passed を 送信成功と読みかけた
★当課 ④ `grep -c` の exit 1 を `|| echo 0` で拾い ★"0\n0" ＝ ★「混入」と 誤表示（★安全側）
★当課 ⑤ ★sha を ★別アルゴリズムで測り ★不一致と読みかけた（★上記）
★CCO  … ★marker `BEGIN`↔`START` ／ ★header 剥がしの順序 ／ ★stale な origin/main
★conductor … ★`$H:lib/...` が zsh `:l` に食われ 0/0 ／ ★`_meta.txt` を母集団に含め 検査語に当たった
★★**逆向き（危険側）の失敗は 1 件も 出ていない**
   ★理由＝★「全数が同じ向きなら まず自分の計器」が ★3 課で 揃っていた（★CCO 起案）
```

### (1t) — ★P-4 着地。★「307 → sign-in」は ★面の実在を言わない（陰性対照で判明・2026-09-23）

## ★着地

```
★#1086 merged … main `0274be24`（★Tier 3・conductor 承認 head `b0830345`・review id 5279877719）
★ローカル main … ★19 passed / 3 file（purchases 9・card 5・既存 data 5）
   ★理由＝`test.yml` に push trigger が無い ∴ ★main は merge 間が CI 無風
★本番 deploy … ★state=READY ／ sha=`0274be2420c4…` ／ ★alias に `mued.jp` ／ aliasError=null
```

## ★★計器の話 ——★conductor 指定の述語は ★門を測っていて ★面を測っていない

```
★指定 … 「本番の /dashboard/plugins が 307 → sign-in になること（署名なし）」
★実測 … 307 → /sign-in?redirect_url=%2Fdashboard%2Fplugins   ← ★指定どおり
★★陰性対照 … /dashboard/nonexistent-negative-control も ★同じ形で 307
   （→ /sign-in?redirect_url=%2Fdashboard%2Fnonexistent-negative-control）
★★∴ この述語は ★middleware が /dashboard/* を丸ごと弾くことしか 言っていない
   ★面が在っても 無くても 同じ値が出る ＝ ★★P-4 の着地の証拠にならない
★★※ 指示が誤りだったのではない —— conductor 自身が「中は見えない」と明記していた。
   ★当課が足したのは ★「では何なら見えるか」＝ ★deploy 側の述語（sha + alias + READY）
```

★**型**: ★**陰性対照は「計器が生きているか」だけでなく ★「その述語が対象を弁別するか」も測る。**
★**今回は 陽性（307 が出た）と 陰性（同じ 307）が ★一致した ＝ ★弁別力ゼロ。**
★**「0% と 100% は同じこと」（CCO）の 向き違い版 —— ★★全部 同じ値が返る 述語は 何も測っていない。**

## ★content課 通知 ——★本件は 軽微（★ログ追記のみ・★rule 自身の基準）

```
★trigger … product spec（UI 仕様）の 機能追加 ＝ ★形式上は 該当する
★★但し 緊急度基準の「軽微」… ★公開済記事の数値・機能訴求に 影響しない
   ★理由＝ ★masterchain は ★store activation 前（★購入 0）∴ ★誤情報になっている記事が ★存在しえない
   ★配達メールは ★キー本文を 載せたまま（★アカウント不要の約束は 不変）＝ ★訴求の前提も 動いていない
★∴ ★rule の「軽微＝即時通知不要・ログ追記のみ」を ★適用し、★ここに記す
★★黙って skip しない ——★conductor へ 報告し、★開店の便に 畳んでもらう
```

### (1u) — ★出したカードが繋がっているかを測り、★版が静かに消える穴を塞いだ（2026-09-23）

## ★配布 URL の実測（★母集団は実時解決・値を焼かない）

```
★母集団 … ★`lib/**/*.ts` の `https://mued.jp/downloads/*.pkg` を grep ＝ ★4 本
   ★4 本 未満は rc 3（★解決の失敗と「本当に 4 本」を 区別する）
★判定 … ★`200` だけでは見ない ——★先頭 byte `xar!` ＋ content-length も 見る
   MUEDlim  0.1.2   200 xar! 3,254,821
   MUEDrive 0.1.2   200 xar! 3,584,930
   MUEDsat  0.1.2   200 xar! 3,405,970
   ★masterchain 0.1.3 200 xar! 4,133,469   ← ★P-4 のカードが リンクする先
★陰性対照 … ★存在しない .pkg → ★404（先頭 byte は `<!DO` ＝ HTML）
★rc0
```

★**なぜ P-4 の直後に これを測るか**: ★カードは `MASTERCHAIN_DOWNLOAD_URL` を ★そのまま `href` にする
∴ ★その URL が死んでいれば ★最初の購入者に ★死んだリンクを出す。★「出した」と「繋がっている」は別。

## ★★姉妹 test が 実定数を 見ていなかった（★#1089 で 塞いだ）

```
★発見 … ★`plugin-portal-purchases.test.ts:36` は ★`MASTERCHAIN_DOWNLOAD_URL` を ★リテラルで mock
   ∴ ★期待値と入力が ★同じ場所から来る（★memory `feedback-the-check-must-not-share-an-origin-with-the-checked`）
★★機序 … ★実定数の形が regex に合わなくなると ★`version: null`
   ＝ ★「版の無いダウンロード」として ★描画されるだけ ★誰にも知らされない
★★引き金は ★既に予定されている … ★dsp 0.1.4 が この URL を変える（★blocked_by W15 ③）
★手当て … ★実定数を import する test を 別 file で 立てる（★mock する file とは 同居できない）
   ★URL 未設定（fail-closed）の状態も ★判定に含めた ——★skip すると「検査していない」が「検査した」と読める
```

## ★meta-RED（★壊したのは lib/ 側・★test 側は無傷）

```
★① config の URL を `0.1.4b2` に          → ★赤（★W15 の引き金そのもの）
★② `versionInUrl` の ★match 側を "9.9.9"  → ★赤
★③ emit する `downloadUrl` に query 付与   → ★赤
★★①の初版が 撃ち損ね … ★`m ? m[1] : "9.9.9"` ＝ ★null 側だけ 差し替えた
   ★実 URL は match する ∴ ★値が変わらず ★緑のまま（★no-op 同然）
   ★★型は 本日 3 度目（★(1s) の `$4` 落ち・★#1069 の全角「円」）——
   ★★**注入は「値が変わる場所」に 撃つ。★分岐の 使われない側に 撃っても 何も 壊れない**
★全 unit … ★170 files / 2,394 tests passed
```

### (1v) — ★4 本の版の道筋（★改名規約の受け入れ・★測った境界・★#1062 の結合）2026-09-23

## ★引き金が 2 度 動いた（★同じ日に）

```
★予告①（conductor）… ★「masterchain 0.1.4 を焼く回に 無料 3 本も焼く」＋★「無料版は EULA 無しでいい」
   ∴ ★無料 3 本は ★EULA を待たず 先に 0.1.3 を配信する
★★訂正②（kimny 逐語）… ★「訂正する。EULAは次回のユーザーリリースで全ての製品に反映する。無料も有料もだ。」
   ∴ ★無料 3 本も ★EULA 到着待ち ＝ ★4 本まとめて bake
★★当課の扱い … ★status の (W15) を ★1 本に畳んだ（★旧「dsp 0.1.4 単独」と ★同一事象）
   ★理由＝ ★2 本 持つと ★片方が 必ず 古くなる（★本 session で 3 度 見た形）
```

## ★★改名規約は受け入れ ——★regex を読まず ★製品側 parser を通して測った

★**conductor 決定**: ★版入りの file 名で 4 本を統一（`MUEDsp-masterchain-<ver>-installer.pkg` ほか）。
★**dsp の規約文書は「版を含まない」を推奨していたが、★実配信は版入りで、★mued 側が既に版入りに依存**
（★version-matches-download の test ／ ★P-4 の `versionInUrl()`）∴ ★文書を実態に合わせる。

```
★測り方 … ★`buildPurchaseItems()` に URL を渡して ★戻り値の version を読む
   ★★regex を 再実装して 当てない（★写しを作ると 実装とずれても 気づけない）
0.1.4   MUEDsp-masterchain-0.1.4-installer.pkg     ★予定の 4 本は 全部 拾える
0.1.3   MUEDlim / MUEDsat / MUEDrive-0.1.3-installer.pkg
0.1.0   MUEDsat-0.1.0-alpha-installer.pkg          ★配達済リンクの形も 従来どおり
```

★**境界（★dsp へ渡す「受け付ける形」）**:
```
✓ ★X.Y.Z                       ✓ ★X.Y.Z-<小文字だけ>（`-beta` は 可）
★null … ★-rc1 ／ -RC（★接尾に 数字・大文字）／ ★0.1.4b2 ／ ★0.1 ／ ★0.1.3.1
        ★_ 区切り ／ ★installer が 末尾でない
★★落ち方は ★null ＝ ★例外でなく ★版だけが 静かに 消える
★★そして ★この境界は ★現在 どこにも assert が無い ——★(W15) ④ で 入れる
   ★★（★台帳に 書いたことを ★対策に 数えない ＝ memory `feedback-make-it-show-up-not-remember-it`）
```

## ★★不都合 1 件 — ★#1062 の destination が ★0.1.2 で 焼き付いている

```
★#1062（open・開店後 merge の約束）… ★alias 5 本 → ★`/downloads/MUEDlim-0.1.2-installer.pkg` 等
   ★★next.config.ts と ★test 側の表の ★両方に 同じ対が 焼かれている
★0.1.3 が先に着地すると … ★#1062 は「★古い版へ 307」する PR になる
   ★壊れない（★0.1.2 の file は 残すので 200 は返る）——★★静かに 古くなるだけ
★当課は触らない（★kimny 裁定・二重編集回避）→ ★conductor が Codex へ:
   ★**destination を `*_DOWNLOAD_URL` から 導出**（★source の一覧は 明示のまま）
   ★理由＝ ★今の形は「★同じ事実を 2 箇所」＝ ★version-matches-download が既に守っている軸と 同型
```

## ★版の所在（★「1 本道」は 製品によって 違う）

```
★無料 3 本   … ★`*_VERSION`（3）＋ ★`*_DOWNLOAD_URL`（3）＝ ★6 定数 / 3 file ＝ ★2 本道
   ★縫っているのは ★`plugin-version-matches-download.test.ts`（★population guard ≥3 つき）
★masterchain … ★URL だけ ＝ ★1 本道（★`MASTERCHAIN_VERSION` を 作らない・P-4 の設計・(1u)）
```

★**もう 1 つ見つけた — ★parser の写しが 2 本**:
```
★製品側 … ★lib/plugins/portal.ts  versionInUrl()
★test 側 … ★plugin-version-matches-download.test.ts:22 ★同じ regex を 再実装
★★∴ ★片方を直しても ★もう片方は 気づかない（★名前規約を動かす日に 分岐する）
★手当て（(W15) ④）… ★1 本 export して test は import。
   ★★但し ★期待値まで 対象から 取ると「食い違えない検査」になる
   ∴ ★assert するのは ★性質（★どの alias も ★今 canonical な URL に解決する・★母集団 5 本）に限る
```

## ★status.md の cap（★当課の閾値を 書いておく）

```
★blocked_by … ★5,026 → ★5,803 B（★cap 6,000・★残り 197 B）
★★W15 の初版は ★6,410 B で ★script が 書かずに 落ちた（★fail-closed・★意図どおり）
★∴ ★理由づけは ★台帳（本 file）へ・★status は ★引き金と 一覧だけ
★★閾値運用: ★5,800 B を 超えたら ★(W11) か ★(W2d) を ★退避する（★書いておかないと 次に誰も気づかない）
```

### (1w) — ★`masterchain_interest` = ★0 行（★実測・2026-09-23）と、★渡し方を 1 度 壊した記録

## ★実測（★kimny が実行・★当課は撃てない）

```
measured_at (JST) : 2026-09-23 10:59:32
table             : masterchain_interest
rows              : ★0
first created_at  : — (0 rows)      ★日付を 捏造しない（★0 行なら 空と印字）
last  created_at  : — (0 rows)
```

★**経路**: ★`scripts/count-masterchain-interest.ts`（★PR #1093・★Tier 2・★self-merge しない）。
★**当課は撃てない**——★本番 DB read は ★実行セッション内の kimny 直接アクション限定で、
★**実測で 分類器が `[Production Reads]` で deny した**（★DB に触らない typecheck を含む compound でさえ）。
★**但し「kimny が実行する」は「kimny が SQL を組み立てる」ではない** ∴ ★組み立ては org・★実行 1 回だけ kimny。

## ★★この 0 の意味 —— ★「需要ゼロ」ではなく ★未計測

```
★`MASTERCHAIN_INTEREST_LIVE = false`（lib/masterchain/config.ts:16）
★`interest-handler.ts:48` … ★gate は ★insert の 手前で return（`registered:false`）
★`app/` `components/` から 当該 route を 叩く面 … ★0 件
★書き込み経路は ★他に無い（★insert は 1 箇所・★backfill script も 無し）
★★∴ ★誰にも フォームが 出ていない ＝ ★0 は ★構造的に 決まっていた
★★kimny 逐語「潜在的な有料顧客いるかな」への 答えに ★この列は 使えない
   ★使えるのは 別の分母（★/muedsp の GA4 到達・★無料 3 本の DL 実数）
★★予測（0）と 実測（0）が 一致したが、★一致は ★予測の正しさの 証拠であって
   ★★「測る必要が 無かった」証拠ではない ——★0 でなければ ★gate を越えて 何かが書いた発見だった
```

## ★★当課が 渡し方を 1 度 壊した（★kimny が 実行して 初めて 判った）

```
★渡した … ★`npx tsx scripts/count-masterchain-interest.ts`
★★実際 … ★`ERR_MODULE_NOT_FOUND`
   ★機序 … ★script を ★保全 branch に commit し ★その後 main に戻った
          ∴ ★作業ツリーに ★file が 無い
★★自分の memory に ★そのままの規律が 在る:
   ★`feedback-workaround-must-itself-be-checked`「★回避策は、それ自身を 1 回 実行してから書く」
★★踏んだ理由 … ★script の中身は 検査した（★型・read-only・PII 無し）が
   ★★「★渡した コマンドが ★渡した状態で 通るか」は ★検査していない
   ＝ ★★検査の対象が ★成果物で 止まり ★引き渡し面に 届いていなかった
★手当て … ★`git checkout <branch> -- <path>` で ★file だけ 取り寄せ（★branch は main のまま）
   ★`fs.existsSync` ＋ `tsx --version` で ★解決を 確認してから 再度 渡した → ★通った
★★恒久手当て … ★#1093 が merge されれば ★main に在る ＝ ★この罠は 消える
   ★それまでは ★status に「★作業ツリーに 取り寄せ済・★main には 未 merge」と 書く
```

★★**同じ件で もう 1 度 踏んだ（★同じ 30 分の中で）**: ★本 entry を出す docs commit に
★**script が 混入した**（★`git stash pop` が ★staged のまま戻し、★`git add status.md docs/…` の
★外に在ったのに ★index には 乗っていた）。★**`[Tier 1]` と書いた commit に ★code が 入った**
＝ ★**Tier を 低く読んで self-merge する向き**。★**捕まえたのは ★PR を出す前の `git show --stat`**
（★CLAUDE.md「★self-merge の前に 実 diff を見る」）。★amend で docs だけに戻し、★script は
★untracked のまま 作業ツリーに残した（★#1093 が 正本）。★★`git add <明示 path>` は
★**「他が 入らない」ことを 保証しない** ——★index の状態は ★別に 見る。

★**型として一段**: ★**「file を 作った」「型が 通った」は ★受け手の手元で 動く証拠ではない。**
★**引き渡しの単位は ★成果物ではなく ★★『相手が打つ 1 行』** ——★**その 1 行を ★自分で 1 回 打つ。**

### (1x) — ★EULA の env は `=1`（★`true` は黙って off）／★#1093 の日付 zone（2026-09-23T11:26+0900）

## ★conductor 再起動の便（2026-09-23・Opus 5.5）を ★一次と照合した

★**便の主張**: 「EULA 到着時は messages `eula.sections.*` → `EULA_VERSION` → `EULA_LIVE` + `NEXT_PUBLIC_EULA_LIVE` → kimny Go の順」。

```
★照合（origin/main 7205fdc7・grep）
EULA_VERSION           … lib/legal/eula.ts:5                    = "PENDING-LAWYER-TEXT"（★まだ仮）
EULA_LIVE              … lib/legal/config.ts:4                  = process.env.EULA_LIVE === "1"
NEXT_PUBLIC_EULA_LIVE  … masterchain-purchase-control.tsx:13    = process.env.NEXT_PUBLIC_EULA_LIVE === "1"
messages               … en/ja とも eula.sections = { status, agreement, contact }（★仮の 3 節）
★∴ 順序は コードと矛盾しない
```

## ★★便に無かった条件 ——★真と読む文字列は `"1"`

```
LEARN_LIVE             … === "true"
EULA_LIVE              … === "1"    ← ★LEARN_LIVE に倣って `true` と set すると ★黙って off
NEXT_PUBLIC_EULA_LIVE  … === "1" ＋ ★build 時に埋め込み ∴ ★set した ★後の deploy で初めて効く
★向き     … fail-closed（★購入ボタンは disabled のまま・★/eula は noindex のまま）＝安全側
             ★但し ★「開けたのに開かない」が ★エラー無しで起きる
★正しい値 … `.env.local.example:67-68`（`EULA_LIVE=1` / `NEXT_PUBLIC_EULA_LIVE=1`）
★担い手   … ★Vercel Production env ＝ 本番設定 ∴ ★kimny / conductor（★当課は PR を作れない）
★検収     … ★deploy の後に ★面で見る（★購入欄の同意 checkbox ／ ★/eula の robots）
             ★「env を set した」は ★証拠でない（memory reference-vercel-env-set-verify-gotchas）
```

★**memory も 1 本 古くなっていた**: ★`reference-live-flag-gates-different-surfaces-per-product` は
★「env は 8 中 1 本だけ（9/16 実測）」と書いていたが、★`EULA_LIVE` が ★翌 9/17（`6da7298e`）に入った
∴ ★今は ★9 中 2 本。★「client ∴ code 定数」も ★言い過ぎ（★client の要求は ★build 時埋め込みで、
★`NEXT_PUBLIC_*` でも満たせる）。★両方 直した。

## ★#1093 — ★日付の zone を ★行に書いた（★CCO PASS）

```
★追加 commit … f7cec9b0（★SQL は不変・★出力の行に "(UTC date)"）
★理由       … created_at は timestamp（tz なし）・defaultNow()・session TZ=GMT（★memory 2026-07-06 実測）
               ∴ 壁時計 UTC。★measured_at は JST ∴ ★隣り合う 2 行で zone が違っていた
               ★0 行の今は無害。★行が入ると JST 00:00–08:59 の行が ★前日として出る
★CI の射程   … ★scripts/ は tsconfig の exclude ＋ eslint の ignore ∴ ★CI はこの file を見ていない
★当課の検証 … scratch tsconfig で単体 typecheck rc=0 ／ ★型エラー 1 行で rc=2（meta-RED）／ 戻して rc=0
★DB では測っていない … ★ローカル Postgres の起動が ★分類器で deny → ★迂回せず、
               ★SQL を変えない形（★表示だけ）に ★変更を縮めた
★CCO        … review 5286175043（★head f7cec9b0 に pin・★静的のみ・★DB には撃っていない）PASS
★merge      … squash 7d26c9a8（★--match-head-commit f7cec9b0・★CI 全 pass の後）
               ★着地 … `git ls-tree origin/main scripts/count-masterchain-interest.ts` で在る・"UTC date" 1 件
               ∴ ★(1w) の「★main には 未 merge」の罠は ★消えた（★main で そのまま打てる）
```

★★**CCO の non-blocking（★実在）**: ★GMT の実測は ★**読む側の session** のもの。★書く側（app の Pool）で
上書きしていないことは ★code search で `SET TIME` / `PGTZ` とも 0 件（★default branch の index であって
pinned sha ではない）・★**role / DB レベルの `ALTER … SET` は 未測** ∴ ★ラベルは ★「上書きが無い限り」の条件つき。

★**script のコメントは「(measured GMT)」** で、★書く側を測ったように読める。★**レビュー後に sha を動かさないため
★この回は 直していない。** ★次に この file を触る回に ★「読む側 session で実測・書く側は未測」と書き直す。

## ★memory 索引を 畳んだ（★hook の警告で）

```
★MEMORY.md … 190 行 / 23,527 文字 → ★107 行 / 13,951 文字（★切られる境界は ≒24.4K 文字）
★リンク    … 130 本 ＝ file 130 本（★dangling 0 ／ ★索引漏れ 0 ／ ★畳む前と同じ照合で確認）
★落とした行 … ★現在形だったもの 2 本（★「8/9 audit bypass 期限」＝#767 は 7/26 merged・★
               「masterchain の律速は kimny・parse は実物と未照合」＝(W12) (a)(b) で 9/16 に閉じた）
               ★memory に現在形を置かない ∴ ★台帳へ寄せず 消した（★正本は ここと status.md）
```

### (1y) — ★有料 final の R2 URL が DB に書かれていなかった（★#1096 で修正・2026-09-23T11:45+0900）

## ★欠陥

```
★場所 … app/api/dial/session/route.ts（★修正前 main の :176-191 final 系 ／ :264-279 mastering）
   copyToR2({...}).then((r2Result) => {
     if (r2Result) { db.update(dialTasks).set({ r2FinalUrl, r2ExpiresAt }).where(...) }
   }).catch(() => {});
★★内側の update は ★await も return もされていない
★★Drizzle の query は lazy ——★`QueryPromise.then()` が `execute()` を呼ぶ
   （★一次＝node_modules/drizzle-orm/query-promise.js を読んだ）
   ∴ ★組み立てただけでは ★何も実行されない ＝ ★r2_final_url は この経路で ★一度も書かれない
★★エラーは出ない（★.catch(() => {}) も 空）
```

## ★★なぜ効くか（★珍しい経路ではない）

```
★ページを開いた直後 … fetchSession()＝session GET が ★先に走る（page.tsx:338）
   ★5 秒 poll の /api/dial/final は その後（:368）
★render は 8〜34 分 ∴ ★離れて戻ったユーザーの final は ★session GET で完了する
★/api/dial/final GET は ★completed なら即 return（final/route.ts:391）＝ ★後から直さない
★RoEx が task を消すと（★数日・#465）★有料 final の DL は R2 に逃げられず ★410
```

## ★手当て（#1096・Tier 2・CCO review 待ち）

```
★lib/dial/r2-persist.ts … copyToR2 と 行更新を ★1 つの async 関数で ★両方 await
★session route          … ★after(() => persistDeliverableToR2(...))
                          ★応答は待たせない・★関数は copy と書き込みが終わるまで生きる
★maxDuration = 120      … after() は関数の寿命の中で走る・copy は最大 90s・mastering/final と同じ
★test                   … ★fake db は ★await された時だけ 書き込みを記録（★Drizzle と同じく lazy）
                          ★control test で ★fake が lazy であることを固定
                          ★修正前 4 failed / 2 passed（★copyToR2 は呼ばれるが ★書き込み 0）
                          ★修正後 6 passed ／ ★meta-RED（helper の await を外す）4 failed
★全体                   … typecheck rc=0 ／ eslint rc=0 ／ test:unit 171 files・2400 tests rc=0
```

## ★影響件数は まだ 測っていない

```
★#1097 … scripts/count-dial-finals-missing-r2.ts（★集計のみ・★kimny が 1 回 実行）
   task_type 別 … completed / with_r2 / missing_r2 / missing<=3d / paid / free15 / 最終日（UTC date）
   ★with_r2 > 0 ＝ ★他の完了経路では copy 自体は動いている（★対照）
   ★missing<=3d ＝ ★RoEx の task が まだ在るかもしれない（★再コピーの余地・★purge 時間は概算）
★★SQL は ★DB で 一度も 実行していない（★ローカル Postgres の起動は 分類器で deny・迂回しない）
★予想 … ★dial の実到達は ≈0（memory・7 月の実測）∴ ★件数は 小さいはず ——★★但し 予想は 測定の代わりにならない
```

## ★範囲外（★PR 本文にも 列挙）

```
★#465   … preview を R2 に写さない（★別の判断・issue は low・スケジュールは kimny）
★mastering/final GET（:286-303）… r2FinalUrl を書くが ★r2ExpiresAt を書かない（★不整合・欠落ではない）
★既存行の修復 … ★件数を見てから（★W16）
```

## ★見つけ方

## ★着地（2026-09-23 昼）

```
★CCO … #1096 review 5286361825 ／ #1097 review 5286387597 ともに PASS（★本番 DB には撃っていない）
   ★#1097 の SQL は ★CCO が 使い捨てのローカル PG14 で ★逐語のまま実行・★手製 fixture と全セル一致
   ★FILTER…::int は集約全体にかかる（pg_typeof=integer）・★≤3d は session TZ を Tokyo/UTC にしても同値
★merge … #1097 → 76e1a203（--match-head-commit ae7210d2）／ #1096 → 560ecc6f（--match-head-commit 49242321）
★本番 … commit status「Vercel success」・GitHub deployment 6605341731 env=Production
         ★`vercel inspect mued.jp` → dpl_DgcNAQ2wycoBfQUZY1U2MoVcUNAy（production・Ready）＝この deploy の id
★kimny への 1 行 … main で `npx tsx scripts/count-dial-finals-missing-r2.ts`
   ★当課の確認（★実行はしていない）: main に file 在り・`npx tsx --version`＝v4.20.6・.env.local 在り
★★読み方（CCO）… ★missing_r2 は copy 失敗・R2 導入前の行も含む ∴ ★#1096 起因の「上限」
                  ★効く数（再コピーの余地）は ★missing<=3d
```

## ★★CCO の non-blocking（★実在）→ #1099

```
★maxDuration は ★呼び出しの開始から数える
★after() の前に inline poll（task ごとに順番・1 回最大 45s）→ ★最悪 45+90=135s > 120s
   ∴ ★after() の copy が途中で kill され ★行もログも残らない ＝ ★#1096 が直したのと同じ「静かな欠落」
★#1099 … maxDuration 300（= final/route.ts）・★COPY_TIMEOUT_MS を export
   ★test は値でなく性質 … maxDuration×1000 ≥ 2×ROEX_POLL_TIMEOUT_MS + COPY_TIMEOUT_MS
   ★120 で RED（120000 < 180000）→ 300 で GREEN
★残る穴 … processing が 5 本以上 ／ 5xx 再試行で copy が複数 attempt → ★まだ超えうる
```

★★**当課の見落とし**: ★#1096 で `maxDuration=120` を書いた時、★「copy は 90s」だけを見て ★**同じ関数の中で after() より前に走る poll を足していなかった。** ★コメントに「mastering/final と同じ」と書いた ——★**前例と同じ値にしたことを ★根拠と取り違えた。**
★★**しかも 前例の側も 同じ足し算で 足りていなかった**（★この台帳を書く途中で 1 度「順序が違う」と書きかけ、★コードを開いて 誤りと分かった）:

```
★mastering/final GET … poll（≤45s）→ ★await copy（≤90s）→ ★その後に completion の行更新
   ∴ ★同じく 45+90=135s > 120s
★但し 落ち方が違う … ★kill されると ★completion 前 ∴ task は processing のまま ＝ ★次の poll でやり直す
   ★R2 だけが 静かに欠ける形ではない ／ ★並行の session GET（#1096 後は after()）が先に完了させることが多い
★★残る危険 … ★copy が毎回 遅いと ★完了しないまま backstop に達して ★有料 mastering（220cr）が failed になりうる
★手当て … ★#1099 は review 中ゆえ ★触らない。★別 PR で mastering/final を ★maxDuration 300 ＋ ★r2ExpiresAt を書く
   （★subagent の指摘＝この GET は r2FinalUrl を書くが r2ExpiresAt を書かない）
```

## ★着地 2（#1099 ／ #1101・2026-09-23 昼）

```
★#1099 … squash 2a766392（--match-head-commit 4c74ecec・CCO PASS・★merge 前に Test pass を確認）
         ★本番 … mued.jp → dpl_Hm1zHGMGhYS6ntHJDUh2zEFJcDsV（main b7ed6279 の deploy）
★#1101 … squash 137fad48（--match-head-commit 8cc6fff9・CCO PASS・★merge 前に Test pass を確認）
         ★GET だけ … ★completion を先に書く → ★copy は after(persistDeliverableToR2)（★URL と期限の両方）
         ★maxDuration 120→300（★POST の submit→await copy にも効く）・★POST（220cr の charge 経路）は不変
         ★CCO … ★POST も読んで確認: ★advisory lock 内の予約行 insert が charge より前 ∴
                  ★関数が長く生きる間に再送されても ★二重 charge の経路は開かない
         ★test … 修正前 3 failed / 1 passed → 修正後 4 passed ／ ★meta-RED（after を即時実行）1 failed
         ★本番 … mued.jp → dpl_8VvViyYKKVtQUS5BXG9B9Ja8EVbE（main 137fad48 の deploy・Ready）
★memory … ★gotcha-drizzle-query-runs-only-when-awaited を新設 ／
           ★feedback-do-not-buy-a-property-with-a-value に「前例と同じ値は導出ではない」を 4 件目として追記
```

## ★CLAUDE.md 共通 block 04（#1102・CCO 配布）

```
★依頼 … CCO（conductor 承認済）・★block 04 の 11 課一覧を消して 正本へのポインタに（+16/−32）
★当課の扱い … ★他 session の依頼で CLAUDE.md を編集しない ∴ ★kimny に提示して ★go を得てから適用
★照合 … patch sha256（shasum -a 256）一致 eadb1858…d366f7e ／ 基準 origin/main 137fad48 ＝ 現在の main
★手順 … origin/main から worktree → git apply --check rc=0 → apply rc=0 → ★hunk は marker 内（249-270 の中）
★push … ★block-main-push hook が ★変数の path を判定できず fail-closed（★実行前に止まる・何も起きていない）
         → ★literal path で commit・push は別コマンド
★残 … CI → merge → CCO へ通知（★CCO が verify-blocks-landing-gate で照合）
```

★#465（preview の R2）の規模を測るために ★subagent に調査させ、★その報告が ★この欠陥を「likely bug」として挙げた。
★**当課は 報告を そのまま運ばず** ★コード（route の該当行）と ★drizzle の source（`query-promise.js`）の ★2 点で 一次確認してから 直した。

### (1z) — ★EULA 後の正式配信は ★4 製品すべて 1.0.0（版に依存する場所の棚卸し・2026-09-23T19:28+0900）

★**kimny 逐語（conductor 便・2026-09-23）**: 「EULAが届いてからの正式な書き出しについては 全ての製品についてバージョン番号を1.0.0にしてください。」
★∴ ★(1v)/(W15) の「無料 3 本 0.1.3・masterchain 0.1.4」は ★置き換え。★引き金（EULA 本文 → dsp が 4 本まとめて bake）は不変。

## ★測った（origin/main af1a4788・node_modules 除外）

```
★版の定数 … lib/{muedsat,muedlim,muedrive}/config.ts の *_VERSION ＝ "0.1.2"（3）
           ＋ *_DOWNLOAD_URL ＝ …-0.1.2-installer.pkg（3）
           ＋ lib/masterchain/config.ts:70 MASTERCHAIN_DOWNLOAD_URL ＝ …-masterchain-0.1.3-installer.pkg
           ★masterchain は URL だけ（MASTERCHAIN_VERSION は作らない・portal は URL から版を読む）
★表示 … ★registry（PLUGIN_DIST.version）→ portal ／ ★/plugins/versions.json（★但し plugin からは読まれていない＝下の訂正）
        ★masterchain の版は portal.ts の versionInUrl() が URL から読む
        ★messages（ja/en）に 版の文字列 0 件・"alpha" 0 件 ／ JSON-LD softwareVersion 0 件
★メール … 本文の版は無い（URL は定数から）∴ ★定数を変えれば追随
★license … ★版を含まない（payload＝name+email+product+scope）。LICENSE_VERSION=2 は ★key の書式版
★EULA_VERSION … lib/legal/eula.ts:5 ＝ "PENDING-LAWYER-TEXT" ——★EULA 文書の版であって ★製品の版ではない
★test … plugin-version-matches-download（定数 2 本の一致）／ plugin-download-artifact-integrity（★sha256 の pin）
        ／ plugin-download-retention（★一度 *_DOWNLOAD_URL に載った URL の file は消せない）／ portal 系 test
★特商法 … app/[locale]/tokushoho/page.tsx:123 の動作環境は ★0.1.3 installer の実測（xar/lipo/otool）
```

★**parser の境界（★製品側 `buildPurchaseItems()` に URL を渡して測った・regex は写していない）**:
```
✓ MUEDsp-masterchain-1.0.0 ／ MUEDlim-1.0.0 ／ MUEDsat-1.0.0 ／ MUEDrive-1.0.0（-installer.pkg）→ "1.0.0"
★null … 1.0 ／ v1.0.0 ／ 1.0.0-rc1 ——★落ち方は null ＝ ★版だけが静かに消える
```

## ★dsp へ（conductor 経由）

```
① 4 本とも PLUG_VERSION を 1.0.0 に ② file 名は ★<Name>-1.0.0-installer.pkg ちょうど（★v 無し・-rc 無し・3 桁）
③ sha256 は ★shasum -a 256 で 4 本ぶん ④ ★plugin の更新通知が 0.1.x < 1.0.0（★major の繰り上がり）を正しく比べるか
   （★versions.json は latest="1.0.0" を返す ∴ 比較は plugin 側 ——★9/23 dsp 実測で ★そもそも比較も取得も無い＝下の訂正）
```

## ★mued の実装（★Codex へ・dsp の名前と sha256 を受けてから）

```
1. 定数 7 本 … 無料 3 本の *_VERSION・*_DOWNLOAD_URL ＋ MASTERCHAIN_DOWNLOAD_URL
2. public/downloads/ に 1.0.0 の 4 本を置く（★旧 file は消さない＝retention test が守る）
3. artifact-integrity test の sha256 pin を 4 本（★masterchain の pin は今 null）
4. #1062 の作り直し … ★source＝alias 5 本 ＋ ★0.1.2 の canonical 3 本 ＋ ★masterchain 0.1.3 ＝ 9 本
   ★destination は 現在の *_DOWNLOAD_URL から導出
   ★test は性質で … 「retained な URL のうち 現在の URL でないものは ★全部 同じ製品の現在の URL へ 307」
5. parser の写し 2 本を 1 本化（portal.ts ↔ version-matches-download.test.ts）＋ ★境界の assert（上の表）
6. lib/*/config.ts の 0.1.2 の由来コメントを 1.0.0 に
7. 特商法の動作環境を ★1.0.0 の installer から再測（xar / lipo / otool）
8. メール手順文・purchased.howto は ★貼り付けボタンが同じ回に乗る場合だけ（W15 ⑤）
```

## ★判断が要るもの（conductor / kimny）

```
Q1 旧 URL … (a) ★9 本すべて 1.0.0 へ 307（推奨）／ (b) 旧 build を そのまま配り続ける
   ★推奨理由 … ★「EULA は次回のユーザーリリースで全製品に反映」と ★旧 link が EULA 前の build を配り続けることは両立しない
              ★#1062 自身が「古い名前が古い build を配り続けない」を目的にしている
              ★file は残る（retention）∴ ★必要なら redirect を外すだけで戻せる
Q2 EULA_VERSION の値 … ★製品版（1.0.0）と ★別物として 文書の版（例: 日付）にする（推奨）——★混ぜると order の tags で区別できない
Q3 FastSpring 側の商品名・版の表記 … ★当課は dashboard を見られない（owner＝conductor / kimny）
```

★★**conductor 決定（2026-09-23 19:30 JST 受領）**:
```
Q1 ＝ ★(a) 9 本すべて 1.0.0 へ 307・★file は残す（★EULA 反映と整合・redirect を外せば戻せる）
Q2 ＝ ★EULA_VERSION は 製品版と分けて ★文書の版（日付など）
Q3 ＝ ★conductor が引き取る（★activation 後に kimny と確認）＝ ★当課は扱わない
★dsp への 4 点 … ★conductor から dsp へ渡す
★順序 … ★dsp の名前と sha256 が届く → ★Codex で実装 → 当課が独立確認 ／ ★特商法の再測は 1.0.0 installer が出てから
```

## ★★訂正 — ★/plugins/versions.json は ★plugin から読まれていない（dsp 実測・当課が一次で照合）

```
★dsp の実測（conductor 便 9/23）… plugin に versions.json を読んで版を比べる処理は ★無い
   ★MUEDsp / MUEDlim に在るのは ★表示の枠（SetUpdateAvailable）だけ・★呼ぶ側は どの branch にも無い
★当課の照合（mued-dsp・git grep・2026-09-23）
   ★'versions.json' を C++（*.cpp *.h *.hpp *.mm）で … ★remote 423 branch すべて 0 件
   ★陽性対照 … 同じ loop で 'SetUpdateAvailable' ＝ 40 branch 中 30 件（★loop は生きている）
   ★origin/main の SetUpdateAvailable は ★定義 2 件と「a future startup version check」のコメントだけ
★∴ ★route.ts:4-8 のコメント「The free MUEDsp plugins fetch this once at startup … surface a "update
   available" banner」は ★事実ではない（★7/19 の dsp↔mued の約束を ★実装済みのように書いている）
★1.0.0 の回 … ★dsp は「比べる関数と test だけ」を足し ★起動時の取得はつながない（★新しい外部通信は kimny 判断）
   ★当課の versions.json は ★1.0.0 を返すように更新する前提のまま（registry から自動）
★★書かないこと … ★「plugin への更新通知が効いている」。★versions.json が 1.0.0 を返すことは ★通知の証拠ではない
★Codex の実装一覧に ★9 を追加 … route.ts のコメントを事実に直す（★取得する plugin は無い・約束は 7/19・つなぐのは kimny 判断）
```

## ★本番後（当課が測る）

```
★(W0) … 1.0.0 の 4 URL を ★xar! ＋ size ＋ 陰性対照 ／ ★/plugins/versions.json が latest=1.0.0（★endpoint の値の確認であって「更新通知が効く」の確認ではない）
★#1062 の 9 本 … ★307 と Location ／ ★特商法の動作環境の値
```

### (2a) — ★本番の license 署名鍵は K1（★秘密に触れずに 3 者照合・2026-09-23T20:35+0900）

★**依頼（conductor）**: ★台帳（conductor 側）の「K1 私鍵が本番に無い」（ship-prod-secrets-two・9/10）が ★実物を見ずに書かれた可能性 ∴ 本番の `MASTERCHAIN_LICENSE_PRIVATE_KEY` が K1 と対かを確かめる。★条件＝秘密の値を出さない・`vercel env pull` しない・署名／注文／DB 書き込みをしない。

★**結果＝★一致。**

```
★経路 … ★既存の本番 GET https://mued.jp/api/health の masterchain.licenseKeyPublic
        ＝ 本番の秘密鍵から ★導出した Ed25519 公開鍵（raw 32 byte hex）。★秘密は返さない（dsp 7/27 の計器）
★測定 … 2026-09-23 20:35 JST ／ mued.jp → dpl_8ErPoUquw8FUqawJtix9GroZfkwz（production・Ready）
本番の導出値          54a6246f7103387e4e72adf44b4c2c5f5607c82e4db198416088e5a7be1d1d41（http 200・json・2 回同値）
K1 公開鍵 file        54a6246f…1d1d41 ★一致（★先頭行 BEGIN PUBLIC KEY を確認してから読んだ・SPKI 44 byte の後ろ 32）
plugin の埋め込み鍵   0x54,0xa6,…,0x1d,0x41 ★一致（mued-dsp origin/main faf9ae4b・LicenseVerifier.h:105-106 の 1 つ目）
★陰性対照 K2          fea9d3b3…81f69a ≠ 本番（★LicenseVerifier.h:108-109 の 2 つ目・★比較は区別できている）
```

★**言えること**: ★本番 deploy の秘密鍵は ★K1 と対。★発行側 issueLicense も同じ privateKey() を読む ∴ ★発行される keyfile は K1 で署名される。
★**言えないこと**: ★keyfile の書式から plugin の検証までを ★通しで確かめたことにはならない（★実 keyfile を plugin で検証する試験が別に要る）。★env は deploy ごとに固定 ∴ ★env を変えた後の deploy では測り直し。
★∴ ★「K1 私鍵が本番に無い」（9/10）は ★今の本番と食い違う。★根拠は /api/health の curl 1 回（★conductor へ報告済）。
★**conductor 受領（9/23）**: ★陰性対照まで付いていて根拠として十分 → ★conductor 側台帳の ship-prod-secrets-two を訂正（conductor #3569）。

## ★★activation 後に残る 通し確認 2 件（★今は待ち・conductor 9/23）

```
① ★keyfile の発行 → plugin で LICENSED（★書式〜検証の通し。鍵の同一性は (2a) で済・通しは未測）
② ★FASTSPRING_WEBHOOK_SECRET の ★値の正しさ（★「在る」は 9/16 に確認済・★値が FastSpring 側と一致するかは未測）
★起床条件 … ★FastSpring store の activation（W12 と同じ）
   ★conductor 実測の逐語（W12 から移した）＝ 管理画面が「Storefront status cannot be changed until activation is
   completed.」で ★popup の Online 切替をブロックする
```

### (2b) — ★FastSpring store activation 済 → ③④⑤ の準備（2026-09-23T21:14+0900）

★**①activation**: Kevin 2026-09-22T17:50:51Z「your store has been activated!」（conductor が Gmail で確認）。★順序（conductor 台帳 masterchain-ready-to-open-20260916 rev11）＝ ②kimny が popup「glasswerks」を Online（★テスト用・販売開始ではない）→ ③DOM 3 点 → ④popup 発テスト注文 → ⑤live storefront env（kimny 承認）→ EULA・1.0.0 → ⑥kimny の本番購入 → ⑦開店。

## ★★前提の訂正 ——★テスト注文では keyfile は発行されない（当課が route を読んで確認）

```
★app/api/webhooks/fastspring/route.ts（#1039・9/16）… ★live !== true の order.completed は ★fulfillment を skip
   ★license 発行 ／ masterchain_purchases ／ 配達メール … ★どれも無し
   ★残るのは … webhook_events の 1 行（payload 付き・errorMessage＝SKIPPED_TEST_MARKER）＋ warn log
   ★=== true で見る ＝ ★欠損も発行しない側（★発行済みキーは撤回できない）
★∴ ④ で確かめられるのは … (a) ★FASTSPRING_WEBHOOK_SECRET（★HMAC は skip より前 ∴ FastSpring の webhook log が 200 なら正・401 なら誤）
                            (b) ★popup の tags（C1-b）… ★payload を読む＝本番 DB 読み＝kimny
★keyfile→plugin LICENSED の通し … ★live 注文だけ ＝ ★⑥（kimny の本番購入）。★鍵は K1（(2a)）∴ ⑥ で見るのは書式〜検証
★当課の memory（project-masterchain-paid-line）は ★「live 未参照 ∴ test 注文も本番扱い」のままだった → ★訂正済
```

## ★conductor 決定（9/23 21:1x）

```
④ ＝ ★(a) テスト注文 1 件・★本番への書き込みは webhook_events の 1 行だけ・★LICENSED の通しは ⑥
③ の値（★公開値・conductor が 9/16 に管理画面で実測した逐語）
   test popup storefront … glasswerks.test.onfastspring.com/popup-glasswerks
   product path          … muedsp-masterchain（★2026-07-29 から存在・$69.00 USD・表示名 MUEDsp masterchain）
   ★「kimny が決める」は ★この既存 product で決着済として扱う
★live の識別子 … ★Online 切替の後に 管理画面で確かめてから決める（★.test. を除いた形は推測 ∴ 先に env へ入れない）
★webhook の配送先が test/both か … ★Online 切替と一緒に conductor が kimny に確認
★tag を読む read-only script … ★Codex で用意（★実行は kimny）
```

## ★③ の方法（★本番の設定は変えない）

```
★本番では今はできない … script は STOREFRONT ＋ PRODUCT_PATH ＋ NEXT_PUBLIC_EULA_LIVE=1 が ★全部 build に在る時だけ読まれる
   （masterchain-purchase-control.tsx:32）∴ ★EULA 前の本番は button disabled のまま（★意図どおり）
★ローカルで起動 ／ 3 値は ★shell の環境変数だけ（★file にも Vercel にも書かない）／ /muedsp は ★DB を読まない（確認済）
★見る 3 点 … (1) script#fsc-api の data-storefront と data-fs-settled="1" (2) window.fastspring
             (3) ★EULA の checkbox を入れた後に button が enabled
★本番の同じ 3 点 … ★⑤ と EULA flag の後に もう一度
```

## ★⑤ の手順（★kimny の承認事項・当課は手順だけ）

```
1. printf '%s' '<live storefront>' | vercel env add NEXT_PUBLIC_FASTSPRING_STOREFRONT production（★echo は末尾改行が入る）
   ★PRODUCT_PATH も同様（muedsp-masterchain）
2. vercel env ls production で ★名前を確認（値は出ない）
3. ★build 時に埋め込まれる ∴ ★新しい deploy が要る ——★git push の自動 deploy か dashboard の Redeploy（★CLI deploy はしない）
4. 確認 … ★EULA flag が off の間は 見た目は変わらない（disabled のまま）
   ★埋め込みの確認＝/en/muedsp の JS chunk に ★storefront の文字列が在る（陽性）＋ ★".test." が無い（陰性）＝当課が測れる
5. 戻し … vercel env rm ＋ redeploy
```
★**追記（2026-09-16 の実測・muedsp-landing-content.tsx のコメント）**: env を入れた後の build でも button が disabled のままだった前例があり、★build cache を疑っている ∴ ★Redeploy は ★build cache を使わない形でも行い、★判定は env の一覧でなく ★button の描画（disabled 形か enabled 形か）で見る。

### (2c) — ★③ で本番の CSP が FastSpring を拒否していた → #1108 で修正・本番着地 ／ ④ の準備完了（2026-09-23T21:52+0900）

## ★③ の実測（ローカル・test storefront・Buy は popup を開くだけで注文しない）

```
★修正前（21:29:53 JST・main）… console「Refused to load the script 'https://d1f8f9xcsvx3ha.cloudfront.net/sbl/1.0.1/
   fastspring-builder.min.js' … script-src …」／ window.fastspring 無し ／ EULA を入れても button disabled ／ popup 開かない
   ★data-fs-settled="1" は error 側でも付く ∴ ★settled を「読めた」と読まない
★本番の CSP を curl … script/style/connect/frame に FastSpring が 0 件 ∴ ★EULA flag と env を入れても 本番は買えなかった
★修正後（21:30:37 JST）… window.fastspring と builder 在り ／ button enabled ／ popup の iframe 表示 ／ ★当課の CSP 違反 0
★残る観察（★当課の CSP ではない）
   ① FastSpring の入れ子 frame（dk9c86k2d45gh.cloudfront.net）が ★自分の frame-ancestors で localhost を拒否 → 本番で再測
   ② 「payment is not allowed in this document」（SBL の iframe に allow="payment" が無い見込み・カード決済は影響なし見込み）
      → ★SBL の版（FastSpring の snippet は sbl.onfastspring.com/sbl/1.0.9）を上げる判断の材料（★別判断・conductor）
   ③ popup の価格 ＝ ¥12,365（消費税 ¥1,124・10% 込）→ ★kimny 決定「現状でいい」＝ サイト $69・決済は地域価格 JPY
   ④ popup の帯「http://localhost:3217 needs to be whitelisted to accept live transactions」
      ∴ ★test は whitelist 不要・live は要る → ★kimny が https://mued.jp と https://www.mued.jp を登録済（21:3x）
★ボタンの文言「Coming soon／近日発売」（muedsp.masterchain.buyLabel）は enabled でも変わらない → ★開店の便の作業（copy は conductor×kimny）
```

## ★#1108（CSP・Tier 3・実装 Codex・review/検証 mued・conductor PASS）

```
★足した 5 本 … script/style＋d1f8f9xcsvx3ha.cloudfront.net ／ img＋sbl.onfastspring.com ／ connect/frame＋*.onfastspring.com
★1 回目の CI … ★Test が落ちた（Module did not self-register: @parcel/watcher-linux-x64-glibc）
   ★test が next.config.ts を import → next-intl の plugin が native module を読み、Linux の worker thread で load 不可
   ★macOS では 173 files 全部 緑だった ＝ ★手元の緑は手元の OS の緑（memory に追記）
★直し … CSP を副作用の無い lib/security/content-security-policy.ts へ（contentSecurityPolicy({ isProduction })）
   test はその module を import・next.config.ts は text で読む guard
   ★header は byte 単位で不変（Codex: 旧/新 config の headers() を両 mode で diff＝空 ／ ★mued: 本番 live 1003 B ＋ 5 本 ＝ 新 1162 B）
★merge … c2d4e534（--match-head-commit 621f4550・conductor の再 pin 後・Test と Build pass の後）
★本番着地 … mued.jp → dpl_6zVTTwceuJttgwds9aHFSH56JBbe（production・Ready）
   ★live の CSP header ＝ merge 前の live（1003 B）＋ ちょうど 5 本（1162 B）＝ ★完全一致
   ★本番は EULA flag off ∴ script はまだ読まない（意図どおり）→ ★本番の popup は ⑤ と EULA flag の後に測る
```

## ★#1109（tags を読む read-only script・Tier 2・実装 Codex・CCO PASS）

```
★merge … 44708557（--match-head-commit bdf34cdf）
★CCO の要修正（★実在・当課の見落とし）… entry guard が ★symlink 越しの絶対 path で main を走らせず ★rc=0 で黙る
   （kimny の Dropbox は symlink）→ ★realpathSync で両辺をそろえた ＋ test
   ★当課の最初の確認は repo の中の相対 path で、★その経路を測っていなかった
★推奨 2 件も反映 … SQL 側 jsonb_object_agg で ★値を DB から出さない ／ 失敗は name と code だけ
★non-blocking（直さず記録）… live は生の値のまま DB から出る（表示は formatter が INVALID に落とす）
★引き渡しの 1 行を ★kimny の打ち方そのもので打った（main 44708557・DB に触らないよう引数 abc）
   cd /Users/kimny/Dropbox/_DevProjects/mued/mued_v2 で相対 ／ Dropbox の絶対 path → ★どちらも rc=1「no data was read … expected N: 1–50」
```

## ★④ の準備

```
★手順書（kimny 向け 1 枚）… conductor へ送付済（URL・test card 4242…・完了画面の license 表示・webhook log 200/401・script の打ち方）
★起動 … conductor から「kimny の準備ができた」→ 当課がローカル（port 3217・test storefront の値は shell の環境変数だけ）
★test card … FastSpring 公式 4242 4242 4242 4242・未来の日付（★CVV の値は公式の表に無い）
★test 注文でも FastSpring は通知と fulfillment を simulate ∴ ★FastSpring 側の license が完了画面に出るかを見る
```

★**時刻の訂正**: ★当課は便と手順書に「22:1x」「22:0x」「21:5x」と ★測らずに書いた。★実測（`gh pr view --json mergedAt`）は #1108 ＝ 21:49:19 JST・#1109 ＝ 21:50:35 JST。★conductor へ訂正済（memory `feedback-timestamps-must-be-measured-not-narrated` に 2 件目として追記）。

### (2d) — ★④ の 1 回目は失敗：原因は CVV（store の設定ではなかった）／ ¥2,680 月額の商品（2026-09-23T22:34+0900）

## ★起きたこと

```
★kimny（ローカルのページ・TEST MODE・¥12,365）… 4242…／4012 8888 8888 1881・12/30・★CVV 123
   → 「テスト モードでは、サポートされていません。」で進まない
★当課の切り分け（Playwright・★FastSpring 公式の decline カード 4000 0000 0000 0002＝注文を作らない）
   22:07:08 popup を開いて session の JSON を保存（JP・JPY・items は masterchain 1 件）
   22:10:04 JP で送信 → POST …/session/<id>/payment ＝ {"messages":[{"type":"danger","phrase":"UnsupportedInTestMode"}],"next":"error","production":false}
            送った paymentType＝"card"
   22:14:43 US（$69.00・USD・郵便番号 10001）・★autoRenew=false でも ★同じ UnsupportedInTestMode
   ⇒ ①（JP・JPY）と ②（支払いの保存）は ★否定（←ここまでは正しい）
★当課の結論「∴ store 側の設定」は ★誤り ——★CVV を 123 のまま 一度も振っていなかった
★kimny が管理画面の Popup Preview でも 123 で同じ文言 → conductor は Kevin 宛ての下書きを作った
```

## ★★原因 ＝ ★CVV（一次で確認）

```
★Kevin 7/30（_conductor/docs/archive/inbox-20260815/fastspring-kevin-reply-20260730.md:31）
   「Looks like the problem is the cvv code. Yours is *56MB for a successful order.」
   :88 … ★管理画面の Checkout Links に表示されている値が このストアの test 用の正しい CVV ／ ★4242… は正しく 123 が誤り
★9/16（conductor 台帳 fastspring-dashboard-setup-20260916 rev4）… subagent も 123 で ★同じ文言 → Kevin の値で 2 回目に成功
   （order GLASSWERKSJP260916-5300-60118）
★∴ ★Kevin 宛ての下書きは ★送らない（★同じ質問に 7/30 に回答済）→ ★conductor へ URGENCY high で停止を依頼済
★次の一手 … ★kimny が ★Checkout Links の CVV で ④ を再試行（★当課は値を記録・便に書かない）
```

★**教訓（memory `feedback-grep-org-records-for-the-error-string-first` 新設）**: ★**同じ日本語の逐語が conductor の台帳に在った** ＝ ★grep 1 回で済んだ。★変数を振る切り分けは ★**振っていない変数（CVV）を列挙していなかった** ∴ ★「残るのは ③」は 言えなかった。

## ★¥2,680 月額の商品（conductor の依頼・管理画面は見ていない）

```
★Preview（管理画面の popup「glasswerks」）は ¥2,680・月額 のサブスク商品で開いた（conductor 報告）
★当課のページの session … groups 1・items 1（muedsp-masterchain だけ）・hasRecurring=false ⇒ ★当課の経路には載らない
   ★当課のコードは SBL に products:[{ path: NEXT_PUBLIC_FASTSPRING_PRODUCT_PATH }] を 1 件 push するだけ（商品の作成・選択の処理なし）
★記録 … 9/16 の管理画面の実測（台帳 fastspring-dashboard-setup-20260916 rev2）＝「One-Time product muedsp-masterchain
   （$69.00 USD・作成 Jul 29, 2026）が既に 1 件（Subscription 0）」／ runbook も「買い切り（★月額ではありません）」
   ／ mued_v2 に ¥2,680・月額・FastSpring subscription の記述 0 件
★∴ ★9/16 以降に作られたか ★Preview が popup の既定の商品（見本など）を出しているか ——★記録からは区別できない
★送信の subscribe=true … ★月額の印ではない（hasRecurring=false・保存は autoRenew で別）・★意味は未確認
★決着に要るもの … 管理画面の Products 一覧（Subscription 件数・名前・作成日）と popup「glasswerks」の既定の商品 ＝ ★kimny の次の入室時
```

★ローカルのページ（pid 30133）は ★22:31:12 に止め（dev のログの最後の書き込み＝終了時の出力）、`next dev` が書き足した AGENTS.md は元に戻した（git status 空）。
