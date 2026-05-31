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

## 切替前に潰すオープン項目（assumption禁止 / 要確認）

1. **なぜ session page は今も旧 ChatPanel か** — 意図的 hold（ChatPanelV2 の feature gap 待ち）か、単なる移行途中か。コミット履歴 / v2/chat.tsx の TODO を確認してから切替。
2. **ChatPanelV2 の feature parity** — 旧 `ChatPanel` は多数 props を持つ（`onMixCheckRequested` / `onMasteringPreviewRequested` / `previewCount` / `previewLimit` / `isMasteringPhase` / `phase` / `mode` 等）。ChatPanelV2(=chatProps 型) がこれら全てを賄えるか **props diff** を取ってから切替（欠落あれば ChatPanelV2 側を先に補完）。
3. **transport-bar アクション(B10) と旧 chat-card ボタンの UX 差** — 切替で操作導線が変わる。ディレクターモデル整合（Hoo の指示→アクションが自然か）をキャラクター gate（実際に session を操作して確認）で検証。
4. **playerKey remount 影響** — chatProps 追加で player の remount key 条件（`:407`）に影響しないか。

---

## まとめ

- **v2 session UI は「未着手」ではなく ~70% 本線化済**（playback 系は完了、chat だけ旧のまま）。
- 「本線化」の実体 = **session page の chat 配線を旧 ChatPanel → ChatPanelV2 に切替える 1 点が主**（+ 旧コード cleanup）。end-state はコードに設計済み（chatProps gate + B10）なので、6/1 の実装は **props 配線 + diff 補完 + 旧除去の機械作業**に落ちる。
- 切替前に **props parity diff** と **旧 ChatPanel 残置理由** を確認すること（オープン項目 1-2）。
