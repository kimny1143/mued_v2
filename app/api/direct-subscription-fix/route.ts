import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * 直接サブスクリプションデータを修正する緊急用APIエンドポイント
 */
export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: '必須パラメータ: userId' }, { status: 400 });
    }
    
    // 管理者権限を持つクライアントを作成
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE || '',
      { auth: { persistSession: false } }
    );
    
    // 1. サブスクリプションデータの有無を確認
    const { data: existingData } = await admin
      .from('stripe_user_subscriptions')
      .select('*')
      .eq('userId', userId)
      .maybeSingle();
    
    // 2. 決済情報を設定
    const now = Math.floor(Date.now() / 1000);
    const oneMonthLater = now + 30 * 24 * 60 * 60; // 30日後
    
    // テスト用の顧客ID・サブスクリプションID
    const customerId = `cus_test_${Date.now()}`;
    const subscriptionId = `sub_test_${Date.now()}`;
    
    // レコードデータを構築
    const record = {
      userId,
      customerId,
      subscriptionId,
      priceId: 'price_1RMJdXRYtspYtD2zESbuO5mG', // Premium Subscription
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: oneMonthLater
    };
    
    let result;
    
    // 3. 既存データがあれば更新、なければ挿入
    if (existingData) {
      const { data, error } = await admin
        .from('stripe_user_subscriptions')
        .update(record)
        .eq('id', existingData.id)
        .select();
        
      if (error) {
        return NextResponse.json({ error: `更新失敗: ${error.message}` }, { status: 500 });
      }
      
      result = { action: '更新', data };
    } else {
      const { data, error } = await admin
        .from('stripe_user_subscriptions')
        .insert(record)
        .select();
        
      if (error) {
        return NextResponse.json({ error: `挿入失敗: ${error.message}` }, { status: 500 });
      }
      
      result = { action: '作成', data };
    }
    
    // 4. 結果を返す
    return NextResponse.json({
      success: true,
      userId,
      result
    });
  } catch (error) {
    // エラーの詳細情報を返す
    return NextResponse.json({
      error: '処理中にエラーが発生しました',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null
    }, { status: 500 });
  }
} 