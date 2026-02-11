# MUEDlobe メッセージング戦略 — 総合見解と実装方針

## 概要

`messaging-strategy.md`（初期ドラフト）と外部レビューフィードバックを統合した最終方針。
この文書に基づいて、ユーザー向け文言の変更を実装する。

---

## 基本方針（確定事項）

### 1. 臨床用語の完全排除

WAISの構造は内部設計の参考として維持するが、ユーザーに見える全てのテキストから臨床用語を排除する。

- ✗ Cognitive Profiling / 認知プロファイリング
- ✗ Working Memory / Processing Speed 等のWAIS下位検査名
- ✗ "Tests" / "Measures" / "測定" / "検査"

### 2. フレーミングの転換

| Before | After |
|--------|-------|
| ユーザーの能力を測定する | Hooがユーザーを理解する |
| 認知プロファイル | 思考スタイル / Thinking Style |
| テスト・検査 | ゲーム |
| 測定する | 知る・理解する・発見する |
| スコア＝能力値 | スコア＝Hooの調整パラメータ |

主語を「あなたが測られる」から「Hooが学ぶ」に転換する。
これはMUEDの哲学「systems by humans, operations by AI」と整合する。

### 3. プロダクト名

「MUEDlobe」は変更しない。タグラインで臨床イメージを中和する。

---

## パラメータ表示名（確定）

候補A（カジュアル）をベースに、Processing Speedのみ音楽メタファー「Tempo」を採用するMix案。

| 内部変数 | 変更しない内部コード | ユーザー向け表示（EN） | ユーザー向け表示（JA） |
|---------|-------------------|---------------------|---------------------|
| WM | `Scores.wm` | Memory | メモリー |
| PS | `Scores.ps` | Tempo | テンポ |
| VC | `Scores.vc` | Word Sense | ワードセンス |
| PR | `Scores.pr` | Patterns | パターン |
| ATT | `Scores.att` | Focus | フォーカス |

### 選定理由

- **Memory**: シンプルで直感的。臨床的な「Working Memory」から十分に距離がある
- **Tempo**: 音楽制作の文脈で「思考のスピード感」を自然に表現できる唯一の語。Hooが「あなたのテンポに合わせます」と言える
- **Word Sense**: 「言語感覚」の英語として自然。Verbal Comprehensionから十分に離れている
- **Patterns**: 抽象的推理＝パターン認識。一般語として馴染みやすい
- **Focus**: Attentionの平易な言い換えとして最適

### 日本語はカタカナ統一

MUEDのトーン（MUEDnote, MUEDear等と同様のモダンな雰囲気）に合わせ、日本語表示もカタカナで統一する。

---

## プロダクトレベルの用語

| 現在 | 変更後（EN） | 変更後（JA） |
|-----|------------|------------|
| Cognitive Profiling | Thinking Style | 思考スタイル |
| Cognitive Profile | Your Style | あなたのスタイル |
| "Measures your cognitive profile" | "Helps Hoo understand your style" | "Hooがあなたのスタイルを理解します" |

---

## LPコピー

### ヒーローセクション

```
EN: MUEDlobe — Tune Hoo to You.
JA: MUEDlobe — Hooをあなたにチューニング。

EN: 7 short games teach Hoo how you think.
    Hoo's suggestions become yours alone.
JA: 7つのショートゲームで、あなたの思考のクセをHooに教える。
    Hooの提案が、あなた専用になります。
```

### How It Works

```
EN:
1. Play 7 short games
2. Hoo learns your style
3. Hoo adapts its support to you

JA:
1. 7つのゲームで遊ぶ
2. Hooがあなたのスタイルを学ぶ
3. Hooのサポートがあなた専用になる
```

### ゲームセレクター表示

ゲームカード上の表示：
- ✗ `WM-1 / Working Memory`
- ○ `Game 1 / Memory`

---

## ゲーム説明文の方向性

