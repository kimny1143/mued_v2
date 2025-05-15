import Stripe from 'stripe';

// Stripeインスタンスの初期化
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

// 環境変数が設定されているか確認
if (!stripeSecretKey) {
  console.error('STRIPE_SECRET_KEY環境変数が設定されていません。');
}

// API接続の設定とタイムアウト設定の追加
export const stripe = new Stripe(stripeSecretKey || 'dummy_key_for_development', {
  // @ts-expect-error: Stripe型定義の更新に対応
  apiVersion: '2023-10-16',
  typescript: true,
  appInfo: {
    name: 'MUED LMS',
    version: '1.0.0',
  },
  maxNetworkRetries: 5,  // ネットワーク接続の再試行回数をさらに増やす
  timeout: 60000, // タイムアウトを60秒に延長
  telemetry: false, // テレメトリを無効化
  host: 'api.stripe.com', // 明示的にホストを指定
  protocol: 'https', // 明示的にプロトコルを指定
});

// 環境に関する情報をログに記録
console.log('Stripe初期化完了:', {
  env: process.env.NODE_ENV,
  vercel: process.env.VERCEL,
  vercelEnv: process.env.VERCEL_ENV,
  hasKey: !!stripeSecretKey,
  keyPrefix: stripeSecretKey ? stripeSecretKey.substring(0, 7) : 'なし',
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

// 決済セッションの作成
export async function createCheckoutSession({
  priceId,
  successUrl,
  cancelUrl,
  customerId,
  metadata,
  mode = 'payment',
  clientReferenceId,
}: {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerId?: string;
  metadata?: Record<string, string>;
  mode?: 'payment' | 'subscription';
  clientReferenceId?: string;
}): Promise<Stripe.Checkout.Session> {
  console.log('Stripeセッション作成開始:', { priceId, mode });
  
  return safeStripeCall(
    async () => {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: mode,
        success_url: successUrl,
        cancel_url: cancelUrl,
        ...(customerId ? { customer: customerId } : {}),
        ...(metadata ? { metadata } : {}),
        ...(clientReferenceId ? { client_reference_id: clientReferenceId } : {}),
      });
      
      console.log('Stripeセッション作成成功:', { sessionId: session.id });
      return session;
    },
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

// 決済セッションの取得
export async function getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent', 'subscription', 'customer'],
  });
} 