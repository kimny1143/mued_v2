import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Stripeクライアントの初期化
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as const
});

// 予約ステータス列挙型
enum ReservationStatus {
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED'
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('Stripe-Signature');

  if (!signature) {
    console.error('署名がありません');
    return new NextResponse('署名が必要です', { status: 400 });
  }

  // Webhookシークレット
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.error('Webhook秘密鍵が設定されていません');
    return new NextResponse('設定エラー', { status: 500 });
  }

  let event: Stripe.Event;

  try {
    // イベントを検証
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
    console.log(`Webhookイベント受信: ${event.id}, タイプ: ${event.type}`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : '不明なエラー';
    console.error(`Webhook検証エラー: ${errorMessage}`);
    return new NextResponse(`Webhook検証エラー: ${errorMessage}`, { status: 400 });
  }
  
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`チェックアウト完了イベント: ${session.id}, モード: ${session.mode}`);
        console.log('セッションメタデータ:', session.metadata);
        
        // セッションモードがサブスクリプションの場合
        if (session.mode === 'subscription' && session.subscription) {
          console.log(`サブスクリプションID: ${session.subscription}, ユーザーメタデータ:`, session.metadata);
          await handleCompletedSubscriptionCheckout(session);
        }
        
        // 単発決済（レッスン予約）の場合
        else if (session.mode === 'payment') {
          console.log('単発レッスン決済を検出:', session.id);
          
          // メタデータからスロット情報を取得
          const slotId = session.metadata?.slotId;
          const studentId = session.metadata?.studentId;
          const notes = session.metadata?.notes || '';
          
          if (!slotId || !studentId) {
            console.error('必要なメタデータがありません:', session.metadata);
            throw new Error('決済セッションに必要なメタデータがありません');
          }
          
          // スロットの存在確認と可用性チェック
          const slot = await prisma.lessonSlot.findUnique({
            where: { id: slotId }
          });
          
          if (!slot) {
            console.error('スロットが見つかりません:', slotId);
            throw new Error('関連するレッスンスロットが見つかりません');
          }
          
          if (!slot.isAvailable) {
            console.error('スロットは既に予約されています:', slotId);
            throw new Error('このスロットは既に予約されています');
          }

          // トランザクションで予約を作成
          const reservation = await prisma.$transaction(async (tx) => {
            // 予約を作成
            const newReservation = await tx.reservation.create({
              data: {
                studentId,
                slotId,
                status: ReservationStatus.CONFIRMED,
                paymentId: session.payment_intent as string,
                notes
              }
            });

            // スロットの可用性を更新
            await tx.lessonSlot.update({
              where: { id: slotId },
              data: { isAvailable: false }
            });

            return newReservation;
          });

          console.log('予約が確定しました:', reservation.id);
        }
        break;
      }
      
      case 'customer.subscription.created': 
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`サブスクリプション更新イベント: ${subscription.id}, ステータス: ${subscription.status}`);
        await handleSubscriptionChange(subscription);
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`サブスクリプション削除イベント: ${subscription.id}`);
        await handleSubscriptionCancellation(subscription);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`支払い成功: ${paymentIntent.id}`);
        
        // 予約の支払いIDを更新
        if (paymentIntent.metadata?.reservationId) {
          await prisma.reservation.update({
            where: { id: paymentIntent.metadata.reservationId },
            data: { paymentId: paymentIntent.id }
          });
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`支払い失敗: ${paymentIntent.id}`);
        
        // 予約をキャンセル（レコードを削除）
        if (paymentIntent.metadata?.reservationId) {
          await prisma.$transaction(async (tx) => {
            // 予約を取得
            const reservation = await tx.reservation.findUnique({
              where: { id: paymentIntent.metadata.reservationId },
              include: { slot: true }
            });

            if (reservation) {
              // 予約を削除
              await tx.reservation.delete({
                where: { id: reservation.id }
              });

              // スロットを再度利用可能に
              await tx.lessonSlot.update({
                where: { id: reservation.slotId },
                data: { isAvailable: true }
              });
            }
          });
        }
        break;
      }

      default:
        console.log(`未処理のイベントタイプ: ${event.type}`);
    }
    
    console.log(`イベント処理完了: ${event.type}`);
    return new NextResponse(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Webhook処理エラー詳細:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Webhook処理エラー',
        details: error instanceof Error ? error.message : '不明なエラー'
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// ユーザーIDを取得する関数
async function findUserByCustomerId(customerId: string): Promise<string | null> {
  try {
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
  } catch (error) {
    console.error('顧客ID検索エラー:', error);
    return null;
  }
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