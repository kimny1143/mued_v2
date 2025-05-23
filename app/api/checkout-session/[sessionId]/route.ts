import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'セッションIDが必要です' },
        { status: 400 }
      );
    }

    // Stripe決済セッションの詳細を取得
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    });

    if (!session) {
      return NextResponse.json(
        { error: 'セッションが見つかりません' },
        { status: 404 }
      );
    }

    // レスポンス用のデータを構築
    const responseData = {
      sessionId: session.id,
      status: session.payment_status,
      amount: session.amount_total || 0,
      currency: session.currency || 'jpy',
      customerEmail: session.customer_details?.email,
      metadata: session.metadata || {},
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Stripe セッション取得エラー:', error);
    return NextResponse.json(
      { error: 'セッション詳細の取得に失敗しました' },
      { status: 500 }
    );
  }
} 