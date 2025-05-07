export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
}

export const products: StripeProduct[] = [
  {
    id: 'prod_SDwjfpaGBSJw8I',
    priceId: 'price_1RJUpvDLJ4SvE3u2bnmzT6qa',
    name: 'Spot Lesson',
    description: 'One-time lesson with an expert instructor',
    mode: 'payment',
  },
  {
    id: 'prod_SDwirBO9qgF1gM',
    priceId: 'price_1RJUpJDLJ4SvE3u2Lwg8MvTS',
    name: 'Premium Subscription',
    description: 'Full access to all premium features and content',
    mode: 'subscription',
  },
  {
    id: 'prod_SDwi1REd7prVuy',
    priceId: 'price_1RJUolDLJ4SvE3u2lcg7C895',
    name: 'Starter Subscription',
    description: 'Basic access to learning materials',
    mode: 'subscription',
  },
  {
    id: 'prod_SDwhXOe4Rxczzo',
    priceId: 'price_1RJUntDLJ4SvE3u2a1TdJcn7',
    name: 'Basic Subscription',
    description: 'Essential features for beginners',
    mode: 'subscription',
  },
];