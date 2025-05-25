import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase-admin';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil' as const
});

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
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

    // Billing Portal Sessionを作成
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_URL}/dashboard/plans`,
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