# MUEDsp「スイートの家」再構成 + home MASTER + MUEDlim go-live 再設計 — Plan（GO①③・2026-07-11）

status: **DRAFT — conductor レビュー待ち**（Plan mode 設計 / 未実装）
owner: mued課 / reviewer: conductor → content(49mspsud) 連携 → staged → kimny 現物 → product Tier2 → index
supersedes: PR #621 (c) 単品DL go-live（backend インフラは継承・下記 iv）

---

## 0. 背景 / 変更点

kimny が **GO①（可視化）+ GO③（順序）** を承認（Chief brief-muedsp-visibility-freepaid-20260711）。MUEDlim go-live の形が **「単品DL」→「MUEDsp スイート文脈で出す」** に変わった。

- **#621（4ノブ MUEDlim (c) form）= HOLD/supersede**。dsp が MUEDlim を **2ノブ「最小設計」+ 正式名** で再ビルド中。config flip は revert 済（`MUEDLIM_LIVE=false`・commit `ce5f95c6`・公開ゼロ担保）。
- **backend インフラは継承**: plugin registry / shared subscribe pipeline / MUEDsat 回帰0 proof / muedlim audience+route+email（`lib/plugins/*`・`app/api/muedlim/*`・`email.service`）。配布パイプは形が変わっても再利用可（Phase B で copy/knobs/pkg のみ差分）。

---

## (i) /muedsp 再構成の構造

**現状**: Header → Hero（MUEDsat faceplate render）→ MUEDsat 節 → MUEDlim 節（`MUEDLIM_LIVE` gate）→ masterchain 節（**最下部**・予告・$69 disabled Buy）。masterchain が末尾＝旗艦が埋もれている。

**新構造（スイートの家・旗艦を最上段に）**:
1. **Header** — MUEDsp（スイート）・不変。
2. **Hero** — スイート全体の入口。「作編曲家のマスターチェーンを、そのまま。」framing（既存 `muedsp.hero` 方向）。render を **masterchain mock**（下記 ii）に差替（現 MUEDsat faceplate は saturation の絵ゆえスイートの顔として不適）。
3. **§1 masterchain（旗艦・最上段）** — eyebrow「開発中」+ **実 mockup + 「こうなります」事実予告** + heading `MUEDsp masterchain` + body（マスターバス全段 Comp→EQ→Limiter を1プラグインに・locked spec）+ **$69 固定**（priceNote single source・値引き文言なし）+ inert Buy「近日発売」（FastSpring MoR・ユーザーに名指さず・live checkout なし）+ notify link。locked controls（Ceiling / Width / Mono / Limiter / Bypass + meters）を「こうなる」として提示（content copy）。
4. **§2 無料モジュール群（masterchain の段を切り出した無料版・出自付き）** — 導入文「masterchain の各段を、1つずつ無料で出しています」+ provenance framing:
   - **MUEDsp saturation（通称 MUEDsat）** — 「トランス・サチュレーションの段」。free・**live**・DL form（既存 `muedsat.*` copy・faceplate idle↔hot compare を継承）。
   - **MUEDsp limiter（通称 MUEDlim）** — 「ピークを抑える最後の段」。free・**dsp 2ノブ再ビルド待ち** → `MUEDLIM_LIVE` gate 維持（Phase A では hidden・下記 iv/質問2）。2ノブ仕様 + 正式名で content が書く。
5. **Footer** — 不変。

- **3層命名規律**: 見出しに正式名（MUEDsp saturation / MUEDsp limiter）、並記で通称（MUEDsat / MUEDlim）。game 名（MuSat / MuLim）は LP register でないため非掲載。
- `MUEDSP_LIVE=true`（index 解除）は **kimny 現物 gate 後** に flip（下記 v）。

---

## (ii) masterchain ビジュアル資産の可否 ★要調達判断

- **現状**: `_conductor/designsystem/muedsp-ui-mock/ui_kits/muedsp/` に **HTML mock 2種**:
  - `index.html` = **Console A**（横型ハードウェアパネル・ゾーン IN·GR·OUT·controls・amber arc knobs）
  - `minimal.html` = **Minimal B**（meter-forward・flat・calm・大 GR numeral）
  - locked spec: Ceiling −1.0 / Width 112% / Mono 26Hz / TP −1.0 dBTP・$69（README `kimny 2026-06-20 "MID"`）。
- **レンダー済み画像は存在しない**（assets は MUEDial console + Hoo SVG のみ）。実プラグインは未完ゆえ「実スクショ」も物理的に無し＝**mock render が最も honest**（実 build スクショは dsp 完成後に差替）。
- **選択肢**:
  - **(a) Minimal B（`minimal.html`）を webp にレンダー** → /muedsp §1 に「開発中のUI（予定）」ラベル付きで掲載。meter-forward で「開発中」と相性良。**推奨**。
  - (b) dsp/design に canonical masterchain render を依頼（DSP UI owner）。
  - (c) HTML mock を React で忠実移植（live panel・画像不要）。重い + 「開発中」なのに shippable に見える懸念。
- **レンダー実行の懸念**: Chrome 拡張は共有ロック + kimny 就寝で permission 承認不可。→ **質問1**（誰がどの手段でレンダーするか）を conductor 判断に。fallback = design 依頼 or Node headless（要調達）。

