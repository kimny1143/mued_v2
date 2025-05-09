import { stripe } from '@/lib/stripe';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { priceId, successUrl, cancelUrl, mode, userId } = body;

    // 必須パラメータを確認
    if (!priceId || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: '必須パラメータが不足しています' }, 
        { status: 400 }
      );
    }

    // テスト用のログ
    console.log('Stripe checkout session creating with:', { priceId, mode, userId });

    // Stripeセッションを作成
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: mode || 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: userId || 'anonymous'
      }
    });

    // セッションURLのログ（テスト環境のみ）
    console.log('Stripe session created:', { sessionId: session.id, url: session.url });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error('チェックアウトセッション作成エラー:', error);
    const errorMessage = error instanceof Error ? error.message : '決済処理中にエラーが発生しました';
    return NextResponse.json(
      { error: errorMessage }, 
      { status: 500 }
    );
  }
} 