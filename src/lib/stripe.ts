import { supabase } from './supabase';
import Stripe from 'stripe';

// Stripeインスタンスの初期化
const stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY || '';
export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
  typescript: true,
});

// キャッシュストレージ
interface CacheItem<T> {
  data: T;
  timestamp: number;
}

const cache: {
  [key: string]: CacheItem<unknown>;
} = {};

// キャッシュの有効期間（10分）
const CACHE_TTL = 10 * 60 * 1000;

/**
 * キャッシュされたデータを取得または新しいデータをフェッチする
 * @param key キャッシュキー
 * @param fetchFn データ取得関数
 * @param ttl キャッシュ有効期間（ミリ秒）
 */
async function getCachedData<T>(key: string, fetchFn: () => Promise<T>, ttl: number = CACHE_TTL): Promise<T> {
  const now = Date.now();
  const cachedItem = cache[key];

  // キャッシュが有効な場合はキャッシュデータを返す
  if (cachedItem && now - cachedItem.timestamp < ttl) {
    return cachedItem.data as T;
  }

  // データをフェッチして、キャッシュに格納
  const data = await fetchFn();
  cache[key] = {
    data,
    timestamp: now,
  };

  return data;
}

/**
 * 料金プラン一覧を取得
 * @param options 検索オプション
 */
export async function getPrices(options?: Stripe.PriceListParams): Promise<Stripe.Price[]> {
  const cacheKey = `prices:${JSON.stringify(options || {})}`;
  
  return getCachedData(cacheKey, async () => {
    const prices = await stripe.prices.list({
      active: true,
      expand: ['data.product'],
      ...options,
    });
    return prices.data;
  });
}

/**
 * 特定のIDの料金プランを取得
 * @param priceId 料金プランID
 */
export async function getPriceById(priceId: string): Promise<Stripe.Price> {
  const cacheKey = `price:${priceId}`;
  
  return getCachedData(cacheKey, async () => {
    return await stripe.prices.retrieve(priceId, {
      expand: ['product'],
    });
  });
}

/**
 * 月額プランと年額プランの価格を取得
 */
export async function getSubscriptionPlans(): Promise<{
  monthly: Stripe.Price[];
  yearly: Stripe.Price[];
}> {
  const cacheKey = 'subscription-plans';
  
  return getCachedData(cacheKey, async () => {
    const prices = await stripe.prices.list({
      active: true,
      expand: ['data.product'],
      type: 'recurring',
    });
    
    return {
      monthly: prices.data.filter(price => price.recurring?.interval === 'month'),
      yearly: prices.data.filter(price => price.recurring?.interval === 'year'),
    };
  });
}

/**
 * 製品カタログを取得
 */
export async function getProducts(options?: Stripe.ProductListParams): Promise<Stripe.Product[]> {
  const cacheKey = `products:${JSON.stringify(options || {})}`;
  
  return getCachedData(cacheKey, async () => {
    const products = await stripe.products.list({
      active: true,
      ...options,
    });
    return products.data;
  });
}

/**
 * 製品カタログと料金を取得してマージする
 */
export async function getProductsWithPrices(): Promise<Array<Stripe.Product & { prices: Stripe.Price[] }>> {
  const cacheKey = 'products-with-prices';
  
  return getCachedData(cacheKey, async () => {
    const [products, prices] = await Promise.all([
      getProducts(),
      getPrices(),
    ]);
    
    // 製品ごとに価格をグループ化
    const pricesByProduct: { [key: string]: Stripe.Price[] } = {};
    prices.forEach(price => {
      const productId = typeof price.product === 'string' ? price.product : price.product?.id;
      if (!productId) return;
      
      if (!pricesByProduct[productId]) {
        pricesByProduct[productId] = [];
      }
      pricesByProduct[productId].push(price);
    });
    
    // 製品オブジェクトに価格を追加
    return products.map(product => ({
      ...product,
      prices: pricesByProduct[product.id] || [],
    }));
  });
}

export async function createCheckoutSession(priceId: string, mode: 'payment' | 'subscription') {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('No session found');
    }

    // 環境変数に基づいてエンドポイントを選択
    const apiEndpoint = import.meta.env.PROD 
      ? `${import.meta.env.SUPABASE_URL_PROD}/functions/v1/stripe-checkout`
      : `${import.meta.env.SUPABASE_URL}/functions/v1/stripe-checkout`;

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        price_id: priceId,
        success_url: `${window.location.origin}/success`,
        cancel_url: `${window.location.origin}/cancel`,
        mode,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create checkout session');
    }

    const { url } = await response.json();
    return url;
  } catch (error: unknown) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

/**
 * キャッシュをクリア
 */
export function clearCache(key?: string): void {
  if (key) {
    delete cache[key];
  } else {
    Object.keys(cache).forEach(k => delete cache[k]);
  }
}