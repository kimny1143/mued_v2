# PWA Phase 0 — iPhone standalone E2E チェックリスト

対象: PR #517（MUEDial を installable PWA 化）の kimny 実機受け入れ（character gate）。
**忠実検証は production `dial.mued.jp` のみ**（理由は末尾「なぜ preview で代替できないか」参照）。

前提:
- iPhone Safari（標準ブラウザ）で実施。Chrome 等の iOS サードパーティブラウザは A2HS 挙動が異なるため Safari で。
- `dial.mued.jp` が production に deploy 済みであること（merge → Vercel production deploy success を mued 側で確認後に着手）。

---

## A. インストール（Add to Home Screen）

1. Safari で `https://dial.mued.jp/` を開く。
   - [ ] **PASS**: dial ランディングが表示される（`/` → `/dial` rewrite）。
2. 共有ボタン（□↑）→「ホーム画面に追加」。
   - [ ] **PASS**: アイコンに **Hoo（フクロウ＝琥珀色のリール目）** が表示される。名称が **「MUEDial」** になっている。
3. 「追加」をタップ → ホーム画面にアイコンが追加される。
   - [ ] **PASS**: ホーム画面の MUEDial アイコンが Hoo マークで鮮明（ぼやけ・余白崩れがない）。

## B. standalone 起動

4. ホーム画面の MUEDial アイコンをタップして起動。
   - [ ] **PASS**: **Safari の UI（アドレスバー・下部ツールバー）が出ない**フルスクリーン standalone で開く。
   - [ ] **PASS**: 起動先が **dial ランディング**（`start_url:"/"` → `/dial`）。marketing（mued.jp 系）ではない。
5. 上部の表示確認。
   - [ ] **PASS**: iOS ステータスバー（時計・電池）が **dial 上部タブバー（Chat / Player）に被っていない**（`statusBarStyle:"black"` の効果）。黒帯がUIに馴染んでいる。

## C. 画面・操作（既存モバイル UI の standalone 内動作）

6. Chat / Player タブ切り替え、スクロール、再生バー（#513 sticky transport）。
   - [ ] **PASS**: #509/#513 で確認した操作が standalone 内でも同様に動く（タブ・accordion・再生/scrub）。
7. 端末を横向きにする。
   - [ ] **PASS**: 横向きでも standalone のまま表示される（`orientation:"any"`）。※横向き最適化レイアウト自体は FF-2 で別途。ここでは「回転して standalone が壊れない」ことの確認のみ。

## D. ゲストトークン経路（同一 origin・主経路 ＝ 影響なし見込み）

8. ゲストトークン付きセッションリンク（`dial.mued.jp/dial/session/<id>?token=<...>`・別途共有）を **standalone 内**で開く。
   - [ ] **PASS**: standalone 内でセッションが開き、テイク再生まで通る（同一 origin ゆえ Safari に離脱しない見込み）。
   - 記録: Safari に離脱した / standalone のまま → どちらか。

## E. ★Clerk sign-in 挙動（最重要・「明確判定」する）

9. サインインが要る操作を踏む（例: standalone 内で `dial.mued.jp/dial/pricing` を開く、または dashboard 系導線）。
   - 観察し、以下の **いずれか**を記録（PASS/FAIL でなく「事実の分類」）:
     - [ ] **(E-1)** mued.jp/sign-in に飛ぶ際 **standalone 内に留まる**（Safari に出ない）。サインイン後 dial.mued.jp に戻り、**サインイン状態が認識される**。→ **standalone auth 成立**
     - [ ] **(E-2)** サインインのため **Safari（別ブラウザ）に離脱する**。サインイン後 dial に戻れない / 戻っても standalone のセッションが未認識。→ **standalone で sign-in が壊れる**
10. 判定の明示（conductor / kimny へ）:
    - **(E-1) なら**: Phase 0 = installable **かつ** sign-in も standalone で成立 → 完全達成。
    - **(E-2) なら**: **Phase 0 = installable は達成**。sign-in-standalone は **Clerk satellite domain 化（別 Tier3 follow-up）** で対応。**guest-token 主経路（D）は影響なし**ゆえ Phase 0 の価値は確実に出ている。← これは想定内の結果であり、Phase 0 の失敗ではない。

## F. mued.jp 非 installable（scope 分離の確認）

11. Safari で `https://mued.jp/`（marketing）を開く → 共有 → ホーム画面に追加。
    - [ ] **PASS**: 追加しても **standalone アプリにはならない**（通常のブックマーク的挙動／manifest 由来のアプリ名・専用アイコンが付かない）。= mued.jp は非 installable のまま。

---

## 判定サマリ（kimny → conductor 返却用）

| 区分 | 結果 |
|------|------|
| A. インストール（アイコン=Hoo・名称=MUEDial） | ☐ PASS / ☐ FAIL |
| B. standalone 起動（フルスクリーン・start_url=/dial・status bar 非被り） | ☐ PASS / ☐ FAIL |
| C. 画面・操作（タブ/再生/横向き standalone 維持） | ☐ PASS / ☐ FAIL |
| D. ゲストトークン経路（standalone 内で開ける） | ☐ PASS / ☐ FAIL |
| **E. Clerk sign-in 挙動** | ☐ (E-1) standalone 成立 / ☐ (E-2) Safari 離脱＝satellite follow-up 要 |
| F. mued.jp 非 installable | ☐ PASS / ☐ FAIL |

A–D・F が PASS なら **Phase 0 = installable 達成**。E は (E-1)/(E-2) の**事実を記録**（(E-2) でも Phase 0 は成立、satellite は別 Tier3）。

---

## なぜ preview で代替できないか（merge 前 preview 検証の限界）

Vercel preview host（`muedv2-git-…vercel.app`）は middleware の subdomain 判定
`hostname.startsWith('dial.')`（`middleware.ts:50`）に**該当しない**。このため:

- preview では `<host>/dial` を直接開けば manifest link・アイコン・A2HS の見た目は確認できるが、
- **`start_url:"/"` は preview host の root（= marketing 相当）に解決**され、dial ランディングには飛ばない。
- preview は manifest link に `crossOrigin="use-credentials"` が付く（Vercel preview 仕様。production では付かない）。

したがって **B（start_url 起動先）・E（Clerk redirect）・F（mued.jp 非 installable）の忠実検証は
production `dial.mued.jp` でしか行えない**。本 PR は純追加・非 regression（既存 UI/auth/routing 不変・
manifest は非ブロッキング）ゆえ、merge → production 反映後に本チェックリストを実施するのが最短かつ忠実。
