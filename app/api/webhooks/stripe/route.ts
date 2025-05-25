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

// Node.jsランタイムを使用（edgeではなく）
export const runtime = 'nodejs';

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
  console.log('🔔 Webhook受信開始');
  
  // リクエストヘッダーの詳細情報をログ出力
  const headersList = headers();
  const headersObject: Record<string, string> = {};
  headersList.forEach((value, key) => {
    if (!key.toLowerCase().includes('auth') && !key.toLowerCase().includes('secret')) {
      headersObject[key] = value;
    }
  });
  
  console.log('📋 リクエストヘッダー:', headersObject);
  console.log('🌐 リクエストURL:', req.url);
  
  try {
    // Protection Bypassトークンをヘッダーまたはクエリパラメータから取得
    const url = new URL(req.url);
    const bypassToken = headersList.get('x-vercel-protection-bypass') || 
                       url.searchParams.get('x-vercel-protection-bypass');
    const expectedToken = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    
    console.log('🔐 Protection Bypass 情報:', {
      hasToken: !!bypassToken,
      hasExpectedToken: !!expectedToken,
      tokenMatches: bypassToken === expectedToken,
      source: headersList.get('x-vercel-protection-bypass') ? 'header' : url.searchParams.get('x-vercel-protection-bypass') ? 'query' : 'none'
    });
    
    // Vercel認証保護が有効な場合のみチェック
    if (expectedToken && bypassToken !== expectedToken) {
      console.error('❌ Protection bypass token が無効です');
      return NextResponse.json(
        { error: 'Invalid protection bypass token' },
        { status: 401 }
      );
    }
    
    const body = await req.text();
    const signature = headersList.get('stripe-signature');

    console.log('📝 リクエスト情報:', {
      hasBody: !!body,
      bodyLength: body.length,
      hasSignature: !!signature,
      hasProtectionBypass: !!bypassToken,
      bypassMethod: headersList.get('x-vercel-protection-bypass') ? 'header' : 'query'
    });

    if (!signature) {
      console.error('❌ Stripe署名がありません');
      return NextResponse.json(
        { error: 'Stripe signature is missing' },
        { status: 400 }
      );
    }

    // Webhookイベントの検証
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      );
      console.log(`✅ 署名検証成功: ${event.type} (${event.id})`);
    } catch (err) {
      console.error('❌ 署名検証エラー:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${errorMessage}` },
        { status: 400 }
      );
    }

    console.log(`🔔 Webhook処理開始: ${event.type}`, { id: event.id });

    // イベントタイプに応じた処理
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          console.log('💳 チェックアウト完了:', { sessionId: session.id, mode: session.mode });
          
          if (session.mode === 'subscription') {
            // サブスクリプション決済の場合
            await handleCompletedSubscriptionCheckout(session);
          } else {
            // 単発決済の場合（レッスン予約など）
            processCheckoutSession(session).catch(error => {
              console.error('Error processing checkout session:', error);
            });
          }
          break;
        }

        case 'customer.subscription.created': {
          const createdSubscription = event.data.object as Stripe.Subscription;
          console.log('🆕 サブスクリプション作成:', { subscriptionId: createdSubscription.id });
          await handleSubscriptionChange(createdSubscription);
          break;
        }

        case 'customer.subscription.updated': {
          const updatedSubscription = event.data.object as Stripe.Subscription;
          console.log('🔄 サブスクリプション更新:', { subscriptionId: updatedSubscription.id });
          await handleSubscriptionChange(updatedSubscription);
          break;
        }

        case 'customer.subscription.deleted': {
          const deletedSubscription = event.data.object as Stripe.Subscription;
          console.log('🗑️ サブスクリプション削除:', { subscriptionId: deletedSubscription.id });
          await handleSubscriptionCancellation(deletedSubscription);
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          console.log('💰 請求書支払い成功:', { invoiceId: invoice.id });
          // 必要に応じて追加処理
          break;
        }

        case 'invoice.payment_failed': {
          const failedInvoice = event.data.object as Stripe.Invoice;
          console.log('❌ 請求書支払い失敗:', { invoiceId: failedInvoice.id });
          // 必要に応じて追加処理
          break;
        }

        default:
          console.log(`ℹ️ 未処理のイベント: ${event.type}`);
      }

      await monitorWebhookPerformance(event.type, startTime);
      console.log(`✅ Webhook処理完了: ${event.type}`);
      return NextResponse.json({ received: true });
      
    } catch (eventError) {
      console.error(`❌ イベント処理エラー (${event.type}):`, eventError);
      const errorMessage = eventError instanceof Error ? eventError.message : String(eventError);
      // エラーでも200を返してStripeに再送信を防ぐ
      return NextResponse.json({ 
        received: true, 
        error: errorMessage
      });
    }
    
  } catch (error) {
    console.error('❌ Webhook全体エラー:', error);
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

// ユーザーIDを取得する関数（シンプル化）
async function findUserByCustomerId(customerId: string): Promise<string | null> {
  try {
    console.log('🔍 顧客IDからユーザー検索:', { customerId });
    
    // シンプルなクエリを使用（リレーションなし）
    const { data, error } = await supabaseAdmin
      .from('stripe_customers')
      .select('userId')
      .eq('customerId', customerId)
      .single();

    if (error) {
      console.error('❌ ユーザー検索エラー:', error);
      // エラーがあってもnullを返して処理を続行
      return null;
    }

    if (!data) {
      console.warn('⚠️ 顧客IDに対応するユーザーが見つかりません:', customerId);
      return null;
    }

    console.log('✅ ユーザー検索成功:', { customerId, userId: data.userId });
    return data.userId;
  } catch (error) {
    console.error('❌ findUserByCustomerId エラー:', error);
    return null;
  }
}

// チェックアウト完了時の処理
async function handleCompletedSubscriptionCheckout(session: Stripe.Checkout.Session) {
  console.log('🔄 サブスクリプションチェックアウト処理開始:', { sessionId: session.id });
  
  if (!session.subscription) {
    console.error('❌ サブスクリプションIDが見つかりません');
    throw new Error('サブスクリプション情報が不完全です');
  }

  // セッションのメタデータからuserIdを取得
  const userId = session.metadata?.userId || session.client_reference_id;
  
  if (!userId) {
    console.error('❌ セッションにユーザーIDが含まれていません');
    throw new Error('ユーザーIDが見つかりません');
  }

  // サブスクリプション情報を取得
  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
  const typedSubscription = subscription as unknown as StripeSubscriptionWithPeriods;
  
  const customerId = typedSubscription.customer as string;
  
  console.log('📋 サブスクリプション詳細:', {
    subscriptionId: typedSubscription.id,
    customerId: customerId,
    userId: userId,
    status: typedSubscription.status,
    priceId: typedSubscription.items.data[0]?.price.id
  });

  // 1. まず顧客情報をstripe_customersテーブルに保存
  console.log('👤 顧客情報を保存中...');
  
  // 既存の顧客レコードを確認
  const { data: existingCustomer, error: customerSelectError } = await supabaseAdmin
    .from('stripe_customers')
    .select('id')
    .eq('userId', userId)
    .single();

  if (customerSelectError && customerSelectError.code !== 'PGRST116') {
    console.error('❌ 顧客情報検索エラー:', customerSelectError);
    throw customerSelectError;
  }

  if (existingCustomer) {
    // 既存レコードがある場合は更新
    const { data: customerUpdateData, error: customerUpdateError } = await supabaseAdmin
      .from('stripe_customers')
      .update({
        customerId: customerId,
        updatedAt: new Date().toISOString(),
      })
      .eq('userId', userId)
      .select();

    if (customerUpdateError) {
      console.error('❌ 顧客情報更新エラー:', customerUpdateError);
      throw customerUpdateError;
    }

    console.log('✅ 顧客情報更新完了:', customerUpdateData);
  } else {
    // 新規レコードの場合は挿入
    const { data: customerInsertData, error: customerInsertError } = await supabaseAdmin
      .from('stripe_customers')
      .insert({
        userId: userId,
        customerId: customerId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select();

    if (customerInsertError) {
      console.error('❌ 顧客情報挿入エラー:', customerInsertError);
      throw customerInsertError;
    }

    console.log('✅ 顧客情報挿入完了:', customerInsertData);
  }

  // 2. サブスクリプション情報をSupabaseに保存
  const subscriptionRecord = {
    userId: userId,
    customerId: customerId,
    subscriptionId: typedSubscription.id,
    priceId: typedSubscription.items.data[0]?.price.id,
    status: typedSubscription.status,
    currentPeriodStart: typedSubscription.current_period_start,
    currentPeriodEnd: typedSubscription.current_period_end,
    cancelAtPeriodEnd: typedSubscription.cancel_at_period_end,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  console.log('💾 Supabaseに保存するサブスクリプションデータ:', subscriptionRecord);

  // 既存のサブスクリプションレコードを確認
  const { data: existingSubscription, error: subscriptionSelectError } = await supabaseAdmin
    .from('stripe_user_subscriptions')
    .select('id')
    .eq('subscriptionId', typedSubscription.id)
    .single();

  if (subscriptionSelectError && subscriptionSelectError.code !== 'PGRST116') {
    console.error('❌ サブスクリプション検索エラー:', subscriptionSelectError);
    throw subscriptionSelectError;
  }

  if (existingSubscription) {
    // 既存レコードがある場合は更新
    const { data: subscriptionUpdateData, error: subscriptionUpdateError } = await supabaseAdmin
      .from('stripe_user_subscriptions')
      .update({
        userId: userId,
        customerId: customerId,
        priceId: typedSubscription.items.data[0]?.price.id,
        status: typedSubscription.status,
        currentPeriodStart: typedSubscription.current_period_start,
        currentPeriodEnd: typedSubscription.current_period_end,
        cancelAtPeriodEnd: typedSubscription.cancel_at_period_end,
        updatedAt: new Date().toISOString(),
      })
      .eq('subscriptionId', typedSubscription.id)
      .select();

    if (subscriptionUpdateError) {
      console.error('❌ サブスクリプションデータ更新エラー:', subscriptionUpdateError);
      throw subscriptionUpdateError;
    }

    console.log('✅ サブスクリプションデータ更新完了:', subscriptionUpdateData);
  } else {
    // 新規レコードの場合は挿入
    const { data: subscriptionInsertData, error: subscriptionInsertError } = await supabaseAdmin
      .from('stripe_user_subscriptions')
      .insert(subscriptionRecord)
      .select();

    if (subscriptionInsertError) {
      console.error('❌ サブスクリプションデータ挿入エラー:', subscriptionInsertError);
      throw subscriptionInsertError;
    }

    console.log('✅ サブスクリプションデータ挿入完了:', subscriptionInsertData);
  }
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

  try {
    // まず既存のレコードを確認
    const { data: existingData, error: selectError } = await supabaseAdmin
      .from('stripe_user_subscriptions')
      .select('id')
      .eq('subscriptionId', typedSubscription.id)
      .single();

    if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = レコードが見つからない
      console.error('既存レコード検索エラー:', selectError);
      throw selectError;
    }

    if (existingData) {
      // 既存レコードがある場合は更新
      console.log('既存のサブスクリプションレコードを更新:', existingData.id);
      const { data: updateData, error: updateError } = await supabaseAdmin
        .from('stripe_user_subscriptions')
        .update({
          userId: userId,
          customerId: typedSubscription.customer as string,
          priceId: typedSubscription.items.data[0]?.price.id,
          status: typedSubscription.status,
          currentPeriodStart: typedSubscription.current_period_start || Math.floor(Date.now() / 1000),
          currentPeriodEnd: typedSubscription.current_period_end || (Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60),
          cancelAtPeriodEnd: typedSubscription.cancel_at_period_end,
          updatedAt: new Date().toISOString(),
        })
        .eq('subscriptionId', typedSubscription.id)
        .select();

      if (updateError) {
        console.error('サブスクリプションデータ更新エラー:', updateError);
        throw updateError;
      }

      console.log('✅ サブスクリプションデータ更新完了:', updateData);
    } else {
      // 新規レコードの場合は挿入（createdAtも追加）
      console.log('新規サブスクリプションレコードを作成');
      const { data: insertData, error: insertError } = await supabaseAdmin
        .from('stripe_user_subscriptions')
        .insert({
          ...subscriptionRecord,
          createdAt: new Date().toISOString(),
        })
        .select();

      if (insertError) {
        console.error('サブスクリプションデータ挿入エラー:', insertError);
        throw insertError;
      }

      console.log('✅ サブスクリプションデータ挿入完了:', insertData);
    }
  } catch (error) {
    console.error('サブスクリプション変更処理エラー:', error);
    throw error;
  }
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