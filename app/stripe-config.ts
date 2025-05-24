export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
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
  // テスト環境では常にテスト用IDを使用するよう変更
  // ブラウザ環境では常にフォールバック（テスト）IDを使用
  return typeof window !== 'undefined' || !isVercelProd() ? fallbackId : realPriceId;
}

// 新しいプラン設定（新ランディングページの仕様に合わせる）
export const products: StripeProduct[] = [
  // フリープラン（Stripeを使わない）
  {
    id: 'free_plan',
    priceId: 'free',
    name: 'FREE',
    description: '音楽学習を始めるための基本機能',
    mode: 'subscription',
    price: 0,
    features: [
      '基本教材アクセス',
      'AI教材：月3本まで',
      '体験レッスン1回',
      '広告表示'
    ],
    recommended: false
  },
  // Starterプラン
  {
    id: 'prod_starter',
    priceId: getPriceId(
      process.env.NEXT_PUBLIC_SUBSCRIPTION_STARTER_ID || 'price_1RSJfeRYtspYtD2zxmNaKWhM', 
      'price_test_starter'
    ),
    name: 'Starter',
    description: '本格的な音楽学習をスタート',
    mode: 'subscription',
    price: 500,
    features: [
      '広告表示なし',
      'レッスン予約枠：1件/月',
      '教材アクセス',
      'AI教材：月3本まで',
      'AIカリキュラム'
    ],
    recommended: false
  },
  // PROプラン（最も人気）
  {
    id: 'prod_pro',
    priceId: getPriceId(
      process.env.NEXT_PUBLIC_SUBSCRIPTION_PRO_ID || 'price_1RSJgpRYtspYtD2zpj4ol1rq',
      'price_test_pro'
    ),
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
    recommended: true
  },
  // Premiumプラン
  {
    id: 'prod_premium',
    priceId: getPriceId(
      process.env.NEXT_PUBLIC_SUBSCRIPTION_PREMIUM_ID || 'price_1RMJdXRYtspYtD2zESbuO5mG',
      'price_test_premium'
    ),
    name: 'Premium',
    description: 'すべての機能を無制限で利用',
    mode: 'subscription',
    price: 5980,
    features: [
      'PROの全機能',
      'AI教材無制限',
      'メンターマッチング優先',
      'グループ／個別レッスン枠：無制限'
    ],
    recommended: false
  },
  // スポットレッスン（単発支払い）
  {
    id: 'prod_test_spot_lesson',
    priceId: 'price_test_spot_lesson',
    name: 'Spot Lesson',
    description: 'One-time lesson with an expert instructor',
    mode: 'payment',
    price: 3000,
    features: [
      '単発レッスン',
      '専門講師によるマンツーマン指導',
      '録画レッスン提供'
    ],
    recommended: false
  }
];

// サブスクリプションプランのみ取得
export const getSubscriptionPlans = (): StripeProduct[] => {
  return products.filter(product => product.mode === 'subscription');
};

// 単発支払いプランのみ取得
export const getPaymentPlans = (): StripeProduct[] => {
  return products.filter(product => product.mode === 'payment');
};

// プラン名でプランを取得
export const getPlanByName = (name: string): StripeProduct | undefined => {
  return products.find(product => product.name === name);
};

// 価格IDでプランを取得
export const getPlanByPriceId = (priceId: string): StripeProduct | undefined => {
  return products.find(product => product.priceId === priceId);
};