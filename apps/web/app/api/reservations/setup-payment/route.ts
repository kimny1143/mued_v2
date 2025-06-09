import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

import { getSessionFromRequest } from '@/lib/session';
import { getOrCreateStripeCustomer } from '@/lib/stripe';
import { getBaseUrl } from '@/lib/utils/url';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
});

export async function POST(request: NextRequest) {
  try {
    // セッション情報を取得
    const session = await getSessionFromRequest(request);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // リクエストボディからデータを取得
    const { reservationData } = await request.json();
    
    console.log('=== Setup Intent Checkout Session作成開始 ===');
    console.log('予約データ:', reservationData);

    // Stripe顧客を取得または作成（文字列の顧客IDが返される）
    const customerId = await getOrCreateStripeCustomer(
      session.user.id,
      session.user.email || ''
    );

    // ベースURLの動的取得
    const baseUrl = getBaseUrl(request);
    
    // リファラーヘッダーからモバイルパスを検出
    const referer = request.headers.get('referer') || '';
    const isMobilePath = referer.includes('/m/');

    // Setup Intent用のCheckout Sessionを作成
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'setup', // Setup Intentモード（決済情報保存のみ）
      payment_method_types: ['card'],
      success_url: isMobilePath 
        ? `${baseUrl}/m/dashboard/booking-calendar/setup-success?session_id={CHECKOUT_SESSION_ID}`
        : `${baseUrl}/dashboard/booking-calendar/setup-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: isMobilePath
        ? `${baseUrl}/m/dashboard/booking-calendar?canceled=true`
        : `${baseUrl}/dashboard/booking-calendar?canceled=true`,
      metadata: {
        // 予約データをメタデータに保存
        reservationData: JSON.stringify(reservationData),
        userId: session.user.id,
        userEmail: session.user.email || '',
      },
    });

    console.log('=== Setup Intent Checkout Session作成完了 ===');
    console.log('セッションID:', checkoutSession.id);
    console.log('決済URL:', checkoutSession.url);

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
      message: '決済情報入力ページにリダイレクトします'
    });

  } catch (error) {
    console.error('Setup Intent Checkout Session作成エラー:', error);
    return NextResponse.json(
      { error: 'Setup Intent Checkout Sessionの作成に失敗しました', details: String(error) },
      { status: 500 }
    );
  }
} 