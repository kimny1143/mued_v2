# MUEDlobe ゲーム テスト実装記録

**実施日:** 2026-02-11
**ブランチ:** `feat/muedlobe-lp-pwa`

---

## 概要

全7ゲームに対してユニットテスト（283テスト）とデバッグログを実装。
ToneSequence の stale closure バグ発見を契機に、残り6ゲームのテストを追加。

## テストファイル一覧

| ファイル | テスト数 | 対象ロジック |
|---------|---------|-------------|
| `toneSequence.test.ts` | 97 | 既存（Phase 2A で作成済み） |
| `wordBridge.test.ts` | 30 | QUESTIONS定数、shuffleOptions、scoreWordBridge、全12問の正解検証 |
| `codeFill.test.ts` | 17 | CODE_PAIRS、generateCodeFillTrial、scoreCodeFill（0.5xペナルティ） |
| `symbolMatch.test.ts` | 14 | generateTrial（hasTarget分布）、scoreSymbolMatch |
| `mentalMath.test.ts` | 80 | generateMathQuestions、**display数式↔answer整合性**、scoreMentalMath |
| `patternComplete.test.ts` | 21 | generatePatternQuestions（20問構造）、scorePatternComplete（難易度重み） |
| `focusFlow.test.ts` | 24 | generateStimulusSequence、scoreFocusFlow（d-prime、rtCv、rawScore） |

**合計: 283テスト、全パス**

## mentalMath 答え検証テスト（追加分: +55テスト）

最も重要な追加。`display` の数式を独立パースして `answer` と一致するか検証する。
生成ロジックの数式不一致バグ（ユーザーが正解を入力しても不正解になる致命的バグ）を検出。

| Level | 検証方法 | リスク |
|-------|---------|-------|
| 1-2 | `"a + b"` / `"a - b"` をパースして計算 | 低（単純演算） |
| 3 | `"a × b"` をパースして計算 | 低 |
| 4 | `"a + b - c"` をパースして計算 | 低 |
| 5 | 答えが正の整数であることを確認 | 中（文章題、パース困難） |
| 6 | `(a+b)×c-d`, `a×b÷c+d`, `a×b+c-d` を正規表現でパース・計算 | **高（複合演算）** |
| 7 | 答えが正の整数、割合問題が整数 | 中（比例・割合） |
| 8 | `A=3B, B=C+5, C=2` 等を正規表現でパース・逆算 | **高（多変数追跡）** |

5回のランダム生成 × 11テスト = 55テスト追加で、確率的なエッジケースもカバー。

## デバッグログ

### ユーティリティ

`lib/muedlobe/games/debug.ts`:
- `gameLog(game, event, data?)` — 開発環境でのみ `console.log` 出力
- `NODE_ENV === 'development'` または `NEXT_PUBLIC_GAME_DEBUG === '1'` で有効
- 本番では完全 no-op

### ログ追加箇所

**ゲームロジック（6ファイル）** — スコアリング関数の入出力:
- `scoreWordBridge` / `scoreCodeFill` / `scoreSymbolMatch`
- `scoreMentalMath` / `scorePatternComplete` / `scoreFocusFlow`

**Reactコンポーネント（7ファイル）** — ユーザー操作イベント:
- 各ゲームの `answer` イベント（回答ごと）
- 各ゲームの `complete` イベント（ゲーム終了時）
- FocusFlow の `response` イベント（クリック/スペースキー反応）

### コンソール出力例

```
[MUEDlobe:SymbolMatch] answer {answer: false, hasTarget: false, correct: true, responseTime: 1234}
[MUEDlobe:SymbolMatch] scoreSymbolMatch:output {correct: 15, incorrect: 3, rawScore: 12}
[MUEDlobe:SymbolMatch] complete {correct: 15, incorrect: 3, rawScore: 12}
```

## テスト実行コマンド

```bash
# 全ゲームテスト
npx vitest run --config vitest.config.unit.ts tests/unit/muedlobe/games/

# 個別ファイル
npx vitest run --config vitest.config.unit.ts tests/unit/muedlobe/games/mentalMath.test.ts
```

## 追加テストの判断記録

以下は「追加不要」と判断したもの:

- **symbolMatch confusable injection**: スコアリングに影響せず、難易度調整のみ。バグがあっても「問題が簡単/難しくなる」だけ
- **patternComplete 正解整合性**: 10種類の生成関数×ランダム性でテストが非常に複雑。コスト対効果が低い
