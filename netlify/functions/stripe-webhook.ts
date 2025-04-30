import { Handler } from '@netlify/functions';
import Stripe from 'stripe';

// Stripeクライアントの初期化
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any, // 型エラーを回避
});

// Webhookのシークレット（環境変数から取得）
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Stripe Webhookを処理するNetlify Function
 * 
 * このWebhookは以下のイベントを処理します：
 * - checkout.session.completed: ユーザーが支払いを完了したとき
 * - subscription.created: 新しいサブスクリプションが作成されたとき
 * - subscription.updated: サブスクリプションが更新されたとき
 * - subscription.deleted: サブスクリプションがキャンセルされたとき
 */
export const handler: Handler = async (event) => {
  try {
    // リクエストボディがない場合はエラー
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing request body' }),
      };
    }

    let stripeEvent;
    
    // 本番環境では署名を検証する
    if (process.env.NODE_ENV === 'production' && endpointSecret) {
      const signature = event.headers['stripe-signature'];
      
      if (!signature) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: 'Missing stripe signature' }),
        };
      }
      
      try {
        stripeEvent = stripe.webhooks.constructEvent(
          event.body,
          signature,
          endpointSecret
        );
      } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return {
          statusCode: 400,
          body: JSON.stringify({ message: `Webhook Error: ${err.message}` }),
        };
      }
    } else {
      // 開発環境では検証をスキップ
      stripeEvent = JSON.parse(event.body);
    }

    // イベントタイプに基づいて処理
    console.log(`Processing Stripe event: ${stripeEvent.type}`);
    
    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        // 支払い完了時の処理
        const session = stripeEvent.data.object;
        console.log(`Payment successful for session: ${session.id}`);
        
        // ユーザーのサブスクリプションステータスを更新
        await handleCheckoutSessionCompleted(session);
        break;
      }
      case 'subscription.created': {
        // サブスクリプション作成時の処理
        const subscription = stripeEvent.data.object;
        console.log(`Subscription created: ${subscription.id}`);
        
        await handleSubscriptionCreated(subscription);
        break;
      }
      case 'subscription.updated': {
        // サブスクリプション更新時の処理
        const subscription = stripeEvent.data.object;
        console.log(`Subscription updated: ${subscription.id}`);
        
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case 'subscription.deleted': {
        // サブスクリプションキャンセル時の処理
        const subscription = stripeEvent.data.object;
        console.log(`Subscription cancelled: ${subscription.id}`);
        
        await handleSubscriptionDeleted(subscription);
        break;
      }
      default:
        // その他のイベントは無視
        console.log(`Unhandled event type: ${stripeEvent.type}`);
    }

    // 処理成功
    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (error) {
    console.error('Error processing Stripe webhook:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};

// 以下は実装すべきハンドラー関数（現時点ではスタブ）

/**
 * チェックアウトセッション完了ハンドラー
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  // ユーザー情報を取得
  const customerId = session.customer as string;
  const customerEmail = session.customer_details?.email;
  
  console.log(`Processing checkout for customer ${customerId} (${customerEmail})`);
  
  // TODO: データベースでユーザーとサブスクリプションのステータスを更新
  // TODO: メール通知などの処理
}

/**
 * サブスクリプション作成ハンドラー
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const status = subscription.status;
  
  console.log(`New subscription ${subscription.id} for customer ${customerId} with status ${status}`);
  
  // TODO: データベースにサブスクリプション情報を保存
}

/**
 * サブスクリプション更新ハンドラー
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const status = subscription.status;
  
  console.log(`Updated subscription ${subscription.id} for customer ${customerId} with status ${status}`);
  
  // TODO: データベースのサブスクリプション情報を更新
}

/**
 * サブスクリプション削除ハンドラー
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  
  console.log(`Deleted subscription ${subscription.id} for customer ${customerId}`);
  
  // TODO: データベースでサブスクリプションをキャンセル状態に更新
} 