import { env } from "process";

// Stripe価格IDの検証とデバッグ
export function validatePriceIds() {
  const isProduction = process.env.NODE_ENV === 'production';
  const vercelEnv = process.env.VERCEL_ENV;
  
  console.log('🔍 Stripe価格ID設定確認:', {
    isProduction,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv,
    starterPriceId: process.env.NEXT_PUBLIC_SUBSCRIPTION_STARTER_ID,
    proPriceId: process.env.NEXT_PUBLIC_SUBSCRIPTION_PRO_ID,
    premiumPriceId: process.env.NEXT_PUBLIC_SUBSCRIPTION_PREMIUM_ID
  });

  // JPY統一方針の確認
  const priceIds = [
    process.env.NEXT_PUBLIC_SUBSCRIPTION_STARTER_ID,
    process.env.NEXT_PUBLIC_SUBSCRIPTION_PRO_ID,
    process.env.NEXT_PUBLIC_SUBSCRIPTION_PREMIUM_ID
  ];

  console.log('💴 JPY統一方針確認:', {
    allPriceIdsSet: priceIds.every(id => id && id.length > 0),
    priceIds: priceIds.filter(Boolean)
  });
}

// プランのタイプ定義
export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  price: number;
  currency: 'jpy'; // JPY統一
  mode: 'subscription' | 'payment';
  features: string[];
  recommended?: boolean;
  popular?: boolean;
}

// プラン設定（JPY統一、新しいランディングページに合わせて更新）
export const stripeProducts: StripeProduct[] = [
  {
    id: 'prod_free',
    priceId: 'free',
    name: 'FREE',
    description: '基本機能を無料で体験',
    price: 0,
    currency: 'jpy',
    mode: 'subscription',
    features: [
      '基本的な学習コンテンツ',
      'コミュニティアクセス',
      '月1回のグループレッスン',
      '基本的なプログレス追跡'
    ],
  },
  {
    id: 'prod_starter',
    priceId: process.env.NEXT_PUBLIC_SUBSCRIPTION_STARTER_ID || '',
    name: 'Starter',
    description: '個人学習に最適なベーシックプラン',
    price: 2980,
    currency: 'jpy',
    mode: 'subscription',
    features: [
      'すべての学習コンテンツ',
      '月4回の個人レッスン',
      'AI学習アシスタント',
      '詳細なプログレス分析',
      'メンターとのチャット',
      '楽譜・音源ダウンロード'
    ],
  },
  {
    id: 'prod_pro',
    priceId: process.env.NEXT_PUBLIC_SUBSCRIPTION_PRO_ID || '',
    name: 'PRO',
    description: '本格的な音楽学習を目指す方に',
    price: 5980,
    currency: 'jpy',
    mode: 'subscription',
    recommended: true,
    popular: true,
    features: [
      'Starterプランの全機能',
      '月8回の個人レッスン',
      'AI作曲アシスタント',
      'カスタム学習プラン',
      '優先メンターマッチング',
      'レコーディング機能',
      '楽器レンタル割引'
    ],
  },
  {
    id: 'prod_premium',
    priceId: process.env.NEXT_PUBLIC_SUBSCRIPTION_PREMIUM_ID || '',
    name: 'Premium',
    description: 'プロフェッショナル向けの最上位プラン',
    price: 9980,
    currency: 'jpy',
    mode: 'subscription',
    features: [
      'PROプランの全機能',
      '無制限の個人レッスン',
      '専属メンター制度',
      'マスタークラス参加権',
      'プロデューサー紹介',
      'レーベル審査サポート',
      '楽器無料レンタル',
      '24時間サポート'
    ],
  },
];

// 価格IDからプラン情報を取得
export function getPlanByPriceId(priceId: string): StripeProduct | undefined {
  return stripeProducts.find(product => product.priceId === priceId);
}

// プラン名からプラン情報を取得
export function getPlanByName(name: string): StripeProduct | undefined {
  return stripeProducts.find(product => product.name.toLowerCase() === name.toLowerCase());
}

// 有料プランのみを取得
export function getPaidPlans(): StripeProduct[] {
  return stripeProducts.filter(product => product.priceId !== 'free');
}

// JPY価格のフォーマット
export function formatJPYPrice(price: number): string {
  if (price === 0) return '無料';
  return `¥${price.toLocaleString('ja-JP')}/月`;
}

// プラン比較用のデータ
export function getPlansForComparison(): StripeProduct[] {
  return stripeProducts.map(plan => ({
    ...plan,
    formattedPrice: formatJPYPrice(plan.price)
  }));
}