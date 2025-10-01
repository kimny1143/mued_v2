# MVP向けアーキテクチャ設計

## 📌 ドキュメント情報

- **作成日**: 2025年10月1日
- **更新日**: 2025年10月1日
- **バージョン**: 2.0（簡素化版）
- **目的**: POCから事業計画書要件を満たすMVPへの技術アーキテクチャ設計
- **対象読者**: 開発者、システムアーキテクト、技術意思決定者

---

## 🎯 エグゼクティブサマリー

本文書は、MUEDプラットフォームをPOC段階からMVPへ移行するための**簡素化されたアーキテクチャ設計**を定義します。OpenAI Function Callingを活用した自然言語処理とシンプルなREST APIによる実装で、**150時間（43日間）**での実装を目指します。

### 主要な技術選定

| 機能領域 | 採用技術 | 選定理由 |
|---------|----------|---------|
| 自然言語処理 | OpenAI Function Calling | 実装シンプル、低コスト |
| API層 | Next.js API Routes | 統一的な開発環境 |
| 認証 | Clerk | POCで実績あり |
| データベース | Neon PostgreSQL | Drizzle ORMで高速アクセス |
| 決済 | Stripe | サブスクリプション対応 |

### アーキテクチャ方針

- ✅ **モノリシック構成**で開始（マイクロサービス化は将来的に検討）
- ✅ **既存技術スタック**を最大限活用
- ✅ **OpenAI Function Calling**で自然言語→ツール実行を実現
- ✅ **シンプルなREST API**で複雑性を回避
- ❌ MCPは採用しない（Phase 2以降で検討可能）

---

## 🏗️ システム全体図

### MVPアーキテクチャ（簡素化版）

```mermaid
graph TB
    subgraph "Frontend Layer"
        WEB[Next.js App Router]
        NLI[自然言語入力]
        SUI[構造化UI]
    end

    subgraph "API Layer"
        APIGW[Next.js API Routes]
        AUTH[Clerk Middleware]
        RATE[Rate Limiting]

        subgraph "OpenAI Integration"
            INTENT[意図解析<br/>Function Calling]
            TOOLS[ツール定義]
        end
    end

    subgraph "Service Layer"
        SUB[Subscription Service]
        PAY[Payment Service]
        AI[AI Service]
        MATCH[Matching Service]
        RES[Reservation Service]
    end

    subgraph "Data Layer"
        DB[(Neon PostgreSQL)]
        CACHE[(Redis/Upstash)]
        QUEUE[Job Queue<br/>BullMQ]
    end

    subgraph "External Services"
        STRIPE[Stripe API]
        OPENAI[OpenAI API]
        EMAIL[Resend]
        GCAL[Google Calendar API]
    end

    NLI --> INTENT
    SUI --> APIGW
    WEB --> APIGW

    INTENT --> TOOLS
    TOOLS --> APIGW

    APIGW --> AUTH
    AUTH --> RATE

    RATE --> SUB
    RATE --> PAY
    RATE --> AI
    RATE --> MATCH
    RATE --> RES

    SUB --> DB
    PAY --> STRIPE
    AI --> OPENAI
    MATCH --> DB
    RES --> DB

    SUB --> CACHE
    AI --> CACHE

    PAY --> QUEUE
    AI --> QUEUE

    RES -.->|予約確定/キャンセル| GCAL
    MATCH -.->|空き枠同期| GCAL

    QUEUE --> EMAIL
```

---

## 🔄 自然言語処理フロー

### OpenAI Function Callingによる実装

