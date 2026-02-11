# MUEDlobe UI Brushup — 統合実装ガイド

## 概要

MUEDlobeは認知プロファイリング機能（7つのゲームで認知変数を測定）。現状の全ゲーム共通レイアウト（タイトル→説明→紫ボタン）を、各ゲームが視覚的に区別できるUIに刷新する。

**設計コンセプト：「計測機器のキャリブレーション」**
- ゲームではなくチューニングセッション
- 美学の参照先：神経心理検査ソフト、Native Instruments、Ableton
- 装飾を足すのではなく、ゲーム自体の構造を見せることで差異化する

**原則：`Premium = (image quality × size) + whitespace − decoration`**

---

## 技術スタック

- Next.js + TailwindCSS 4
- ダークテーマ（ベース `#0a0a0f`）固定
- モバイルファースト（375px）、デスクトップ対応（1440px）
- i18n：日本語 / 英語
- WCAG AA コントラスト準拠
- ページ重量 < 200KB/game（外部画像アセット不使用、CSS/SVGのみ）

---

## 禁止事項（AI生成感の回避）

- `backdrop-blur` 使用禁止
- グロウ/グラデーションボタン禁止
- `hover:scale` トランジション禁止
- Tailwindデフォルトの高彩度カラー（`cyan-400`, `amber-500`, `rose-500` 等）直接使用禁止
- Monospaceフォントでの「INITIALIZE SEQUENCE」的なロールプレイ的ラベリング禁止
- Inter, Roboto, Arial 等の汎用フォント禁止

---

## 1. カラーシステム

### 認知変数ごとのアクセントカラー（低彩度）

| Variable | Label | Color Name | Hex | 用途 |
|----------|-------|-----------|-----|------|
| Memory | `Memory` | Steel Blue | `#6B8FAD` | Tone Sequence, Mental Math |
| Tempo | `Tempo` | Warm Sand | `#AD8F6B` | Symbol Match, Code Fill |
| Word Sense | `Word Sense` | Sage | `#6BAD7E` | Word Bridge |
| Patterns | `Patterns` | Muted Coral | `#AD6B6B` | Pattern Complete |
| Focus | `Focus` | Pale Gold | `#ADA06B` | Focus Flow |

### カラーの適用箇所（3箇所のみ）

1. **カテゴリラベルのテキスト色**（ヘッダーの `Memory`, `Tempo` 等）
2. **Specimen Preview 内のハイライト要素**（1箇所だけ。例：ターゲット記号のみアクセントカラー）
3. **ヘッダー左端の縦線**（2px、カラーインジケーター）

### CSS変数定義

```css
:root {
  --color-base: #0a0a0f;
  --color-surface: #12121a;
  --color-text-primary: rgba(255, 255, 255, 0.87);
  --color-text-secondary: rgba(255, 255, 255, 0.5);
  --color-text-tertiary: rgba(255, 255, 255, 0.3);
  --color-border: rgba(255, 255, 255, 0.08);

  --color-memory: #6B8FAD;
  --color-tempo: #AD8F6B;
  --color-wordsense: #6BAD7E;
  --color-patterns: #AD6B6B;
  --color-focus: #ADA06B;
}
```

---

## 2. レイアウト構造

### モバイル（375px）— 単一カラム

```
┌─────────────────────────┐
│ ← Memory                │  戻るナビ + カテゴリラベル（アクセントカラー）
│                         │  左端に2px縦線（アクセントカラー）
│                         │
│                         │
│   ┌─────────────────┐   │
│   │                 │   │
│   │   [Specimen     │   │  画面の40-50%を使用
│   │    Preview]     │   │  各ゲーム固有のビジュアル
│   │                 │   │
│   └─────────────────┘   │
│                         │
│   トーンシーケンス        │  ゲーム名（localeに従い1言語のみ）
│   4-6 min               │  所要時間（text-secondary）
│                         │
│   音の列を聴いて、指定    │  説明文（2行以内、text-secondary）
│   された順序で再現。      │
│                         │
│                         │
│      [ 開始 ]            │  ゴーストボタン
│                         │
└─────────────────────────┘
```

### デスクトップ（1440px）— Specimen横展開

```
┌──────────────────────────────────────────────┐
│ ← Memory                                     │
│ ┃                                             │  左端2px縦線
├──────────────────────────────────────────────┤
│                                              │
│   ┌──────────────────┐    トーンシーケンス     │
│   │                  │    4-6 min             │
│   │  [Specimen       │                        │
│   │   Preview]       │    音の列を聴いて、     │
│   │                  │    指定された順序で再現。 │
│   │                  │                        │
│   └──────────────────┘    [ 開始 ]             │
│                                              │
└──────────────────────────────────────────────┘
```

