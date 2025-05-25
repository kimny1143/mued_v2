import { env } from "process";

export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  mode: 'subscription' | 'payment';
  price: number; // 月額料金（円）
  originalPrice?: number; // 元の価格（割引がある場合）
  features: string[]; // 機能リスト
  recommended?: boolean; // おすすめプランかどうか
}

// Vercelプロダクション環境かどうかを判定
function isVercelProd(): boolean {
  return process.env.VERCEL_ENV === 'production';
}

// 環境によって適切な価格IDを返す関数
function getPriceId(realPriceId: string, fallbackId: string): string {
  // 本番環境でのみ実際の価格IDを使用
  if (isVercelProd() && typeof window === 'undefined') {
    return realPriceId;
  }
  return fallbackId;
}

// Stripe価格IDの検証とデバッグ
export function validatePriceIds() {
  const isProduction = process.env.NODE_ENV === 'production';
  const vercelEnv = process.env.VERCEL_ENV;
  
  console.log('Stripe価格ID設定確認:', {
    isProduction,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv,
    starterPriceId: process.env.NEXT_PUBLIC_SUBSCRIPTION_STARTER_ID,
    proPriceId: process.env.NEXT_PUBLIC_SUBSCRIPTION_PRO_ID,
    premiumPriceId: process.env.NEXT_PUBLIC_SUBSCRIPTION_PREMIUM_ID
  });
}

// プラン設定（新しいランディングページに合わせて更新）
export const stripeProducts: StripeProduct[] = [
  {
    id: 'prod_free',
    priceId: 'free', // FREEプランは特別な扱い
    name: 'FREE',
    description: 'まずは無料で体験',
    mode: 'subscription',
    price: 0,
    features: [
      '広告表示あり',
      'レッスン予約枠：1件',
      '録画レッスン無制限',
      '教材アクセス制限あり',
      'AIコンテンツ生成',
      'AIカリキュラム',
    ],
  },
  {
    id: 'prod_starter',
    priceId: process.env.NEXT_PUBLIC_SUBSCRIPTION_STARTER_ID || 'price_1RSJfeRYtspYtD2zxmNaKWhM',
    name: 'Starter',
    description: '本格的な学習を始める',
    mode: 'subscription',
    price: 980,
    features: [
      '広告表示なし',
      'レッスン予約枠：3件/月',
      '録画レッスン無制限',
      '教材アクセス無制限',
      'AI教材：月3本まで',
      'AIカリキュラム',
      'メールサポート'
    ],
  },
  {
    id: 'prod_pro',
    priceId: process.env.NEXT_PUBLIC_SUBSCRIPTION_PRO_ID || 'price_1RSJgpRYtspYtD2zpj4ol1rq',
    name: 'PRO',
    description: 'プロフェッショナル向けの充実機能',
    mode: 'subscription',
    price: 2480,
    features: [
      '広告表示なし',
      'レッスン予約枠：5件/月',
      '録画レッスン無制限',
      '教材アクセス無制限',
      'AI教材：月5本まで',
      'AIカリキュラム',
      'チャットサポート'
    ],
    recommended: true,
  },
  {
    id: 'prod_premium',
    priceId: process.env.NEXT_PUBLIC_SUBSCRIPTION_PREMIUM_ID || 'price_1RMJdXRYtspYtD2zESbuO5mG',
    name: 'Premium',
    description: '最高の学習体験を提供',
    mode: 'subscription',
    price: 4980,
    features: [
      '広告表示なし',
      'レッスン予約枠：無制限',
      '録画レッスン無制限',
      '教材アクセス無制限',
      'AI教材：無制限',
      'AIカリキュラム',
      '優先サポート',
      '限定コンテンツ'
    ],
  },
];

// プランを取得する関数
export function getSubscriptionPlans(): StripeProduct[] {
  // 環境変数の設定を確認
  validatePriceIds();
  return stripeProducts;
}

// 価格IDからプランを取得する関数
export function getPlanByPriceId(priceId: string | null): StripeProduct | undefined {
  if (!priceId) return stripeProducts.find(p => p.priceId === 'free');
  
  // デバッグログ
  console.log('検索する価格ID:', priceId);
  console.log('利用可能なプラン:', stripeProducts.map(p => ({ name: p.name, priceId: p.priceId })));
  
  return stripeProducts.find(product => product.priceId === priceId);
}

// 価格IDを標準化する関数（テスト環境用）
export function normalizeStripePrice(priceId: string): string {
  // 開発環境とテスト環境で異なる価格IDを使用する場合の対応
  const priceMap: Record<string, string> = {
    // 古い価格IDから新しい価格IDへのマッピング（必要に応じて）
    'price_1QmjrpRYtspYtD2z4zGVzQK8': process.env.NEXT_PUBLIC_SUBSCRIPTION_STARTER_ID || 'price_1RSJfeRYtspYtD2zxmNaKWhM',
    'price_1QmjsTRYtspYtD2zMFZvJqZk': process.env.NEXT_PUBLIC_SUBSCRIPTION_PRO_ID || 'price_1RSJgpRYtspYtD2zpj4ol1rq',
    'price_1QmjsyRYtspYtD2z8JtRD2eC': process.env.NEXT_PUBLIC_SUBSCRIPTION_PREMIUM_ID || 'price_1RMJdXRYtspYtD2zESbuO5mG',
  };
  
  return priceMap[priceId] || priceId;
}

// プラン名でプランを取得
export const getPlanByName = (name: string): StripeProduct | undefined => {
  return stripeProducts.find(product => product.name === name);
};