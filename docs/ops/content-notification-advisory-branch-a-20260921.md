# content課 canonical 変更通知 — advisory 分岐 A（★#1069 を merge する その手で送る）

★**これは ★下書きではなく ★発出待ちの本文。** ★#1069 を merge した ★同じターンで送る。
★**「merge 後にやる」と後ろへずらさない** ——★`canonical-change-notification` は ★Hoo Pass 退役で 1 回 落ちており、
★原因は宛先名の陳腐化ではなく ★後ろへずらしたこと（★rule 冒頭に経緯）。

- ★**担い手**: ★mued課（★conductor と (a) で合意＝★押す者が その手で送る・2026-09-21）
- ★**宛先**: ★`ListAgents` で ★実時解決（★母体は旧 `_contents-writing`）。★**ここに name を書き写さない**（★セッションごとに変わる）
- ★**経路**: ★組込み `SendMessage`（★`mcp__claude-peers__send_message` は使わない＝★送信側に成功が返るのに届かない）
- ★**SNS課 と混同しない**（★両方とも発信系だが canonical 通知先は content課）

---

## 送る本文（★そのままコピーして可）

★**MUED advisory の価格体系が変わりました（★旧 3 段は販売終了）**

★**canonical**: ★`messages/{ja,en}.json` の `advisory` ／ `tokushoho.advisory` ／ ★`app/llms.txt/route.ts`
★**根拠**: ★kimny 裁定 2026-09-21（★逐語「Aで。advisory は小規模事業者に絞って展開しよう。旧来のadvisory はマーケティングに的にもスキーム的にも失敗である。なぜなら売り上げがゼロだからだ」）／★PR #1069

★**before → after（核心差分）**

```
★販売終了（★旧 3 段）
   見立て＋設計図（単発）  250,000円（税込275,000円）
   月額でつくる            200,000円（税込220,000円）/月〜
   月額で並走する          400,000円（税込440,000円）/月〜

★現行（★小規模事業者向けの新体系）
   初回相談                          無料（60分）
   3ヶ月 業務改善・自走化プログラム   月額100,000円（税込110,000円）／総額300,000円（税込330,000円・分割可）
   社内お守りプラン                  月額30,000円（税込33,000円）★月単位で解約可
   スポット相談                      30,000円（税込33,000円）／90分
```

★**位置づけの変更**（★価格だけではない）: ★**advisory は 小規模事業者向けに絞る**。★旧来の路線は ★マーケティング的にもスキーム的にも失敗（★売上ゼロ）という kimny の評価。★八王子向けの訴求が起点。

★**影響範囲（★当課が実測した・★推定ではない）**

```
★content課 の ★公開済記事 … ★影響なし
   ★根拠＝★workspace に 公開系 dir が 無い（published / posts / articles / output / live / dist / content ＝ すべて不在）
★content課 の ★drafts     … ★★6 file が 旧価格を持つ（＝★再利用すると 旧価格が 復活する）
   drafts/inbox/advisory-lp-v7-plan-brief-20260702.md
   drafts/inbox/advisory-lp-i18n-section-mapping-20260702.md
   drafts/inbox/advisory-claudedesign-runbook-20260702.md
   drafts/inbox/advisory-lp-copy-rewrite-20260703.md
   drafts/advisory-lp-impl/tokushoho-and-seo-diffs.md
   drafts/advisory-lp-impl/page.tsx
★測り方 … grep -ral --include='*.md' --include='*.tsx' -E '250,?000|200,?000円|400,?000円'
★陽性control … 同 repo で 'advisory' は 47 file（∴ ★0 件は「見えていない」ではない）
★可変性 … ★2026-09-21 時点の測定。★当課は content課 repo を書き換えていない（★読むだけ）
```

★**緊急度**: ★**通常**（★公開済記事は無いので「即時」ではない。★但し ★drafts が そのまま次の記事の素になるため ★軽微にも落とさない ——★迷ったら過剰通知側）

★**お願い**: ★上記 6 file の旧価格を ★新体系へ。★**退役分（旧 3 段）は「値を直す」でなく「消す」対象**です
——★価格 grep は ★退役項目を原理的に拾えない（★Hoo Pass のセルが「無料」と書かれていた前例）。

---

## 発出後にやること

★**この file に ★発出の事実を追記する**（★送信は自分の側の出来事 ∴ ★相手の返信を「届いた」の証拠にする）。

```
★発出: <ISO8601>  ★宛先: <ListAgents で解決した name>  ★相手の返信: <あり/なし>
```