デスクトップではSpecimenを左、テキスト+ボタンを右に配置。ただし情報量は増やさない。

---

## 3. Specimen Preview — 各ゲームの静的ミニチュア

**最重要の差別化要素。** 各ゲームのプレイ画面のフォーマットをCSS/SVGで静的に表示する。インタラクティブではない。低彩度で、ハイライトは1箇所のみアクセントカラーを使用。

メタファー図や抽象アイコンではなく、**実際のゲームUIの構造**をそのまま縮小して見せる。

### 3-1. Tone Sequence（Memory / Steel Blue）

**表示内容：** 横並びの5つの丸（ステップ）に順序番号。ピアノロール断片的な見た目。

```
実装イメージ：
  ①  ②  ③  ④  ⑤
  ●  ○  ○  ●  ○

- 5つの円を横並び（gap: 12px）
- 丸の大きさ: 32-40px
- 塗りつぶし（●）: var(--color-memory) at 60% opacity
- 空（○）: border 1px rgba(255,255,255,0.15)
- 番号: 各丸の上に小さく（12px, text-tertiary）
```

### 3-2. Mental Math（Memory / Steel Blue）

**表示内容：** 算式フォーマット。`7 + _ = 13` のような1行。

```
実装イメージ：
  7  +  _  =  13

- 数字は大きめ（32-40px）で text-primary
- 演算子は text-secondary
- アンダースコア部分を var(--color-memory) の下線で表現
- Monospace は使わない。本文と同じフォントの数字ウェイト
```

### 3-3. Symbol Match（Tempo / Warm Sand）

**表示内容：** 上段にターゲット記号1つ、水平線、下段に5つの比較記号。

```
実装イメージ：
        ◆          ← ターゲット（アクセントカラー）
  ─────────────
  ○  △  ◆  □  ☆   ← 比較群（text-tertiary、一致する◆だけ若干明るく）

- ターゲット: 48px, var(--color-tempo)
- 水平線: 1px, rgba(255,255,255,0.1)
- 比較記号: 24px each, text-tertiary
- 一致記号: text-secondary（目立たせすぎない）
```

### 3-4. Code Fill（Tempo / Warm Sand）

**表示内容：** 2行×5列の対応表（上段：数字、下段：記号）+ 問い。

```
実装イメージ：
  1    2    3    4    5
  ○    △    □    ☆    ◇
  ─────────────────────
        3 → ?            ← 問い（アクセントカラーで「?」）

- グリッド: 5列×2行、border で区切り
- 上段（数字）: text-secondary, 14px
- 下段（記号）: text-primary, 18px
- 問い: 数字は text-primary、? は var(--color-tempo)
```

### 3-5. Word Bridge（Word Sense / Sage）

**表示内容：** 2つの単語を点線でつなぎ、中央に「?」。

```
実装イメージ：
  海  ─ ─ ─  ?  ─ ─ ─  空

- 左右の単語: text-primary, 24px
- 点線: border-dashed 1px rgba(255,255,255,0.15)
- 中央の ?: var(--color-wordsense), 28px
- 全体を横並びで中央配置
```

### 3-6. Pattern Complete（Patterns / Muted Coral）

**表示内容：** 3×3グリッド、右下セルが空欄、他8セルに簡略図形。

```
実装イメージ：
  ┌───┬───┬───┐
  │ ▲ │ ■ │ ● │
  ├───┼───┼───┤
  │ ■ │ ● │ ▲ │
  ├───┼───┼───┤
  │ ● │ ▲ │ ? │  ← 右下のみ var(--color-patterns) で「?」
  └───┴───┴───┘

- グリッド: 3×3, 各セル 48-56px
- セル border: 1px rgba(255,255,255,0.1)
- 図形: text-secondary, 20px
- 右下セル: border を dashed に、背景なし、? をアクセントカラー
```

### 3-7. Focus Flow（Focus / Pale Gold）

**表示内容：** 横一列に記号が並び、ターゲットのみアクセントカラー。

```
実装イメージ：
  ♭   ♯   ♪   ♭   ♯

- 5つの記号を横並び（gap: 20px）
- 全て text-tertiary, 28px
- ターゲット（♪）のみ var(--color-focus), text-primary
- ターゲットの下に小さな下線（2px, アクセントカラー）
```

---

## 4. ボタンデザイン

### 現状（廃止）
紫グラデーション + グロウ + 角丸大 → 完全に廃止

