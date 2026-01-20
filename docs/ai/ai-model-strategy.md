# AI モデル戦略 - MUED LMS

## 概要

本ドキュメントは、2026年1月に実施した Hoo AI PoC 評価に基づき、MUED LMS の AI モデル戦略を定義するものです。

**決定日**: 2026-01-20
**ステータス**: 承認済み

---

## 1. 戦略的決定

### 採用プロバイダー

| プロバイダー | 主な用途 | フォールバック |
|-------------|----------|---------------|
| **Anthropic (Claude)** | 複雑な対話、コンテンツ生成 | Gemini |
| **Google (Gemini)** | シンプルな推論、分類 | Claude |

### 廃止プロバイダー

| プロバイダー | 理由 |
|-------------|------|
| **OpenAI** | PoC 評価で Claude/Gemini に対してコストパフォーマンスが劣る |

**注記**: MIDI-LLM（Modal.com 上の Llama ベースモデル）は音楽生成に特化した専用モデルであり、変更なし。

---

## 2. 機能別モデル選定

### 2.1 推奨モデル割り当て

| 機能 | サービス/ファイル | 推奨モデル | 理由 |
|------|------------------|-----------|------|
| **Hoo AI** | `app/api/hoo/chat/` | Claude Haiku 4.5 | キャラクター一貫性、文脈維持 |
| **Interviewer** | `lib/services/interviewer.service.ts` | Claude Haiku 4.5 | 対話品質、共感的応答 |
| **AI Material** | `lib/services/ai-material.service.ts` | Claude Haiku 4.5 | 出力品質、構造化コンテンツ |
| **Analyzer** | `lib/services/analyzer.service.ts` | Gemini 2.5 Flash | シンプルな分類タスク |
| **AI Intent** | `app/api/ai/intent/route.ts` | Gemini 2.5 Flash | 意図分類 |
| **Mentor Matching** | `app/api/mentor-matching/` | Gemini 2.5 Flash | 検索・ランキングタスク |
| **RAG Service** | `lib/services/rag.service.ts` | Gemini 2.5 Flash | 検索拡張 |

### 2.2 選定基準

**Claude Haiku 4.5 を使用する場合:**
- キャラクター/ペルソナの一貫性が必要
- 長い文脈の維持が重要
- 高品質でニュアンスのある出力が必要
- ユーザー向けの会話機能

**Gemini 2.5 Flash を使用する場合:**
- シンプルな分類や意図検出
- コスト効率が優先
- バックグラウンド処理タスク
- 大量・低複雑度の処理

---

## 3. コスト比較

### 3.1 価格（100万トークンあたり）

| モデル | 入力 | 出力 | 備考 |
|--------|------|------|------|
| Claude Haiku 4.5 | $1.00 | $5.00 | 対話における最良の品質/コスト比 |
| Gemini 2.5 Flash | $0.15 | $0.60 | Claude の 6-8 倍安価 |
| GPT-4.1 Mini | $0.40 | $1.60 | （参考：廃止予定） |
| GPT-5 Mini | $0.25 | $2.00 | （参考：廃止予定） |

### 3.2 移行後の月次コスト見積もり

| 機能 | 月間ボリューム | モデル | 推定コスト |
|------|---------------|--------|-----------|
| Hoo AI | 10,000 会話 | Claude Haiku 4.5 | 約 $25 |
| Interviewer | 5,000 セッション | Claude Haiku 4.5 | 約 $15 |
| AI Material | 2,000 生成 | Claude Haiku 4.5 | 約 $10 |
| Analyzer | 20,000 分析 | Gemini 2.5 Flash | 約 $3 |
| AI Intent | 50,000 リクエスト | Gemini 2.5 Flash | 約 $5 |
| Mentor Matching | 10,000 検索 | Gemini 2.5 Flash | 約 $2 |
| **合計** | - | - | **約 $60/月** |

---

## 4. 技術アーキテクチャ

### 4.1 プロバイダー抽象化層

