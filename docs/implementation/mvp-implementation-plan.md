# MVP詳細実装計画

## 📌 ドキュメント情報

- **作成日**: 2025年10月1日
- **更新日**: 2025年10月1日
- **バージョン**: 3.0（OpenAI統合版）
- **目的**: MVPに向けた具体的な実装タスクと技術詳細の提供
- **対象読者**: 開発者、AIエージェント（Claude Code）

---

## ⚡ 開発実績と予測

### 開発実績
- POC完成: 2日間（総稼働7時間）
- 1日の平均稼働時間: 3.5時間

### MVP達成予測（実績ベース）
- 総工数: **150時間**（バッファ20%込み）
- 実稼働日数: **43日間**
- カレンダー期間: 約9週間
- MVP達成目標日: **2025年12月5日**

---

## 🎯 技術スタック（確定版）

### コア技術
- **Frontend**: Next.js 15 (App Router)
- **認証**: Clerk
- **データベース**: Neon PostgreSQL + Drizzle ORM
- **決済**: Stripe
- **AI**: OpenAI API (Function Calling)
- **キャッシュ**: Upstash Redis
- **メール**: Resend

### 開発ツール
- **パッケージ管理**: pnpm
- **テスト**: Jest + Playwright
- **デプロイ**: Vercel
- **モニタリング**: Vercel Analytics

---

## 📊 実装フェーズ（OpenAI統合版）

### Phase 1: 基盤構築（実働10日・35時間）

#### Day 1-2: プロジェクト初期設定（7時間）

##### タスク1: Next.js環境構築（2時間）
```bash
# プロジェクト作成
pnpm create next-app@latest mued-mvp --typescript --tailwind --app --src-dir
cd mued-mvp

# 依存関係インストール
npm install @clerk/nextjs drizzle-orm @neondatabase/serverless stripe openai resend
npm install -D drizzle-kit @types/node tsx
```

##### タスク2: 環境変数設定（1.5時間）
```typescript
// lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  // Clerk
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string(),
  CLERK_SECRET_KEY: z.string(),
  CLERK_WEBHOOK_SECRET: z.string().optional(),

  // Database
  DATABASE_URL: z.string().url(),

  // OpenAI
  OPENAI_API_KEY: z.string(),
  OPENAI_ORG_ID: z.string().optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string(),

  // Redis
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string(),

  // Resend
  RESEND_API_KEY: z.string(),
});

export const env = envSchema.parse(process.env);
```

##### タスク3: データベース初期設定（3.5時間）
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

// 他のテーブル定義...
// 詳細は db/schema.ts を参照
```

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

```bash
# Drizzleセットアップ
npm run db:push      # スキーマをDBに適用
npm run db:generate  # マイグレーションファイル生成
```

#### Day 3-4: OpenAI統合基盤（7時間）

##### タスク4: OpenAIクライアント設定（2時間）
```typescript
// lib/openai.ts
import OpenAI from 'openai';
import { env } from './env';

export const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  organization: env.OPENAI_ORG_ID,
});

// コスト追跡用のラッパー
export class OpenAIService {
  private static readonly MODEL_COSTS = {
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  };

  static async createCompletion(
    params: OpenAI.Chat.ChatCompletionCreateParams
  ) {
    const startTime = Date.now();

    try {
      const response = await openai.chat.completions.create(params);

      // コスト計算
      const usage = response.usage;
      if (usage) {
        const modelCost = this.MODEL_COSTS[params.model] || { input: 0, output: 0 };
        const cost = (usage.prompt_tokens * modelCost.input / 1000) +
                    (usage.completion_tokens * modelCost.output / 1000);

        // メトリクス記録
        await this.recordMetrics({
          model: params.model,
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
          estimatedCost: cost,
          duration: Date.now() - startTime,
        });
      }

      return response;
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw error;
    }
  }

  private static async recordMetrics(metrics: any) {
    // Vercel KVまたはデータベースに記録
    console.log('[OpenAI Metrics]', metrics);
  }
}
```

##### タスク5: Function Callingツール定義（5時間）
```typescript
// lib/ai/tools.ts
import { z } from 'zod';

