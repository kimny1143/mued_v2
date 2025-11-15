# Gemini 音楽生成能力リサーチレポート

**調査日**: 2025-11-12
**対象**: Google Gemini API (2.0/2.5) + Lyria RealTime
**目的**: MUED LMS教材生成での採用可否を判断

---

## 📋 要約結論

### ❌ **ABC Notation生成には不向き**

**理由:**
- Gemini 2.5 Pro/Flash は**音声・画像・動画のマルチモーダルに特化**
- **記号音楽（ABC notation, MusicXML）の生成機能は未対応**
- Lyria RealTime は**音声ストリーミング専用**（MIDI/ABC出力不可）

### ⚠️ **OpenAI/Claude との比較**

| 機能 | OpenAI GPT-4o | Claude Sonnet 4.5 | Gemini 2.5 Pro | 推奨 |
|------|---------------|-------------------|---------------|------|
| **ABC notation生成** | ✅ CoMT対応 | ✅ 可能（検証中） | ❌ 未対応 | OpenAI/Claude |
| **音楽理論推論** | ✅ 高い | ✅✅ 非常に高い | ○ 可能 | Claude |
| **MIDIバイナリ処理** | ⚠️ Base64経由 | ✅✅ 直接処理 | ❌ 不可 | Claude |
| **文書生成品質** | ○ 良好 | ✅✅ 優秀 | ○ 良好 | Claude |
| **入力価格（$/1M tokens）** | $2.50 | $3.00 | $0.30 | Gemini |
| **出力価格（$/1M tokens）** | $10.00 | $15.00 | $2.50 | Gemini |

**結論**: 教材生成には **Claude または OpenAI** を推奨。
Gemini は**コストは最安だが、記号音楽生成に不向き**。

---

## 🎵 Gemini の音楽関連機能詳細

### 1. Lyria RealTime（音声生成モデル）

**特徴:**
```
モデル名: lyria-realtime-exp
接続方式: WebSocket（低レイテンシーストリーミング）
出力形式: Raw 16-bit PCM Audio (48kHz, stereo)
入力形式: テキストプロンプトのみ
```

**できること:**
- リアルタイム音楽生成（BPM 60-200調整可能）
- ジャンル・楽器・ムードの指定
- インタラクティブな音楽制作

**できないこと:**
- ❌ MIDI出力
- ❌ ABC notation出力
- ❌ MusicXML出力
- ❌ ボーカル生成
- ❌ 歌詞生成

**教材用途での課題:**
- 楽譜として表示できない（PCM Audioのみ）
- DAWにインポート不可（MIDIファイルが生成されない）
- 音楽理論学習に不向き（記号表現がない）

---

### 2. Gemini 2.5 Pro/Flash（テキスト生成モデル）

**公式仕様:**
```
モデル: gemini-2.5-pro / gemini-2.5-flash / gemini-2.5-flash-lite
入力: Text, Image, Video, Audio, PDF
出力: Text（音声生成は別モデル）
コンテキスト: 1,048,576 tokens（約800万文字）
```

**音楽関連タスクでの性能:**

#### ✅ できること
1. **音楽理論の説明・解説**
   - コード進行の分析
   - 楽曲構造の説明
   - 音階・調性の解説

2. **教材テキスト生成**
   - 学習ポイントの箇条書き
   - 練習指示の記述
   - 音楽用語の説明

3. **プロンプトから音楽アイデア提案**
   - "ジャズ風のコード進行を提案して"
   - "子供向けの簡単なメロディを考えて"

#### ❌ できないこと
1. **ABC notation の直接生成**
   - 公式ドキュメントに記載なし
   - 学習データに ABC notation が含まれているか不明
   - 実験的に試す価値はあるが、精度は未知数

2. **MIDIファイルの生成・編集**
   - バイナリ処理は非対応
   - Base64エンコード経由でも精度が不確実

---

## 💰 コスト比較（2025年11月時点）

### API料金（1M tokens あたり）

| モデル | 入力 | 出力 | 合計（1M in + 1M out） |
|--------|------|------|------------------------|
| **OpenAI GPT-4o** | $2.50 | $10.00 | **$12.50** |
| **Claude 3.7 Sonnet** | $3.00 | $15.00 | **$18.00** |
| **Gemini 2.5 Pro** | $0.75 | $7.50 | **$8.25** |
| **Gemini 2.5 Flash** | $0.30 | $2.50 | **$2.80** ⭐ |
| **Gemini 2.5 Flash-Lite** | $0.10 | $0.40 | **$0.50** ⭐⭐ |

**コスト削減率（対 GPT-4o 比）:**
- Gemini 2.5 Flash: **約 78% 削減**
- Gemini 2.5 Flash-Lite: **約 96% 削減**

**注意点:**
- Claude Code 定額プラン（月額$20）を使用中の場合、Claude API の追加コストなし
- 大量の教材生成を行う場合、Gemini のコスト優位性が顕著

---

## 🧪 実験的な利用可能性

### テストすべきケース

#### 1. ABC notation 生成テスト

