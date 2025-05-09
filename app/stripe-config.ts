export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
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
    priceId: 'price_1RMJdXRYtspYtD2zESbuO5mG',
    name: 'Premium Subscription',
    description: 'Full access to all premium features and content',
    mode: 'subscription',
  },
  {
    id: 'prod_SGrLpJJwwRtj6h',
    priceId: 'price_1RMJcpRYtspYtD2zQjRRmLXc',
    name: 'Starter Subscription',
    description: 'Basic access to learning materials',
    mode: 'subscription',
  },
  {
    id: 'prod_SGrKXJgrKyLhTI',
    priceId: 'price_1RMJc0RYtspYtD2zcfoCAsph',
    name: 'Basic Subscription',
    description: 'Essential features for beginners',
    mode: 'subscription',
  },
];