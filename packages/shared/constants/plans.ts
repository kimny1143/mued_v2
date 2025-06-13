// @mued/shared/constants/plans - Subscription plan constants

export const SUBSCRIPTION_PLANS = {
  FREE: {
    id: 'free',
    name: 'フリープラン',
    price: 0,
    features: [
      '月1回のレッスン予約',
      '基本教材へのアクセス',
      'コミュニティフォーラム参加',
    ],
    limits: {
      monthlyLessons: 1,
      advancedMaterials: false,
      prioritySupport: false,
    },
  },
  BASIC: {
    id: 'basic',
    name: 'ベーシックプラン',
    price: 5000,
    features: [
      '月4回のレッスン予約',
      'すべての教材へのアクセス',
      'レッスン録画機能',
      'メール優先サポート',
    ],
    limits: {
      monthlyLessons: 4,
      advancedMaterials: true,
      prioritySupport: true,
    },
  },
  PREMIUM: {
    id: 'premium',
    name: 'プレミアムプラン',
    price: 15000,
    features: [
      '無制限のレッスン予約',
      'すべての教材へのアクセス',
      'レッスン録画機能',
      '24時間優先サポート',
      '1対1のメンタリング',
      '特別イベントへの参加',
    ],
    limits: {
      monthlyLessons: -1, // unlimited
      advancedMaterials: true,
      prioritySupport: true,
      mentoring: true,
    },
  },
} as const;

export type SubscriptionPlanId = keyof typeof SUBSCRIPTION_PLANS;
export type SubscriptionPlan = typeof SUBSCRIPTION_PLANS[SubscriptionPlanId];