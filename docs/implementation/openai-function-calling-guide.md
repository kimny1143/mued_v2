# OpenAI Function Calling実装ガイド

## 📌 ドキュメント情報

- **作成日**: 2025年10月1日
- **バージョン**: 1.0
- **目的**: MUEDプロジェクトにおけるOpenAI Function Callingの実装ガイド
- **対象読者**: 開発者

---

## 🎯 概要

OpenAI Function Callingは、LLMに外部ツールや関数を呼び出す能力を与える機能です。自然言語の入力を構造化されたAPI呼び出しに変換し、その結果を基に応答を生成できます。

### 主要な利点

- ✅ **自然言語→構造化データ変換** - ユーザーの曖昧な要求を正確なAPI呼び出しに
- ✅ **並列実行対応** - 複数のツールを同時に呼び出し可能
- ✅ **Structured Outputs** - スキーマに厳密に準拠したJSON出力を保証
- ✅ **エラーハンドリング** - ツール実行失敗時の適切な対処

---

## 🔧 基本実装

### 1. OpenAIクライアント設定

```typescript
// lib/openai/client.ts
import OpenAI from 'openai';
import { z } from 'zod';

// 環境変数スキーマ
const envSchema = z.object({
  OPENAI_API_KEY: z.string(),
  OPENAI_ORG_ID: z.string().optional(),
});

const env = envSchema.parse(process.env);

// OpenAIクライアント初期化
export const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  organization: env.OPENAI_ORG_ID,
});

// モデル定数
export const MODELS = {
  FAST: 'gpt-3.5-turbo', // 高速・低コスト
  BALANCED: 'gpt-4o-mini', // バランス型
  POWERFUL: 'gpt-4o', // 高精度
} as const;
```

### 2. コスト追跡ラッパー

```typescript
// lib/openai/service.ts
import { openai, MODELS } from './client';
import type { ChatCompletionCreateParams } from 'openai/resources/chat';

interface ModelCost {
  input: number; // $/1K tokens
  output: number; // $/1K tokens
}

export class OpenAIService {
  // モデル別コスト定義（2025年1月時点）
  private static readonly MODEL_COSTS: Record<string, ModelCost> = {
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  };

  /**
   * コスト追跡機能付きのCompletion作成
   */
  static async createCompletion(
    params: ChatCompletionCreateParams
  ) {
    const startTime = Date.now();

    try {
      const completion = await openai.chat.completions.create(params);

      // 使用量とコストの記録
      if (completion.usage) {
        const cost = this.calculateCost(
          params.model,
          completion.usage
        );

        await this.recordMetrics({
          model: params.model,
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens,
          estimatedCost: cost,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        });
      }

      return completion;
    } catch (error) {
      console.error('[OpenAI Error]', error);
      throw error;
    }
  }

  /**
   * コスト計算
   */
  private static calculateCost(
    model: string,
    usage: { prompt_tokens: number; completion_tokens: number }
  ): number {
    const costs = this.MODEL_COSTS[model] || { input: 0, output: 0 };

    return (
      (usage.prompt_tokens * costs.input) / 1000 +
      (usage.completion_tokens * costs.output) / 1000
    );
  }

  /**
   * メトリクス記録（DBまたはログ）
   */
  private static async recordMetrics(metrics: any) {
    // 実装例：データベースに保存（Drizzle）
    // await db.insert(openAIUsage).values(metrics);

    // 開発環境ではコンソール出力
    if (process.env.NODE_ENV === 'development') {
      console.log('[OpenAI Metrics]', metrics);
    }
  }
}
```

---

## 🛠️ Function Calling実装

### 3. ツール定義

