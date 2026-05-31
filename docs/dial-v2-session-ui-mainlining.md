# MUEDial v2 session UI 本線化 — 現状把握 + 残タスク (investigation)

**Status:** investigation / docs-only (コード実装は CI billing block 6/1 復帰後 Tier 2)
**Author:** mued課
**Date:** 2026-05-31
**関連:** kimny priority pivot (mued課=MUEDial実装+継続的改善 最重点) / `components/dial/v2/` / `app/dial/session/[id]/page.tsx`

---

## なぜこの調査か

priority が「MUEDial 実装+継続的改善 最重点」に切替わり、次の一手候補として **`components/dial/v2/`（次世代 session UI）の本線化** を挙げた。が、「v2 = これから本線化する未着手 build」という想定はコード実態とズレていた。**既存 state 優先（assumption禁止）** に従い実態を検証し、「本線化」が具体的に何を指すかを確定する。

---

## 検証で判明した実態（grep + 該当箇所読込）

### v2 はすでに session player の本線

`app/dial/session/[id]/page.tsx:11` が **`UnifiedSessionPlayerV2 as UnifiedSessionPlayer`** を import し、2 箇所（`:1424` フル / `:1630` 2カラム `compact`）でレンダー。v2 player は内部で v2/ サブコンポーネント一式を使用:

| v2/ ファイル | 役割 | 本線使用 |
|------------|------|---------|
| `unified-session-player-v2.tsx` (579L) | session player 本体 | ✅ session route |
| `atoms.tsx` / `icons.tsx` | Micro/Readout/Btn / アイコン | ✅ player 内 |
| `waveform.tsx` (123L) | OverviewWave / peaks | ✅ player 内 |
| `take-pills.tsx` (255L) | TakeHistory / take 履歴 | ✅ player 内 |
| `stem-panel.tsx` (283L) | StemPanel（gain/pan 編集） | ✅ player 内 |
| `analyzer.tsx` (415L) | AnalyzerCluster | ✅ player 内 |
| `chat.tsx` (563L) | **ChatPanelV2** | ⚠️ **下記参照** |

→ **player / waveform / stem / analyzer / take 履歴は v2 本線化 完了。**

### 残ギャップ: chat だけ旧 `ChatPanel` のまま（検証済み）

v2 player は **chat を内蔵できる設計**だが、その有効化は `chatProps` 次第:

- `unified-session-player-v2.tsx:185-186` — `chatProps?` は optional（「omit to render player-only」）
- `:569` — **`{chatProps && (<ChatPanelV2 .../>)}`** = chatProps を渡したときだけ ChatPanelV2（右カラム 440px）描画
- `:410-459` — **B10**: chatProps があると **mix アクションボタンを transport bar に表示**（旧 chat の ParamChangeCard ボタンを置換）= 新 UX

**しかし session page は v2 player に `chatProps` を渡していない**（`:1424` / `:1630` の props に chatProps 無し）。代わりに **旧 `ChatPanel`**（`components/dial/chat-panel.tsx`, 629L）を `:9` import → `:1771` で 2カラムの右側に別途レンダー。

→ つまり **会話 UI は旧 `ChatPanel` + 旧 chat-card アクションボタンのまま**。v2 の `ChatPanelV2` + transport-bar アクションは **build 済だが session flow で未配線**。

### 旧コードの残置（cleanup 候補）

| 旧ファイル | 現状 | 含意 |
|-----------|------|------|
| `components/dial/unified-session-player.tsx` (373L) | コンポーネント本体は**未使用**、`TakeEntry`/`TakeStage`/`StemParamChange` の**型 import のみ**（page `:12`, v2 player `:13,:17`） | 型を `types.ts` 等へ抽出 → 旧コンポーネント削除候補 |
| `components/dial/chat-panel.tsx` (629L) | session page で**現役**（上記ギャップ） | ChatPanelV2 移行後に削除候補 |
| `components/dial/audio-analyzer.tsx` (653L) | `/dial/analyzer` standalone page (`:4`) + 旧 player が使用。v2 は `v2/analyzer` (AnalyzerCluster) | standalone analyzer は v2 未移行（別サーフェス判断） |

---

## 「本線化」の具体 = 残タスク（6/1 CI 復帰後 Tier 2）

