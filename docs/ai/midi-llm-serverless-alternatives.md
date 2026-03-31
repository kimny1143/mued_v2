# MIDI-LLM: GPUレス実現方式の調査報告

> **作成日**: 2026-03-27
> **目的**: Modal.com GPUサーバーを使わずに自然言語→MIDI生成を実現する方式の技術調査
> **ステータス**: 参考資料（実装未着手）

---

## 背景

mued_v2には `modal_app/` に MIDI-LLM（自然言語→MIDI生成）のモック実装が残存している。Modal.comでGPUサーバーをデプロイする前提だったが、実モデル統合は未着手のまま休眠状態。

本資料では、GPUサーバーなしで同等機能を実現する代替方式を調査した。

## 結論

**LLM API → ABC notation → MIDI変換** が最も実用的。mued_v2にはABC→MIDI変換が既に実装済み（`lib/export/midi-exporter.ts`、abcjs使用）。Vercel Serverless Functionで完結し、追加インフラ不要。

---

## 方式比較

| 方式 | GPU | MIDI品質 | コスト(1K生成/月) | 実現性 |
|------|-----|----------|------------------|--------|
| **① LLM API → ABC → MIDI** | 不要 | ◎ 単旋律〜和音進行 | $0.30〜$11 | **◎ 推奨** |
| ② LLM API → MusicXML → MIDI | 不要 | ○ 記譜詳細だが不安定 | $3〜$100 | △ |
| ③ MusicGen/MusicLM → 音声 | API経由 | × MIDI出力不可 | $5〜$15 | × |
| ④ 音声生成 → 音声→MIDI変換 | API経由 | × 変換ロス大 | $10+ | × |
| ⑤ Modal.com自前GPU（現行案） | **必要** | ◎ 専用モデル次第 | $30-50固定 | △ |

---

## 方式① LLM API → ABC notation → MIDI（推奨）

### 概要

1. ユーザーが自然言語で音楽を記述（例: 「Cメジャーの明るいピアノメロディ、8小節」）
2. LLM APIがABC notationを生成
3. `abcjs`がABC→MIDI変換（CPU、ミリ秒単位）

### LLMモデル別のABC生成能力

| モデル | 単旋律の構文正解率 | 特徴 |
|--------|------------------|------|
| Claude Sonnet/Opus | 80-90% | バリデーション+リトライで99%近くに |
| GPT-4o / GPT-5 | 80-90% | コミュニティ実績多い |
| GPT-4o-mini | 70-80% | 安価。単純なメロディは十分 |
| Gemini 2.0 Flash | 70-80% | 最安。軽量用途に適 |

### コスト試算（16小節メロディ1回あたり）

入力: ~800トークン（システムプロンプト+ユーザー入力）
出力: ~500トークン（ABC notation）
リトライ込み（20%失敗想定、1回リトライ）

| モデル | 1回あたり | 月1,000生成 | 月10,000生成 |
|--------|----------|------------|-------------|
| GPT-4o-mini | $0.0004 (≒¥0.06) | $0.40 | $4 |
| Gemini 2.0 Flash | $0.0003 (≒¥0.05) | $0.30 | $3 |
| Claude Haiku 3.5 | $0.003 (≒¥0.5) | $3 | $30 |
| GPT-4o | $0.008 (≒¥1.2) | $8 | $80 |
| Claude Sonnet | $0.011 (≒¥1.7) | $11 | $110 |

→ Modal.comの$30-50/月固定と比べて **1/100〜1/10以下**

### 既知の弱点

- **小節の拍数計算ミス**: 4/4で5拍分の音符を出力するケースあり → バリデーションで検出可能
- **多声部（V:1/V:2）が不安定**: 単旋律に限定すれば回避可
- **極端な音域のハルシネーション**: 指定楽器の範囲外の音を出すことがある
- **リピート記号の不正**: `|:` `:|` が稀に壊れる