// ツールのスキーマ定義
export const toolSchemas = {
  searchAvailableSlots: z.object({
    mentorId: z.string().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    subject: z.string(),
    timePreference: z.enum(['morning', 'afternoon', 'evening']).optional(),
  }),

  createReservation: z.object({
    mentorId: z.string().cuid(),
    slotId: z.string().cuid(),
    message: z.string().max(500).optional(),
  }),

  generateStudyMaterial: z.object({
    subject: z.string(),
    topic: z.string(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    format: z.enum(['quiz', 'summary', 'flashcards', 'practice']).optional(),
  }),

  getSubscriptionStatus: z.object({
    userId: z.string().cuid(),
  }),

  upgradeSubscription: z.object({
    userId: z.string().cuid(),
    tier: z.enum(['STARTER', 'BASIC', 'PREMIUM']),
  }),
};

// OpenAI Function Calling用のツール定義
export const tools = [
  {
    type: 'function' as const,
    function: {
      name: 'searchAvailableSlots',
      description: 'メンターの空き枠を検索します。科目、日付、時間帯を指定できます。',
      parameters: {
        type: 'object',
        properties: {
          mentorId: {
            type: 'string',
            description: 'メンターID（任意）'
          },
          date: {
            type: 'string',
            format: 'date',
            description: 'YYYY-MM-DD形式の日付'
          },
          subject: {
            type: 'string',
            description: '科目名（例：内科、外科、小児科）'
          },
          timePreference: {
            type: 'string',
            enum: ['morning', 'afternoon', 'evening'],
            description: '時間帯の希望（任意）'
          }
        },
        required: ['date', 'subject']
      },
      strict: true
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'createReservation',
      description: '指定されたメンターとスロットで予約を作成します。',
      parameters: {
        type: 'object',
        properties: {
          mentorId: { type: 'string' },
          slotId: { type: 'string' },
          message: {
            type: 'string',
            description: 'メンターへのメッセージ（任意）'
          }
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
      description: 'AI教材を生成します。科目、トピック、難易度を指定できます。',
      parameters: {
        type: 'object',
        properties: {
          subject: { type: 'string' },
          topic: { type: 'string' },
          difficulty: {
            type: 'string',
            enum: ['beginner', 'intermediate', 'advanced']
          },
          format: {
            type: 'string',
            enum: ['quiz', 'summary', 'flashcards', 'practice'],
            description: '教材の形式（任意）'
          }
        },
        required: ['subject', 'topic', 'difficulty']
      },
      strict: true
    }
  }
];
```

#### Day 5-6: 意図解析エンドポイント実装（7時間）

##### タスク6: 意図解析API実装（7時間）
```typescript
// app/api/ai/intent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { OpenAIService } from '@/lib/openai';
import { tools, toolSchemas } from '@/lib/ai/tools';
import { z } from 'zod';

const requestSchema = z.object({
  message: z.string().min(1).max(1000),
});

export async function POST(req: NextRequest) {
  try {
    // 認証チェック
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // リクエストバリデーション
    const body = await req.json();
    const { message } = requestSchema.parse(body);

    // OpenAI Function Callingで意図解析
    const completion = await OpenAIService.createCompletion({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `あなたは医学生のための学習支援アシスタントです。
ユーザーの要求を理解し、適切なツールを呼び出してください。
利用可能な機能：
- レッスン予約の検索と作成
- AI教材の生成
- サブスクリプション管理

ユーザーが曖昧な要求をした場合は、明確化のための質問をしてください。`
        },
        {
          role: 'user',
          content: message
        }
      ],
      tools,
      tool_choice: 'auto',
      temperature: 0.3,
      max_tokens: 1000,
    });

    const responseMessage = completion.choices[0].message;

    // ツール呼び出しがある場合
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      const toolResults = await executeTools(
        responseMessage.tool_calls,
        userId
      );

      // ツール実行結果を含めて最終応答を生成
      const finalCompletion = await OpenAIService.createCompletion({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'ツールの実行結果を基に、ユーザーに分かりやすく応答してください。'
          },
          responseMessage,
          ...toolResults
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      return NextResponse.json({
        success: true,
        response: finalCompletion.choices[0].message.content,
        toolsUsed: responseMessage.tool_calls.map(tc => tc.function.name),
      });
    }

    // 直接応答の場合
    return NextResponse.json({
      success: true,
      response: responseMessage.content,
    });

  } catch (error) {
    console.error('Intent processing error:', error);

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

// ツール実行関数
async function executeTools(
  toolCalls: any[],
  userId: string
) {
  const results = await Promise.all(
    toolCalls.map(async (toolCall) => {
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);

      try {
        // スキーマバリデーション
        const schema = toolSchemas[functionName];
        if (schema) {
          schema.parse(args);
        }

        // 各ツールに対応するAPIエンドポイントを呼び出し
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL}/api/${functionName}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': userId,
            },
            body: JSON.stringify(args),
          }
        );

        const result = await response.json();

        return {
          tool_call_id: toolCall.id,
          role: 'tool' as const,
          content: JSON.stringify(result),
        };
      } catch (error) {
        return {
          tool_call_id: toolCall.id,
          role: 'tool' as const,
          content: JSON.stringify({
            error: `Tool execution failed: ${error.message}`
          }),
        };
      }
    })
  );

  return results;
}
```

### Phase 2: サブスクリプション機能（実働8日・28時間）

#### Day 7-8: Stripe統合（7時間）

##### タスク7: Stripe製品設定（3.5時間）
```typescript
// scripts/setup-stripe.ts
import Stripe from 'stripe';
import { env } from '@/lib/env';

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
});

