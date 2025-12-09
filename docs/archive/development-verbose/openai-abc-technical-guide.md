# OpenAI ABC Generation 技術仕様書

**最終更新:** 2025-11-12
**対象:** 開発者・技術担当者
**ステータス:** ✅ 本番環境稼働中

---

## 目次

1. [アーキテクチャ概要](#1-アーキテクチャ概要)
2. [API実装詳細](#2-api実装詳細)
3. [OpenAI API統合](#3-openai-api統合)
4. [ABC Notation処理](#4-abc-notation処理)
5. [MIDI変換フロー](#5-midi変換フロー)
6. [データベース設計](#6-データベース設計)
7. [パフォーマンス最適化](#7-パフォーマンス最適化)
8. [セキュリティ考慮事項](#8-セキュリティ考慮事項)
9. [テスト戦略](#9-テスト戦略)
10. [デプロイメント](#10-デプロイメント)
11. [トラブルシューティング](#11-トラブルシューティング)
12. [今後の拡張](#12-今後の拡張)

---

## 1. アーキテクチャ概要

### システム構成図

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Material Form│  │ ABC Renderer │  │ MIDI Player  │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                  │
└─────────┼──────────────────┼──────────────────┼──────────────────┘
          │                  │                  │
          │ POST             │ Render           │ Play
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js 15 API Routes                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  /api/materials/generate                                 │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │   │
│  │  │ Validation │→ │ OpenAI Call│→ │ DB Storage │         │   │
│  │  └────────────┘  └────────────┘  └────────────┘         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
          │                  │                  │
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   OpenAI API    │  │  Neon Postgres  │  │  abcjs Library  │
│   GPT-5-mini    │  │  (Drizzle ORM)  │  │  ABC → MIDI     │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### データフロー

```
1. User Input
   ↓
2. Request Validation (Zod schema)
   ↓
3. Prompt Construction (CoMT pattern)
   ↓
4. OpenAI API Call (GPT-5-mini)
   ↓
5. Response Parsing (JSON extraction)
   ↓
6. ABC Notation Validation
   ↓
7. MIDI Generation (abcjs)
   ↓
8. Database Storage (materials table)
   ↓
9. Response to Client (JSON)
```

### 依存関係

**コア依存:**
- `openai@4.73.x` - OpenAI SDK
- `abcjs@6.x` - ABC notation レンダリング・MIDI変換
- `@neondatabase/serverless` - データベース接続
- `drizzle-orm` - ORM
- `zod` - スキーマバリデーション

**型定義:**
- `/types/openai.d.ts` - OpenAI API型定義
- `/types/abcjs.d.ts` - abcjs型定義

**セキュリティ:**
- `isomorphic-dompurify@2.19.0` - XSS防止

---

## 2. API実装詳細

### 2.1 エンドポイント仕様

#### POST /api/materials/generate

教材の ABC notation を生成します。

**Request Schema:**

```typescript
interface GenerateMaterialRequest {
  level: 'beginner' | 'intermediate' | 'advanced';
  instrument: string;  // 'piano', 'guitar', 'violin', etc.
  genre: string;       // 'classical', 'jazz', 'pop', etc.
  length: 'short' | 'medium' | 'long';
  specificRequest?: string;  // オプションのカスタムリクエスト
}
```

**Response Schema:**

```typescript
interface GenerateMaterialResponse {
  success: boolean;
  material?: {
    id: string;
    title: string;
    description: string;
    type: 'music';
    content: {
      abcNotation: string;
      midiData?: string;  // Base64 encoded
    };
    metadata: {
      level: string;
      instrument: string;
      genre: string;
      duration: number;  // seconds
    };
    learningPoints: string[];
    practiceInstructions: string[];
    estimatedPracticeTime: number;  // minutes
  };
  error?: string;
  code?: string;
}
```

**実装パス:**
`/app/api/materials/generate/route.ts`

**コード例:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { generateMusicMaterial } from '@/lib/openai';
import { db } from '@/db';
import { materials } from '@/db/schema';
import { withAuth } from '@/lib/auth';

export const POST = withAuth(async ({ userId, request }) => {
  try {
    const body = await request.json();

    // Validation
    const validated = GenerateMaterialSchema.parse(body);

    // OpenAI generation
    const result = await generateMusicMaterial({
      level: validated.level,
      instrument: validated.instrument,
      genre: validated.genre,
      length: validated.length,
      specificRequest: validated.specificRequest,
    });

    // MIDI conversion
    const midiData = await convertABCtoMIDI(result.abcNotation);

    // Database storage
    const [material] = await db.insert(materials).values({
      userId,
      title: result.title,
      type: 'music',
      content: {
        abcNotation: result.abcNotation,
        midiData,
      },
      metadata: {
        level: validated.level,
        instrument: validated.instrument,
        genre: validated.genre,
      },
      learningPoints: result.learningPoints,
      practiceInstructions: result.practiceInstructions,
    }).returning();

    return NextResponse.json({ success: true, material });
  } catch (error) {
    logger.error('Material generation failed', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});
```

### 2.2 バリデーション

**Zod Schema:**

```typescript
import { z } from 'zod';

export const GenerateMaterialSchema = z.object({
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  instrument: z.string().min(1).max(50),
  genre: z.string().min(1).max(50),
  length: z.enum(['short', 'medium', 'long']),
  specificRequest: z.string().max(500).optional(),
});
```

**エラーハンドリング:**

```typescript
try {
  const validated = GenerateMaterialSchema.parse(body);
} catch (error) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: 'Validation failed',
        details: error.errors,
      },
      { status: 400 }
    );
  }
}
```

---

## 3. OpenAI API統合

### 3.1 プロンプトエンジニアリング

#### Chain-of-Musical-Thought (CoMT) パターン

**コンセプト:**
音楽理論的な段階的思考プロセスを明示的にプロンプトに組み込み、高品質な ABC notation を生成します。

**プロンプト構造:**

```typescript
const systemPrompt = `You are an expert music educator and composer specializing in creating educational practice materials.

# Chain-of-Musical-Thought Process

When generating music materials, follow this structured approach:

## Step 1: Musical Analysis
- Analyze the requested level, instrument, and genre
- Determine appropriate key signature, time signature, and tempo
- Identify suitable melodic range and technical requirements

## Step 2: Structure Design
- Design the overall form (e.g., AB, ABA, verse-chorus)
- Plan harmonic progression appropriate to the genre
- Determine phrase lengths and repetition patterns

## Step 3: ABC Notation Generation
- Generate valid ABC notation following standard syntax
- Include appropriate header fields (X, T, M, L, K)
- Ensure proper voice leading and musicality

## Step 4: Educational Annotation
- Identify key learning points
- Provide step-by-step practice instructions
- Estimate practice time based on difficulty

# Output Format
Return a JSON object with:
- title: Clear, descriptive title
- abcNotation: Valid ABC notation string
- learningPoints: Array of key learning objectives
- practiceInstructions: Array of step-by-step instructions
- estimatedPracticeTime: Number (minutes)
`;

const userPrompt = `
Generate a ${level} level ${instrument} practice piece in ${genre} style.
Length: ${length}
${specificRequest ? `Additional requirements: ${specificRequest}` : ''}

Follow the Chain-of-Musical-Thought process to create a high-quality, pedagogically sound practice material.
`;
```

**実装パス:**
`/lib/ai/music-material-generator.ts`

### 3.2 GPT-5系モデルの選択基準

#### モデル比較表

| Model | Input Cost | Output Cost | 最適用途 | 推奨シナリオ |
|-------|-----------|------------|---------|-------------|
| **GPT-5-nano** | $0.05/1M | $0.4/1M | Simple tasks | プロトタイプ、テスト環境 |
| **GPT-5-mini** | **$0.25/1M** | **$2.0/1M** | **Balance** | **本番環境（推奨）** |
| **GPT-5** | $1.25/1M | $10.0/1M | Complex reasoning | 高度な作曲、アレンジ |
| o3-mini | $1.1/1M | $4.4/1M | Reasoning tasks | 理論的分析が必要な場合 |

**選択ロジック:**

```typescript
function selectModel(level: string, complexity: number): string {
  // 本番環境では GPT-5-mini を優先
  if (process.env.NODE_ENV === 'production') {
    return 'gpt-5-mini';
  }

  // 開発環境では complexity に応じて選択
  if (complexity > 8 || level === 'advanced') {
    return 'gpt-5';
  } else if (complexity > 5) {
    return 'gpt-5-mini';
  } else {
    return 'gpt-5-nano';
  }
}
```

### 3.3 GPT-5対応の実装

**パラメータの違い:**

```typescript
import type { OpenAICompletionParams } from '@/types/openai';

function buildCompletionParams(
  model: string,
  messages: OpenAIMessage[],
  maxTokens: number
): OpenAICompletionParams {
  const isGPT5 = model.startsWith('gpt-5') || model.startsWith('o3');

  if (isGPT5) {
    // GPT-5系: max_completion_tokens のみ
    // temperature は固定（調整不可）
    return {
      model,
      messages,
      max_completion_tokens: maxTokens,
      response_format: { type: 'json_object' },
    };
  } else {
    // GPT-4o系: max_tokens + temperature
    return {
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    };
  }
}
```

**実装パス:**
`/lib/openai.ts:143-167`

### 3.4 コスト追跡

**リアルタイムコスト計算:**

```typescript
interface CostEstimate {
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

function calculateCost(
  model: string,
  usage: { prompt_tokens: number; completion_tokens: number }
): CostEstimate {
  const pricing = {
    'gpt-5-nano': { input: 0.05, output: 0.4 },
    'gpt-5-mini': { input: 0.25, output: 2.0 },
    'gpt-5': { input: 1.25, output: 10.0 },
    'o3-mini': { input: 1.1, output: 4.4 },
  };

  const rates = pricing[model] || pricing['gpt-5-mini'];

  const inputCost = (usage.prompt_tokens / 1_000_000) * rates.input;
  const outputCost = (usage.completion_tokens / 1_000_000) * rates.output;

  return {
    inputTokens: usage.prompt_tokens,
    outputTokens: usage.completion_tokens,
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  };
}
```

**ログ出力:**

```typescript
logger.info('OpenAI API call completed', {
  model,
  usage: response.usage,
  cost: calculateCost(model, response.usage),
  duration: Date.now() - startTime,
});
```

### 3.5 エラーハンドリング

**Retry Logic（今後実装予定）:**

```typescript
async function callOpenAIWithRetry(
  params: OpenAICompletionParams,
  maxRetries = 3
): Promise<OpenAICompletionResponse> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await openai.chat.completions.create(params);
    } catch (error) {
      lastError = error;

      // Rate limit (429) の場合は exponential backoff
      if (error.status === 429) {
        const delay = Math.pow(2, attempt) * 1000;
        logger.warn(`Rate limited, retrying in ${delay}ms`, { attempt });
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // その他のエラーは即座に throw
      throw error;
    }
  }

  throw lastError;
}
```

---

## 4. ABC Notation処理

### 4.1 パーサー実装

**abcjs ライブラリの使用:**

```typescript
import abcjs from 'abcjs';
import type { TuneObject, RenderOptions } from '@/types/abcjs';

function parseABCNotation(abcString: string): TuneObject {
  try {
    const visualObjs = abcjs.renderAbc(
      'dummy-container',
      abcString,
      { add_classes: true }
    );

    if (!visualObjs || visualObjs.length === 0) {
      throw new Error('Failed to parse ABC notation');
    }

    return visualObjs[0];
  } catch (error) {
    logger.error('ABC parsing failed', { abcString, error });
    throw new Error(`Invalid ABC notation: ${error.message}`);
  }
}
```

### 4.2 バリデーション処理

**ABC Notation の検証ルール:**

```typescript
interface ABCValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function validateABCNotation(abc: string): ABCValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 必須ヘッダーフィールドの確認
  const requiredFields = ['X:', 'T:', 'M:', 'L:', 'K:'];
  for (const field of requiredFields) {
    if (!abc.includes(field)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // 小節線の確認
  if (!abc.includes('|')) {
    warnings.push('No bar lines found');
  }

  // 音符の存在確認
  const notePattern = /[A-Ga-g]/;
  if (!notePattern.test(abc)) {
    errors.push('No notes found in ABC notation');
  }

  // 括弧の対応確認
  const openBrackets = (abc.match(/\[/g) || []).length;
  const closeBrackets = (abc.match(/\]/g) || []).length;
  if (openBrackets !== closeBrackets) {
    errors.push('Mismatched brackets');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
```

### 4.3 品質基準

**音楽理論的な品質評価:**

```typescript
interface QualityMetrics {
  melodicRange: number;       // semitones
  harmonicComplexity: number; // 0-10 scale
  rhythmicDiversity: number;  // 0-10 scale
  formClarity: number;        // 0-10 scale
  pedagogicalValue: number;   // 0-10 scale
}

function evaluateQuality(abc: string, level: string): QualityMetrics {
  const tuneObject = parseABCNotation(abc);

  return {
    melodicRange: calculateMelodicRange(tuneObject),
    harmonicComplexity: analyzeHarmony(tuneObject),
    rhythmicDiversity: analyzeRhythm(tuneObject),
    formClarity: analyzeForm(tuneObject),
    pedagogicalValue: assessPedagogicalValue(tuneObject, level),
  };
}
```

---

## 5. MIDI変換フロー

### 5.1 ABC → MIDI 変換

**実装:**

```typescript
import abcjs from 'abcjs';

async function convertABCtoMIDI(abcNotation: string): Promise<string> {
  try {
    // ABC notation をパース
    const visualObjs = abcjs.renderAbc(
      'dummy-container',
      abcNotation,
      { add_classes: true }
    );

    if (!visualObjs || visualObjs.length === 0) {
      throw new Error('Failed to parse ABC notation');
    }

    // MIDI バイナリ生成
    const midiBuffer = abcjs.synth.getMidiFile(
      visualObjs[0],
      {
        qpm: 120,  // Quarter notes per minute
        program: 0, // Instrument (0 = Acoustic Grand Piano)
      }
    );

    // Base64 エンコード
    const midiBase64 = Buffer.from(midiBuffer).toString('base64');

    return midiBase64;
  } catch (error) {
    logger.error('MIDI conversion failed', { abcNotation, error });
    throw new Error(`MIDI conversion failed: ${error.message}`);
  }
}
```

**実装パス:**
`/lib/music/abc-to-midi.ts`

### 5.2 エラーハンドリング

**変換失敗時のフォールバック:**

```typescript
async function convertABCtoMIDIWithFallback(
  abcNotation: string
): Promise<{ success: boolean; midiData?: string; error?: string }> {
  try {
    const midiData = await convertABCtoMIDI(abcNotation);
    return { success: true, midiData };
  } catch (error) {
    logger.error('MIDI conversion failed, trying simplified version', error);

    try {
      // シンプル化された ABC notation で再試行
      const simplifiedABC = simplifyABCNotation(abcNotation);
      const midiData = await convertABCtoMIDI(simplifiedABC);

      logger.warn('MIDI conversion succeeded with simplified ABC');
      return { success: true, midiData };
    } catch (fallbackError) {
      return {
        success: false,
        error: 'MIDI conversion failed even with simplified ABC',
      };
    }
  }
}
```

### 5.3 MIDI再生設定

**abcjs オプション:**

```typescript
interface MIDIPlaybackOptions {
  qpm: number;           // Tempo (quarter notes per minute)
  program: number;       // MIDI instrument number
  transpose: number;     // Semitones to transpose
  channel: number;       // MIDI channel (0-15)
  velocity: number;      // Note velocity (0-127)
}

const defaultOptions: MIDIPlaybackOptions = {
  qpm: 120,
  program: 0,   // Acoustic Grand Piano
  transpose: 0,
  channel: 0,
  velocity: 90,
};

// 楽器別プリセット
const instrumentPresets: Record<string, Partial<MIDIPlaybackOptions>> = {
  piano: { program: 0, velocity: 90 },
  guitar: { program: 24, velocity: 80 },
  violin: { program: 40, velocity: 85 },
  flute: { program: 73, velocity: 70 },
  trumpet: { program: 56, velocity: 95 },
};
```

---

## 6. データベース設計

### 6.1 スキーマ定義

**materials テーブル:**

```typescript
// db/schema/materials.ts
import { pgTable, uuid, text, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const materials = pgTable('materials', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  description: text('description'),
  type: text('type').notNull(), // 'music', 'text', 'video'

  // ABC notation + MIDI data
  content: jsonb('content').notNull().$type<{
    abcNotation: string;
    midiData?: string;  // Base64 encoded
  }>(),

  // Metadata
  metadata: jsonb('metadata').$type<{
    level: string;
    instrument: string;
    genre: string;
    duration?: number;
    key?: string;
    timeSignature?: string;
    tempo?: number;
  }>(),

  // Educational content
  learningPoints: jsonb('learning_points').$type<string[]>(),
  practiceInstructions: jsonb('practice_instructions').$type<string[]>(),
  estimatedPracticeTime: integer('estimated_practice_time'), // minutes

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### 6.2 インデックス最適化

**推奨インデックス:**

```sql
-- ユーザー別教材取得の最適化
CREATE INDEX idx_materials_user_id ON materials(user_id);

-- レベル・楽器・ジャンル検索の最適化
CREATE INDEX idx_materials_metadata ON materials USING GIN (metadata jsonb_path_ops);

-- 作成日時でのソート最適化
CREATE INDEX idx_materials_created_at ON materials(created_at DESC);

-- 複合インデックス（頻繁な検索パターン）
CREATE INDEX idx_materials_user_type_created
ON materials(user_id, type, created_at DESC);
```

### 6.3 キャッシュ戦略

**Redis キャッシュ（今後実装予定）:**

```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function getCachedMaterial(
  cacheKey: string
): Promise<Material | null> {
  try {
    const cached = await redis.get<Material>(cacheKey);
    if (cached) {
      logger.debug('Cache hit', { cacheKey });
      return cached;
    }
    return null;
  } catch (error) {
    logger.warn('Cache read failed', error);
    return null;
  }
}

async function setCachedMaterial(
  cacheKey: string,
  material: Material,
  ttl = 3600 // 1 hour
): Promise<void> {
  try {
    await redis.setex(cacheKey, ttl, material);
    logger.debug('Cache set', { cacheKey, ttl });
  } catch (error) {
    logger.warn('Cache write failed', error);
  }
}
```

---

## 7. パフォーマンス最適化

### 7.1 レスポンスタイム目標

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| P50 (median) | < 3s | 2.1s | ✅ |
| P95 | < 5s | 4.3s | ✅ |
| P99 | < 8s | 6.8s | ✅ |
| Timeout | 30s | 0% | ✅ |

### 7.2 並列処理実装

**Promise.all for parallel operations:**

```typescript
async function generateMaterialWithOptimizations(
  params: GenerateMaterialParams
): Promise<Material> {
  const startTime = Date.now();

  // OpenAI 生成
  const generationResult = await generateMusicMaterial(params);

  // MIDI 変換と DB 保存を並列実行
  const [midiData, _] = await Promise.all([
    convertABCtoMIDI(generationResult.abcNotation),
    // 他の非同期処理があればここに追加
  ]);

  // DB 保存
  const material = await saveMaterial({
    ...generationResult,
    midiData,
  });

  logger.info('Material generation completed', {
    duration: Date.now() - startTime,
    materialId: material.id,
  });

  return material;
}
```

### 7.3 コスト最適化

**トークン数削減戦略:**

```typescript
function optimizePrompt(params: GenerateMaterialParams): string {
  // 冗長な表現を削除
  // システムプロンプトを圧縮
  // 必要最小限の情報のみ含める

  const compactPrompt = `
Generate ${params.level} ${params.instrument} piece in ${params.genre}.
Length: ${params.length}
${params.specificRequest || ''}
Return JSON: {title, abcNotation, learningPoints[], practiceInstructions[], estimatedPracticeTime}
`.trim();

  return compactPrompt;
}
```

**コスト見積もり:**

```typescript
// 平均的な生成リクエスト
const avgPromptTokens = 800;
const avgCompletionTokens = 1200;

// GPT-5-mini のコスト
const costPerRequest =
  (800 / 1_000_000 * 0.25) +  // Input: $0.0002
  (1200 / 1_000_000 * 2.0);    // Output: $0.0024
  // Total: $0.0026 per request

// 月間 10,000 リクエストの場合
const monthlyCost = 0.0026 * 10_000; // $26
```

---

## 8. セキュリティ考慮事項

### 8.1 APIキー管理

**環境変数:**

```bash
# .env.local
OPENAI_API_KEY="sk-..."
```

**実装:**

```typescript
// lib/openai.ts
let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    openaiClient = new OpenAI({
      apiKey,
      maxRetries: 3,
      timeout: 30000, // 30 seconds
    });
  }

  return openaiClient;
}
```

### 8.2 レート制限

**クライアント側レート制限（今後実装）:**

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
  analytics: true,
});

export async function checkRateLimit(userId: string): Promise<boolean> {
  const { success } = await ratelimit.limit(userId);
  return success;
}
```

### 8.3 入力サニタイゼーション

**XSS 防止:**

```typescript
import DOMPurify from 'isomorphic-dompurify';

function sanitizeUserInput(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // テキストのみ許可
    ALLOWED_ATTR: [],
  });
}

// API route での使用
const sanitizedRequest = sanitizeUserInput(body.specificRequest);
```

---

## 9. テスト戦略

### 9.1 ユニットテスト

**ABC Notation パーサーのテスト:**

```typescript
// tests/unit/lib/music/abc-parser.test.ts
import { describe, it, expect } from 'vitest';
import { parseABCNotation, validateABCNotation } from '@/lib/music/abc-parser';

describe('ABC Notation Parser', () => {
  it('should parse valid ABC notation', () => {
    const abc = `X:1\nT:Test\nM:4/4\nL:1/4\nK:C\nC D E F |`;
    const result = parseABCNotation(abc);

    expect(result).toBeDefined();
    expect(result.lines).toHaveLength(1);
  });

  it('should reject invalid ABC notation', () => {
    const invalidABC = `Invalid ABC`;

    expect(() => parseABCNotation(invalidABC)).toThrow('Invalid ABC notation');
  });

  it('should validate required header fields', () => {
    const incompleteABC = `X:1\nT:Test\nC D E F |`;
    const validation = validateABCNotation(incompleteABC);

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain('Missing required field: M:');
  });
});
```

### 9.2 統合テスト

**API エンドポイントのテスト:**

```typescript
// tests/integration/api/materials-generate.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { POST } from '@/app/api/materials/generate/route';
import { mockAuth } from '@/tests/helpers/mock-auth';

describe('POST /api/materials/generate', () => {
  beforeEach(() => {
    mockAuth({ userId: 'test-user-id', role: 'teacher' });
  });

  it('should generate beginner piano material', async () => {
    const request = new Request('http://localhost/api/materials/generate', {
      method: 'POST',
      body: JSON.stringify({
        level: 'beginner',
        instrument: 'piano',
        genre: 'classical',
        length: 'short',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.material).toBeDefined();
    expect(data.material.content.abcNotation).toContain('K:');
    expect(data.material.learningPoints).toBeInstanceOf(Array);
  });

  it('should handle validation errors', async () => {
    const request = new Request('http://localhost/api/materials/generate', {
      method: 'POST',
      body: JSON.stringify({
        level: 'invalid-level',
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });
});
```

### 9.3 E2Eテストシナリオ

**Playwright テスト:**

```typescript
// tests/e2e/material-generation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Material Generation Flow', () => {
  test('should generate and play ABC material', async ({ page }) => {
    await page.goto('/teacher/materials/new');

    // フォーム入力
    await page.selectOption('[name="level"]', 'beginner');
    await page.selectOption('[name="instrument"]', 'piano');
    await page.selectOption('[name="genre"]', 'classical');
    await page.selectOption('[name="length"]', 'short');

    // 生成実行
    await page.click('button:has-text("生成")');

    // 結果待機
    await page.waitForSelector('.abc-notation', { timeout: 10000 });

    // ABC notation が表示されていることを確認
    const abcContent = await page.textContent('.abc-notation');
    expect(abcContent).toContain('X:');
    expect(abcContent).toContain('K:');

    // MIDI 再生ボタンが有効
    await expect(page.locator('button:has-text("再生")')).toBeEnabled();
  });
});
```

---

## 10. デプロイメント

### 10.1 環境変数設定

**Vercel Environment Variables:**

```bash
# Production
OPENAI_API_KEY="sk-..."
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_APP_URL="https://mued.jp"

# Development
OPENAI_API_KEY="sk-..."
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 10.2 CI/CDパイプライン

**GitHub Actions ワークフロー:**

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: vercel/action@v2
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

### 10.3 モニタリング設定

**Vercel Analytics:**

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

**カスタムメトリクス:**

```typescript
import { track } from '@vercel/analytics';

async function generateMaterial(params: GenerateMaterialParams) {
  const startTime = Date.now();

  try {
    const result = await generateMusicMaterial(params);

    // 成功メトリクス
    track('material_generated', {
      level: params.level,
      instrument: params.instrument,
      duration: Date.now() - startTime,
    });

    return result;
  } catch (error) {
    // エラーメトリクス
    track('material_generation_failed', {
      level: params.level,
      error: error.message,
    });

    throw error;
  }
}
```

---

## 11. トラブルシューティング

### 11.1 よくある問題

#### 問題1: OpenAI API Timeout

**症状:**
```
Error: OpenAI API request timed out
```

**原因:**
- ネットワーク遅延
- OpenAI API の一時的な負荷

**解決策:**
```typescript
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 3,
  timeout: 30000, // 30秒に延長
});
```

#### 問題2: ABC Notation パースエラー

**症状:**
```
Error: Failed to parse ABC notation
```

**原因:**
- 生成された ABC notation に構文エラー
- abcjs ライブラリの制限

**解決策:**
1. バリデーション強化
2. フォールバック生成

```typescript
try {
  return parseABCNotation(abc);
} catch (error) {
  logger.warn('ABC parsing failed, requesting regeneration');
  const regenerated = await regenerateWithSimplification(params);
  return parseABCNotation(regenerated);
}
```

#### 問題3: MIDI 変換失敗

**症状:**
```
Error: MIDI conversion failed
```

**原因:**
- ABC notation に複雑な記譜
- abcjs の MIDI 生成制限

**解決策:**
```typescript
// シンプル化されたバージョンで再試行
function simplifyABCNotation(abc: string): string {
  return abc
    .replace(/\+[A-Za-z]+\+/g, '') // 装飾音削除
    .replace(/![A-Za-z]+!/g, '')   // 注釈削除
    .replace(/"[^"]*"/g, '');      // コードシンボル削除
}
```

### 11.2 デバッグ手順

**ステップ1: ログ確認**

```bash
# Vercel ログ
vercel logs --follow

# ローカルログ
tail -f .next/server.log
```

**ステップ2: OpenAI リクエスト検証**

```typescript
logger.debug('OpenAI request', {
  model,
  promptTokens: messages.reduce((sum, m) => sum + m.content.length, 0),
  timestamp: new Date().toISOString(),
});
```

**ステップ3: ABC notation 検証**

```typescript
const validation = validateABCNotation(generatedABC);
if (!validation.valid) {
  logger.error('Invalid ABC notation generated', {
    errors: validation.errors,
    warnings: validation.warnings,
    abc: generatedABC,
  });
}
```

---

## 12. 今後の拡張

### 12.1 予定機能

**Phase 3a（2025 Q1）:**
- [ ] PDF エクスポート機能
- [ ] MusicXML 形式対応
- [ ] アレンジ提案機能
- [ ] テンプレートベース生成

**Phase 3b（2025 Q2）:**
- [ ] コラボレーション機能
- [ ] 練習記録連携
- [ ] AI 演奏評価
- [ ] リアルタイムストリーミング

### 12.2 技術的改善

**優先度: 高**
- OpenAI retry logic with exponential backoff
- Redis キャッシュ実装
- Rate limiting (Upstash Ratelimit)

**優先度: 中**
- Worker threads for MIDI conversion
- GraphQL API 対応
- WebSocket リアルタイム更新

**優先度: 低**
- MIDI Type 0/1 選択機能
- 複数楽器アンサンブル
- VR/AR 統合

---

## 関連ドキュメント

- [OpenAI ABC Generation 機能ガイド](/docs/features/openai-abc-generation-guide.md)（ユーザー向け）
- [Type Safety Migration Guide](/docs/implementation/type-safety-migration-guide.md)
- [Phase 2 Completion Report](/docs/reports/phase2-completion-report.md)
- [MUED LMS Architecture](/docs/architecture/system-architecture.md)

---

**変更履歴:**

| 日付 | バージョン | 変更内容 |
|------|----------|---------|
| 2025-11-12 | 1.0 | 初版作成 |

---

*最終更新: 2025-11-12*
*ステータス: ✅ 公開済み*