### 推奨アーキテクチャ

```
[ユーザー入力]
    ↓
[LLM API (gpt-4o-mini等)]
    ↓
[ABC notation テキスト]
    ↓
[abcjs バリデーション] → NG → リトライ (最大2回、エラー内容をLLMにフィードバック)
    ↓ OK
[abcjs.synth.getMidiFile()]
    ↓
[MIDIファイル]
```

- Vercel Serverless Function内で完結
- 追加インフラ・GPU不要
- レイテンシ: LLM応答1-3秒 + MIDI変換 <100ms

---

## 方式② LLM API → MusicXML → MIDI

- MusicXMLはABCの10-20倍のトークン量（8小節で2,000-5,000トークン）
- LLMのXML生成精度は60-70%程度（ABC比で大幅に低い）
- MusicXML→MIDI変換には `music21`（Python）が必要で、Vercel Serverless非対応
- **メリット**: アーティキュレーション・ダイナミクス等の詳細記譜が可能
- **結論**: MIDIスケッチ用途ではオーバースペック。コスト対効果が悪い

## 方式③④ 音声生成系（MusicGen/MusicLM等）

- Google MusicLM（Vertex AI）、Meta MusicGen（Replicate）ともに**音声出力のみ**。MIDI非対応
- 音声→MIDI変換（basic-pitch等）を噛ませる方式は、ポリフォニック転写の精度が低くMIDI品質が実用外
- Suno / Udio / Beatoven.ai 等も全て音声のみ
- **結論**: テキスト→MIDI用途には不向き

## 方式⑤ Modal.com GPU（現行案）

- A10G GPU @ ~$1.10/時 + アイドルタイムアウト5分
- 専用モデル（ChatMusician等）をホストすれば最高品質の可能性
- ただしモデル選定・学習・運用の工数が大きい
- 現状モック実装のみで、実モデル統合のめどが立っていない

---

## mued_v2の既存コード資産

| ファイル | 内容 | 状態 |
|---------|------|------|
| `lib/export/midi-exporter.ts` | ABC → MIDI変換 (`abcjs.synth.getMidiFile`) | **実装済み・利用可能** |
| `lib/abc-analyzer.ts` | ABC notation分析 | 実装あり |
| `components/features/materials/abc-notation-renderer.tsx` | 楽譜描画 | 実装あり |
| `lib/midi-to-abc.ts` | MIDI → ABC変換 | モック（逆方向） |
| `lib/modal-client.ts` | Modal.comクライアント | モック → 方式①採用時は削除候補 |
| `modal_app/` | Modal.com Pythonサーバー | モック → 方式①採用時は削除候補 |

→ ABC→MIDI変換パイプラインの後半は既に動く。足りないのは「自然言語→ABC」のLLM呼び出し部分のみ。

---

## この方式でできないこと

方式①（LLM → ABC → MIDI）の限界:

- **フルアレンジ**: ドラム+ベース+鍵盤+メロディの同時生成
- **DAW的な制御**: ベロシティカーブ、CCオートメーション、ピッチベンド
- **ジャンル特化**: プロダクション品質のビート・アレンジ

これらが必要になった場合は専用モデル（GPU）の再検討が必要。ただしMUEDnoteの「制作メモから簡易MIDIスケッチ」用途であれば方式①で十分。

---

## 市場状況（2026年3月時点）

**テキスト→MIDIを直接提供するAPIは存在しない。** これは市場のギャップであり、LLM → ABC → MIDIパイプラインで埋められるポジション。

- ChatMusician（オープンソース）: LLaMA fine-tune、ABC出力可能。自前ホスト必要
- MusicLang（Pythonライブラリ）: アルゴリズム作曲、MIDI出力。API無し
- Anticipatory Music Transformer（DeepMind）: MIDI対応だがAPI公開なし

---

*本資料は参考情報であり、実装判断はプロダクト方針に基づいて行うこと。*
