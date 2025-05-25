import Stripe from 'stripe';

const useMock = process.env.STRIPE_MOCK === 'true';
const apiKey = useMock ? 'sk_test_mock' : process.env.STRIPE_SECRET_KEY;

if (!apiKey) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(apiKey, {
  // @ts-expect-error: stripe-mock は古い API バージョンを使用
  apiVersion: '2022-11-15',
  ...(useMock && {
    host: 'localhost',
    port: 12111,
    protocol: 'http',
  }),
  typescript: true,
  appInfo: {
    name: 'mued-lms',
    version: '0.1.0',
  },
  maxNetworkRetries: 5,  // ネットワーク接続の再試行回数をさらに増やす
  timeout: 60000, // タイムアウトを60秒に延長
  telemetry: false, // テレメトリを無効化
});

// デバッグ用ログ
console.log('Stripe クライアント初期化:', {
  isMock: useMock,
  vercel: process.env.VERCEL,
  vercelEnv: process.env.VERCEL_ENV,
  hasKey: !!apiKey,
  keyPrefix: apiKey ? apiKey.substring(0, 7) : 'なし',
});

// Stripeエラーのラッパー関数（再利用可能）
export async function safeStripeCall<T>(
  apiCall: () => Promise<T>, 
  errorMessage = 'Stripe API呼び出しエラー'
): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    console.error(`${errorMessage}:`, error);
    
    // エラーメッセージを整形
    let enhancedError;
    if (error instanceof Error) {
      enhancedError = new Error(`${errorMessage}: ${error.message}`);
      // 元のエラーのスタックトレースを保持
      enhancedError.stack = error.stack;
    } else {
      enhancedError = new Error(`${errorMessage}: 不明なエラー`);
    }
    
    throw enhancedError;
  }
}

// 10分間のキャッシュ設定
const CACHE_TTL = 10 * 60 * 1000; // 10分（ミリ秒）

type CacheItem<T> = {
  value: T;
  expiresAt: number;
};

// シンプルなキャッシュマネージャー
const cache: Record<string, CacheItem<unknown>> = {};

// キャッシュから値を取得
function getCached<T>(key: string): T | null {
  const item = cache[key];
  if (!item) return null;
  
  if (Date.now() > item.expiresAt) {
    delete cache[key];
    return null;
  }
  
  return item.value as T;
}

// キャッシュに値を設定
function setCached<T>(key: string, value: T): void {
  cache[key] = {
    value,
    expiresAt: Date.now() + CACHE_TTL,
  };
}

// 価格情報を取得（キャッシュ付き）
export async function getPrices(options?: {
  active?: boolean;
  product?: string;
  type?: 'one_time' | 'recurring';
}): Promise<Stripe.Price[]> {
  const cacheKey = `prices:${JSON.stringify(options || {})}`;
  const cached = getCached<Stripe.Price[]>(cacheKey);
  
  if (cached) return cached;

  const prices = await stripe.prices.list({
    ...options,
    limit: 100,
    expand: ['data.product'],
  });

  setCached(cacheKey, prices.data);
  return prices.data;
}

// 製品情報を取得（キャッシュ付き）
export async function getProducts(options?: {
  active?: boolean;
  ids?: string[];
}): Promise<Stripe.Product[]> {
  const cacheKey = `products:${JSON.stringify(options || {})}`;
  const cached = getCached<Stripe.Product[]>(cacheKey);
  
  if (cached) return cached;

  let products: Stripe.Product[];
  
  if (options?.ids && options.ids.length > 0) {
    // 個別にプロダクトを取得し配列に結合
    products = await Promise.all(
      options.ids.map(id => stripe.products.retrieve(id))
    );
  } else {
    // リストから取得
    const result = await stripe.products.list({
      active: options?.active,
      limit: 100,
    });
    products = result.data;
  }

  setCached(cacheKey, products);
  return products;
}

// 商品と価格情報を一緒に取得
export async function getProductsWithPrices(options?: {
  active?: boolean;
}): Promise<Array<Stripe.Product & { prices: Stripe.Price[] }>> {
  const products = await getProducts(options);
  const prices = await getPrices({
    active: options?.active,
  });

  // 製品ごとに価格をグループ化
  return products.map(product => ({
    ...product,
    prices: prices.filter(price => price.product === product.id),
  }));
}

