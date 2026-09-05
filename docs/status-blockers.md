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

