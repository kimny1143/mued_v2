import { stripe, safeStripeCall } from '@/lib/stripe';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { ReservationStatus, PaymentStatus } from '@prisma/client';

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
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { reservationId } = await req.json();
    if (!reservationId) {
      return NextResponse.json({ error: '予約IDが必要です' }, { status: 400 });
    }

    // トランザクションで予約情報とレッスンスロットを取得
    const reservation = await prisma.$transaction(async (tx) => {
      const res = await tx.reservation.findUnique({
        where: { id: reservationId },
        include: {
          slot: {
            include: {
              teacher: true,
            },
          },
        },
      });

      if (!res) {
        throw new Error('予約が見つかりません');
      }

      if (res.studentId !== session.user.id) {
        throw new Error('この予約に対する権限がありません');
      }

      if (res.status !== ReservationStatus.PENDING) {
        throw new Error('この予約は既に処理済みです');
      }

      return res;
    });

    // Stripe Checkout Sessionを作成
    const checkoutSession = await stripeInstance.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: 'レッスン予約',
              description: `${reservation.slot.teacher.name}先生とのレッスン`,
            },
            unit_amount: 5000, // ¥5,000
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/reservations?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/reservations?canceled=true`,
      metadata: {
        reservationId: reservation.id,
        studentId: session.user.id,
        teacherId: reservation.slot.teacherId,
        lessonSlotId: reservation.slotId,
      },
    });

    // Paymentレコードを作成
    await prisma.payment.create({
      data: {
        reservationId: reservation.id,
        stripeSessionId: checkoutSession.id,
        amount: 5000,
        currency: 'jpy',
        status: PaymentStatus.PENDING,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ checkoutUrl: checkoutSession.url });
  } catch (error) {
    console.error('チェックアウトエラー:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'チェックアウト処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 