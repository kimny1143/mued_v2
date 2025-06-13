import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import Stripe from 'stripe';



// テスト価格情報の型定義
type TestPriceInfo = {
  name: string;
  amount: number;
  interval?: 'day' | 'week' | 'month' | 'year';
};

// テスト価格のマッピング
const TEST_PRICES: Record<string, TestPriceInfo> = {
  'price_test_starter': { name: 'Starter Subscription', amount: 2000, interval: 'month' },
  'price_test_premium': { name: 'Premium Subscription', amount: 6000, interval: 'month' },
  'price_test_basic': { name: 'Basic Subscription', amount: 1000, interval: 'month' },
  'price_test_spot_lesson': { name: 'Spot Lesson', amount: 3000 }
};

export const dynamic = 'force-dynamic';

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil' as const,
});

export async function POST(req: NextRequest) {
  // 🚨 このAPIルートは廃止されました
  // 新しいSetup Intentフローを使用してください
  return NextResponse.json({
    error: 'このAPIルートは廃止されました。新しいSetup Intentフローを使用してください。',
    newEndpoints: {
      newReservation: '/api/reservations/setup-payment',
      existingReservation: '/api/reservations/[id]/setup-payment'
    },
    reason: 'Setup Intentによる段階的決済フローに移行しました',
    migration: {
      oldFlow: '即座決済（予約時点で決済実行）',
      newFlow: 'Setup Intent（カード情報登録 → メンター承認 → 自動決済）',
      benefits: [
        'メンター承認前の誤課金を防止',
        'キャンセル処理の簡素化',
        'より安全な決済フロー'
      ]
    }
  }, { status: 410 }); // 410 Gone
} 