```typescript
// lib/ai/tools/definitions.ts
import { z } from 'zod';

/**
 * Zodスキーマでツールパラメータを定義
 */
export const toolSchemas = {
  // 予約検索
  searchAvailableSlots: z.object({
    mentorId: z.string().cuid().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    subject: z.string(),
    timePreference: z.enum(['morning', 'afternoon', 'evening']).optional(),
  }),

  // 予約作成
  createReservation: z.object({
    mentorId: z.string().cuid(),
    slotId: z.string().cuid(),
    message: z.string().max(500).optional(),
  }),

  // AI教材生成
  generateStudyMaterial: z.object({
    subject: z.string(),
    topic: z.string(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    format: z.enum(['quiz', 'summary', 'flashcards', 'practice']).optional(),
    language: z.enum(['ja', 'en']).default('ja'),
  }),

  // サブスクリプション確認
  getSubscriptionStatus: z.object({
    userId: z.string().cuid(),
  }),

  // プランアップグレード
  upgradeSubscription: z.object({
    userId: z.string().cuid(),
    tier: z.enum(['STARTER', 'BASIC', 'PREMIUM']),
    billingCycle: z.enum(['monthly', 'yearly']).optional(),
  }),
};

/**
 * OpenAI Function Calling用のツール定義
 */
export const tools = [
  {
    type: 'function' as const,
    function: {
      name: 'searchAvailableSlots',
      description: `メンターの空き枠を検索します。
        科目、日付、時間帯の希望を指定できます。
        特定のメンターを指定することも可能です。`,
      parameters: {
        type: 'object',
        properties: {
          mentorId: {
            type: 'string',
            description: 'メンターID（任意）',
          },
          date: {
            type: 'string',
            format: 'date',
            description: 'YYYY-MM-DD形式の日付',
          },
          subject: {
            type: 'string',
            description: '科目名（例：内科、外科、小児科）',
          },
          timePreference: {
            type: 'string',
            enum: ['morning', 'afternoon', 'evening'],
            description: '時間帯の希望（任意）',
          },
        },
        required: ['date', 'subject'],
      },
      strict: true, // Structured Outputs有効化
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'createReservation',
      description: '指定されたメンターとスロットで予約を作成します。',
      parameters: {
        type: 'object',
        properties: {
          mentorId: {
            type: 'string',
            description: 'メンターID',
          },
          slotId: {
            type: 'string',
            description: 'スロットID',
          },
          message: {
            type: 'string',
            description: 'メンターへのメッセージ（任意、最大500文字）',
          },
        },
        required: ['mentorId', 'slotId'],
      },
      strict: true,
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'generateStudyMaterial',
      description: `AI教材を生成します。
        科目、トピック、難易度を指定できます。
        出力形式も選択可能です。`,
      parameters: {
        type: 'object',
        properties: {
          subject: {
            type: 'string',
            description: '科目名',
          },
          topic: {
            type: 'string',
            description: 'トピック',
          },
          difficulty: {
            type: 'string',
            enum: ['beginner', 'intermediate', 'advanced'],
            description: '難易度',
          },
          format: {
            type: 'string',
            enum: ['quiz', 'summary', 'flashcards', 'practice'],
            description: '教材の形式（任意）',
          },
          language: {
            type: 'string',
            enum: ['ja', 'en'],
            description: '言語（デフォルト：ja）',
          },
        },
        required: ['subject', 'topic', 'difficulty'],
      },
      strict: true,
    },
  },
];

// 型定義のエクスポート
export type ToolName = keyof typeof toolSchemas;
export type ToolParams<T extends ToolName> = z.infer<typeof toolSchemas[T]>;
```

---

## 🎬 意図解析エンドポイント

### 4. 意図解析API実装

```typescript
// app/api/ai/intent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { OpenAIService } from '@/lib/openai/service';
import { tools, toolSchemas } from '@/lib/ai/tools/definitions';
import { executeTools } from '@/lib/ai/tools/executor';

// リクエストスキーマ
const requestSchema = z.object({
  message: z.string().min(1).max(1000),
  conversationId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // 1. 認証チェック
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. リクエスト検証
    const body = await req.json();
    const { message, conversationId } = requestSchema.parse(body);

    // 3. 会話履歴の取得（オプション）
    const history = conversationId
      ? await getConversationHistory(conversationId)
      : [];

    // 4. OpenAI Function Callingで意図解析
    const completion = await OpenAIService.createCompletion({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        ...history,
        {
          role: 'user',
          content: message,
        },
      ],
      tools,
      tool_choice: 'auto', // AIに判断させる
      temperature: 0.3, // 一貫性重視
      max_tokens: 1000,
    });

    const responseMessage = completion.choices[0].message;

    // 5. ツール呼び出しがある場合
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      // ツール実行
      const toolResults = await executeTools(
        responseMessage.tool_calls,
        userId
      );

      // 6. ツール実行結果を含めて最終応答を生成
      const finalCompletion = await OpenAIService.createCompletion({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: '実行結果を基に、ユーザーに分かりやすく応答してください。',
          },
          responseMessage,
          ...toolResults,
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      // 7. 会話履歴の保存
      if (conversationId) {
        await saveConversation(conversationId, {
          userMessage: message,
          assistantResponse: finalCompletion.choices[0].message.content,
          toolsUsed: responseMessage.tool_calls.map(tc => tc.function.name),
        });
      }

      return NextResponse.json({
        success: true,
        response: finalCompletion.choices[0].message.content,
        toolsUsed: responseMessage.tool_calls.map(tc => tc.function.name),
        conversationId: conversationId || generateConversationId(),
      });
    }

    // 8. 直接応答の場合（ツール呼び出しなし）
    return NextResponse.json({
      success: true,
      response: responseMessage.content,
      conversationId: conversationId || generateConversationId(),
    });

  } catch (error) {
    console.error('[Intent API Error]', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Intent processing failed' },
      { status: 500 }
    );
  }
}

// システムプロンプト
const SYSTEM_PROMPT = `あなたは医学生のための学習支援アシスタントです。

