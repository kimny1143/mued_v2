import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { ReservationStatus, PaymentStatus } from '@prisma/client';

// エッジ関数として実行
export const runtime = 'edge';

// Stripeクライアントの初期化
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil' as const
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// リトライロジック
async function processWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.error(`Attempt ${i + 1} failed:`, error);
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
  
  throw lastError;
}

// パフォーマンスモニタリング
async function monitorWebhookPerformance(
  eventType: string,
  startTime: number
) {
  const duration = Date.now() - startTime;
  console.log(`Webhook ${eventType} processed in ${duration}ms`);
}

export async function POST(req: Request) {
  const startTime = Date.now();
  
  try {
    const body = await req.text();
    const signature = headers().get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Stripe signature is missing' },
        { status: 400 }
      );
    }

    // Webhookイベントの検証
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );

    // イベントタイプに応じた処理
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // 非同期で処理を開始
      processCheckoutSession(session).catch(error => {
        console.error('Error processing checkout session:', error);
      });
      
      // 即座にレスポンスを返す
      await monitorWebhookPerformance(event.type, startTime);
      return NextResponse.json({ received: true });
    }

    await monitorWebhookPerformance(event.type, startTime);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// チェックアウトセッションの処理
async function processCheckoutSession(session: Stripe.Checkout.Session) {
  return processWithRetry(async () => {
    await prisma.$transaction(async (tx) => {
      // Paymentレコードを更新
      const payment = await tx.payment.update({
        where: {
          stripeSessionId: session.id,
        },
        data: {
          stripePaymentId: session.payment_intent as string,
          status: PaymentStatus.SUCCEEDED,
        },
      });

      // 予約ステータスを更新
      await tx.reservation.update({
        where: {
          id: payment.reservationId,
        },
        data: {
          status: ReservationStatus.CONFIRMED,
        },
      });

      // レッスンスロットの予約状態を更新
      const reservation = await tx.reservation.findUnique({
        where: { id: payment.reservationId },
        select: { slotId: true },
      });

      if (reservation) {
        await tx.lessonSlot.update({
          where: { id: reservation.slotId },
          data: { isAvailable: false },
        });
      }
    });
  });
}

// ユーザーIDを取得する関数
async function findUserByCustomerId(customerId: string): Promise<string | null> {
  return processWithRetry(async () => {
    const { data, error } = await supabaseAdmin
      .from('stripe_customers')
      .select('user_id')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (error || !data) {
      console.error('ユーザー検索エラー:', error || 'ユーザーが見つかりません');
      return null;
    }

    return data.user_id;
  });
}

// チェックアウト完了時の処理
async function handleCompletedSubscriptionCheckout(session: Stripe.Checkout.Session) {
  if (!session.subscription || !session.metadata?.userId) {
    throw new Error('サブスクリプション情報が不完全です');
  }

  // サブスクリプション情報を取得
  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
  
  // ユーザーのサブスクリプション情報を更新
  await prisma.stripeUserSubscription.create({
    data: {
      userId: session.metadata.userId,
      subscriptionId: subscription.id,
      customerId: subscription.customer as string,
      status: subscription.status,
      currentPeriodStart: BigInt(subscription.current_period_start),
      currentPeriodEnd: BigInt(subscription.current_period_end),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      priceId: subscription.items.data[0].price.id
    }
  });
}

// サブスクリプション変更時の処理
async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  console.log(`サブスクリプション変更処理: ${subscription.id}`);
  
  const userId = await findUserByCustomerId(subscription.customer as string);
  
  if (!userId) {
    console.error('サブスクリプションに関連するユーザーが見つかりませんでした', { 
      subscriptionId: subscription.id,
      customerId: subscription.customer
    });
    return;
  }

  console.log(`サブスクリプション変更: ユーザーID=${userId}, ステータス=${subscription.status}`);

  // サブスクリプション情報を更新
  const subscriptionRecord = {
    userId: userId,
    customerId: subscription.customer as string,
    subscriptionId: subscription.id,
    priceId: subscription.items.data[0]?.price.id,
    status: subscription.status,
    currentPeriodStart: subscription.current_period_start || Math.floor(Date.now() / 1000),
    currentPeriodEnd: subscription.current_period_end || (Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    updatedAt: new Date().toISOString(),
  };
  
  console.log('更新するサブスクリプションデータ:', subscriptionRecord);

  // supabaseAdminを使用して権限問題を解決
  const { data, error } = await supabaseAdmin
    .from('stripe_user_subscriptions')
    .upsert(subscriptionRecord, {
      onConflict: 'userId',
      ignoreDuplicates: false
    })
    .select();

  if (error) {
    console.error('サブスクリプションデータ更新エラー:', error);
    throw error;
  }

  console.log('サブスクリプションデータを更新しました:', data);
}

// サブスクリプションキャンセル時の処理
async function handleSubscriptionCancellation(subscription: Stripe.Subscription) {
  console.log(`サブスクリプションキャンセル処理: ${subscription.id}`);

  // ユーザーIDを取得
  const userId = await findUserByCustomerId(subscription.customer as string);
  
  if (!userId) {
    console.error('サブスクリプションに関連するユーザーが見つかりませんでした', { 
      subscriptionId: subscription.id,
      customerId: subscription.customer
    });
    return;
  }

  // サブスクリプションステータスを更新
  // supabaseAdminを使用して権限問題を解決
  const { data, error } = await supabaseAdmin
    .from('stripe_user_subscriptions')
    .update({
      status: 'canceled',
      updatedAt: new Date().toISOString(),
    })
    .eq('userId', userId)
    .select();

  if (error) {
    console.error('サブスクリプションキャンセルデータ更新エラー:', error);
    throw error;
  }

  console.log('サブスクリプションキャンセル完了:', data);
} 