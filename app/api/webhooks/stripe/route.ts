import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';
import { headers } from 'next/headers';
import Stripe from 'stripe';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('stripe-signature') || '';
  
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.error('Webhook Secretが設定されていません');
    return new NextResponse('Webhook Secret missing', { status: 500 });
  }

  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : '不明なエラー';
    console.error(`Webhook Error: ${errorMessage}`);
    return new NextResponse(`Webhook Error: ${errorMessage}`, { status: 400 });
  }

  console.log(`Event type: ${event.type}`);
  
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // セッションモードがサブスクリプションの場合のみ処理
        if (session.mode === 'subscription' && session.subscription) {
          await handleCompletedSubscriptionCheckout(session);
        }
        break;
      }
      
      case 'customer.subscription.created': 
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(subscription);
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCancellation(subscription);
        break;
      }
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook処理エラー:', error);
    return new NextResponse('Webhook処理エラー', { status: 500 });
  }
}

// サブスクリプションチェックアウト完了時の処理
async function handleCompletedSubscriptionCheckout(session: Stripe.Checkout.Session) {
  if (!session.customer || !session.subscription) return;

  // サブスクリプションの詳細を取得
  const subscriptionData = await stripe.subscriptions.retrieve(session.subscription as string);
  
  // メタデータからユーザーIDを取得（チェックアウト時に設定する必要がある）
  const userId = session.metadata?.userId || await findUserByCustomerId(session.customer as string);
  
  if (!userId) {
    console.error('ユーザーIDが見つかりませんでした', { session });
    return;
  }

  // 既存のサブスクリプションを確認
  const { data: existingSubscriptions } = await supabase
    .from('stripe_user_subscriptions')
    .select('*')
    .eq('userId', userId);

  // 既存のサブスクリプションがある場合は解約
  if (existingSubscriptions && existingSubscriptions.length > 0) {
    for (const existingSub of existingSubscriptions) {
      if (existingSub.subscriptionId !== subscriptionData.id && existingSub.status !== 'canceled') {
        try {
          // Stripeでサブスクリプションを解約
          await stripe.subscriptions.cancel(existingSub.subscriptionId);
          console.log(`既存のサブスクリプション ${existingSub.subscriptionId} を解約しました`);
        } catch (error) {
          console.error('既存サブスクリプションの解約エラー:', error);
        }
      }
    }
  }

  // 現在のサブスクリプション情報をデータベースに保存/更新
  const { data, error } = await supabase
    .from('stripe_user_subscriptions')
    .upsert({
      userId: userId,
      customerId: session.customer as string,
      subscriptionId: subscriptionData.id,
      priceId: subscriptionData.items.data[0]?.price.id,
      status: subscriptionData.status,
      currentPeriodStart: subscriptionData.start_date,
      currentPeriodEnd: subscriptionData.current_period_end,
      cancelAtPeriodEnd: subscriptionData.cancel_at_period_end,
      updatedAt: new Date().toISOString(),
    }, {
      onConflict: 'subscriptionId',
    })
    .select('*')
    .single();

  if (error) {
    console.error('サブスクリプションデータ保存エラー:', error);
    throw error;
  }

  console.log('サブスクリプションデータを保存しました:', data);
}

// サブスクリプション変更時の処理
async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const userId = await findUserByCustomerId(subscription.customer as string);
  
  if (!userId) {
    console.error('サブスクリプションに関連するユーザーが見つかりませんでした', { subscription });
    return;
  }

  // サブスクリプション情報を更新
  const { error } = await supabase
    .from('stripe_user_subscriptions')
    .upsert({
      userId: userId,
      customerId: subscription.customer as string,
      subscriptionId: subscription.id,
      priceId: subscription.items.data[0]?.price.id,
      status: subscription.status,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      updatedAt: new Date().toISOString(),
    }, {
      onConflict: 'subscriptionId',
    });

  if (error) {
    console.error('サブスクリプションデータ更新エラー:', error);
    throw error;
  }
}

// サブスクリプションキャンセル時の処理
async function handleSubscriptionCancellation(subscription: Stripe.Subscription) {
  // サブスクリプションステータスを更新
  const { error } = await supabase
    .from('stripe_user_subscriptions')
    .update({
      status: 'canceled',
      updatedAt: new Date().toISOString(),
    })
    .eq('subscriptionId', subscription.id);

  if (error) {
    console.error('サブスクリプションキャンセルデータ更新エラー:', error);
    throw error;
  }
}

// カスタマーIDからユーザーIDを見つける
async function findUserByCustomerId(customerId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('stripe_user_subscriptions')
    .select('userId')
    .eq('customerId', customerId)
    .maybeSingle();

  if (error || !data) {
    console.error('カスタマーIDからユーザーIDを取得できませんでした:', error);
    return null;
  }

  return data.userId;
} 