利用可能な機能：
- レッスン予約の検索と作成
- AI教材の生成（クイズ、サマリー、フラッシュカード、練習問題）
- サブスクリプション管理

ユーザーの要求を理解し、適切なツールを呼び出してください。
曖昧な要求の場合は、明確化のための質問をしてください。

重要な制約：
- 日付は必ずYYYY-MM-DD形式で扱う
- 金額は日本円（¥）で表示
- 丁寧で親しみやすい口調を維持`;
```

### 5. ツール実行エンジン

```typescript
// lib/ai/tools/executor.ts
import { toolSchemas, type ToolName } from './definitions';
import { searchAvailableSlots } from '@/services/reservation.service';
import { createReservation } from '@/services/reservation.service';
import { generateStudyMaterial } from '@/services/ai-material.service';
import { getSubscriptionStatus } from '@/services/subscription.service';
import { upgradeSubscription } from '@/services/subscription.service';

// ツールハンドラーマッピング
const toolHandlers: Record<ToolName, (params: any, userId: string) => Promise<any>> = {
  searchAvailableSlots,
  createReservation,
  generateStudyMaterial,
  getSubscriptionStatus,
  upgradeSubscription,
};

/**
 * ツール呼び出しを実行
 */
export async function executeTools(
  toolCalls: any[],
  userId: string
) {
  // 並列実行可能なツールは同時に実行
  const results = await Promise.all(
    toolCalls.map(async (toolCall) => {
      const functionName = toolCall.function.name as ToolName;
      const args = JSON.parse(toolCall.function.arguments);

      try {
        // 1. パラメータ検証
        const schema = toolSchemas[functionName];
        if (!schema) {
          throw new Error(`Unknown tool: ${functionName}`);
        }

        const validatedParams = schema.parse(args);

        // 2. ツール実行
        const handler = toolHandlers[functionName];
        if (!handler) {
          throw new Error(`No handler for tool: ${functionName}`);
        }

        const result = await handler(validatedParams, userId);

        // 3. 成功レスポンス
        return {
          tool_call_id: toolCall.id,
          role: 'tool' as const,
          content: JSON.stringify({
            success: true,
            data: result,
          }),
        };

      } catch (error: any) {
        console.error(`[Tool Error: ${functionName}]`, error);

        // 4. エラーレスポンス
        return {
          tool_call_id: toolCall.id,
          role: 'tool' as const,
          content: JSON.stringify({
            success: false,
            error: error.message || 'Tool execution failed',
          }),
        };
      }
    })
  );

  return results;
}
```

---

## 🚀 実装例

### 6. 予約検索の実装