// 月額プランの取得
export async function getMonthlyPrices(options?: {
  active?: boolean;
  product?: string;
}): Promise<Stripe.Price[]> {
  const prices = await getPrices({
    ...options,
    type: 'recurring',
  });

  return prices.filter(price => 
    price.recurring?.interval === 'month'
  );
}

// 年額プランの取得
export async function getYearlyPrices(options?: {
  active?: boolean;
  product?: string;
}): Promise<Stripe.Price[]> {
  const prices = await getPrices({
    ...options,
    type: 'recurring',
  });

  return prices.filter(price => 
    price.recurring?.interval === 'year'
  );
}

// サブスクリプション関連の型定義
export type StripeSubscription = Stripe.Subscription & {
  customer: Stripe.Customer;
  items: {
    data: Array<{
      price: Stripe.Price;
      quantity: number;
    }>;
  };
  status: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'trialing' | 'unpaid';
  current_period_end: number;
  cancel_at_period_end: boolean;
};

// チェックアウトセッションの型定義
export type StripeCheckoutSession = Stripe.Checkout.Session & {
  customer: Stripe.Customer;
  subscription?: StripeSubscription;
  payment_intent?: Stripe.PaymentIntent;
};

// 決済セッションの作成
export async function createCheckoutSession({
  priceId,
  slotId,
  reservationId,
  successUrl,
  cancelUrl,
  customerId,
  metadata,
  mode = 'payment',
  clientReferenceId,
}: {
  priceId?: string;
  slotId?: string;
  reservationId?: string;
  successUrl: string;
  cancelUrl: string;
  customerId?: string;
  metadata?: Record<string, string>;
  mode?: 'payment' | 'subscription';
  clientReferenceId?: string;
}): Promise<Stripe.Checkout.Session> {
  // 予約用のメタデータを構築
  const reservationMetadata = {
    ...metadata,
    ...(slotId && { slotId }),
    ...(reservationId && { reservationId }),
  };

  // 予約用のクライアントリファレンスIDを構築
  const reservationClientReferenceId = clientReferenceId || 
    (slotId && reservationId ? `${slotId}:${reservationId}` : undefined);

  return await safeStripeCall(
    () => stripe.checkout.sessions.create({
      mode,
      payment_method_types: ['card'],
      line_items: priceId ? [{
        price: priceId,
        quantity: 1,
      }] : undefined,
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer: customerId,
      metadata: reservationMetadata,
      client_reference_id: reservationClientReferenceId,
    }),
    'チェックアウトセッションの作成に失敗しました'
  );
}

// 一回限りの決済セッションの作成
export async function createOneTimePriceCheckoutSession({
  unitAmount,
  currency,
  name,
  description,
  successUrl,
  cancelUrl,
  customerId,
  metadata,
}: {
  unitAmount: number;
  currency: string;
  name: string;
  description?: string;
  successUrl: string;
  cancelUrl: string;
  customerId?: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.Checkout.Session> {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency,
          product_data: {
            name,
            ...(description ? { description } : {}),
          },
          unit_amount: unitAmount,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    ...(customerId ? { customer: customerId } : {}),
    ...(metadata ? { metadata } : {}),
  });

  return session;
}

// サブスクリプションのチェックアウトセッション作成
export async function createSubscriptionCheckoutSession({
  priceId,
  successUrl,
  cancelUrl,
  customerId,
  metadata,
  trialDays,
}: {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerId?: string;
  metadata?: Record<string, string>;
  trialDays?: number;
}): Promise<Stripe.Checkout.Session> {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    ...(customerId ? { customer: customerId } : {}),
    ...(metadata ? { metadata } : {}),
    ...(trialDays ? { subscription_data: { trial_period_days: trialDays } } : {}),
  });

  return session;
}

