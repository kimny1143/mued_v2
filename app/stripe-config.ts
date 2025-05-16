export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
}

// Vercel環境とローカル環境の違いを検出する関数
function isVercelProd(): boolean {
  // VERCEL_ENV === 'production'の場合のみtrueを返す（Vercelの本番デプロイ環境）
  return process.env.VERCEL_ENV === 'production';
}

// 環境によって適切な価格IDを返す関数
function getPriceId(realPriceId: string, fallbackId: string): string {
  // テスト環境では常にテスト用IDを使用するよう変更
  // ブラウザ環境では常にフォールバック（テスト）IDを使用
  return typeof window !== 'undefined' || !isVercelProd() ? fallbackId : realPriceId;
}

// Stripeサンドボックスモードで作成した製品と価格ID
export const products: StripeProduct[] = [
  {
    id: 'prod_test_spot_lesson',
    priceId: 'price_test_spot_lesson',
    name: 'Spot Lesson',
    description: 'One-time lesson with an expert instructor',
    mode: 'payment',
  },
  {
    id: 'prod_SGrMMxymyqkwTz',
    priceId: getPriceId('price_1RMJdXRYtspYtD2zESbuO5mG', 'price_test_premium'),
    name: 'Premium Subscription',
    description: 'Full access to all premium features and content',
    mode: 'subscription',
  },
  {
    id: 'prod_SGrLpJJwwRtj6h',
    priceId: getPriceId('price_1RMJcpRYtspYtD2zQjRRmLXc', 'price_test_starter'),
    name: 'Starter Subscription',
    description: 'Basic access to learning materials',
    mode: 'subscription',
  },
  {
    id: 'prod_SGrKXJgrKyLhTI',
    priceId: getPriceId('price_1RMJc0RYtspYtD2zcfoCAsph', 'price_test_basic'),
    name: 'Basic Subscription',
    description: 'Essential features for beginners',
    mode: 'subscription',
  },
];