```typescript
// services/reservation.service.ts
import { db } from '@/db';
import { lessonSlots, users, mentors } from '@/db/schema';
import { eq, and, gte, lt } from 'drizzle-orm';
import type { ToolParams } from '@/lib/ai/tools/definitions';

export async function searchAvailableSlots(
  params: ToolParams<'searchAvailableSlots'>,
  userId: string
) {
  const { date, subject, mentorId, timePreference } = params;

  const targetDate = new Date(date);

  // 時間帯フィルター条件を構築
  const conditions = [
    gte(lessonSlots.startTime, targetDate),
    eq(lessonSlots.status, 'available'),
  ];

  if (mentorId) {
    conditions.push(eq(lessonSlots.mentorId, mentorId));
  }

  if (timePreference) {
    const [start, end] = getTimeRange(timePreference);
    conditions.push(
      gte(lessonSlots.startTime, start),
      lt(lessonSlots.startTime, end)
    );
  }

  // データベースクエリ（Drizzle）
  const slots = await db
    .select({
      id: lessonSlots.id,
      startTime: lessonSlots.startTime,
      endTime: lessonSlots.endTime,
      price: lessonSlots.price,
      mentor: {
        id: users.id,
        name: users.name,
            select: {
              name: true,
              image: true,
            },
          },
          specialties: true,
          rating: true,
        },
      },
    },
    orderBy: [
      { mentor: { rating: 'desc' } },
      { startTime: 'asc' },
    ],
    take: 10, // 最大10件
  });

  return {
    count: slots.length,
    slots: slots.map(formatSlot),
    message: slots.length > 0
      ? `${slots.length}件の空き枠が見つかりました。`
      : '該当する空き枠が見つかりませんでした。',
  };
}

// ヘルパー関数
function getTimeRangeStart(preference: string): Date {
  const today = new Date();
  switch (preference) {
    case 'morning': return new Date(today.setHours(6, 0, 0, 0));
    case 'afternoon': return new Date(today.setHours(12, 0, 0, 0));
    case 'evening': return new Date(today.setHours(18, 0, 0, 0));
    default: return new Date(today.setHours(0, 0, 0, 0));
  }
}

function getTimeRangeEnd(preference: string): Date {
  const today = new Date();
  switch (preference) {
    case 'morning': return new Date(today.setHours(12, 0, 0, 0));
    case 'afternoon': return new Date(today.setHours(18, 0, 0, 0));
    case 'evening': return new Date(today.setHours(23, 59, 59, 999));
    default: return new Date(today.setHours(23, 59, 59, 999));
  }
}

function formatSlot(slot: any) {
  return {
    id: slot.id,
    date: slot.date.toISOString().split('T')[0],
    time: `${slot.startTime.toTimeString().slice(0, 5)} - ${slot.endTime.toTimeString().slice(0, 5)}`,
    mentor: {
      id: slot.mentor.id,
      name: slot.mentor.user.name,
      image: slot.mentor.user.image,
      specialties: slot.mentor.specialties,
      rating: slot.mentor.rating,
    },
    price: slot.price,
  };
}
```

---

## 🧪 テスト戦略

### 7. ユニットテスト

```typescript
// __tests__/ai/tools.test.ts
import { describe, it, expect, jest } from '@jest/globals';
import { executeTools } from '@/lib/ai/tools/executor';

describe('Tool Executor', () => {
  it('should execute searchAvailableSlots successfully', async () => {
    const toolCalls = [
      {
        id: 'call_1',
        function: {
          name: 'searchAvailableSlots',
          arguments: JSON.stringify({
            date: '2025-12-01',
            subject: '内科',
          }),
        },
      },
    ];

    const results = await executeTools(toolCalls, 'user_123');

    expect(results).toHaveLength(1);
    expect(results[0].role).toBe('tool');

    const content = JSON.parse(results[0].content);
    expect(content.success).toBe(true);
    expect(content.data).toHaveProperty('slots');
  });

  it('should handle invalid parameters', async () => {
    const toolCalls = [
      {
        id: 'call_2',
        function: {
          name: 'searchAvailableSlots',
          arguments: JSON.stringify({
            date: 'invalid-date',
            subject: '内科',
          }),
        },
      },
    ];

    const results = await executeTools(toolCalls, 'user_123');

    const content = JSON.parse(results[0].content);
    expect(content.success).toBe(false);
    expect(content.error).toBeDefined();
  });

  it('should execute multiple tools in parallel', async () => {
    const toolCalls = [
      {
        id: 'call_3',
        function: {
          name: 'searchAvailableSlots',
          arguments: JSON.stringify({
            date: '2025-12-01',
            subject: '内科',
          }),
        },
      },
      {
        id: 'call_4',
        function: {
          name: 'getSubscriptionStatus',
          arguments: JSON.stringify({
            userId: 'user_123',
          }),
        },
      },
    ];

    const startTime = Date.now();
    const results = await executeTools(toolCalls, 'user_123');
    const duration = Date.now() - startTime;

    expect(results).toHaveLength(2);
    // 並列実行なので、順次実行より速いはず
    expect(duration).toBeLessThan(1000);
  });
});
```

