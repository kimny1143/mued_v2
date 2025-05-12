import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { headers } from 'next/headers';
import Stripe from 'stripe';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('stripe-signature') || '';
  
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const isLocalDev = process.env.NODE_ENV === 'development';
  
  if (!webhookSecret && !isLocalDev) {
    console.error('Webhook Secretが設定されていません');
    return new NextResponse('Webhook Secret missing', { status: 500 });
  }

  let event: Stripe.Event;
  
  try {
    // 開発環境では署名検証をスキップしてリクエスト本文から直接イベントを取得
    if (isLocalDev) {
      console.log('ローカル開発環境: 署名検証をスキップします');
      event = JSON.parse(body) as Stripe.Event;
    } else {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret!);
    }
    console.log(`Webhook受信: ${event.type}, ID: ${event.id}`);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : '不明なエラー';
    console.error(`Webhook署名検証エラー: ${errorMessage}`);
    return new NextResponse(`Webhook Error: ${errorMessage}`, { status: 400 });
  }

  console.log(`イベント処理開始: ${event.type}`);
  
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`チェックアウト完了イベント: ${session.id}, モード: ${session.mode}`);
        console.log('セッションメタデータ:', session.metadata);
        
        // セッションモードがサブスクリプションの場合のみ処理
        if (session.mode === 'subscription' && session.subscription) {
          console.log(`サブスクリプションID: ${session.subscription}, ユーザーメタデータ:`, session.metadata);
          await handleCompletedSubscriptionCheckout(session);
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
    }
    
    console.log(`イベント処理完了: ${event.type}`);
    return NextResponse.json({ received: true, success: true, event: event.type });
  } catch (error) {
    console.error('Webhook処理エラー詳細:', error);
    return new NextResponse('Webhook処理エラー', { status: 500 });
  }
}

// セッション完了時にユーザーIDをカスタマーIDから検索
async function findUserByCustomerId(customerId: string): Promise<string | null> {
  console.log(`カスタマーID ${customerId} のユーザーを検索中...`);
  
  // supabaseAdminを使用して権限問題を解決
  const { data, error } = await supabaseAdmin
    .from('stripe_customers')
    .select('user_id')
    .eq('customer_id', customerId)
    .single();
  
  if (error) {
    console.error('カスタマーIDからユーザーの検索エラー:', error);
    return null;
  }
  
  if (!data || !data.user_id) {
    console.error(`カスタマーID ${customerId} に関連するユーザーが見つかりませんでした`);
    return null;
  }
  
  console.log(`カスタマーID ${customerId} のユーザーを発見: ${data.user_id}`);
  return data.user_id;
}

// ユーザーIDからカスタマーIDを検索
async function findCustomerByUserId(userId: string): Promise<string | null> {
  // supabaseAdminを使用して権限問題を解決
  const { data, error } = await supabaseAdmin
    .from('stripe_customers')
    .select('customer_id')
    .eq('user_id', userId)
    .single();
  
  if (error) {
    console.error('ユーザーIDからカスタマーの検索エラー:', error);
    return null;
  }
  
  if (!data) {
    console.error(`ユーザーID ${userId} に関連するカスタマーが見つかりませんでした`);
    return null;
  }
  
  return data.customer_id;
}

// チェックアウト完了時の処理
async function handleCompletedSubscriptionCheckout(session: Stripe.Checkout.Session) {
  if (!session.customer || !session.subscription) {
    console.error('セッションにcustomerまたはsubscriptionがありません', session);
    return;
  }
  
  // メタデータからユーザーIDを取得（旧方式）またはcustomer_idから検索（新方式）
  let userId = session.metadata?.userId || null;
  
  // メタデータからユーザーIDが見つからない場合は、customer_idから検索
  if (!userId) {
    console.log('メタデータからユーザーIDが見つかりません。customerIdから検索します:', session.customer);
    userId = await findUserByCustomerId(session.customer as string);
    
    if (!userId) {
      console.error('customerIdからもユーザーIDが見つかりませんでした。処理を中止します');
      return;
    }
  }
  
  console.log(`チェックアウト完了処理: ユーザーID=${userId}, サブスクリプションID=${session.subscription}`);
  
  // Stripeからサブスクリプション詳細を取得
  const subscriptionData = await stripe.subscriptions.retrieve(session.subscription as string);
  console.log('取得したサブスクリプション情報:', subscriptionData);
  
  // 顧客情報をデータベースに登録/更新
  const customerRecord = {
    user_id: userId,
    customer_id: session.customer as string,
  };
  
  console.log('顧客情報をupsertします:', customerRecord);
  
  // supabaseAdminを使用して権限問題を解決
  const { error: customerError } = await supabaseAdmin
    .from('stripe_customers')
    .upsert(customerRecord, {
      onConflict: 'user_id',
    });
  
  if (customerError) {
    console.error('顧客情報の保存エラー:', customerError);
    throw customerError;
  }
  
  console.log('顧客情報を保存しました');

  // データベース挿入処理の詳細デバッグ
  try {
    // 現在のサブスクリプション情報をデータベースに保存/更新
    const subscriptionRecord = {
      userId: userId,
      customerId: session.customer as string,
      subscriptionId: subscriptionData.id,
      priceId: subscriptionData.items.data[0]?.price.id,
      status: subscriptionData.status,
      currentPeriodStart: subscriptionData.items.data[0]?.current_period_start,
      currentPeriodEnd: subscriptionData.items.data[0]?.current_period_end,
      cancelAtPeriodEnd: subscriptionData.cancel_at_period_end,
      updatedAt: new Date().toISOString(),
    };
    
    console.log('保存するサブスクリプションデータ:', subscriptionRecord);

    // supabaseAdminを使用して権限問題を解決
    const { data, error } = await supabaseAdmin
      .from('stripe_user_subscriptions')
      .upsert(subscriptionRecord, {
        onConflict: 'subscriptionId',
      })
      .select('*')
      .single();

    if (error) {
      console.error('サブスクリプションデータ保存エラー:', error);
      throw error;
    }

    console.log('サブスクリプションデータを保存しました:', data);
    
    return data;
  } catch (error) {
    console.error('サブスクリプションデータ更新中のエラー:', error);
    throw error;
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

  // サブスクリプション情報を更新
  const subscriptionRecord = {
    userId: userId,
    customerId: subscription.customer as string,
    subscriptionId: subscription.id,
    priceId: subscription.items.data[0]?.price.id,
    status: subscription.status,
    currentPeriodStart: subscription.items.data[0]?.current_period_start,
    currentPeriodEnd: subscription.items.data[0]?.current_period_end,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    updatedAt: new Date().toISOString(),
  };
  
  console.log('更新するサブスクリプションデータ:', subscriptionRecord);

  // supabaseAdminを使用して権限問題を解決
  const { data, error } = await supabaseAdmin
    .from('stripe_user_subscriptions')
    .upsert(subscriptionRecord, {
      onConflict: 'subscriptionId',
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

  // サブスクリプションステータスを更新
  // supabaseAdminを使用して権限問題を解決
  const { data, error } = await supabaseAdmin
    .from('stripe_user_subscriptions')
    .update({
      status: 'canceled',
      updatedAt: new Date().toISOString(),
    })
    .eq('subscriptionId', subscription.id)
    .select();

  if (error) {
    console.error('サブスクリプションキャンセルデータ更新エラー:', error);
    throw error;
  }

  console.log('サブスクリプションキャンセル完了:', data);
} 