---

## (iii) home MASTER 再構成

- **現状**: `integrated-landing-content-v2.tsx` の MASTER `ProductSection` → `/muedsp`・`RENDER_MASTER = /muedsat/faceplate-hot.webp`（MUEDsat faceplate）・copy `landing.v2.master`（MUEDsp brand・"1曲を、仕上げる"・body は無料1段中心）。**MUEDsat 偏重**。
- **新**: masterchain 中心に書換（hero C1 は不変）:
  - `RENDER_MASTER` → **masterchain mock webp**（ii で作る asset）に差替。
  - copy（`landing.v2.master` の role/heading/lead/body/origin）を masterchain flagship 中心に content が調整（無料モジュールは「その段を無料で」と従属言及）。
  - cta「MUEDsp を見る」→ `/muedsp`（不変）。

---

## (iv) dsp 2ノブ待ちの依存線（Phase 分割）

- **Phase A（dsp 非依存・先行可）**: /muedsp 再構成（masterchain 旗艦最上段 + MUEDsat cutout provenance）+ home MASTER masterchain 化 + masterchain mock 資産 + `MUEDSP_LIVE` flip。**MUEDlim 節は `MUEDLIM_LIVE=false` 維持（hidden）**。
- **Phase B（dsp-gated）**: dsp が MUEDlim **2ノブ最小設計 + 正式名 + 再ビルド pkg** 納品 → MUEDlim 節を 2ノブ+正式名 copy で書換 + pkg 差替（**served-URL shasum 二重 gate**・#612 教訓）→ `MUEDLIM_LIVE` flip → MUEDlim DL 公開。
- **backend インフラ**（#621）は Phase B で再利用（copy/knobs/pkg のみ差分・回帰0 proof は継続有効）。
- **GO③ 順序と整合**: /muedsp（スイートの家）index 先行（Phase A）→ MUEDlim DL 公開（Phase B）→ 外報スイート物語（正式名 package 揃うまで HOLD）。

---

## (v) kimny index 前 現物段取り

1. Phase A を **`MUEDSP_LIVE=false` staged** のまま /muedsp 再構成（masterchain 旗艦 + MUEDsat cutout + mock 資産）+ home MASTER 化。
2. preview（直URL可・noindex）→ **conductor verify**。
3. **kimny 現物 gate**（masterchain 旗艦の見え方・mock 採否・home MASTER の masterchain 中心度）。
4. OK → `MUEDSP_LIVE=true` flip（同 PR の最後の1コミット・advisory/muedial go-live 同型）+ sitemap `/muedsp` 追加 + llms MUEDsp family 更新。
5. prod verify（CDN settle 後・index 確認・forbidden sweep 0・既存回帰0）→ 完了報告。

---

## copy 依頼（content 49mspsud）

masterchain framing（flagship・「こうなります」・locked spec controls・$69 fixed・no discount）/ 無料モジュール provenance（「段を切り出した無料版」）/ 3層命名規律（正式名 + 通称）/ claim 規律（競合名 / 再現 / 精度クレーム封印）/ home MASTER masterchain 中心 copy。

---

## 実装ファイル（Phase A 想定）

- `components/features/muedsp-landing/muedsp-landing-content.tsx` — 順序入替（masterchain 最上段）+ 無料モジュール群 provenance framing + MUEDlim hidden。
- `components/features/landing/integrated-landing-content-v2.tsx` — MASTER render（→ masterchain mock）+ copy。
- `public/muedsp/masterchain-mock.webp` — 新 asset（ii の render）。
- `messages/{en,ja}.json` — `muedsp.*` 拡張 + `landing.v2.master` 調整（content canonical・parity 維持）。
- `lib/muedsp/config.ts` — `MUEDSP_LIVE` flip（kimny gate 後）。
- `app/sitemap.ts` — `/muedsp`（`MUEDSP_LIVE` gate）。
- `app/llms.txt/route.ts` — MUEDsp family 記述更新。
- `app/[locale]/muedsp/page.tsx` — JSON-LD Product（`MUEDSP_LIVE` gate・既存）。

---

## Tier / gate

`MUEDSP_LIVE` flip + /muedsp 再構成 + home MASTER = **live home 変更 + 公開範囲拡大**（masterchain $69 index）= Tier3 相当（kimny policy gate は GO①③ で取得済）+ product Tier2（実装無影響/回帰）+ conductor verify + kimny 現物。

---

## conductor 判断要（質問）

1. **masterchain mock 資産**: (a) `minimal.html` を webp render（推奨）/ (b) design 依頼 / (c) React 移植。**誰がどの手段でレンダーするか**（Chrome 共有ロック + kimny 就寝 permission ゆえ mued 単独レンダー困難）。
2. **MUEDlim 節の Phase A 扱い**: (x) 完全 hidden（`MUEDLIM_LIVE=false`・存在させない・**推奨**）/ (y)「近日」予告のみ表示（2ノブ完成前に名前だけ出す）。推奨 (x) — 正式名 package 揃うまで名前露出は外報 HOLD 方針と整合。
3. **`MUEDSP_LIVE` flip の PR 構成**: 同 PR に staged で入れ kimny 現物 gate 後に flip（最後の1コミット・**推奨**）/ 別 flip PR。