async function setupStripeProducts() {
  const plans = [
    {
      name: 'MUED Freemium',
      id: 'freemium',
      price: 0,
      features: {
        aiMaterials: 3,
        monthlyReservations: 1,
        adsDisplay: true,
      }
    },
    {
      name: 'MUED Starter',
      id: 'starter',
      price: 500,
      features: {
        aiMaterials: 3,
        monthlyReservations: 1,
        adsDisplay: true,
      }
    },
    {
      name: 'MUED Basic',
      id: 'basic',
      price: 2480,
      features: {
        aiMaterials: 'unlimited',
        monthlyReservations: 5,
        chatSupport: true,
      }
    },
    {
      name: 'MUED Premium',
      id: 'premium',
      price: 5980,
      features: {
        aiMaterials: 'unlimited',
        monthlyReservations: 'unlimited',
        priorityMatching: true,
        pdfImport: true,
      }
    }
  ];

  for (const plan of plans) {
    // 製品作成
    const product = await stripe.products.create({
      name: plan.name,
      metadata: {
        planId: plan.id,
        features: JSON.stringify(plan.features),
      }
    });

    // 価格作成（月額）
    if (plan.price > 0) {
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.price,
        currency: 'jpy',
        recurring: {
          interval: 'month',
        },
        metadata: {
          planId: plan.id,
        }
      });

      console.log(`Created: ${plan.name} - Product: ${product.id}, Price: ${price.id}`);
    }
  }
}

setupStripeProducts().catch(console.error);
```

##### タスク8: サブスクリプションサービス（3.5時間）
```typescript
// lib/services/subscription.service.ts
import { stripe } from '@/lib/stripe';
import { db } from '@/db';
import { users, subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export class SubscriptionService {
  static async createCheckoutSession(
    userId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string
  ) {
    // ユーザーとサブスクリプション情報を取得
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) throw new Error('User not found');

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    let customerId = subscription?.stripeCustomerId;

    // Stripe顧客が存在しない場合は作成
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
        }
      });
      customerId = customer.id;

      // DBに保存
      if (subscription) {
        await db
          .update(subscriptions)
          .set({ stripeCustomerId: customerId })
          .where(eq(subscriptions.userId, userId));
      } else {
        await db.insert(subscriptions).values({
          userId: user.id,
          stripeCustomerId: customerId,
          tier: 'freemium',
          status: 'active',
        });
      }
    }

    // チェックアウトセッション作成
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        }
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: user.id,
      }
    });

    return session;
  }

  static async handleWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.handleCheckoutComplete(session);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionCancel(subscription);
        break;
      }
    }
  }

  private static async handleCheckoutComplete(
    session: Stripe.Checkout.Session
  ) {
    const userId = session.metadata?.userId;
    if (!userId) return;

    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    );

    const tier = this.getTierFromPriceId(
      subscription.items.data[0].price.id
    );

    await db
      .update(subscriptions)
      .set({
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0].price.id,
        tier,
        status: 'active',
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      })
      .where(eq(subscriptions.userId, userId));
  }

  private static getTierFromPriceId(priceId: string): string {
    // 価格IDからティアを判定するロジック
    const priceToTier = {
      'price_starter': 'STARTER',
      'price_basic': 'BASIC',
      'price_premium': 'PREMIUM',
    };
    return priceToTier[priceId] || 'FREEMIUM';
  }
}
```

#### Day 9-10: 使用量追跡（7時間）

##### タスク9: 使用量制限ミドルウェア（7時間）
```typescript
// lib/middleware/usage-limiter.ts
import { db } from '@/db';
import { subscriptions, aiGeneratedMaterials, reservations } from '@/db/schema';
import { eq, gte, count } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

const TIER_LIMITS = {
  freemium: {
    aiMaterials: 3,
    reservations: 1,
  },
  starter: {
    aiMaterials: 3,
    reservations: 1,
  },
  basic: {
    aiMaterials: -1, // unlimited
    reservations: 5,
  },
  premium: {
    aiMaterials: -1,
    reservations: -1,
  }
};

