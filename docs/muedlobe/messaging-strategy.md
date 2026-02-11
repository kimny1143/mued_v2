# MUEDlobe メッセージング戦略

## 背景と課題

MUEDlobeは7つのゲームでユーザーの思考傾向を測定し、Hooのコミュニケーションスタイルを最適化するツール。
内部的にはWAIS（ウェクスラー成人知能検査）の構造を参考にしているが、**これはあくまで設計上の参考**であり、臨床検査ではない。

### 現状の問題

ユーザーに見える文言が臨床的すぎる：

| 現在の表現 | 問題点 |
|-----------|--------|
| Cognitive Profiling / 認知プロファイリング | 心理検査そのもの |
| Working Memory / ワーキングメモリ | WAIS下位検査の正式名称 |
| Processing Speed / 処理速度 | 同上 |
| Verbal Comprehension / 言語理解 | 同上 |
| Perceptual Reasoning / 知覚推理 | 同上 |
| Attention / 注意力 | 臨床的文脈を想起 |
| "Measures your cognitive profile" | 能力測定と解釈される |

**リスク**: 医療行為・心理検査と誤認され、法的リスクや信頼性の問題が生じうる。

---

## リフレーミングの原則

### 1. 目的の転換：「能力測定」→「スタイル発見」

MUEDlobeがやっていることの本質は：
> 「あなたがどういう受け取り方をする人か」をHooが理解するためのプロセス

能力の高低を判定するのではなく、**思考の傾向・好みを知る**ためのツール。

### 2. 文脈の明確化：音楽制作のため

MUEDは音楽制作エコシステム。MUEDlobeの文脈は：
> 「音楽制作中にHooがあなたに最適なサポートをするための準備」

臨床・教育の文脈ではなく、クリエイティブツールの一部。

### 3. トーンの統一：カジュアル＆フレンドリー

MUEDearやMUEDnoteと同じく、深刻にならず軽いトーンで。
「検査」ではなく「ゲーム」。「測定」ではなく「発見」。

---

## 用語の置き換え案

### プロダクト全体

| 現在 | 候補A | 候補B | 候補C |
|-----|-------|-------|-------|
| Cognitive Profiling | Thinking Style | Creative Style | Your Style |
| 認知プロファイリング | 思考スタイル分析 | クリエイティブスタイル診断 | あなたのスタイル |
| Cognitive Profile | Thinking Profile | Creative Profile | Your Profile |
| 認知プロファイル | 思考プロファイル | クリエイティブプロファイル | — |

### ゲーム変数名（ユーザー向け）

| 内部名 (変更しない) | 現在のUI表示 | 候補A (カジュアル) | 候補B (音楽寄り) |
|---------------------|-------------|-------------------|-----------------|
| WM (Working Memory) | Working Memory | Memory & Recall | 記憶 / Memory |
| PS (Processing Speed) | Processing Speed | Quick Thinking | 反応 / Speed |
| VC (Verbal Comprehension) | Verbal Comprehension | Word Sense | 言語感覚 / Words |
| PR (Perceptual Reasoning) | Perceptual Reasoning | Pattern Recognition | パターン / Patterns |
| ATT (Attention) | Attention | Focus | 集中 / Focus |

**注**: 内部コード（型定義 `Scores.wm`, `Scores.ps` 等、スコアリングパイプライン）は変更不要。変更するのはユーザー向け表示のみ。

### ゲーム説明文

| ゲーム | 現在 | リフレーミング案 |
|-------|------|-----------------|
| Tone Sequence | "Tests auditory working memory capacity" | "Hooがあなたの記憶の仕方を理解するためのゲーム" 的な方向 |
| Mental Math | "Measures numerical working memory and processing" | 「測定する」→「知る」「理解する」 |
| Symbol Match | "Tests visual processing speed" | テスト→ゲーム、測定→発見 |
| Code Fill | "Measures cognitive processing efficiency" | 同上 |
| Word Bridge | "Tests verbal reasoning and vocabulary" | 同上 |
| Pattern Complete | "Measures abstract reasoning ability" | 同上 |
| Focus Flow | "Tests sustained attention" | 同上 |

---

## LP コピー方向性

### ヒーローセクション

**現在:**
> MUEDlobe — Know How You Think
> 7 quick games measure your cognitive profile.

**方向性案:**
> MUEDlobe — Hooがあなたを知るための7つのゲーム
> ゲームで遊ぶだけ。Hooがあなたに合った伝え方を見つけます。

ポイント：
- 主語を「あなた」から「Hoo」に転換
- 「測定」→「知る」「見つける」
- ゲームであることを強調

### ゲームセレクター

各ゲームカードに表示する変数名を臨床用語から離す。
例: `WM-1 / Working Memory` → `Game 1 / Memory` のように。

### How It Works

**現在:**
1. Play 7 Games
2. Get your cognitive profile
3. Hoo adapts to how you think

**方向性案:**
1. 7つのゲームで遊ぶ
2. あなたのスタイルがわかる
3. Hooが最適なサポートをする

### 免責表示

LP下部またはゲーム開始画面に、以下の趣旨の一文を入れる：

> MUEDlobeは医学的・心理学的な検査ではありません。
> Hooのコミュニケーションを最適化するためのエンターテインメントツールです。

英語：
> MUEDlobe is not a medical or psychological assessment.
> It's an entertainment tool that helps Hoo communicate with you better.

---

## 影響範囲

### 変更が必要なファイル（ユーザー向け文言のみ）

| ファイル | 内容 |
|---------|------|
| `messages/en.json` (`muedlobe.*`) | 英語コピー全般 |
| `messages/ja.json` (`muedlobe.*`) | 日本語コピー全般 |
| `components/features/muedlobe-landing/muedlobe-hero-section.tsx` | variable表示 |
| `components/features/muedlobe-landing/muedlobe-overview-section.tsx` | ステップ文言 |
| `public/manifest.json` | `name` フィールド |
| `app/lobe/` 配下のゲームUI | variable表示（もし表示している箇所があれば） |

### 変更しないファイル

| ファイル | 理由 |
|---------|------|
| `types/muedlobe.ts` | 内部型定義。WM/PS/VC/PR/ATTはコード上の識別子 |
| `lib/muedlobe/scoring/*` | スコアリングロジック。ユーザーに見えない |
| `lib/muedlobe/constants.ts` | GAME_METAの `variable` フィールドは内部用 |
| `db/schema/*` | DB スキーマ。ユーザーに見えない |

---

## 決定が必要な事項

1. **プロダクト名**: 「MUEDlobe」のまま？ "lobe" = 脳の葉、も臨床的に見えるか？
   - → 現状はブランド名として成立しているので変更不要と考えるが、要議論

2. **用語セット**: 候補A（カジュアル）vs 候補B（音楽寄り）vs 混合
   - → 推奨: 候補Aベースで、MUEDのトーンに合わせる

3. **免責の配置**: LP下部 / ゲーム開始前 / 両方？
   - → 推奨: LP下部 + ゲーム開始前の両方

4. **v0.8 Pilot の説明**: パイロット版であることをどの程度強調するか
   - → 現状の小バッジで十分と考える

---

*作成: 2026-02-09*
*ステータス: ドラフト — レビュー待ち*