```typescript
// /app/api/ai/intent/route.ts
import { openai } from '@/lib/openai';
import { NextRequest, NextResponse } from 'next/server';

// ツール定義（OpenAI Function Calling形式）
const tools = [
  {
    type: 'function' as const,
    function: {
      name: 'searchAvailableSlots',
      description: 'メンターの空き枠を検索',
      parameters: {
        type: 'object',
        properties: {
          mentorId: { type: 'string', description: 'メンターID（任意）' },
          date: { type: 'string', format: 'date', description: '日付' },
          subject: { type: 'string', description: '科目' }
        },
        required: ['date', 'subject']
      },
      strict: true // Structured Outputs有効化
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'createReservation',
      description: '予約を作成',
      parameters: {
        type: 'object',
        properties: {
          mentorId: { type: 'string' },
          slotId: { type: 'string' },
          message: { type: 'string' }
        },
        required: ['mentorId', 'slotId']
      },
      strict: true
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'generateStudyMaterial',
      description: 'AI教材を生成',
      parameters: {
        type: 'object',
        properties: {
          subject: { type: 'string' },
          topic: { type: 'string' },
          difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] }
        },
        required: ['subject', 'topic']
      },
      strict: true
    }
  }
];

export async function POST(req: NextRequest) {
  try {
    const { message, userId } = await req.json();

    // OpenAI Function Callingで意図解析
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // コスト効率の良いモデル
      messages: [
        {
          role: 'system',
          content: 'あなたは医学生のための学習支援アシスタントです。ユーザーの要求を理解し、適切なツールを呼び出してください。'
        },
        { role: 'user', content: message }
      ],
      tools,
      tool_choice: 'auto',
      temperature: 0.3 // 一貫性のある応答のため低めに設定
    });

    const responseMessage = completion.choices[0].message;

    // ツール呼び出しがある場合
    if (responseMessage.tool_calls) {
      const results = [];

      // 並列実行可能なツールは同時に処理
      const toolPromises = responseMessage.tool_calls.map(async (toolCall) => {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        // 各ツールに対応するAPIエンドポイントを呼び出し
        const apiResponse = await fetch(`/api/${functionName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId
          },
          body: JSON.stringify(args)
        });

        return {
          tool_call_id: toolCall.id,
          role: 'tool' as const,
          content: await apiResponse.text()
        };
      });

      const toolResults = await Promise.all(toolPromises);

      // ツール実行結果を含めて最終応答を生成
      const finalCompletion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          ...completion.choices[0].message,
          ...toolResults
        ],
        temperature: 0.7
      });

      return NextResponse.json({
        response: finalCompletion.choices[0].message.content,
        toolsUsed: responseMessage.tool_calls.map(tc => tc.function.name)
      });
    }

    // 直接応答の場合
    return NextResponse.json({
      response: responseMessage.content
    });

  } catch (error) {
    console.error('Intent processing error:', error);
    return NextResponse.json(
      { error: 'Intent processing failed' },
      { status: 500 }
    );
  }
}
```

---

## 💾 データベーススキーマ

### 主要エンティティ（Drizzle Schema）

```typescript
// db/schema.ts
import { pgTable, uuid, text, timestamp, integer, boolean, jsonb, decimal } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ユーザー情報（Clerk連携）
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name"),
  role: text("role").notNull().default("student"), // student, mentor, admin
  subscriptionTier: text("subscription_tier").notNull().default("freemium"),
  profileImageUrl: text("profile_image_url"),
  bio: text("bio"),
  skills: jsonb("skills").$type<string[]>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// サブスクリプション
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  stripeCustomerId: text("stripe_customer_id").notNull().unique(),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  stripePriceId: text("stripe_price_id"),

  tier: text("tier").notNull(), // FREEMIUM, STARTER, BASIC, PREMIUM
  status: text("status").notNull().default("active"), // active, canceled, past_due

  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),

  // 使用量追跡
  aiMaterialsUsed: integer("ai_materials_used").notNull().default(0),
  reservationsUsed: integer("reservations_used").notNull().default(0),

  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// メンター情報