// 既存のサブスクリプションを考慮したチェックアウトセッション作成
export async function createOrUpdateSubscriptionCheckout({
  priceId,
  successUrl,
  cancelUrl,
  customerId,
  userId,
  metadata,
  trialDays,
}: {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerId?: string;
  userId?: string;
  metadata?: Record<string, string>;
  trialDays?: number;
}): Promise<Stripe.Checkout.Session | { url: string }> {
  try {
    // 既存の顧客IDがある場合、アクティブなサブスクリプションを確認
    if (customerId) {
      console.log('既存顧客のサブスクリプションを確認:', customerId);
      
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        const existingSubscription = subscriptions.data[0];
        console.log('既存のサブスクリプションを発見:', existingSubscription.id);
        
        // 同じ価格IDの場合はリダイレクトのみ
        if (existingSubscription.items.data[0].price.id === priceId) {
          console.log('同じプランへの変更要求 - リダイレクトのみ実行');
          return { url: successUrl };
        }
        
        // 異なる価格IDの場合はプラン変更
        console.log('プラン変更を実行:', priceId);
        
        // サブスクリプションアイテムを更新
        const updatedSubscription = await stripe.subscriptions.update(existingSubscription.id, {
          items: [{
            id: existingSubscription.items.data[0].id,
            price: priceId,
          }],
          proration_behavior: 'create_prorations', // 日割り計算を行う
          metadata: {
            ...existingSubscription.metadata,
            ...metadata,
            updated_at: new Date().toISOString(),
          },
        });

        console.log('サブスクリプション更新成功:', updatedSubscription.id);
        
        // プラン変更が完了したので成功URLにリダイレクト
        return { url: successUrl.replace('{CHECKOUT_SESSION_ID}', 'upgrade_' + updatedSubscription.id) };
      }
    }

    // 新規サブスクリプションの場合は通常のチェックアウトセッション作成
    console.log('新規サブスクリプションのチェックアウトセッション作成');
    return await createSubscriptionCheckoutSession({
      priceId,
      successUrl,
      cancelUrl,
      customerId,
      metadata: {
        ...metadata,
        userId: userId || 'unknown',
      },
      trialDays,
    });
    
  } catch (error) {
    console.error('サブスクリプション処理エラー:', error);
    // エラーが発生した場合は通常のチェックアウトセッション作成にフォールバック
    return await createSubscriptionCheckoutSession({
      priceId,
      successUrl,
      cancelUrl,
      customerId,
      metadata,
      trialDays,
    });
  }
}

// 顧客IDを取得または作成する関数
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<string> {
  try {
    // まず既存の顧客を検索
    const customers = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (customers.data.length > 0) {
      console.log('既存のStripe顧客を発見:', customers.data[0].id);
      return customers.data[0].id;
    }

    // 新規顧客を作成
    const customer = await stripe.customers.create({
      email,
      name: name || email,
      metadata: {
        userId,
      },
    });

    console.log('新規Stripe顧客を作成:', customer.id);
    return customer.id;
    
  } catch (error) {
    console.error('Stripe顧客の取得/作成エラー:', error);
    throw error;
  }
}

// 決済セッションの取得
export async function getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent', 'subscription', 'customer'],
  });
}

// 予約用の決済セッション作成関数
export async function createCheckoutSessionForReservation(
  userId: string | null | undefined,
  userEmail: string | null | undefined,
  reservationId: string,
  amount: number,
  currency: string | null | undefined,
  details: {
    teacher: string;
    date: string;
    time: string;
    duration: string;
  },
  customUrls?: {
    successUrl?: string;
    cancelUrl?: string;
  }
): Promise<Stripe.Checkout.Session> {
  // ベースURLの取得 - 本番環境を優先
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
    'https://dev.mued.jp' || // 明示的にdev.mued.jpを指定
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  console.log('Stripe決済用ベースURL:', baseUrl);
  console.log('使用している環境変数:', {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    VERCEL_URL: process.env.VERCEL_URL,
    VERCEL_ENV: process.env.VERCEL_ENV
  });

  // リダイレクトURL（カスタムURLが指定されていればそれを使用、なければデフォルト）
  const successUrl = customUrls?.successUrl || `${baseUrl}/dashboard/reservations/success?reservation_id=${reservationId}`;
  const cancelUrl = customUrls?.cancelUrl || `${baseUrl}/dashboard/reservations?canceled=true`;

  console.log('決済成功時URL:', successUrl);
  console.log('決済キャンセル時URL:', cancelUrl);

  // nullやundefinedの値のフォールバック
  const safeUserId = userId || 'unknown-user';
  const safeUserEmail = userEmail || 'unknown@example.com';
  const safeCurrency = (currency || 'jpy').toLowerCase();

  return await safeStripeCall(
    () => stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: safeCurrency,
          product_data: {
            name: `${details.teacher}先生のレッスン予約`,
            description: `${details.date} ${details.time}（${details.duration}）`,
          },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: reservationId,
      customer_email: safeUserEmail,
      metadata: {
        userId: safeUserId,
        reservationId,
        teacher: details.teacher,
        date: details.date,
        time: details.time,
        duration: details.duration
      },
    }),
    '予約用決済セッション作成エラー'
  );
} 