export async function checkUsageLimit(
  userId: string,
  feature: 'aiMaterials' | 'reservations'
) {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (!subscription) {
    throw new Error('Subscription not found');
  }

  const limits = TIER_LIMITS[subscription.tier];
  const limit = limits[feature];

  // 無制限の場合
  if (limit === -1) return { allowed: true };

  // 現在の月の使用量を取得
  const currentMonth = new Date();
  currentMonth.setDate(1);
  currentMonth.setHours(0, 0, 0, 0);

  let usage = 0;

  if (feature === 'aiMaterials') {
    const [result] = await db
      .select({ count: count() })
      .from(aiGeneratedMaterials)
      .where(
        eq(aiGeneratedMaterials.userId, userId),
        gte(aiGeneratedMaterials.createdAt, currentMonth)
      );
    usage = result?.count || 0;
  } else if (feature === 'reservations') {
    const [result] = await db
      .select({ count: count() })
      .from(reservations)
      .where(
        eq(reservations.studentId, userId),
        gte(reservations.createdAt, currentMonth)
      );
    usage = result?.count || 0;
  }

  return {
    allowed: usage < limit,
    current: usage,
    limit,
    remaining: Math.max(0, limit - usage)
  };
}

// API Routeでの使用例
export async function withUsageLimit(
  req: NextRequest,
  feature: 'aiMaterials' | 'reservations',
  handler: () => Promise<NextResponse>
) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const usage = await checkUsageLimit(userId, feature);

  if (!usage.allowed) {
    return NextResponse.json(
      {
        error: 'Usage limit exceeded',
        limit: usage.limit,
        current: usage.current,
        upgradeUrl: '/pricing'
      },
      { status: 429 }
    );
  }

  return handler();
}
```

#### Day 11-12: Googleカレンダー統合（7時間）

##### タスク10: Google Calendar API設定（3.5時間）
```typescript
// lib/google-calendar.ts
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export class GoogleCalendarService {
  private oauth2Client: OAuth2Client;
  private calendar;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  // OAuth認証URLの生成
  getAuthUrl(userId: string) {
    const scopes = [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: userId, // ユーザーIDを保持
    });
  }

  // トークンの保存
  async setCredentials(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    return tokens;
  }
}
```

**環境変数追加**:
```env
# .env.local
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

##### タスク11: 予約確定時のイベント作成（3.5時間）
```typescript
// services/reservation.service.ts
import { GoogleCalendarService } from '@/lib/google-calendar';

export class ReservationService {
  static async confirmReservation(reservationId: string) {
    // 1. DB更新
    const [reservation] = await db
      .update(reservations)
      .set({ status: 'confirmed' })
      .where(eq(reservations.id, reservationId))
      .returning();

    // 関連データを取得
    const [student] = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, reservation.studentId))
      .limit(1);

    const [mentor] = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, reservation.mentorId))
      .limit(1);

    const [slot] = await db
      .select()
      .from(lessonSlots)
      .where(eq(lessonSlots.id, reservation.slotId))
      .limit(1);

    // 2. Googleカレンダーイベント作成
    if (reservation.mentor.googleAccessToken) {
      const calendarService = new GoogleCalendarService();
      calendarService.setCredentials(reservation.mentor.googleAccessToken);

      const event = await calendarService.createEvent({
        summary: `MUED レッスン: ${reservation.subject}`,
        description: `
学生: ${reservation.student.name}
メンター: ${reservation.mentor.name}
${reservation.notes || ''}

予約ID: ${reservation.id}
        `.trim(),
        start: {
          dateTime: reservation.slot.startTime.toISOString(),
          timeZone: 'Asia/Tokyo',
        },
        end: {
          dateTime: reservation.slot.endTime.toISOString(),
          timeZone: 'Asia/Tokyo',
        },
        attendees: [
          { email: reservation.student.email, displayName: reservation.student.name },
          { email: reservation.mentor.email, displayName: reservation.mentor.name },
        ],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1日前
            { method: 'popup', minutes: 30 },      // 30分前
          ],
        },
      });

      // 3. イベントIDを保存
      await db
        .update(reservations)
        .set({
          googleEventId: event.id,
          googleEventLink: event.htmlLink,
        })
        .where(eq(reservations.id, reservationId));
    }

    return { reservation, student, mentor, slot };
  }

  // キャンセル時
  static async cancelReservation(reservationId: string) {
    const [reservation] = await db
      .select()
      .from(reservations)
      .where(eq(reservations.id, reservationId))
      .limit(1);

    // Googleカレンダーから削除
    if (reservation.googleEventId && reservation.mentor.googleAccessToken) {
      const calendarService = new GoogleCalendarService();
      await calendarService.deleteEvent(reservation.googleEventId);
    }

    // DB更新
    return await db
      .update(reservations)
      .set({ status: 'canceled' })
      .where(eq(reservations.id, reservationId))
      .returning();
  }
}
```