export const mentors = pgTable("mentors", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id).unique(),

  // プロフィール
  specialties: jsonb("specialties").$type<string[]>(),
  qualifications: jsonb("qualifications").$type<string[]>(),
  university: text("university"),
  graduationYear: integer("graduation_year"),

  // パフォーマンス
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  totalSessions: integer("total_sessions").notNull().default(0),

  // 収益シェア
  revenueShareRate: decimal("revenue_share_rate", { precision: 3, scale: 2 }).default("0.70"),
  totalEarnings: decimal("total_earnings", { precision: 10, scale: 2 }).default("0"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// レッスンスロット（メンターの予約可能時間）
export const lessonSlots = pgTable("lesson_slots", {
  id: uuid("id").primaryKey().defaultRandom(),
  mentorId: uuid("mentor_id").notNull().references(() => users.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  maxCapacity: integer("max_capacity").notNull().default(1),
  currentCapacity: integer("current_capacity").notNull().default(0),
  status: text("status").notNull().default("available"), // available, booked, cancelled
  recurringId: uuid("recurring_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// 予約
export const reservations = pgTable("reservations", {
  id: uuid("id").primaryKey().defaultRandom(),
  slotId: uuid("slot_id").notNull().references(() => lessonSlots.id),
  studentId: uuid("student_id").notNull().references(() => users.id),
  mentorId: uuid("mentor_id").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"), // pending, approved, paid, completed, cancelled
  paymentStatus: text("payment_status").notNull().default("pending"),
  stripeSessionId: text("stripe_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  cancelReason: text("cancel_reason"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// AI生成教材
export const aiGeneratedMaterials = pgTable("ai_generated_materials", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),

  subject: text("subject").notNull(),
  topic: text("topic").notNull(),
  difficulty: text("difficulty").notNull(), // beginner, intermediate, advanced

  content: jsonb("content").notNull(), // 生成されたコンテンツ
  metadata: jsonb("metadata"), // メタデータ（トークン数など）

  // コスト追跡
  tokensUsed: integer("tokens_used").notNull().default(0),
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 4 }).default("0"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// メッセージ
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  reservationId: uuid("reservation_id").references(() => reservations.id),
  senderId: uuid("sender_id").notNull().references(() => users.id),
  receiverId: uuid("receiver_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  attachments: jsonb("attachments").$type<{ url: string; type: string; name: string }[]>(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// リレーション定義
export const usersRelations = relations(users, ({ many }) => ({
  mentorSlots: many(lessonSlots),
  studentReservations: many(reservations),
  sentMessages: many(messages),
  aiMaterials: many(aiGeneratedMaterials),
  subscriptions: many(subscriptions),
}));

export const reservationsRelations = relations(reservations, ({ one, many }) => ({
  slot: one(lessonSlots, {
    fields: [reservations.slotId],
    references: [lessonSlots.id],
  }),
  student: one(users, {
    fields: [reservations.studentId],
    references: [users.id],
  }),
  mentor: one(users, {
    fields: [reservations.mentorId],
    references: [users.id],
  }),
  messages: many(messages),
}));
```

---

## 🔌 API設計

### REST APIエンドポイント構成

```typescript
// API Routes構造
app/api/
├── auth/
│   └── webhook/          # Clerk webhook
├── stripe/
│   └── webhook/          # Stripe webhook
├── ai/
│   ├── intent/          # 自然言語意図解析
│   └── generate/        # 教材生成
├── subscriptions/
│   ├── create/          # サブスクリプション作成
│   ├── update/          # プラン変更
│   └── cancel/          # 解約
├── reservations/
│   ├── search/          # 空き枠検索
│   ├── create/          # 予約作成
│   └── [id]/           # 予約詳細・更新・削除
├── mentors/
│   ├── search/          # メンター検索
│   ├── [id]/           # メンター詳細
│   └── slots/          # 空き枠管理
└── payments/
    ├── create-intent/   # 支払い作成
    └── confirm/         # 支払い確認
```

### APIレスポンス標準化

```typescript
// lib/api-response.ts
export class ApiResponse {
  static success<T>(data: T, meta?: any) {
    return NextResponse.json({
      success: true,
      data,
      meta,
      timestamp: new Date().toISOString()
    });
  }

  static error(message: string, code?: string, status = 400) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message,
          code: code || 'UNKNOWN_ERROR'
        },
        timestamp: new Date().toISOString()
      },
      { status }
    );
  }
}

// 使用例
export async function GET(req: NextRequest) {
  try {
    const data = await fetchData();
    return ApiResponse.success(data);
  } catch (error) {
    return ApiResponse.error('Failed to fetch data', 'FETCH_ERROR', 500);
  }
}
```

---

## 🔐 セキュリティ設計

### 認証・認可

```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/(?!auth|stripe/webhook)(.*)'
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
```

### Rate Limiting

```typescript
// lib/rate-limiter.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const rateLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'), // 10リクエスト/10秒
  analytics: true,
  prefix: '@upstash/ratelimit',
});

// API Routeでの使用
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
  const { success, limit, reset, remaining } = await rateLimiter.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': new Date(reset).toISOString(),
        }
      }
    );
  }

  // 通常の処理
}
```

### 入力検証

```typescript
// lib/validation.ts
import { z } from 'zod';

// スキーマ定義
export const CreateReservationSchema = z.object({
  mentorId: z.string().cuid(),
  slotId: z.string().cuid(),
  message: z.string().max(500).optional()
});

