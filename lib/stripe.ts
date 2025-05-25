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
  console.log('🔍 サブスクリプション処理開始:', { priceId, customerId });

  // 既存のサブスクリプションをチェック
  if (customerId) {
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 10,
      });

      console.log('既存サブスクリプション確認:', {
        count: subscriptions.data.length,
        subscriptions: subscriptions.data.map(sub => ({
          id: sub.id,
          status: sub.status,
          currency: sub.currency,
          priceId: sub.items.data[0]?.price.id
        }))
      });

      if (subscriptions.data.length > 0) {
        const existingSub = subscriptions.data[0];
        const currentPriceId = existingSub.items.data[0]?.price.id;
        const currentCurrency = existingSub.currency;

        console.log('既存サブスクリプション詳細:', {
          id: existingSub.id,
          currentPriceId,
          currentCurrency,
          newPriceId: priceId
        });

        // 同じ価格IDの場合は何もしない
        if (currentPriceId === priceId) {
          console.log('⚠️ 同じプランのため処理をスキップ');
          throw new Error('既に同じプランに加入しています');
        }

        // 通貨が異なる場合（USD→JPY移行）の処理
        if (currentCurrency !== 'jpy') {
          console.log('🔄 通貨移行処理: USD→JPY - 新しい顧客を作成');
          
          // 既存のサブスクリプションをキャンセル
          await stripe.subscriptions.update(existingSub.id, {
            cancel_at_period_end: true,
            metadata: {
              ...existingSub.metadata,
              migration_reason: 'currency_change_usd_to_jpy',
              old_price_id: currentPriceId,
              new_price_id: priceId,
              migration_date: new Date().toISOString(),
            }
          });

          console.log('✅ 既存USDサブスクリプションを期間終了時にキャンセル設定');

          // 既存顧客の情報を取得
          const existingCustomer = await stripe.customers.retrieve(customerId);
          
          if (existingCustomer.deleted) {
            throw new Error('Customer has been deleted');
          }
          
          // 新しい顧客を作成（通貨混在を回避）
          const newCustomer = await stripe.customers.create({
            email: existingCustomer.email || undefined,
            name: existingCustomer.name || undefined,
            metadata: {
              ...existingCustomer.metadata,
              migration_from: customerId,
              migration_reason: 'currency_unification_usd_to_jpy',
              migration_date: new Date().toISOString(),
            },
          });

          console.log('🆕 新しいJPY専用顧客を作成:', newCustomer.id);

          // 新しい顧客でJPYサブスクリプションを作成
          const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
            mode: 'subscription',
            success_url: successUrl,
            cancel_url: cancelUrl,
            customer: newCustomer.id, // 新しい顧客IDを使用
            metadata: {
              ...metadata,
              migration_type: 'usd_to_jpy',
              old_subscription_id: existingSub.id,
              old_customer_id: customerId,
              new_customer_id: newCustomer.id,
            },
            subscription_data: {
              metadata: {
                migration_from: existingSub.id,
                migration_reason: 'currency_unification',
                old_customer_id: customerId,
              },
              ...(trialDays ? { trial_period_days: trialDays } : {}),
            },
          });

          return session;
        }

        // 同じ通貨（JPY）内でのプラン変更
        console.log('🔄 JPY内でのプラン変更処理');
        
        // Stripe Billing Portalを使用してプラン変更
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: successUrl,
        });

        // Billing Portalへのリダイレクト用の特別なセッションを作成
        return {
          id: `portal_${portalSession.id}`,
          url: portalSession.url,
          // その他の必要なプロパティはダミー値
        } as Stripe.Checkout.Session;
      }
    } catch (error) {
      console.error('既存サブスクリプション確認エラー:', error);
      
      // 通貨混在エラーの場合は、新しい顧客を作成して回避
      if (error instanceof Error && error.message.includes('cannot combine currencies')) {
        console.log('🚨 通貨混在エラー検出 - 新しい顧客を作成して回避');
        
        try {
          // 既存顧客の情報を取得
          const existingCustomer = await stripe.customers.retrieve(customerId);
          
          if (existingCustomer.deleted) {
            throw new Error('Customer has been deleted');
          }
          
          // 新しい顧客を作成（通貨混在を回避）
          const newCustomer = await stripe.customers.create({
            email: existingCustomer.email || undefined,
            name: existingCustomer.name || undefined,
            metadata: {
              ...existingCustomer.metadata,
              migration_from: customerId,
              migration_reason: 'currency_unification_usd_to_jpy',
              migration_date: new Date().toISOString(),
            },
          });

          console.log('🆕 通貨混在回避のため新しい顧客を作成:', newCustomer.id);

          // 新しい顧客でサブスクリプションを作成
          const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
            mode: 'subscription',
            success_url: successUrl,
            cancel_url: cancelUrl,
            customer: newCustomer.id,
            metadata: {
              ...metadata,
              migration_type: 'currency_conflict_resolution',
              old_customer_id: customerId,
              new_customer_id: newCustomer.id,
            },
            ...(trialDays ? { subscription_data: { trial_period_days: trialDays } } : {}),
          });

          return session;
        } catch (migrationError) {
          console.error('顧客移行処理エラー:', migrationError);
          // 移行に失敗した場合は、顧客IDなしで新規作成
          customerId = undefined;
        }
      } else {
        // その他のエラーの場合は新規作成を続行
        console.log('その他のエラーのため新規作成を続行');
      }
    }
  }

  // 新規サブスクリプション作成
  console.log('🆕 新規サブスクリプション作成');
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