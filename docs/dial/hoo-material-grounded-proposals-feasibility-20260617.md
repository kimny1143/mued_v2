# Feasibility: Hoo が素材の音響状態を見て「提案ベース」で発言できるか

作成: 2026-06-17 / mued課 / 起案: kimny 指摘（白手袋 df55abae の Preview 1 試聴）

## 背景（kimny の論点）

白手袋セッションで、RAW が既にバランス良好な素材に対し、引き継いだ調整（メインV前面・コーラス控えめ）が**過剰に効き**、「RAW の方がマシ」な状態に。kimny なら「リセットしてコーラスだけ上げて」と判断できるが、Yuu のような非専門ユーザーには無理。

> **問い**: Hoo が素材を分析し「このバランスは既に良いので、コーラスだけ少し上げるくらいでどう？」と**提案ベース**で言えないか？

reach 投入前の「製品の音質」関門に直結。

## 結論

**実装可能・段階的。** infra の土台は既存。本質は「データ不足」より**設計転換**（「指示→盲目適用」から「解析→保守的に提案」へ）＝ ディレクターモデルの核心（Hoo は判断する director、単なる executor でない）。

## 現状の analysis infra（コード実態）

| 要素 | 実態 | 出典 |
|---|---|---|
| RoEx `/mixanalysis`（`analyzeMix`, ~10cr） | **全体ミックス**指標のみ（loudnessLufs/peak/stereo/tonalProfile）。**per-track 無し**。単一 mix URL 必須（stem 分離前は対象が無い） | `lib/roex/analysis.ts:66-95` |
| `session.analysisResult` | mix chat の promptInput に**渡っている** | `app/api/dial/chat/route.ts:159` |
| ↑ を MIX prompt に描画？ | **していない**。`分析データの活用`節は **MASTERING prompt のみ**。→ 今 Hoo は mix 中に解析値を見ていない | `lib/ai/prompts/dial.ts:695`（mastering）/ `buildDialSystemPrompt` sessionContext に mix 用の分析描画なし |
| per-stem 生レベル | **既に client 側で算出済**: 各 stem WAV を decode し peak 配列を計算（波形表示用・**RoEx コスト 0**） | `hooks/use-stem-peaks.ts:17-33` |
| RoEx preview の per-track 処理 | preview は **per-track `fxSettings`（gain 含む 9-node FX）** を返し `dial_tasks.fxSettings` に保存 ＝ RoEx が各 stem に必要と判断した処理 | `app/api/dial/preview/route.ts:138` |
| 解析の発火タイミング | mix+mastering では **mix-final 完了後**の URL を解析（mastering-only は 2-mix の先頭 track）。つまり **RAW/調整前には解析が無い** | `app/api/dial/analyze/route.ts:106-131` |

## 2 つの実ギャップ ＋ 1 つの設計転換

1. **ギャップA（容易）**: 全体 analysisResult が **mix prompt に未描画**。→ mirror すれば即 Hoo が見る。
2. **ギャップB（中）**: 「コーラスだけ」のような **per-track 相対バランス**は RoEx 全体解析では分からない。→ client の stem-peak（既存）か RoEx preview の fxSettings/gain を使う。
3. **設計転換**: 現 mix prompt は「**いきなりパラメータを提案しない**」（reactive）。proactive 提案には prompt 設計の変更が要る（過剰提案・冗長会話の逆リスクに注意）。

## 実装オプション（段階）

### Phase 1 — 低コスト・高価値・即着手可（RoEx 追加コスト 0）
- ①既存 `analysisResult` を **MIX prompt に描画**（mastering 節を mirror）。
- ②prompt 指針追加: 「解析で mix が既にバランス良好/ターゲット内なら **最小変更 or 無変更を提案**し、その旨を正直に伝える。過剰調整しない」。
- ③「RAW/ニュートラルから始める」導線（パラメータ・リセット）。
- → これだけで「RAW の方がマシ」を Hoo が**自ら抑制提案**できる。引き継ぎ調整の盲目適用を緩和。
- 前提整備: mix+mastering で **mix-final 前（preview 後）にも全体解析**を打てるよう発火点を前倒し（preview URL を解析対象に）。

### Phase 2 — per-track 精度（本命・RoEx 追加コスト 0）
- client の stem-peak（`use-stem-peaks`）から **per-track 相対レベル**を算出し chat context へ。
- → Hoo「コーラスが lead vocal 比 +X 高め。少し抑えるか、逆に上げたいならこのくらい」と**具体提案**。「コーラスだけ上げる」精度。
- 制約: peak ≠ 知覚ラウドネス（近似・必要なら RMS/簡易 LUFS に拡張）。decode 負荷は iOS 向けに既に bound 済（`use-stem-peaks.ts:8`）。

### Phase 3 — 発展（大）
- RAW の mix-analysis（stem 合算 or preview）+ reference-aware 提案 + session 開封時の auto-balance サジェスト。

## 制約・リスク

- RoEx `/mixanalysis` = 全体のみ・~10cr/回・単一 URL 必須（per-track を RoEx でやると N×コスト）。
- client stem-peak = 無料だが peak ベース（知覚と完全一致でない）。
- **最終的な「バランスが良いか」は主観 ＝ kimny 判断領域**。Hoo の提案は「補助・選択肢提示」であって自動確定にしない設計に。
- reactive→proactive の prompt 大改修は **A/B 検証必須**（提案過多・会話冗長化の逆 UX リスク）。

## 推奨

**Phase 1 を先行**（低リスク・即「過剰適用」緩和、RoEx コスト 0）。続いて **Phase 2**（per-track の本命、client stem-peak 活用でコスト 0）。reach 前の音質関門は Phase 1+2 で十分カバー可能。Phase 1 は prompt + 解析発火点の変更が中心で、新 API/スキーマ不要。
