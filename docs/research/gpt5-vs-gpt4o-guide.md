# GPT-5 vs GPT-4o 使い分けガイド

**作成日**: 2025-01-07
**対象**: MUED LMS v2 開発チーム
**最終更新**: リサーチ日 2025-11-07（GPT-5リリース: 2025-08-07）

---

## エグゼクティブサマリー

**結論**: GPT-5リリース（2025年8月）以降、複雑なタスクは**GPT-5が主流**。

| 用途 | 推奨モデル | 理由 |
|------|----------|------|
| **音楽教材生成（MultiTrackJSON）** | **GPT-5** ⭐ | 構造化出力に強い、複雑な推論 |
| コーディング | **GPT-5** ⭐ | SWE-bench: 74.9% vs 30.8% |
| ドキュメント分析 | **GPT-5** ⭐ | 400K context |
| リアルタイム会話 | GPT-4o | 低レイテンシー |
| 一般チャット | GPT-4o | シンプル・低コスト |

---

## GPT-5 の特徴（2025年8月リリース）

### 🧠 推論モデル

GPT-5は**推論トークン（reasoning_tokens）**を使用してから出力します：

```json
{
  "completion_tokens": 20000,
  "completion_tokens_details": {
    "reasoning_tokens": 15000,  // 推論に使用
    "audio_tokens": 0
  }
}
```

**重要**: 通常より大きな`max_completion_tokens`が必要（推奨: **64K**）

### 📊 ベンチマーク性能

| テスト | GPT-5 | GPT-4o | 改善率 |
|--------|-------|--------|--------|
| AIME 2025 Math | **94.6%** | 71% | +33% |
| SWE-bench Verified | **74.9%** | 30.8% | +143% |
| 事実誤り率 | **-45%** | 基準 | - |

### ✅ 構造化出力

**GPT-5の優位性**:
- ✅ `json_schema` サポート（推奨）
- ✅ **Context-Free Grammar (CFG)** サポート（厳密な構文制約）
- ✅ スキーマ違反が少ない
- ✅ 複数ツール呼び出しで安定

**GPT-4o**:
- ✅ Structured Outputs サポート
- ❌ CFGなし

---

## 実装ガイド

### ✅ GPT-5 推奨実装（音楽教材生成）

```typescript
import { createChatCompletion } from '@/lib/openai';

const { completion, usage } = await createChatCompletion(
  [{ role: 'user', content: prompt }],
  {
    model: 'gpt-5',
    maxTokens: 64000, // 推論 + 出力用の大きな上限
    // temperature: 1.0, // GPT-5は温度固定（カスタマイズ不可）
  }
);

// GPT-5固有: 推論トークン使用量を確認
if (completion.usage?.completion_tokens_details?.reasoning_tokens) {
  console.log('Reasoning tokens:', completion.usage.completion_tokens_details.reasoning_tokens);
}
```

### 🎛️ 推論時間の制御（オプション）

```typescript
const { completion } = await createChatCompletion(
  [{ role: 'user', content: prompt }],
  {
    model: 'gpt-5',
    maxTokens: 64000,
    // reasoning_effort: 'low' | 'medium' | 'high' | 'minimal'
  }
);
```

**推奨設定**:
- `minimal`: クイックな事実取得、UI応答
- `medium`: 通常の複雑タスク（**デフォルト推奨**）
- `high`: 最高品質が必要な場合

---

## コスト最適化

### 💰 価格比較（per 1M tokens）

| モデル | Input | Output | 想定ケース (10K in / 5K out) |
|-------|-------|--------|--------------------------|
| **GPT-5** | $1.25 | $10 | **$0.0625** |
| GPT-5 mini | $0.25 | $2 | **$0.0125** |
| GPT-4o | $2.5 | $10 | **$0.075** |

### 🔄 キャッシュ活用

```typescript
// プロンプトキャッシュ（繰り返し使用で90%削減）
const { completion } = await openai.chat.completions.create({
  model: 'gpt-5',
  messages: [
    {
      role: 'system',
      content: MULTI_TRACK_MUSIC_PROMPT, // 長いプロンプト
      // キャッシュは自動的に適用される（5分間有効）
    },
    { role: 'user', content: userRequest }
  ],
  max_completion_tokens: 64000,
});
```