**Drizzleスキーマ更新**:
```typescript
// db/schema.ts にフィールド追加

// 予約テーブル
export const reservations = pgTable("reservations", {
  // ... 既存フィールド
  googleEventId: text("google_event_id"),
  googleEventLink: text("google_event_link"),
});

// メンターテーブル（新規追加の場合）
export const mentors = pgTable("mentors", {
  // ... 既存フィールド
  googleAccessToken: text("google_access_token"),
  googleRefreshToken: text("google_refresh_token"),
  calendarSyncEnabled: boolean("calendar_sync_enabled").default(false),
});
```

---

### Phase 3: AI教材生成（実働7日・24.5時間）

#### Day 11-12: 教材生成エンジン（7時間）

##### タスク10: AI教材生成サービス（7時間）
```typescript
// lib/services/ai-material.service.ts
import { OpenAIService } from '@/lib/openai';
import { db } from '@/db';
import { aiGeneratedMaterials } from '@/db/schema';
import { z } from 'zod';

export class AIMaterialService {
  static async generateMaterial(
    userId: string,
    params: {
      subject: string;
      topic: string;
      difficulty: 'beginner' | 'intermediate' | 'advanced';
      format?: 'quiz' | 'summary' | 'flashcards' | 'practice';
    }
  ) {
    // 使用量チェック
    const canGenerate = await checkUsageLimit(userId, 'aiMaterials');
    if (!canGenerate.allowed) {
      throw new Error('AI教材生成の月間上限に達しました');
    }

    // プロンプト構築
    const prompt = this.buildPrompt(params);

    // OpenAI APIで生成
    const completion = await OpenAIService.createCompletion({
      model: this.selectModel(params.difficulty),
      messages: [
        {
          role: 'system',
          content: '医学教育の専門家として、学生向けの教材を作成してください。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    });

    const content = JSON.parse(completion.choices[0].message.content);

    // データベースに保存（Drizzle）
    const [material] = await db
      .insert(aiGeneratedMaterials)
      .values({
        userId,
        subject: params.subject,
        topic: params.topic,
        difficulty: params.difficulty,
        content,
        metadata: {
          format: params.format || 'summary',
          model: completion.model,
          promptTokens: completion.usage?.prompt_tokens,
          completionTokens: completion.usage?.completion_tokens,
        },
        tokensUsed: completion.usage?.total_tokens || 0,
        estimatedCost: this.calculateCost(completion).toString(),
      })
      .returning();

    return material;
  }

  private static buildPrompt(params: any): string {
    const formatInstructions = {
      quiz: `
10問の選択式問題を作成してください。各問題には：
- 問題文
- 4つの選択肢（A, B, C, D）
- 正解
- 解説
を含めてください。`,
      summary: `
トピックの要点を箇条書きでまとめてください：
- 主要な概念（5-7項目）
- 重要な用語の定義
- 臨床的意義
- 覚えるべきポイント`,
      flashcards: `
15枚のフラッシュカードを作成してください。各カードには：
- 表面：質問または用語
- 裏面：答えまたは定義
- ヒント（任意）`,
      practice: `
臨床シナリオを3つ作成し、それぞれに：
- 患者の症例
- 診断プロセス
- 治療方針
- 学習ポイント
を含めてください。`
    };

    return `
科目：${params.subject}
トピック：${params.topic}
難易度：${params.difficulty === 'beginner' ? '初級' :
         params.difficulty === 'intermediate' ? '中級' : '上級'}

${formatInstructions[params.format || 'summary']}

JSON形式で出力してください。
`;
  }

  private static selectModel(difficulty: string) {
    switch (difficulty) {
      case 'beginner':
        return 'gpt-3.5-turbo';
      case 'intermediate':
        return 'gpt-4o-mini';
      case 'advanced':
        return 'gpt-4o';
      default:
        return 'gpt-4o-mini';
    }
  }

  private static calculateCost(completion: any): number {
    const modelCosts = {
      'gpt-4o': { input: 0.005, output: 0.015 },
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    };

    const usage = completion.usage;
    if (!usage) return 0;

    const costs = modelCosts[completion.model] || { input: 0, output: 0 };

    return (usage.prompt_tokens * costs.input / 1000) +
           (usage.completion_tokens * costs.output / 1000);
  }
}
```

#### Day 13-14: 教材管理API（7時間）

