import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { ReservationStatus, PaymentStatus } from '@prisma/client';

// Stripe API型を拡張する
interface StripeSubscriptionWithPeriods extends Stripe.Subscription {
  current_period_start: number;
  current_period_end: number;
}

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
        include: {
          reservation: {
            include: { slot: true }
          }
        }
      });

      if (!payment.reservation) {
        throw new Error(`支払いに関連する予約が見つかりません: ${payment.id}`);
      }

      // 予約ステータスを更新
      await tx.reservation.update({
        where: {
          id: payment.reservation.id,
        },
        data: {
          status: ReservationStatus.CONFIRMED,
        },
      });

      // メタデータから予約時間情報を取得
      const reservation = payment.reservation;
      
      const bookedStartTime = session.metadata?.bookedStartTime 
        ? new Date(session.metadata.bookedStartTime)
        : reservation.bookedStartTime;
      
      const bookedEndTime = session.metadata?.bookedEndTime 
        ? new Date(session.metadata.bookedEndTime)
        : reservation.bookedEndTime;
      
      const hoursBooked = session.metadata?.hoursBooked
        ? parseInt(session.metadata.hoursBooked, 10)
        : reservation.hoursBooked || 1;

      // レッスンスロットの更新方法を判断
      // 完全予約かどうかを判断（スロットの時間全てを予約したか）
      const isFullSlotBooking = 
        bookedStartTime.getTime() <= reservation.slot.startTime.getTime() &&
        bookedEndTime.getTime() >= reservation.slot.endTime.getTime();

      // スロットが完全に予約された場合は利用不可にする
      if (isFullSlotBooking) {
        await tx.lessonSlot.update({
          where: { id: reservation.slotId },
          data: { isAvailable: false },
        });
      } else {
        // 部分予約の場合は他の時間帯を予約できるようにする
        // この実装は追加の複雑さを避けるため、現状は何もしない
        // 実際の実装では、スロットを分割するなどの高度な処理が必要
        console.log(`部分予約が完了: ${reservation.id}, ${hoursBooked}時間`);
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
  const typedSubscription = subscription as unknown as StripeSubscriptionWithPeriods;
  
  // ユーザーのサブスクリプション情報を更新
  await prisma.stripeUserSubscription.create({
    data: {
      userId: session.metadata.userId,
      subscriptionId: typedSubscription.id,
      customerId: typedSubscription.customer as string,
      status: typedSubscription.status,
      currentPeriodStart: BigInt(typedSubscription.current_period_start),
      currentPeriodEnd: BigInt(typedSubscription.current_period_end),
      cancelAtPeriodEnd: typedSubscription.cancel_at_period_end,
      priceId: typedSubscription.items.data[0].price.id
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

  // サブスクリプション情報を取得
  const typedSubscription = subscription as unknown as StripeSubscriptionWithPeriods;
  const subscriptionRecord = {
    userId: userId,
    customerId: typedSubscription.customer as string,
    subscriptionId: typedSubscription.id,
    priceId: typedSubscription.items.data[0]?.price.id,
    status: typedSubscription.status,
    currentPeriodStart: typedSubscription.current_period_start || Math.floor(Date.now() / 1000),
    currentPeriodEnd: typedSubscription.current_period_end || (Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60),
    cancelAtPeriodEnd: typedSubscription.cancel_at_period_end,
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