```
現状: v2 player(playback) ─┐
                          ├─ session page (2カラム)
旧 ChatPanel(会話) ────────┘   ← ここが旧のまま

目標: v2 player に chatProps を渡し、ChatPanelV2 + transport-bar アクションを本線化
      → 旧 ChatPanel render(:1771) 除去 → 旧 chat-panel.tsx 削除
```

| # | タスク | 種別 | 6/1前 |
|---|--------|------|-------|
| 1 | **session page → v2 player に `chatProps` 配線**（旧 `ChatPanel` を ChatPanelV2 に切替） | コード (Tier 2) | ❌ |
| 2 | 切替後の旧 `ChatPanel` render(:1771) 除去 + `chat-panel.tsx` 削除 | コード (Tier 2) | ❌ |
| 3 | 旧 `unified-session-player.tsx` の型を `types.ts` 抽出 → 旧コンポーネント削除 | コード (Tier 2) | ❌ |
| 4 | `/dial/analyzer` standalone を v2/analyzer 移行するか判断 | 設計判断 | 検討可 |

---

## オープン項目の解消（2026-05-31 追検証）

### ✅ #1 解消: 旧 ChatPanel 残置理由 = **未完の staged migration**

git 履歴で確定。「PR-v2.x」シリーズの段階移行が**途中で止まっている**:
- `c1aff760` PR-v2.6 (#195): **ChatPanelV2 を新規追加**（HooAvatar/ModeBadge/ParamChangeCard）
- `cc418c76` PR-v2.8 (#198): **page.tsx を UnifiedSessionPlayerV2 に cutover**（player だけ）
- → 最終ステップ（chatProps 配線で ChatPanelV2 を本線化）が**未実施**。`grep "chatProps="` = **全コードベースで 0 件** → ChatPanelV2 は本番で一度もレンダーされていない。

意図的 feature-gap hold ではなく、**段階 cutover のやり残し**。

### ✅ #2 解消: props parity = **完全一致（drop-in）**

`ChatPanelProps`（旧）と `ChatPanelV2Props`（v2）は **21 フィールド全て同一**（型・optional 記号・`onMasteringPreviewRequested?(desiredLoudness?)` の引数まで一致、検証定数 `VALID_PRESENCE/PAN/REVERB` も同一）。**props gap なし** → 切替は「:1771 の `<ChatPanel {...}>` に渡している props オブジェクトをそのまま v2 player の `chatProps`（`Omit<_, 'className'>`）に移す」だけ。

### ⚠️ feature drift なし、ただし dual-maintenance 負債

Hoo language 機能（`4c7f605b` v2.42 / `a67ee13d` v2.44）は **`chat-panel.tsx` と `v2/chat.tsx` の両方に同一コミットで適用**されている（各 PR で両ファイル "6 ++--"）。= **両 chat は並行 co-maintained**、旧(本番)が機能遅れではない。

→ **cutover の value は feature 回復ではなく「chat 実装の二重メンテ解消」**（chat 変更を毎回 2 ファイルに入れている負債の解消）。

### 残オープン（実装時に潰す）

3. **transport-bar アクション(B10) の UX 差** — 切替で mix アクションが chat-card → transport bar に移動（唯一の実 UX 変更）。ディレクターモデル整合を**キャラクター gate**（実 session 操作で Hoo の指示→アクションが自然か確認）で検証。
4. **playerKey remount 影響** — chatProps 追加で player remount 条件（`:407`）に影響しないか。

---

## まとめ

- **v2 session UI は「未着手」ではなく ~70% 本線化済**（playback 系完了、chat だけ旧のまま）。原因は **PR-v2.x 段階 cutover の最終 chat 配線やり残し**。
- 「本線化」の実体 = **session page の chat 配線を 旧 ChatPanel → ChatPanelV2 に切替える 1 点**（props 完全一致の drop-in + 旧除去）。**props gap・feature drift なし**で de-risk 済。
- 6/1 実装は **①:1771 の props を v2 player `chatProps` に移植 → ②旧 `<ChatPanel>` render + 2カラム wrapper 除去 → ③B10 UX をキャラクター gate 検証 → ④ proven 後 `chat-panel.tsx` 削除（二重メンテ解消）** の機械作業。
- 副次 value: chat 実装の dual-maintenance 負債を解消（継続的改善の対象として妥当）。