### 新デザイン：ゴーストボタン

```css
.start-button {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.7);
  padding: 12px 40px;
  border-radius: 2px;        /* 角丸は最小 */
  font-size: 14px;
  letter-spacing: 0.05em;
  transition: color 0.2s ease;
}

.start-button:hover {
  color: rgba(255, 255, 255, 0.95);
  border-color: rgba(255, 255, 255, 0.35);
  /* background は変えない。scale も使わない。 */
}

.start-button:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}
```

ラベル：locale依存で「開始」/ "Start"。それ以上の装飾的ラベリングは不要。

---

## 5. ヘッダー / ナビゲーション

```
┌─ 2px縦線（アクセントカラー）
│
│  ← Memory              ← 戻るリンク + カテゴリラベル
│     Tone Sequence       ← ゲーム名（削除も検討可。下のタイトルと重複するため）
│
├─────────────────────────── 1px 水平線 rgba(255,255,255,0.08)
```

- カテゴリラベル（Memory, Tempo 等）はアクセントカラーで表示
- カテゴリラベルは英語固定（変数のコード名として扱う。翻訳対象外）
- ゲーム名はlocale依存で1言語のみ

---

## 6. 言語戦略

| 要素 | 日本語ユーザー | 英語ユーザー |
|------|-------------|------------|
| カテゴリラベル | Memory, Tempo 等（英語固定） | Memory, Tempo 等 |
| ゲーム名 | トーンシーケンス | Tone Sequence |
| 説明文 | 日本語 | 英語 |
| ボタン | 開始 | Start |
| 所要時間 | 4-6 min（共通） | 4-6 min |

ヘッダーに英語ゲーム名 + ボディに日本語ゲーム名、という混在は廃止。

---

## 7. Disclaimer（免責事項）

スタート画面から**完全に除去**。

代替配置：
- MUEDlobe トップ画面（ゲーム一覧）のフッターに1回だけ表示
- または初回ゲーム開始時にインラインで表示（dismissable）

---

## 8. 背景処理（実験的）

`#0a0a0f` の void 感を軽減するため、極めて薄いドットグリッドを背景に敷く。

```css
.game-start-screen {
  background-color: #0a0a0f;
  background-image: radial-gradient(
    rgba(255, 255, 255, 0.03) 1px,
    transparent 1px
  );
  background-size: 24px 24px;
}
```

- `opacity: 0.03` で視認の閾値ギリギリ
- モバイルでは視認不能になる可能性あり → 効果がなければ削除してよい
- あくまで実験的。効果が薄ければフォールバックはプレーンな `#0a0a0f`

---

## 9. 一覧画面（Lobe List）の改善

現状のリスト構造は維持。以下を追加：

1. **各カードの左端に 3px のカラーバー**（アクセントカラー）
2. **完了状態の表示**：チェックマークではなく、カラーバーの opacity で表現
   - 未完了: `opacity: 0.3`
   - 完了: `opacity: 1.0`
3. **プログレスバーの分割**：7セグメントに分け、各ゲームの完了状態を個別に表示。完了セグメントはそのゲームのアクセントカラーで塗る

---

## 10. 実装フェーズ

### Phase 1（効果大・工数小）— まずここから

- [ ] ボタンデザイン変更（紫グラデーション → ゴーストボタン）
- [ ] アクセントカラーシステムの CSS 変数定義と適用
- [ ] Disclaimer のスタート画面からの除去
- [ ] 言語混在の解消（1言語のみ表示）

### Phase 2（効果大・工数中）— 最重要

- [ ] Specimen Preview の実装（7ゲーム全て、CSS/SVGのみ）
- [ ] レイアウト再構成（モバイル単一カラム / デスクトップ横展開）
- [ ] 背景ドットグリッドの実験

### Phase 3（効果中・工数小）

- [ ] 一覧画面のカラーバー追加
- [ ] プログレスバーの分割表示
- [ ] 2回目以降のプレイ時の短縮画面（前回スコア + 開始ボタンのみ）

---

## 11. 検証基準

実装後に以下を確認：

- [ ] 7つのスタート画面を並べたとき、各画面が一目で区別できるか
- [ ] Specimen Preview を見ただけで、ゲームのフォーマットが推測できるか
- [ ] モバイル（375px）で情報が欠けずに表示されるか
- [ ] `#0a0a0f` 上で全てのテキストが WCAG AA コントラスト比を満たすか
- [ ] ページ重量が 200KB 以下か（DevTools Network タブで確認）
- [ ] 「AI生成っぽい」という印象を受けないか（主観テスト）