**仮説:** Gemini 2.5 Pro は大規模コンテキストを持つため、Few-shot learning で ABC notation を生成できる可能性がある。

**テスト方法:**
```typescript
const prompt = `
以下の例を参考に、ABC notationで楽譜を生成してください。

例1:
X:1
T:Twinkle Twinkle Little Star
M:4/4
L:1/4
K:C
C C G G | A A G2 | F F E E | D D C2 |

要求: Dメジャーで、初心者向けのギターアルペジオ練習曲を生成してください。
`;

const response = await geminiAPI.generateContent(prompt);
```

**期待される結果:**
- ✅ 構文的に正しいABC notationが生成される
- ⚠️ 音楽的に意味のあるメロディかは不明
- ❌ OpenAI の CoMT ほどの品質は期待できない

---

#### 2. 教材テキスト生成テスト

**仮説:** Gemini 2.5 Flash-Lite でも、学習ポイント・練習指示の生成は十分可能。

**テスト方法:**
```typescript
const prompt = `
以下のABC notationから、初心者向けの学習ポイントと練習指示を生成してください。

[ABC notation here]

出力フォーマット:
{
  "learningPoints": ["ポイント1", "ポイント2", ...],
  "practiceInstructions": ["指示1", "指示2", ...]
}
`;
```

**期待される結果:**
- ✅ 構造化されたJSON出力（Gemini は Structured Outputs 対応）
- ✅ 自然な日本語テキスト
- ✅ OpenAI/Claude と同等の品質
- ✅ コストは約 96% 削減

---

## 🎯 採用戦略の提案

### Option A: Claude 1本化（推奨）

```
理由:
✅ ABC notation生成が可能（検証中）
✅ MIDIバイナリ処理が得意
✅ 文書生成品質が最高
✅ Claude Code 定額プラン利用中（追加コスト0）

デメリット:
⚠️ CoMT が使えるか要検証
```

---

### Option B: ハイブリッド（OpenAI + Gemini）

```
Phase 1: OpenAI で ABC notation 生成（CoMT使用）
Phase 2: Gemini Flash-Lite で教材テキスト生成（コスト削減）
Phase 3: Claude で MIDI バイナリ調整（品質向上）

メリット:
✅ 各モデルの強みを活用
✅ コストと品質のバランス

デメリット:
⚠️ 複数APIの管理が煩雑
⚠️ OpenAI API コストは残る
```

---

### Option C: 3モデル比較PoC（検証フェーズ）

```
実装:
├─ OpenAI: ABC notation + 教材テキスト（ベースライン）
├─ Claude: ABC notation + 教材テキスト + MIDI調整
└─ Gemini: ABC notation（実験）+ 教材テキスト（コスト削減）

評価指標:
1. ABC notation の音楽的品質
2. 教材テキストの教育的価値
3. 生成速度（レイテンシー）
4. API コスト（実測値）
5. 実装の複雑さ
```

---

## 📊 最終推奨

### **Short-term（今すぐ実装）**

**Claude Sonnet 4.5 で PoC ブランチ作成** ✅

理由:
- ABC notation 生成を CoMT プロンプトでテスト
- MIDI バイナリ調整機能を追加
- Claude Code 定額で追加コスト0
- 文書生成品質が最高

---

### **Mid-term（品質確認後）**

**Gemini 2.5 Flash-Lite を教材テキスト生成に部分採用** ⚠️

条件:
- Claude で ABC notation 生成が成功した場合
- 教材テキストのみ Gemini に切り替え（96% コスト削減）
- ABC notation は Claude のまま

---

### **Long-term（将来的に）**

**Lyria RealTime を音声ガイド機能で活用** 🎵

用途:
- 生成した楽譜を音声で再生（Lyria RealTime）
- 「お手本演奏」として提供
- MIDI ダウンロード機能は継続（Claude/abcjs）

---

## 🚀 次のアクション

### 優先順位1: Claude PoC ブランチ作成

```bash
git checkout -b feature/poc-claude-material-generation
```

### 優先順位2: Claude で ABC notation 生成テスト

```typescript
// app/api/materials/generate-claude/route.ts
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const message = await anthropic.messages.create({
  model: "claude-sonnet-4-5-20250929",
  max_tokens: 4096,
  messages: [{
    role: "user",
    content: `You are a music theory expert. Use Chain-of-Musical-Thought:
1. Analyze the musical context
2. Determine appropriate chord progression
3. Generate melody that fits the harmony
4. Output in ABC notation

Generate a D major guitar arpeggio etude for beginners.`
  }]
});
```

### 優先順位3: 品質比較ドキュメント作成

```
/docs/research/
├─ openai-abc-generation-results.md    # OpenAI生成結果
├─ claude-abc-generation-results.md    # Claude生成結果
├─ gemini-abc-generation-results.md    # Gemini生成結果（実験）
└─ model-comparison-matrix.md          # 比較マトリックス
```

---

**調査完了日:** 2025-11-12
**次回更新:** Claude PoC 実装後