// バリデーションミドルウェア
export function validateRequest<T>(schema: z.ZodSchema<T>) {
  return async (req: NextRequest) => {
    try {
      const body = await req.json();
      const validated = schema.parse(body);
      return { success: true, data: validated };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        };
      }
      return { success: false, error: 'Invalid request' };
    }
  };
}
```

---

## ⚡ パフォーマンス最適化

### キャッシュ戦略

```typescript
// lib/cache.ts
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export class Cache {
  static async get<T>(key: string): Promise<T | null> {
    return await redis.get(key);
  }

  static async set(key: string, value: any, ttl?: number) {
    if (ttl) {
      await redis.setex(key, ttl, value);
    } else {
      await redis.set(key, value);
    }
  }

  static async invalidate(pattern: string) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

// 使用例：メンター情報のキャッシュ
export async function getMentorWithCache(mentorId: string) {
  const cacheKey = `mentor:${mentorId}`;

  // キャッシュチェック
  const cached = await Cache.get(cacheKey);
  if (cached) return cached;

  // DBから取得（Drizzle）
  const [mentor] = await db
    .select()
    .from(mentors)
    .where(eq(mentors.id, mentorId))
    .limit(1);

  // キャッシュに保存（5分間）
  await Cache.set(cacheKey, mentor, 300);

  return mentor;
}
```

### OpenAI APIコスト最適化

```typescript
// lib/openai-optimizer.ts
export class OpenAIOptimizer {
  // トークン数の事前推定
  static estimateTokens(text: string): number {
    // 簡易的な推定（日本語は1文字≒1トークン）
    return Math.ceil(text.length * 1.2);
  }

  // プロンプトの最適化
  static optimizePrompt(prompt: string, maxTokens = 1000): string {
    const estimated = this.estimateTokens(prompt);
    if (estimated > maxTokens) {
      // 長すぎる場合は要約を要求
      return `以下の内容を${maxTokens}トークン以内で要約してください：\n${prompt}`;
    }
    return prompt;
  }

  // モデル選択の最適化
  static selectModel(complexity: 'low' | 'medium' | 'high') {
    switch (complexity) {
      case 'low':
        return 'gpt-3.5-turbo'; // 最も安価
      case 'medium':
        return 'gpt-4o-mini'; // バランス型
      case 'high':
        return 'gpt-4o'; // 高精度
    }
  }

  // レスポンスキャッシュ
  static async getCachedOrGenerate(
    key: string,
    generator: () => Promise<string>,
    ttl = 3600 // 1時間
  ): Promise<string> {
    const cached = await Cache.get(key);
    if (cached) return cached as string;

    const result = await generator();
    await Cache.set(key, result, ttl);
    return result;
  }
}
```

---

## 🚀 デプロイメント構成

### 環境変数

```env
# .env.local
# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx

# Database
DATABASE_URL=postgresql://user:password@host/db

# Redis Cache
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# OpenAI
OPENAI_API_KEY=sk-xxx
OPENAI_ORGANIZATION=org-xxx

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Email
RESEND_API_KEY=re_xxx
```

### Vercelデプロイ設定

```json
// vercel.json
{
  "functions": {
    "app/api/ai/generate/route.ts": {
      "maxDuration": 30
    },
    "app/api/ai/intent/route.ts": {
      "maxDuration": 25
    }
  },
  "env": {
    "NODE_ENV": "production"
  }
}
```

---

## 📅 Googleカレンダー統合

### 統合方針

**カレンダーUIを自前実装せず、Googleカレンダーに委譲**することで開発コストを削減し、ユーザーは使い慣れたインターフェースで予約を管理できます。

### 統合ポイント

```typescript
// services/google-calendar.service.ts
import { google } from 'googleapis';

export class GoogleCalendarService {
  private calendar = google.calendar('v3');

  // 予約確定時: カレンダーイベント作成
  async createReservationEvent(reservation: Reservation) {
    const event = {
      summary: `レッスン: ${reservation.subject}`,
      description: `メンター: ${reservation.mentor.name}\n${reservation.notes || ''}`,
      start: {
        dateTime: reservation.startTime.toISOString(),
        timeZone: 'Asia/Tokyo',
      },
      end: {
        dateTime: reservation.endTime.toISOString(),
        timeZone: 'Asia/Tokyo',
      },
      attendees: [
        { email: reservation.student.email },
        { email: reservation.mentor.email },
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1日前
          { method: 'popup', minutes: 30 },      // 30分前
        ],
      },
    };

    return await this.calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      sendUpdates: 'all', // 全参加者に通知
    });
  }

  // キャンセル時: イベント削除
  async cancelReservationEvent(googleEventId: string) {
    return await this.calendar.events.delete({
      calendarId: 'primary',
      eventId: googleEventId,
      sendUpdates: 'all',
    });
  }

  // メンター空き枠同期（Phase 2）
  async syncMentorAvailability(mentorCalendarId: string, days = 30) {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);

    const response = await this.calendar.events.list({
      calendarId: mentorCalendarId,
      timeMin: now.toISOString(),
      timeMax: future.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    // ビジー時間を除外して空き枠を生成
    return this.generateAvailableSlots(response.data.items);
  }
}
```

### 実装フェーズ

#### Phase 1（MVP）: 基本的なイベント作成
- ✅ 予約確定時に自動でGoogleカレンダーイベント作成
- ✅ メンター・学生双方にリマインダー送信
- ✅ キャンセル時のイベント削除

#### Phase 2（成長期）: 双方向同期
- ⚠️ メンターのGoogleカレンダーから空き枠を自動検出
- ⚠️ 外部カレンダーアプリとの同期
- ⚠️ 複数カレンダーの統合管理

### データベーススキーマ追加

```typescript
// db/schema.ts に追加