**節約の目安**:
- プロンプトキャッシュ: 90%削減（繰り返し使用時）
- GPT-5 miniへのルーティング: 簡単なタスクで80%削減
- 構造化JSON出力: 冗長性削減で10-30%削減

---

## MUED LMS での実装方針

### Phase 2 音楽教材生成

**採用モデル**: **GPT-5**

**理由**:
1. **複雑な音楽理論推論** (和声進行、対位法、オーケストレーション)
2. **構造化JSON出力** (MultiTrackJSON生成)
3. **長いプロンプト対応** (MULTI_TRACK_MUSIC_PROMPT: 2,700+ tokens)
4. **スキーマ違反が少ない** (Zodバリデーションエラー削減)

### 実装例

```typescript
// lib/services/ai-material.service.ts

export async function generateMultiTrackMusic(
  request: MaterialGenerationRequest
): Promise<MultiTrackMusicMaterial> {
  const prompt = MULTI_TRACK_MUSIC_PROMPT
    .replace('{subject}', request.subject)
    .replace('{topic}', request.topic)
    .replace('{difficulty}', request.difficulty)
    .replace('{instrument}', request.instrument || '')
    .replace('{context}', request.additionalContext || '');

  const { completion, usage } = await createChatCompletion(
    [{ role: 'user', content: prompt }],
    {
      model: 'gpt-5', // Phase 2ではGPT-5を使用
      maxTokens: 64000,
    }
  );

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('GPT-5 generated no output');
  }

  // JSON抽出とバリデーション
  const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
  const jsonString = jsonMatch ? jsonMatch[1] : content;
  const result = JSON.parse(jsonString);

  // Zodバリデーション
  const validated = MultiTrackJSONSchema.parse(result);

  return validated as MultiTrackMusicMaterial;
}
```

---

## トラブルシューティング

### ❌ 問題: "No content in response"

**原因**: GPT-5が全てのトークンを推論に使用し、出力が0

**解決策**:
```typescript
{
  model: 'gpt-5',
  maxTokens: 64000, // ❌ 16000 → ✅ 64000
}
```

### ❌ 問題: "Unsupported parameter: 'max_tokens'"

**原因**: GPT-5は`max_completion_tokens`を使用（lib/openai.tsのラッパーが自動変換）

**解決策**:
```typescript
// ❌ 直接OpenAI SDKを使う場合
await openai.chat.completions.create({
  model: 'gpt-5',
  max_tokens: 16000, // GPT-5では非対応
});

// ✅ ラッパー関数を使う
await createChatCompletion(messages, {
  model: 'gpt-5',
  maxTokens: 64000, // 自動的にmax_completion_tokensに変換
});
```

### ❌ 問題: レスポンスが遅い

**原因**: GPT-5は推論に時間がかかる

**対策**:
1. `reasoning_effort: 'low'` または `'minimal'` を使用
2. 簡単なタスクはGPT-5 miniにルーティング
3. キャッシュを活用（繰り返しプロンプト）

---

## 参考資料

### 公式ドキュメント
- [Introducing GPT-5 | OpenAI](https://openai.com/index/introducing-gpt-5/)
- [GPT-5 for developers | OpenAI](https://openai.com/index/introducing-gpt-5-for-developers/)
- [GPT-5 New Params and Tools | OpenAI Cookbook](https://cookbook.openai.com/examples/gpt-5/gpt-5_new_params_and_tools)

### ベンチマーク・比較
- [GPT-5 vs o3 vs 4o — 2025 Benchmarks & Best Uses](https://www.getpassionfruit.com/blog/chatgpt-5-vs-gpt-5-pro-vs-gpt-4o-vs-o3-performance-benchmark-comparison-recommendation-of-openai-s-2025-models)
- [GPT-5 Benchmarks | Vellum](https://www.vellum.ai/blog/gpt-5-benchmarks)

### コミュニティ
- [Azure OpenAI reasoning models | Microsoft Learn](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/how-to/reasoning)

---

## 更新履歴

| 日付 | 変更内容 | 担当 |
|------|---------|------|
| 2025-01-07 | 初版作成（GPT-5リサーチ結果を反映） | Claude Code |

---

**注意**: 本ドキュメントはClaude Code（知識カットオフ: 2025-01）が2025-11-07にWebリサーチした情報に基づいています。最新情報は[OpenAI公式ドキュメント](https://openai.com/)を参照してください。
