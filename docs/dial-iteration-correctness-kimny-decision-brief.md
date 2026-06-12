# ⑤ 対話イテレーション correctness — UX・原価 判断ブリーフ（kimny 向け）

2026-06-12。conductor 経由で escalate 済の判断材料。**実装は kimny 方向 OK まで hold**。

## 1. 何が分かったか（experiment-first が救った）

⑤ = 対話ミックスの **2回目以降の調整が反映されず、1回目の音が返る**バグ。原因は RoEx の
task 単位 idempotency（同じ mix タスクへの2回目の effects 適用は「キャッシュ済の1回目」を無料で返す）。

修正案の当初プラン＝「調整毎に fresh タスクを作って即 final」を、**実寸9stemで実験して反証**した:

> fresh `/mixpreview`（2秒で taskId）→ 即 `/retrievefinalmix` → **11秒で 500 + 課金**
> `"Service completed but did not return results. Your credits have been used - please contact support."`

= Yuu が踏んだ「credits used / contact support」そのもの。RoEx は **ベースmixのrender完了前に
effects を適用できない**（render は実寸で 8〜22分）。同期処理では maxDuration 300秒を超えるので、
naive 修正は**全イテレーションで課金付き500を量産**する。小2stemで成立して見えたのは render が
16秒で終わる小サンプルゆえの錯覚（[[feedback-timeout-calibration-needs-prod-data]] と同型）。

→ **正しい修正は client-orchestrated 非同期の一択**: 調整毎に既存 `/preview`（mint→client-poll で
render待ち）を回し、ready になってから `/final` で effects 適用。

## 2. 核心トレードオフ（ここが kimny 判断）

正しくすると、対話の1往復（調整→聴く）が **数分待ちになる**。RoEx の構造上、これは回避不能。

| | 今（バグあり） | 修正後（正しい） |
|---|---|---|
| フルjourney（mix_check×2 + final） | base render **1回**（8-22分） | base render **約3回**（各8-22分） |
| 体感 | 1回目だけ待つ、以降は即時（だが**同じ音**＝バグ） | 調整毎に数分待つ（だが**毎回ちゃんと反映**） |
| RoEx 実原価 / paid session | 約 250-300cr（実質1 render、以降cache無料） | 最大 約 900cr（3 render、baseCycleLimit=3 で bound） |

つまり修正は「**速いが嘘の音**」→「**遅いが本物の音**」への転換。対話ミックス（＝MUEDial の
中核価値「ディレクター席」）が機能するには本物が要るが、各往復が数分になる UX をどう設計するか。

## 3. UX オプション（排他でなく組合せ可）

- **U1: 1ボタン2フェーズ** — 「この調整で生成」を押すと裏で fresh render（進捗バー、既存の
  preview render UI 流用）→ ready で自動 final。最も素直。各回 8-22分待ち。
- **U2: バッチ調整** — Hoo と複数の調整を会話で固めてから「まとめて1回 render」。render 回数＝
  待ち回数を減らす。対話の往復感は薄れるが待ち時間総量は最小。
- **U3: 期待値設定 + 上限明示** — 「精緻化は最大2回 + 最終、各回数分かかります（あなたのミックスを
  毎回作り直しています）」を UI で明示。baseCycleLimit=3 と整合。
- **緩和策（どの U とも併用）= detect-and-regen**: パラメータが**前回から変わっていなければ
  再render しない**（キャッシュを即返す・無料）。本当に変えた調整だけが数分renderを発生させる。
  無駄render/無駄課金を消す。

## 4. 原価 delta（freee/CFO 連携・conductor が方向確定後に依頼）

今は2回目以降が RoEx cache-hit で**無料**（実験B=1秒・課金0）。修正後は各 real iteration が
**実250cr+課金**に転じる。paid dialogue の canonical 原価が ~530cr → 最大 ~900cr（render 3回時）。
free15 も同様（baseCycleLimit=3）。**baseCycleLimit=3 が cost ceiling**（PR #462 で先行マージ予定）。

## 5. 実装surface（GO 後は機械作業・参考）

- **client 主**（`app/dial/session/[id]/page.tsx:826-847`）: 今 mix_check/final が**同一の初回
  preview を再利用**しているのが ⑤ surface。これを「最新の fresh ready preview を使う」に変更し、
  調整毎に `/preview` を先行させる（既存 endpoint・既存 poll UI 流用）。
- **server `/final` は不変**: ready な任意の preview task に effects 適用する現仕様のまま動く。
  cycle 会計（`paidCycleCount < baseCycleLimit + additional`, `mixCheckCount < 2`）も不変。
- 1回目の mix_check は初回 preview をそのまま使える（初回 retrievefinalmix は cache でない）。
  fresh render が要るのは 2回目以降。

## 6. kimny への質問

1. **UX 方向** = U1 / U2 / U3 / 組合せ のどれで設計するか？（detect-and-regen は既定で入れる前提）
2. **各往復 数分待ち**を許容するか？ それとも別アプローチ（会話中に背景で先回り render 等）を
   探るか？（背景pre-renderは投機的で複雑・別途検討）
3. **mix_check も毎回 fresh render**するか、それとも mix_check は軽く・**final だけ本物 render**で
   いくか？（前者＝対話の各段で本物 / 後者＝待ちを final 1回に圧縮）

実装着手・9stem 正シーケンス検証render（before/after 証跡固め, ~10-22分・pool消費）とも、この
回答を受けてから即実行する。
