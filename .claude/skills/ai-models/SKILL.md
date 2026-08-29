---
name: ai-models
description: OpenAI APIモデル選定、GPT-5/GPT-4.1使い分け、AI機能実装。AIモデル、OpenAI、GPT、API呼び出し、モデル選択時に使用。
---

# AI モデル選定 (MUED LMS v2)

## 基本方針

**本プロジェクトで GPT-4o を新規採用しない。**★**現存する例外は1箇所** — `lib/services/analyzer.service.ts:79` の `gpt-4o-mini`（MVP・コード内コメントに「upgrade to gpt-5-mini when available」）。`lib/openai.ts` の `MODEL_PRICING` に `gpt-4o` / `gpt-4o-mini` が在るのは★課金計算のための価格表で、呼び出しではない。

## モデル選定ガイド

| 用途 | 使用モデル | 理由 |
|-----|----------|------|
| **複雑な判断・分析** | GPT-5系 (`gpt-5`, `gpt-5.1`) | 推論能力が必要なタスク |
| **単純生成・会話** | GPT-4.1系 (`gpt-4.1-mini`) | max token節約、コスト効率 |
| **開発/テスト** | Claude (MCP経由) | 日本語品質、教育的コンテンツ |
| ★**本番の会話 (Hoo / dial)** | ★**Anthropic Claude**（`lib/ai/providers/claude.ts`・SDK 直呼び。MCP ではない） | ★この skill は長らく「Claude=開発のみ」と書いていたが実測で誤り |

## 推論モデル vs 非推論モデル

- GPT-5系は**推論モデル**：単純な生成タスクで使うとmax tokenが飽和する
- GPT-4.1系は**非推論モデル**：シンプルな生成に適している
- MUEDnoteの会話機能など単純生成には GPT-4.1系を使用

## 実装時の注意

| タスク | 使用モデル |
|-------|----------|
| 音楽教材生成（複雑） | `gpt-5` または `gpt-5.1` |
| 会話・単純生成 | `gpt-4.1-mini` |

## 使用禁止モデル

- **GPT-4o**: 新規採用しない（★既存の例外1件は上記。「禁止」と書くと、実在する例外を読む人が bug と誤認する）
- **o3, o4-mini**: 使用しない

## 詳細ドキュメント

★**無し**。旧 `docs/archive/ai-model-comparison.md` は commit `8cc4906a` で意図的に削除された（`docs/archive/` は現在 0 件）。
必要なら `git show 8cc4906a^:docs/archive/ai-model-comparison.md` で取り出せる。
