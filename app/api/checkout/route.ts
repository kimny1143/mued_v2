import { stripe } from '@/lib/stripe';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // リクエスト情報をログに記録
    console.log('チェックアウトAPIがリクエストを受信:', {
      headers: Object.fromEntries(request.headers),
      url: request.url,
      method: request.method,
      host: request.headers.get('host'),
      origin: request.headers.get('origin'),
      node_env: process.env.NODE_ENV,
    });

    const body = await request.json();
    const { priceId, successUrl, cancelUrl, mode, userId } = body;

    // 詳細なリクエストボディをログに記録
    console.log('チェックアウトリクエストの詳細:', {
      body,
      priceId,
      successUrl,
      cancelUrl,
      mode,
      userId,
      stripeKey: process.env.STRIPE_SECRET_KEY ? 'あり' : 'なし',
      stripePubKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 'あり' : 'なし',
      env: {
        VERCEL_ENV: process.env.VERCEL_ENV,
        VERCEL_URL: process.env.VERCEL_URL,
      }
    });

    // 必須パラメータを確認
    if (!priceId || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: '必須パラメータが不足しています', missing: { priceId: !priceId, successUrl: !successUrl, cancelUrl: !cancelUrl } }, 
        { status: 400 }
      );
    }

    // Stripe APIキーがない場合
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEYが環境変数に設定されていません');
      return NextResponse.json(
        { error: 'Stripe APIキーが設定されていません' },
        { status: 500 }
      );
    }

    // テスト用のログ
    console.log('Stripe checkout session creating with:', { priceId, mode, userId });

    try {
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
    } catch (stripeError) {
      console.error('Stripeセッション作成エラー:', stripeError);
      return NextResponse.json(
        { error: 'Stripeセッションの作成に失敗しました', details: stripeError }, 
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error('チェックアウトセッション作成エラー:', error);
    const errorMessage = error instanceof Error ? error.message : '決済処理中にエラーが発生しました';
    return NextResponse.json(
      { error: errorMessage }, 
      { status: 500 }
    );
  }
} 