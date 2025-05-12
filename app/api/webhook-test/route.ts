import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Stripeクライアントの初期化
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any, // 型エラー回避
});

/**
 * サブスクリプション更新テスト用エンドポイント
 * 指定されたユーザーIDにサブスクリプションデータを作成します
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({
      error: 'ユーザーIDが必要です',
      usage: 'GET /api/webhook-test?userId=xxxxx'
    }, { status: 400 });
  }
  
  try {
    console.log(`テスト用サブスクリプション更新: ユーザーID=${userId}`);
    
    // 現在時刻とサブスクリプション期間を設定
    const now = Math.floor(Date.now() / 1000);
    const oneMonthLater = now + 30 * 24 * 60 * 60; // 30日後
    
    // サブスクリプションデータを作成
    const subscriptionData = {
      userId: userId,
      customerId: `cus_test_${Date.now()}`,
      subscriptionId: `sub_test_${Date.now()}`,
      priceId: 'price_1RMJdXRYtspYtD2zESbuO5mG',
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: oneMonthLater,
      cancelAtPeriodEnd: false,
      updatedAt: new Date().toISOString()
    };
    
    // サブスクリプションテーブルにデータを作成/更新
    const { data, error } = await supabaseAdmin
      .from('stripe_user_subscriptions')
      .upsert(subscriptionData, {
        onConflict: 'userId',
        ignoreDuplicates: false
      })
      .select();
      
    if (error) {
      console.error('サブスクリプションデータ作成エラー:', error);
      return NextResponse.json({
        error: 'サブスクリプションデータの作成に失敗しました',
        details: error
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'テスト用サブスクリプションデータを作成しました',
      subscription: data
    });
  } catch (error) {
    console.error('予期しないエラー:', error);
    return NextResponse.json({
      error: '予期しないエラーが発生しました',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 