##### タスク11: 教材CRUD API（7時間）
```typescript
// app/api/ai/materials/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { AIMaterialService } from '@/lib/services/ai-material.service';
import { db } from '@/db';
import { aiGeneratedMaterials } from '@/db/schema';
import { eq, and, desc, count } from 'drizzle-orm';
import { z } from 'zod';

const generateSchema = z.object({
  subject: z.string().min(1),
  topic: z.string().min(1),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  format: z.enum(['quiz', 'summary', 'flashcards', 'practice']).optional(),
});

// 教材生成
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const params = generateSchema.parse(body);

    const material = await AIMaterialService.generateMaterial(userId, params);

    return NextResponse.json({
      success: true,
      data: material,
    });
  } catch (error) {
    if (error.message.includes('上限')) {
      return NextResponse.json(
        { error: error.message },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate material' },
      { status: 500 }
    );
  }
}

// 教材一覧取得
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const subject = searchParams.get('subject');
    const difficulty = searchParams.get('difficulty');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 条件構築
    const conditions = [eq(aiGeneratedMaterials.userId, userId)];
    if (subject) conditions.push(eq(aiGeneratedMaterials.subject, subject));
    if (difficulty) conditions.push(eq(aiGeneratedMaterials.difficulty, difficulty));

    const [materials, [totalResult]] = await Promise.all([
      db
        .select()
        .from(aiGeneratedMaterials)
        .where(and(...conditions))
        .orderBy(desc(aiGeneratedMaterials.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(aiGeneratedMaterials)
        .where(and(...conditions)),
    ]);

    return NextResponse.json({
      success: true,
      data: materials,
      meta: {
        total,
        limit,
        offset,
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch materials' },
      { status: 500 }
    );
  }
}
```

### Phase 4: レッスン予約システム（実働8日・28時間）

#### Day 15-17: メンター管理（10.5時間）

##### タスク12: メンター検索・マッチング（10.5時間）
```typescript
// lib/services/matching.service.ts
import { db } from '@/db';
import { mentors, lessonSlots } from '@/db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { OpenAIService } from '@/lib/openai';

export class MatchingService {
  static async findBestMentors(params: {
    subject: string;
    date: Date;
    timePreference?: 'morning' | 'afternoon' | 'evening';
    studentLevel?: string;
  }) {
    // メンターと空きスロットを取得
    const mentorsWithSlots = await db
      .select({
        id: mentors.id,
        userId: mentors.userId,
        specialties: mentors.specialties,
        rating: mentors.rating,
        totalSessions: mentors.totalSessions,
        slots: sql`ARRAY_AGG(${lessonSlots.id})`,
      })
      .from(mentors)
      .leftJoin(lessonSlots, eq(lessonSlots.mentorId, mentors.userId))
      .where(
        and(
          gte(lessonSlots.startTime, params.date),
          eq(lessonSlots.status, 'available')
        )
      )
      .groupBy(mentors.id);

    // AIでマッチングスコアを計算
    if (mentorsWithSlots.length > 1) {
      const scores = await this.calculateMatchScores(
        mentorsWithSlots,
        params
      );

      // スコア順にソート
      mentorsWithSlots.sort((a, b) =>
        (scores[b.id] || 0) - (scores[a.id] || 0)
      );
    }

    return mentorsWithSlots.slice(0, 5); // 上位5名を返す
  }

  private static async calculateMatchScores(
    mentors: any[],
    params: any
  ): Promise<Record<string, number>> {
    const prompt = `
以下のメンターリストから、学生に最適なメンターを評価してください。

学生の要望：
- 科目：${params.subject}
- 希望時間帯：${params.timePreference || '指定なし'}
- レベル：${params.studentLevel || '未指定'}

メンターリスト：
${mentors.map(m => `
- ID: ${m.id}
- 専門：${m.specialties.join(', ')}
- 評価：${m.rating}/5
- 経験：${m.totalSessions}セッション
`).join('\n')}

各メンターのマッチングスコアを0-100で評価し、JSON形式で返してください。
`;

    const completion = await OpenAIService.createCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'マッチングアルゴリズムとして評価してください。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    return JSON.parse(completion.choices[0].message.content);
  }

  static async createReservation(params: {
    studentId: string;
    mentorId: string;
    slotId: string;
    message?: string;
  }) {
    // スロットの空き確認
    const [slot] = await db
      .select()
      .from(lessonSlots)
      .where(eq(lessonSlots.id, params.slotId))
      .limit(1);

    if (!slot || slot.status !== 'available') {
      throw new Error('このスロットは予約できません');
    }

    // 予約作成
    const [reservation] = await db
      .insert(reservations)
      .values({
        studentId: params.studentId,
        mentorId: params.mentorId,
        slotId: params.slotId,
        status: 'pending',
        amount: slot.price,
        notes: params.message,
      })
      .returning();

    // スロットを予約済みに更新
    await db
      .update(lessonSlots)
      .set({
        status: 'booked',
        currentCapacity: sql`${lessonSlots.currentCapacity} + 1`
      })
      .where(eq(lessonSlots.id, params.slotId));

    // 確認メール送信
    await this.sendConfirmationEmail(reservation);

    return reservation;
  }

  private static async sendConfirmationEmail(reservation: any) {
    // Resendでメール送信
    // 実装省略
  }
}
```

