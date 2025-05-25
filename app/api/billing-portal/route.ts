import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-admin';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil' as const
});

export const dynamic = 'force-dynamic';

// CORS対応のためのOPTIONSメソッド
export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(req: Request) {
  try {
    console.log('🔄 Billing Portal Session作成開始');

    // ユーザー認証を確認
    const sessionInfo = await getSessionFromRequest(req);
    if (!sessionInfo?.user) {
      console.error('❌ 認証が必要です');
      return NextResponse.json({ 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    const userId = sessionInfo.user.id;
    console.log('✅ 認証済みユーザー:', userId);

    // ユーザーのStripe顧客IDを取得
    const { data: customerData, error: customerError } = await supabaseAdmin
      .from('stripe_customers')
      .select('customerId')
      .eq('userId', userId)
      .single();

    if (customerError || !customerData) {
      console.error('❌ Stripe顧客が見つかりません:', customerError);
      return NextResponse.json({ 
        error: 'Stripe customer not found. Please subscribe to a plan first.' 
      }, { status: 404 });
    }

    const customerId = customerData.customerId;
    console.log('✅ Stripe顧客ID:', customerId);

    // return_urlを安全に構築
    let returnUrl: string;
    
    if (process.env.NEXT_PUBLIC_URL) {
      // 環境変数が設定されている場合
      returnUrl = process.env.NEXT_PUBLIC_URL;
      // httpで始まっていない場合はhttps://を追加
      if (!returnUrl.startsWith('http://') && !returnUrl.startsWith('https://')) {
        returnUrl = `https://${returnUrl}`;
      }
    } else {
      // 環境変数が設定されていない場合は、リクエストヘッダーから取得
      const host = req.headers.get('host') || 'localhost:3000';
      const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
      returnUrl = `${protocol}://${host}`;
    }
    
    // パスを追加
    returnUrl = `${returnUrl}/dashboard/plans`;
    
    console.log('📍 Return URL:', returnUrl);

    // Billing Portal Sessionを作成
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    console.log('✅ Billing Portal Session作成成功:', portalSession.id);

    return NextResponse.json({
      url: portalSession.url,
      sessionId: portalSession.id
    });

  } catch (error) {
    console.error('❌ Billing Portal Session作成エラー:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json({ 
      error: errorMessage,
      details: 'Billing Portal Sessionの作成に失敗しました。'
    }, { status: 500 });
  }
} 