// 予約テーブルにGoogleカレンダーフィールド追加
export const reservations = pgTable("reservations", {
  // ... 既存フィールド

  // Google Calendar統合
  googleEventId: text("google_event_id"),     // GoogleカレンダーのイベントID
  googleEventLink: text("google_event_link"), // カレンダーイベントへのリンク
});

// メンターテーブルにGoogleカレンダーフィールド追加
export const mentors = pgTable("mentors", {
  // ... 既存フィールド

  // カレンダー同期設定
  googleCalendarId: text("google_calendar_id"),          // メンターのGoogleカレンダーID
  calendarSyncEnabled: boolean("calendar_sync_enabled").default(false),
  lastSyncedAt: timestamp("last_synced_at"),
});
```

### メリット

1. **開発コスト削減**
   - カレンダーUIの実装不要（推定20-30時間の削減）
   - リマインダー機能も自動

2. **ユーザー体験向上**
   - 使い慣れたGoogleカレンダーで管理
   - 他のスケジュールと統合表示
   - スマホ・PCで自動同期

3. **保守性向上**
   - Googleがカレンダー機能を保守
   - セキュリティアップデートも自動

---

## 📈 将来の拡張性

### Phase 2以降の検討事項

1. **マイクロサービス化**
   - ユーザー数5,000超えた段階で検討
   - AI機能から段階的に分離
   - MCPの採用も選択肢として検討可能

2. **B2B API公開**
   - 医療機関向けAPI提供
   - 使用量ベースの課金モデル
   - APIゲートウェイの導入

3. **グローバル展開**
   - 多言語対応
   - CDN活用
   - リージョン別デプロイ

4. **高度なAI機能**
   - RAGシステムの構築
   - ベクトルDB（Pinecone等）導入
   - カスタムLLMファインチューニング

5. **カレンダー統合拡張**
   - OutlookカレンダーAPI対応
   - AppleカレンダーAPI対応
   - CalDAVプロトコル対応

---

## 📊 成功指標とモニタリング

### KPI設定

```typescript
// lib/metrics.ts
export const trackMetric = async (metric: {
  name: string;
  value: number;
  tags?: Record<string, string>;
}) => {
  // Vercel Analyticsへの送信
  if (typeof window !== 'undefined' && window.va) {
    window.va('event', {
      name: metric.name,
      value: metric.value,
      ...metric.tags
    });
  }

  // サーバーサイドではログ出力
  if (typeof window === 'undefined') {
    console.log('[METRIC]', JSON.stringify(metric));
  }
};

// 使用例
await trackMetric({
  name: 'reservation.created',
  value: 1,
  tags: { tier: 'premium' }
});
```

### 主要メトリクス

- **ビジネスメトリクス**
  - MRR（月次経常収益）
  - ユーザー獲得コスト（CAC）
  - 顧客生涯価値（LTV）
  - チャーンレート

- **技術メトリクス**
  - API応答時間（p50, p95, p99）
  - エラー率
  - OpenAI APIコスト
  - キャッシュヒット率

---

## 🔚 まとめ

本アーキテクチャは、**シンプルさと実装スピード**を重視し、MVPを**150時間（43日間）**で完成させることを目標としています。OpenAI Function CallingとREST APIの組み合わせにより、自然言語処理を含む高度な機能を低コストで実現し、将来的な拡張性も確保しています。

### 次のステップ

1. ✅ Stripe製品・価格設定の実装
2. ✅ OpenAI Function Calling統合の実装
3. ✅ 基本的なCRUD APIの構築
4. ✅ サブスクリプション管理機能の実装
5. ✅ AI教材生成機能の実装