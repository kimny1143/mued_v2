import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slotId, mentorId, startTime, endTime, hourlyRate, amount } = body;

    // バリデーション
    if (!slotId || !mentorId || !startTime || !endTime || !amount) {
      return NextResponse.json(
        { error: '必要な予約情報が不足しています' },
        { status: 400 }
      );
    }

    // Stripe決済セッションを作成
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: 'レッスン予約',
              description: `開始時間: ${new Date(startTime).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`,
              metadata: {
                slotId,
                mentorId,
                startTime,
                endTime,
              },
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_URL}/dashboard/booking-calendar/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/dashboard/booking-calendar?canceled=true`,
      metadata: {
        slotId,
        mentorId,
        startTime,
        endTime,
        hourlyRate: String(hourlyRate),
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      checkoutUrl: session.url,
    });
  } catch (error) {
    console.error('Stripe決済セッション作成エラー:', error);
    return NextResponse.json(
      { error: '決済セッションの作成に失敗しました' },
      { status: 500 }
    );
  }
} 