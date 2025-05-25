import { NextRequest, NextResponse } from 'next/server';
import { createSubscriptionCheckoutSession } from '@/lib/stripe';
import { getSessionFromRequest } from '@/lib/session';
import { getPlanByPriceId, validatePriceIds } from '@/app/stripe-config';
import { supabaseBrowser } from '@/lib/supabase-browser';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
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

    // セッション取得を試行（複数の方法でフォールバック）
    let sessionUserId: string | null = null;
    let userEmail: string | null = null;

    try {
      // 方法1: getSessionFromRequestを使用
      const sessionInfo = await getSessionFromRequest(req);
      if (sessionInfo?.user) {
        sessionUserId = sessionInfo.user.id;
        userEmail = sessionInfo.user.email || null;
        console.log('セッション取得成功（getSessionFromRequest）:', sessionUserId);
      }
    } catch (sessionErr) {
      console.warn('getSessionFromRequest失敗:', sessionErr);
    }

    // 方法2: リクエストで送信されたuserIdを使用（一時的フォールバック）
    if (!sessionUserId && userId) {
      console.log('フォールバック: リクエストのuserIdを使用:', userId);
      sessionUserId = userId;
      
      // userIdからメールアドレスを取得する場合の処理
      // NOTE: 本来はセキュリティ上推奨されないが、開発段階での一時的対応
      try {
        // Supabaseから直接ユーザー情報を取得
        const { data: userData } = await supabaseBrowser
          .from('users')
          .select('email')
          .eq('id', userId)
          .single();
        
        if (userData?.email) {
          userEmail = userData.email;
        }
      } catch (userErr) {
        console.warn('ユーザー情報取得失敗:', userErr);
      }
    }

    // 最終的に認証情報が取得できない場合はエラー
    if (!sessionUserId) {
      console.error('セッション取得失敗: 認証が必要です');
      return NextResponse.json({ 
        error: 'Authentication required',
        details: 'ユーザーセッションが見つかりません。再ログインしてください。'
      }, { status: 401 });
    }

    // Stripe決済セッションを作成
    try {
      const checkoutSession = await createSubscriptionCheckoutSession({
        priceId,
        successUrl: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/plans`,
        metadata: {
          userId: sessionUserId,
          userEmail: userEmail || 'unknown@example.com',
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