### Phase 5: 統合とテスト（実働10日・35時間）

#### Day 18-20: 統合テスト（10.5時間）

##### タスク13: E2Eテスト実装（10.5時間）
```typescript
// tests/e2e/user-journey.spec.ts
import { test, expect } from '@playwright/test';

test.describe('ユーザージャーニー', () => {
  test('新規ユーザーがAI教材を生成して予約する', async ({ page }) => {
    // 1. サインアップ
    await page.goto('/sign-up');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'Test123!');
    await page.click('button[type="submit"]');

    // 2. ダッシュボードへ遷移
    await expect(page).toHaveURL('/dashboard');

    // 3. AI教材生成
    await page.click('text=AI教材を作成');
    await page.selectOption('[name="subject"]', '内科');
    await page.fill('[name="topic"]', '心電図の読み方');
    await page.selectOption('[name="difficulty"]', 'beginner');
    await page.click('text=生成する');

    // 4. 生成完了を待つ
    await expect(page.locator('.material-content')).toBeVisible({
      timeout: 30000
    });

    // 5. メンター予約
    await page.click('text=メンターを探す');
    await page.fill('[name="date"]', '2025-12-01');
    await page.selectOption('[name="subject"]', '内科');
    await page.click('text=検索');

    // 6. メンター選択
    await page.click('.mentor-card:first-child button');
    await page.click('.slot-available:first-child');
    await page.click('text=予約する');

    // 7. 予約確認
    await expect(page.locator('.reservation-success')).toBeVisible();
  });

  test('自然言語での操作', async ({ page }) => {
    await page.goto('/dashboard');

    // チャットインターフェース
    await page.fill('.chat-input', '明日の午後に内科のメンターを予約したい');
    await page.keyboard.press('Enter');

    // AIの応答を待つ
    await expect(page.locator('.ai-response')).toContainText('利用可能なメンター');

    // 提案されたオプションから選択
    await page.click('.suggested-action:first-child');

    // 確認
    await expect(page.locator('.reservation-pending')).toBeVisible();
  });
});
```

#### Day 21-23: パフォーマンス最適化（10.5時間）

##### タスク14: キャッシュとレート制限（10.5時間）
```typescript
// lib/cache/redis-cache.ts
import { Redis } from '@upstash/redis';

export class CacheManager {
  private static redis = Redis.fromEnv();

  static async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      return data as T;
    } catch (error) {
      console.error(`Cache get error for ${key}:`, error);
      return null;
    }
  }

  static async set(
    key: string,
    value: any,
    ttl: number = 3600
  ): Promise<void> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error(`Cache set error for ${key}:`, error);
    }
  }

  static async invalidate(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error(`Cache invalidation error for ${pattern}:`, error);
    }
  }

  // よく使うキャッシュキーのヘルパー
  static keys = {
    mentor: (id: string) => `mentor:${id}`,
    mentorSlots: (mentorId: string, date: string) =>
      `mentor_slots:${mentorId}:${date}`,
    userMaterials: (userId: string) => `user_materials:${userId}`,
    subscriptionLimits: (userId: string) =>
      `subscription_limits:${userId}`,
  };
}

// 使用例：メンター情報のキャッシュ
export async function getMentorWithCache(mentorId: string) {
  const cacheKey = CacheManager.keys.mentor(mentorId);

  // キャッシュチェック
  const cached = await CacheManager.get(cacheKey);
  if (cached) return cached;

  // DBから取得（Drizzle）
  const [mentor] = await db
    .select()
    .from(mentors)
    .where(eq(mentors.id, mentorId))
    .limit(1);

  if (!mentor) return null;

  // 空きスロットを取得
  const slots = await db
    .select()
    .from(lessonSlots)
    .where(
      and(
        eq(lessonSlots.mentorId, mentor.userId),
        gte(lessonSlots.startTime, new Date()),
        eq(lessonSlots.status, 'available')
      )
    );

  const mentorWithSlots = { ...mentor, availableSlots: slots };

  // キャッシュに保存（5分間）
  await CacheManager.set(cacheKey, mentorWithSlots, 300);

  return mentor;
}
```