---

## 💰 コスト最適化

### 8. トークン使用量の最適化

```typescript
// lib/ai/optimizer.ts
export class AIOptimizer {
  /**
   * トークン数の事前推定（日本語対応）
   */
  static estimateTokens(text: string): number {
    // 日本語: 約1文字 = 0.7トークン
    // 英語: 約4文字 = 1トークン
    const japaneseChars = (text.match(/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g) || []).length;
    const englishChars = text.length - japaneseChars;

    return Math.ceil(japaneseChars * 0.7 + englishChars * 0.25);
  }

  /**
   * プロンプトの圧縮
   */
  static compressPrompt(prompt: string, maxTokens: number = 1000): string {
    const estimated = this.estimateTokens(prompt);

    if (estimated <= maxTokens) {
      return prompt;
    }

    // 要約を要求
    return `以下の内容を${maxTokens}トークン以内で要約してください：\n${prompt.slice(0, maxTokens * 4)}...`;
  }

  /**
   * モデル選択の最適化
   */
  static selectOptimalModel(
    taskComplexity: 'low' | 'medium' | 'high',
    costSensitive: boolean = true
  ): string {
    if (costSensitive) {
      // コスト重視
      switch (taskComplexity) {
        case 'low': return 'gpt-3.5-turbo';
        case 'medium': return 'gpt-4o-mini';
        case 'high': return 'gpt-4o-mini'; // コスト重視なら4o-miniまで
      }
    } else {
      // 品質重視
      switch (taskComplexity) {
        case 'low': return 'gpt-4o-mini';
        case 'medium': return 'gpt-4o';
        case 'high': return 'gpt-4o';
      }
    }
  }

  /**
   * レスポンスキャッシュ
   */
  static getCacheKey(params: any): string {
    // パラメータからキャッシュキーを生成
    const normalized = JSON.stringify({
      model: params.model,
      messages: params.messages,
      tools: params.tools?.map((t: any) => t.function.name),
    });

    return `ai:${Buffer.from(normalized).toString('base64').slice(0, 32)}`;
  }
}
```

### 9. キャッシュ戦略

```typescript
// lib/ai/cache.ts
import { Redis } from '@upstash/redis';
import { AIOptimizer } from './optimizer';

export class AICache {
  private static redis = Redis.fromEnv();
  private static DEFAULT_TTL = 3600; // 1時間

  /**
   * キャッシュ付きCompletion実行
   */
  static async getCachedOrGenerate(
    params: any,
    generator: () => Promise<any>,
    ttl: number = this.DEFAULT_TTL
  ) {
    // 1. キャッシュキー生成
    const cacheKey = AIOptimizer.getCacheKey(params);

    // 2. キャッシュチェック
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        console.log('[Cache Hit]', cacheKey);
        return cached;
      }
    } catch (error) {
      console.error('[Cache Error]', error);
    }

    // 3. 生成実行
    const result = await generator();

    // 4. キャッシュ保存（非同期）
    this.redis.setex(cacheKey, ttl, JSON.stringify(result)).catch(
      error => console.error('[Cache Save Error]', error)
    );

    return result;
  }

  /**
   * パターン別キャッシュ無効化
   */
  static async invalidate(pattern: string) {
    const keys = await this.redis.keys(`ai:${pattern}*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

---

## 🛡️ エラーハンドリング

### 10. 包括的なエラー処理