```typescript
// lib/ai/unified-provider.ts（実装予定）

export type AIProvider = 'claude' | 'gemini';
export type AIModel =
  | 'claude-haiku-4-5-20251001'
  | 'gemini-2.5-flash';

export interface ChatOptions {
  provider?: AIProvider;
  model?: AIModel;
  maxTokens?: number;
  temperature?: number;
}

export async function chat(
  messages: ChatMessage[],
  options?: ChatOptions
): Promise<ChatResponse>;
```

### 4.2 フォールバック戦略

```
プライマリ: Claude Haiku 4.5
    ↓ （API エラーまたはタイムアウト）
フォールバック: Gemini 2.5 Flash
    ↓ （API エラーまたはタイムアウト）
エラー: キャッシュ/デフォルト応答を返す
```

### 4.3 環境変数

```bash
# プライマリプロバイダー
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=AIza...

# モデル設定
AI_DEFAULT_PROVIDER=claude
AI_FALLBACK_PROVIDER=gemini

# 機能別オーバーライド（オプション）
AI_ANALYZER_PROVIDER=gemini
AI_INTENT_PROVIDER=gemini
AI_HOO_PROVIDER=claude
```

---

## 5. 移行計画

### Phase 1: Hoo AI 実装（現在）
- ブランチ: `feature/hoo-poc`
- スコープ: Claude + Gemini フォールバックで Hoo AI を完成
- 成果物: main への PR

### Phase 2: プロバイダー抽象化層
- ブランチ: `feature/ai-provider-migration`
- スコープ: 統合プロバイダー作成、低リスク機能の移行
- 対象機能: AI Intent, Mentor Matching, Analyzer

### Phase 3: 高価値機能の移行
- ブランチ: `feature/ai-provider-migration`（継続）
- スコープ: 十分なテストを伴うコア機能の移行
- 対象機能: Interviewer, AI Material

### Phase 4: クリーンアップ
- OpenAI SDK 依存の削除
- ドキュメント更新
- レガシーコードのアーカイブ

---

## 6. PoC 評価サマリー

### 6.1 評価したモデル

| モデル | プロバイダー | 強み | 弱み |
|--------|-------------|------|------|
| Claude Haiku 4.5 | Anthropic | キャラクター一貫性、文脈、品質 | Gemini より高コスト |
| Gemini 2.5 Flash | Google | コスト効率、速度 | 対話でのニュアンスが劣る |
| GPT-4.1 Mini | OpenAI | 良好なベースライン | Claude に劣る |
| GPT-5 Mini | OpenAI | 推論力向上 | コストが正当化されない |

### 6.2 主な発見

1. **Claude はペルソナ駆動の会話に優れる** - Hoo キャラクターが一貫して維持された
2. **Gemini はシンプルなタスクで最良のコスト/パフォーマンス** - 6-8 倍安価で十分な品質
3. **OpenAI は競争優位性を失った** - コストでも品質でもリーダーではない

### 6.3 評価ドキュメント

参照: [docs/hoo/Talk_Poc/poc-evaluation-result.md](../hoo/Talk_Poc/poc-evaluation-result.md)

---

## 7. 決定ログ

| 日付 | 決定 | 理由 |
|------|------|------|
| 2026-01-20 | Claude + Gemini 採用、OpenAI 廃止 | PoC 結果、コスト最適化 |
| 2026-01-20 | 対話は Claude、分類は Gemini | 機能要件がモデル特性に合致 |
| 2026-01-20 | 段階的移行アプローチ | リスク軽減、漸進的検証 |

---

## 8. 参考資料

- [Hoo PoC 評価結果](../hoo/Talk_Poc/poc-evaluation-result.md)
- [MUEDnote サブスクリプションプラン](../business/subscription/muednote-subscription-plan-v1.md)
- [Anthropic 料金](https://www.anthropic.com/pricing)
- [Google AI 料金](https://ai.google.dev/pricing)

---

*最終更新: 2026-01-20*
