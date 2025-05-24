import { NextRequest, NextResponse } from 'next/server';
import { createSubscriptionCheckoutSession } from '@/lib/stripe';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getPlanByPriceId } from '@/app/stripe-config';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // リクエストボディを取得
    const { priceId, successUrl, cancelUrl, userId } = await req.json();

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

    // プラン情報を取得
    const plan = getPlanByPriceId(priceId);
    if (!plan) {
      return NextResponse.json({ error: 'Invalid price ID' }, { status: 400 });
    }

    // ユーザー認証の確認（オプション - 未ログイン時も決済可能）
    let authenticatedUserId: string | undefined;
    const { data: { session: authSession } } = await supabase.auth.getSession();
    
    if (authSession?.user) {
      authenticatedUserId = authSession.user.id;
    }

    // カスタマーID（ユーザーが認証済みの場合のみ）
    let customerId: string | undefined;
    if (authenticatedUserId) {
      // Stripe Customerの確認または作成
      // TODO: Stripe Customerの管理機能を実装する場合はここに追加
    }

    // デフォルトのリダイレクトURL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   process.env.NEXT_PUBLIC_SITE_URL || 
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    const defaultSuccessUrl = `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const defaultCancelUrl = `${baseUrl}/dashboard/plans`;

    // チェックアウトセッションを作成
    const checkoutSession = await createSubscriptionCheckoutSession({
      priceId,
      successUrl: successUrl || defaultSuccessUrl,
      cancelUrl: cancelUrl || defaultCancelUrl,
      customerId,
      metadata: {
        planName: plan.name,
        planDescription: plan.description,
        userId: authenticatedUserId || userId || 'anonymous',
        priceAmount: plan.price.toString(),
      },
      trialDays: undefined, // 無料トライアル日数（必要に応じて設定）
    });

    if (!checkoutSession.url) {
      throw new Error('Failed to create checkout session URL');
    }

    return NextResponse.json({ 
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
      planName: plan.name,
      amount: plan.price
    });

  } catch (error) {
    console.error('Subscription checkout error:', error);
    
    // エラーレスポンス
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to create checkout session',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
} 