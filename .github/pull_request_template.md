<!--
mued課 PR テンプレート。書き方の base = claude-code-template repo の同 path。
キャラクター gate 行のみ mued課用に fill 済。
★このファイルは「覚えておく」ためではなく「毎 PR で目に入る」ために在る。
   読み返して防げた実例が 0 だったので、規律は出てくる場所に置く。
-->

## Summary

<!-- 何を・なぜ変えたか 1-3 行 -->

## Tier

<!-- 実 diff で判定する。「何を変えたつもりか」では決めない: gh pr view <n> --json files -->

- [ ] Tier 1 — docs / データ / コピー / テスト追加のみ → `[self-review]` セルフマージ
- [ ] Tier 2 — コード変更あり・Tier 3 非該当 → `[peer-review: 課名]`（mued の相手は product課）
- [ ] Tier 3 — 価格 / 認証 / 破壊的スキーマ / 本番設定(secrets) / 外部サービス / 全課波及 hook → conductor 提出

<!--
★`.ts` / `.tsx` が 1 本でも入っていれば Tier 1 ではない。
   sitemap.ts・next.config.ts・新規 page.tsx は「docs のつもり」でも コード。
-->

## 機械チェック

- [ ] `npm run typecheck` 通過（★`$?` は pipe の前で測る。`tsc | tail` の rc は tail のもの）
- [ ] `npm run lint` 通過
- [ ] `npm run test:unit` 通過（★CI が回すのはこれ）
- [ ] `npm run build` 成功（該当する場合）

## 成果物 verify

<!--
機械チェックとは別工程。「コードが壊れていない」と「成果物が実際に使える」は別物。
証拠なしに「通過」と書けない — evidence なしの記載は未検証扱い。
-->

**mued課のキャラクター gate — 実 URL を開いて、その面が読めて操作できるか。**

- [ ] **実 URL（本番 or preview）で当該面を開き、意図した内容が描画されることを確認した**
- [ ] ★**status code でなく本文の述語で測った** — この site では status が両義。`POST` は存在しない経路にも 200＋HTML を返し（`GET` なら 404）、subscribe 系は成功・honeypot・`registry.live=false` が**同じ 200＋同型 body**。**404 も同じく弁別しない**（route 有りで空 ⇔ route 無しが両方 404）。∴ 「200 だが未反映」を弁別する語を 1 つ選んで assert する
- [ ] ★**route の有無を測るなら `x-matched-path`** — `/_not-found` や `/[locale]` なら自分のハンドラには届いていない。status では測れない
- [ ] ★**新しい面を足したなら、その面への入口を同じ PR で繋いだ** — 導線ゼロの追加は型エラーにならない（退役と同じく fail-silent）。到達性は件数や存在でなく、render して `href` とアクセシブル名で測る
- [ ] ★**ローカル server で測ったなら、起動ログで自分の build が応答していることを確認した**（`curl` の 200 は、別プロセスが port を握っていても返る）

## 証拠

<!--
実行ログ / スクショ / 実測値の貼り付け。「見た」だけで証拠が残っていない = 未検証扱い。
★0 件・緑・skip を報告する時は、陽性control（確実に在るものが出る）を同じ出力に並べる。
   陽性control が無い 0 件は、「無い」と「計器が死んでいる」を区別できない。
-->

## 検査の健全性

<!-- test / ガードを足した PR のみ。足していなければ section ごと削除して可。 -->

- [ ] ★**meta-RED を通した** — 壊すのは**対象側**。test 側の定数を壊しても両方 直るので検出できない
- [ ] ★**母集団の作り方を書いた** — 包含リスト（手書き配列）なら、リストに依存しない述語を 1 つ足す。「関連 test が緑」は、自分がその test の母集団に居ることを意味しない

## Test plan

<!-- reviewer が再現できるレベルで箇条書き -->