全ゲームの説明文を以下のパターンで統一する。
「Hooが〜を理解する」または「あなたの〜をHooに教える」形式。

| ゲーム | 現在（削除） | 新（EN方向性） | 新（JA方向性） |
|-------|------------|--------------|--------------|
| Tone Sequence | "Tests auditory working memory capacity" | "How you hold sounds in mind" | "あなたの音の記憶のしかたをHooが学ぶ" |
| Mental Math | "Measures numerical working memory and processing" | "How you juggle numbers" | "数字の扱い方をHooに教える" |
| Symbol Match | "Tests visual processing speed" | "How fast you spot connections" | "つながりを見つけるテンポを知る" |
| Code Fill | "Measures cognitive processing efficiency" | "How quickly you decode patterns" | "パターンを読み解くスピードを知る" |
| Word Bridge | "Tests verbal reasoning and vocabulary" | "How you connect words and meaning" | "言葉のつながり方をHooが学ぶ" |
| Pattern Complete | "Measures abstract reasoning ability" | "How you see the bigger picture" | "全体像の捉え方をHooに教える" |
| Focus Flow | "Tests sustained attention" | "How you stay in the zone" | "集中の保ち方をHooが学ぶ" |

---

## 免責事項（Disclaimer）

### 配置: LP下部 + ゲーム開始前の2箇所

### LP下部（短縮版）

```
EN: MUEDlobe is not a psychological or medical assessment.
    It's a calibration tool for personalizing Hoo.

JA: MUEDlobeは心理検査ではありません。
    Hooのパーソナライズのためのツールです。
```

### ゲーム開始前（詳細版）

```
EN: These games are not a medical or psychological assessment.
    They are a calibration tool that helps Hoo adapt its communication style to you.
    Scores are not diagnostic results — they are tuning parameters for Hoo.

JA: 本ゲームは医学的・心理学的な検査ではなく、
    AIアシスタント「Hoo」の応答スタイルを最適化するためのキャリブレーションツールです。
    スコアは診断結果ではなく、Hoo専用の調整パラメータです。
```

---

## 影響範囲

### 変更するファイル（ユーザー向け文言のみ）

| ファイル | 変更内容 |
|---------|---------|
| `messages/en.json` (`muedlobe.*`) | 英語コピー全般 — 上記の用語・コピーに準拠 |
| `messages/ja.json` (`muedlobe.*`) | 日本語コピー全般 — 上記の用語・コピーに準拠 |
| `components/features/muedlobe-landing/muedlobe-hero-section.tsx` | パラメータ表示名、ヒーローコピー |
| `components/features/muedlobe-landing/muedlobe-overview-section.tsx` | How It Worksステップ文言 |
| `public/manifest.json` | `name`フィールド（description等にcognitiveが含まれていれば修正） |
| `app/lobe/` 配下のゲームUI | パラメータ表示名（表示している箇所があれば） |
| LP下部のフッター or 免責セクション | 免責文言の追加 |
| ゲーム開始画面 | 免責文言の追加 |

### 変更しないファイル

| ファイル | 理由 |
|---------|------|
| `types/muedlobe.ts` | 内部型定義。WM/PS/VC/PR/ATTはコード識別子として維持 |
| `lib/muedlobe/scoring/*` | スコアリングロジック。ユーザーに見えない |
| `lib/muedlobe/constants.ts` | GAME_METAの`variable`フィールドは内部用 |
| `db/schema/*` | DBスキーマ。ユーザーに見えない |

---

## 実装順序

1. `messages/en.json` と `messages/ja.json` のパラメータ名・コピー変更
2. LPコンポーネントのコピー差し替え（hero, overview）
3. ゲームUI内のパラメータ表示名変更
4. 免責文言の追加（LP下部 + ゲーム開始前）
5. manifest.json等の付随修正

---

*確定: 2025-02-09*
*ステータス: 実装指示*
