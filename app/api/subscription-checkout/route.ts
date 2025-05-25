import { NextRequest, NextResponse } from 'next/server';
import { createSubscriptionCheckoutSession } from '@/lib/stripe';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getPlanByPriceId, validatePriceIds } from '@/app/stripe-config';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // デバッグ: 価格ID設定を確認
    validatePriceIds();
    
    // リクエストボディを取得
    const { priceId, successUrl, cancelUrl, userId } = await req.json();

    console.log('サブスクリプション決済開始:', {
      priceId,
      successUrl,
      cancelUrl,
      userId,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV
    });

    if (!priceId) {
      return NextResponse.json({ error: 'Price ID is required' }, { status: 400 });
    }

    // FREEプランの場合は決済不要
    if (priceId === 'free') {
      return NextResponse.json({ 
        message: 'Free plan selected - no payment required',
        redirectUrl: successUrl || '/dashboard'
      });
    }

    // プラン情報を確認
    const plan = getPlanByPriceId(priceId);
    if (!plan) {
      console.error('不明な価格ID:', priceId);
      return NextResponse.json({ 
        error: `Invalid price ID: ${priceId}. Available plans should be checked.` 
      }, { status: 400 });
    }

    console.log('決済するプラン:', plan);

    // 現在のユーザーセッションを取得
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('セッション取得エラー:', sessionError);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Stripe決済セッションを作成
    try {
      const checkoutSession = await createSubscriptionCheckoutSession({
        priceId,
        successUrl: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/plans`,
        metadata: {
          userId: session.user.id,
          userEmail: session.user.email || '',
          planName: plan.name,
          planDescription: plan.description
        }
      });

      if (!checkoutSession || !checkoutSession.url) {
        throw new Error('Stripe checkout session URL not generated');
      }

      console.log('Stripe決済セッション作成成功:', checkoutSession.id);

      return NextResponse.json({
        sessionId: checkoutSession.id,
        url: checkoutSession.url
      });

    } catch (stripeError) {
      console.error('Stripe決済セッション作成エラー:', stripeError);
      
      // Stripeエラーの詳細を返す
      const errorMessage = stripeError instanceof Error ? stripeError.message : 'Stripe checkout session creation failed';
      
      return NextResponse.json({ 
        error: errorMessage,
        details: 'Stripe決済セッションの作成に失敗しました。価格IDが正しく設定されているか確認してください。'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('サブスクリプション決済API エラー:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json({ 
      error: errorMessage,
      details: 'サブスクリプション決済の処理中にエラーが発生しました。'
    }, { status: 500 });
  }
} 