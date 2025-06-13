# Stripe Checkout + Webhook 設計書

## 概要

本ドキュメントでは、MUED LMSのレッスン予約システムにおけるStripe決済フローとWebhook処理の設計について記述します。

## 1. アーキテクチャ

### 1.1 全体フロー

```
+-------------------------+    +------------------------+    +----------------------------+
|                         |    |                        |    |                            |
| Next.js フロントエンド  +--->+ Stripe Checkout Session +--->+ Webhook (Supabase Function) |
|                         |    |                        |    |                            |
+------------+------------+    +------------------------+    +-------------+--------------+
             ^                                                             |
             |                                                             |
             |                        +--------------------+                |
             |                        |                    |                |
             +------------------------+  データベース更新   <----------------+
                                      |                    |
                                      +--------------------+
```

### 1.2 主要コンポーネント

1. **NextJS フロントエンド**: 
   - レッスン予約UIの表示
   - Stripeチェックアウトセッション生成APIの呼び出し
   - 決済成功後のリダイレクト処理

2. **Stripe Checkout Session**:
   - 安全な決済フォームの提供
   - カード情報の処理と決済実行
   - 決済結果のイベント発行

3. **Webhook (Supabase Edge Function)**:
   - Stripeからのイベント受信・検証
   - 決済成功時のデータベース更新
   - 予約確定処理の実行

## 2. 実装詳細

### 2.1 Stripe Checkout セッション作成

```typescript
// app/api/checkout/lesson/route.ts
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { lessonSlotId, successUrl, cancelUrl } = await req.json();
    
    // レッスン枠の情報を取得
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    const { data: lessonSlot, error } = await supabase
      .from('lesson_slots')
      .select('*, mentors(name)')
      .eq('id', lessonSlotId)
      .single();
    
    if (error || !lessonSlot) {
      return NextResponse.json(
        { error: 'レッスン枠が見つかりません' },
        { status: 404 }
      );
    }
    
    // 予約情報を仮登録（ステータスはpending）
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .insert({
        user_id: session.user.id,
        lesson_slot_id: lessonSlotId,
        status: 'pending',
      })
      .select()
      .single();
    
    if (reservationError) {
      return NextResponse.json(
        { error: '予約の仮登録に失敗しました' },
        { status: 500 }
      );
    }
    
    // Stripeチェックアウトセッションの作成
    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: `レッスン: ${lessonSlot.mentors.name}`,
              description: `${new Date(lessonSlot.start_time).toLocaleString('ja-JP')} 〜 ${new Date(lessonSlot.end_time).toLocaleString('ja-JP')}`,
            },
            unit_amount: lessonSlot.price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      client_reference_id: reservation.id, // 予約IDを参照IDとして設定
      metadata: {
        reservationId: reservation.id,
        lessonSlotId: lessonSlotId,
        userId: session.user.id,
      },
    });
    
    // セッションIDを返す
    return NextResponse.json({ sessionId: stripeSession.id, url: stripeSession.url });
  } catch (error: any) {
    console.error('Checkout session creation error:', error);
    return NextResponse.json(
      { error: `チェックアウトセッションの作成に失敗しました: ${error.message}` },
      { status: 500 }
    );
  }
}
```

### 2.2 Webhook処理（Supabase Edge Function）