```typescript
// lib/ai/error-handler.ts
export class AIErrorHandler {
  /**
   * OpenAI APIエラーの処理
   */
  static handleOpenAIError(error: any): NextResponse {
    // Rate Limit エラー
    if (error.status === 429) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'リクエストが多すぎます。しばらくお待ちください。',
          retryAfter: error.headers?.['retry-after'] || 60,
        },
        { status: 429 }
      );
    }

    // トークン上限エラー
    if (error.code === 'context_length_exceeded') {
      return NextResponse.json(
        {
          error: 'Context too long',
          message: '入力が長すぎます。短くしてください。',
        },
        { status: 400 }
      );
    }

    // API Key エラー
    if (error.status === 401) {
      console.error('[API Key Error]', error);
      return NextResponse.json(
        {
          error: 'Configuration error',
          message: 'システムエラーが発生しました。',
        },
        { status: 500 }
      );
    }

    // その他のエラー
    return NextResponse.json(
      {
        error: 'AI processing failed',
        message: 'AI処理中にエラーが発生しました。',
      },
      { status: 500 }
    );
  }

  /**
   * フォールバック応答
   */
  static getFallbackResponse(intent: string): string {
    const fallbacks: Record<string, string> = {
      reservation: 'お手数ですが、予約は手動で行ってください。',
      material: '教材生成が一時的に利用できません。後ほどお試しください。',
      subscription: 'サブスクリプション情報の取得に失敗しました。',
      default: 'リクエストを処理できませんでした。サポートにお問い合わせください。',
    };

    return fallbacks[intent] || fallbacks.default;
  }
}
```

---

## 📊 モニタリングと分析

### 11. 使用状況分析

```typescript
// lib/ai/analytics.ts
export class AIAnalytics {
  /**
   * ツール使用状況の追跡
   */
  static async trackToolUsage(
    userId: string,
    toolName: string,
    success: boolean,
    duration: number
  ) {
    await db.insert(aiToolUsage).values({
      userId,
      toolName,
      success,
      duration,
      timestamp: new Date(),
    });
  }

  /**
   * コスト分析レポート
   */
  static async generateCostReport(startDate: Date, endDate: Date) {
    const [result] = await db
      .select({
        totalCost: sum(openAIUsage.estimatedCost),
        totalTokens: sum(openAIUsage.totalTokens),
        count: count(),
      })
      .from(openAIUsage)
      .where(
        and(
          gte(openAIUsage.timestamp, startDate),
          lte(openAIUsage.timestamp, endDate)
        )
      );

    return {
      totalCost: result?.totalCost || 0,
      totalTokens: result?.totalTokens || 0,
      totalRequests: result?.count || 0,
      averageCostPerRequest:
        (result?.totalCost || 0) / (result?.count || 1),
    };
  }

  /**
   * パフォーマンスメトリクス
   */
  static async getPerformanceMetrics() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentCalls = await db
      .select()
      .from(aiToolUsage)
      .where(gte(aiToolUsage.timestamp, oneDayAgo));

    const metrics = {
      totalCalls: recentCalls.length,
      successRate:
        (recentCalls.filter(c => c.success).length / recentCalls.length) * 100,
      averageResponseTime:
        recentCalls.reduce((sum, c) => sum + c.duration, 0) / recentCalls.length,
      toolUsage: {} as Record<string, number>,
    };

    // ツール別使用回数
    recentCalls.forEach(call => {
      metrics.toolUsage[call.toolName] =
        (metrics.toolUsage[call.toolName] || 0) + 1;
    });

    return metrics;
  }
}
```

---

## 🚀 ベストプラクティス

### まとめ

1. **コスト管理**
   - モデル選択の最適化
   - レスポンスキャッシュの活用
   - トークン使用量の監視

2. **エラーハンドリング**
   - 包括的なエラー処理
   - フォールバック機能
   - ユーザーフレンドリーなメッセージ

3. **パフォーマンス**
   - 並列ツール実行
   - キャッシュ戦略
   - 適切なタイムアウト設定

4. **セキュリティ**
   - 入力検証（Zod）
   - APIキーの安全管理
   - レート制限

5. **モニタリング**
   - 使用状況の追跡
   - コスト分析
   - パフォーマンスメトリクス

---

## 🔗 関連リソース

### 公式ドキュメント
- [OpenAI Function Calling Guide](https://platform.openai.com/docs/guides/function-calling)
- [Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)

### プロジェクト内ドキュメント
- [MVPアーキテクチャ設計](/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/docs/architecture/mvp-architecture.md)
- [MVP実装計画](/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/docs/implementation/mvp-implementation-plan.md)
- [簡素化アーキテクチャ](/Users/kimny/Dropbox/_DevProjects/mued/mued_v2/docs/architecture/mvp-simplified-architecture.md)