### Phase 6: デプロイと監視（実働5日・17.5時間）

#### Day 24-25: Vercelデプロイ（7時間）

##### タスク15: 本番環境設定（7時間）
```bash
# Vercel設定
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
vercel env add CLERK_SECRET_KEY
vercel env add DATABASE_URL
vercel env add OPENAI_API_KEY
vercel env add STRIPE_SECRET_KEY
vercel env add UPSTASH_REDIS_REST_URL
vercel env add UPSTASH_REDIS_REST_TOKEN
vercel env add RESEND_API_KEY

# デプロイ
vercel --prod
```

```typescript
// lib/monitoring/analytics.ts
export class Analytics {
  static async track(event: string, properties?: any) {
    if (typeof window !== 'undefined' && window.va) {
      window.va('event', { name: event, ...properties });
    }

    // サーバーサイドログ
    if (typeof window === 'undefined') {
      console.log('[Analytics]', { event, properties });
    }
  }

  static async trackApiCall(
    endpoint: string,
    duration: number,
    status: number
  ) {
    await this.track('api_call', {
      endpoint,
      duration,
      status,
      timestamp: new Date().toISOString()
    });
  }

  static async trackOpenAIUsage(
    model: string,
    tokens: number,
    cost: number
  ) {
    await this.track('openai_usage', {
      model,
      tokens,
      cost,
      timestamp: new Date().toISOString()
    });
  }
}
```

---

## 📊 進捗管理

### マイルストーン

| Phase | 期間 | 工数 | 完了条件 |
|-------|------|------|----------|
| Phase 1: 基盤構築 | 10日 | 35時間 | OpenAI統合完了 |
| Phase 2: サブスク | 8日 | 28時間 | Stripe決済動作 |
| Phase 3: AI教材 | 7日 | 24.5時間 | 教材生成成功 |
| Phase 4: 予約 | 8日 | 28時間 | 予約フロー完成 |
| Phase 5: 統合 | 10日 | 35時間 | E2Eテスト合格 |
| Phase 6: デプロイ | 5日 | 17.5時間 | 本番稼働 |

### デイリータスク管理

```typescript
// scripts/daily-progress.ts
interface DailyTask {
  day: number;
  date: string;
  tasks: string[];
  hours: number;
  completed: boolean;
}

const schedule: DailyTask[] = [
  {
    day: 1,
    date: '2025-10-01',
    tasks: ['Next.js環境構築', '環境変数設定'],
    hours: 3.5,
    completed: false
  },
  // ... 全43日分
];

function checkProgress() {
  const completed = schedule.filter(d => d.completed).length;
  const remaining = schedule.filter(d => !d.completed).length;
  const totalHours = schedule.reduce((sum, d) =>
    sum + (d.completed ? d.hours : 0), 0
  );

  console.log(`
    進捗: ${completed}/43日 (${(completed/43*100).toFixed(1)}%)
    完了時間: ${totalHours}/150時間
    残り日数: ${remaining}日
    予定完了日: 2025-12-05
  `);
}
```

---

## 🚨 リスクと対策

### 技術的リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| OpenAI API障害 | 高 | フォールバック応答準備 |
| Stripeエラー | 高 | エラーハンドリング強化 |
| DBパフォーマンス | 中 | インデックス最適化 |
| キャッシュ障害 | 低 | DBフォールバック |

### スケジュールリスク

- **バッファ**: 20%（30時間）を既に含む
- **優先度**: コア機能を先に実装
- **段階リリース**: 機能ごとにデプロイ可能

---

## ✅ 成功の定義

### MVP完了条件

1. ✅ ユーザー登録・認証機能
2. ✅ 4段階サブスクリプション管理
3. ✅ AI教材生成（月間制限付き）
4. ✅ メンター予約システム
5. ✅ 自然言語での操作（OpenAI Function Calling）
6. ✅ 決済処理（Stripe）
7. ✅ 基本的な管理画面

### 品質基準

- レスポンスタイム: < 3秒（p95）
- エラー率: < 1%
- OpenAI APIコスト: < $100/月
- コードカバレッジ: > 70%

---

## 📚 参考資料

- [OpenAI Function Calling Guide](https://platform.openai.com/docs/guides/function-calling)
- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Stripe Subscription Guide](https://stripe.com/docs/billing/subscriptions)
- [Clerk Next.js Integration](https://clerk.com/docs/nextjs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [Drizzle with Neon](https://neon.tech/docs/guides/drizzle)