```typescript
// supabase/functions/stripe-webhook/index.ts
import { serve } from 'https://deno.land/std@0.131.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';
import Stripe from 'https://esm.sh/stripe@12.10.0?dts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2022-11-15',
});

// Webhookエンドポイントシークレット
const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

serve(async (req) => {
  // リクエストボディを取得
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return new Response('Signature missing', { status: 400 });
  }

  let event;
  try {
    // イベント検証
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Supabaseクライアントの初期化
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_KEY') || '';
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // イベントタイプに基づいて処理
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      
      // 予約IDとユーザーIDの取得
      const reservationId = session.metadata.reservationId;
      const lessonSlotId = session.metadata.lessonSlotId;
      const userId = session.metadata.userId;
      
      if (!reservationId || !lessonSlotId || !userId) {
        console.error('Missing metadata in session', session);
        return new Response('Missing metadata', { status: 400 });
      }
      
      // 予約ステータスの更新
      const { error: reservationError } = await supabase
        .from('reservations')
        .update({ 
          status: 'confirmed',
          payment_status: 'paid',
          payment_intent_id: session.payment_intent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reservationId);
      
      if (reservationError) {
        console.error('Failed to update reservation:', reservationError);
        return new Response('Reservation update failed', { status: 500 });
      }
      
      // レッスン枠の利用状況更新
      const { error: lessonSlotError } = await supabase
        .from('lesson_slots')
        .update({ available: false })
        .eq('id', lessonSlotId);
      
      if (lessonSlotError) {
        console.error('Failed to update lesson slot:', lessonSlotError);
        return new Response('Lesson slot update failed', { status: 500 });
      }
      
      // 支払い記録の作成
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: userId,
          reservation_id: reservationId,
          amount: session.amount_total,
          currency: session.currency,
          payment_intent_id: session.payment_intent,
          payment_status: 'succeeded',
          payment_method: session.payment_method_types[0],
        });
      
      if (paymentError) {
        console.error('Failed to create payment record:', paymentError);
        return new Response('Payment record creation failed', { status: 500 });
      }
      
      break;
      
    case 'checkout.session.expired':
      // 期限切れの場合、予約を取り消す
      const expiredSession = event.data.object;
      const expiredReservationId = expiredSession.metadata.reservationId;
      
      if (expiredReservationId) {
        const { error } = await supabase
          .from('reservations')
          .update({ 
            status: 'cancelled',
            payment_status: 'expired',
            updated_at: new Date().toISOString(),
          })
          .eq('id', expiredReservationId);
        
        if (error) {
          console.error('Failed to cancel expired reservation:', error);
          return new Response('Reservation cancellation failed', { status: 500 });
        }
      }
      break;
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### 2.3 フロントエンド実装（予約から決済）

```typescript
// components/reservation/useReservation.ts
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export const useReservation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const createReservation = async (lessonSlotId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // チェックアウトセッションを作成
      const response = await fetch('/api/checkout/lesson', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lessonSlotId,
          successUrl: `${window.location.origin}/reservations/success`,
          cancelUrl: `${window.location.origin}/reservations`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '予約処理中にエラーが発生しました');
      }

      const { url } = await response.json();
      
      // Stripeチェックアウトページにリダイレクト
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('チェックアウトURLが取得できませんでした');
      }
    } catch (err: any) {
      setError(err.message || '予約処理中に未知のエラーが発生しました');
      console.error('Reservation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createReservation,
    isLoading,
    error,
  };
};
```

## 3. データモデル

### 3.1 Prisma/DBモデル

```prisma
// prisma/schema.prisma

model LessonSlot {
  id         String       @id @default(uuid())
  mentorId   String
  startTime  DateTime
  endTime    DateTime
  price      Int
  available  Boolean      @default(true)
  createdAt  DateTime     @default(now())
  updatedAt  DateTime     @updatedAt
  mentor     User         @relation(fields: [mentorId], references: [id])
  reservation Reservation?
}

model Reservation {
  id             String    @id @default(uuid())
  userId         String
  lessonSlotId   String    @unique
  status         String    @default("pending") // pending, confirmed, cancelled
  paymentStatus  String?   // null, paid, refunded, failed
  paymentIntentId String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  user           User      @relation(fields: [userId], references: [id])
  lessonSlot     LessonSlot @relation(fields: [lessonSlotId], references: [id])
  payment        Payment?
}

model Payment {
  id               String    @id @default(uuid())
  userId           String
  reservationId    String    @unique
  amount           Int
  currency         String    @default("jpy")
  paymentIntentId  String
  paymentStatus    String
  paymentMethod    String
  createdAt        DateTime  @default(now())
  user             User      @relation(fields: [userId], references: [id])
  reservation      Reservation @relation(fields: [reservationId], references: [id])
}
```

## 4. セキュリティ対策

### 4.1 Webhook署名検証

- Stripe Webhookからのリクエストは署名を検証し、正当なリクエストのみを処理
- 署名検証のためのエンドポイントシークレットは環境変数で管理

### 4.2 フロントエンド漏洩防止

- StripeのAPIキーはサーバーサイドでのみ使用し、フロントエンドに露出させない
- セッション作成など全ての支払い関連処理はサーバーサイドAPI経由で実行

### 4.3 冪等性の確保

- WebhookイベントのIDを記録し、同じイベントを複数回処理しないよう対策
- データベース更新は必要に応じてトランザクションを使用して一貫性を確保

## 5. エラーハンドリングとロギング

### 5.1 エラーシナリオ

1. **決済失敗**:
   - Webhook経由で通知を受け取り、予約ステータスを更新
   - ユーザーに適切なエラーメッセージを表示

2. **Webhook処理失敗**:
   - 詳細なエラーロギングを実施
   - リトライメカニズムの実装を検討
   - クリティカルなエラーは通知システムで運用チームに通知

### 5.2 ロギング戦略

- 全てのStripeイベントとWebhook処理の結果をSupabaseのログテーブルに記録
- エラー発生時は詳細な診断情報とスタックトレースをログに残す
- 個人情報・カード情報などの機密データはログに含めない

## 6. 今後の拡張計画

### 6.1 サブスクリプション対応

- 現状は都度決済のみ対応
- 今後プレミアムプランなどのサブスクリプションモデルにも対応予定

### 6.2 決済分析ダッシュボード

- 売上集計やユーザー行動分析のためのダッシュボード開発
- Stripeデータとアプリケーションデータを組み合わせた分析

### 6.3 メンター決済

- メンターへの報酬支払いにStripe Connectを活用する計画
- 自動的な収益配分と支払いスケジュール管理 