import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 専用の管理者権限クライアント
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * サブスクリプションデータを直接データベースに作成/更新する緊急修正API
 */
export async function POST(request: Request) {
  try {
    const { userId, priceId = 'price_1RMJdXRYtspYtD2zESbuO5mG' } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'ユーザーIDが必要です' }, { status: 400 });
    }
    
    // 1. ユーザーの存在を確認
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('id, email')
      .eq('id', userId)
      .single();
      
    if (userError || !userData) {
      return NextResponse.json({ 
        error: 'ユーザーが見つかりません', 
        details: userError?.message || '指定されたIDのユーザーが存在しません'
      }, { status: 404 });
    }
    
    console.log('ユーザー確認OK:', userData);
    
    // 2. カスタマーIDを確認/作成
    let customerId = '';
    const { data: customerData, error: customerError } = await adminClient
      .from('stripe_customers')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (!customerData) {
      // カスタマーレコードがなければ作成
      customerId = `cus_test_${Date.now()}_${userId.substring(0, 8)}`;
      
      const { data: newCustomer, error: createError } = await adminClient
        .from('stripe_customers')
        .insert({
          user_id: userId,
          customer_id: customerId
        })
        .select()
        .single();
        
      if (createError) {
        return NextResponse.json({ 
          error: 'カスタマーレコードの作成に失敗しました', 
          details: createError.message 
        }, { status: 500 });
      }
      
      console.log('カスタマーレコード作成OK:', newCustomer);
    } else {
      customerId = customerData.customer_id;
      console.log('既存カスタマーレコード:', customerData);
    }
    
    // 3. 既存のサブスクリプションを確認
    const { data: existingSub, error: subError } = await adminClient
      .from('stripe_user_subscriptions')
      .select('*')
      .eq('userId', userId)
      .maybeSingle();
      
    // 現在時刻とサブスクリプション期間を設定
    const now = Math.floor(Date.now() / 1000);
    const oneMonthLater = now + 30 * 24 * 60 * 60;
    
    // 4. サブスクリプションを作成または更新
    let result;
    const subscriptionRecord = {
      userId,
      customerId,
      subscriptionId: `sub_test_${Date.now()}`,
      priceId,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: oneMonthLater
    };
    
    if (existingSub) {
      // 既存のサブスクリプションを更新
      const { data: updated, error: updateError } = await adminClient
        .from('stripe_user_subscriptions')
        .update(subscriptionRecord)
        .eq('id', existingSub.id)
        .select()
        .single();
        
      if (updateError) {
        return NextResponse.json({ 
          error: 'サブスクリプションの更新に失敗しました', 
          details: updateError.message 
        }, { status: 500 });
      }
      
      result = { action: 'updated', data: updated };
      console.log('サブスクリプション更新OK:', updated);
    } else {
      // 新規サブスクリプションを作成
      const { data: created, error: createError } = await adminClient
        .from('stripe_user_subscriptions')
        .insert(subscriptionRecord)
        .select()
        .single();
        
      if (createError) {
        return NextResponse.json({ 
          error: 'サブスクリプションの作成に失敗しました', 
          details: createError.message 
        }, { status: 500 });
      }
      
      result = { action: 'created', data: created };
      console.log('サブスクリプション作成OK:', created);
    }
    
    // RPC関数での取得もテスト
    const { data: rpcData, error: rpcError } = await adminClient.rpc(
      'get_subscription_by_user_id',
      { user_id: userId }
    );
    
    return NextResponse.json({
      success: true,
      message: `サブスクリプションが${result.action === 'updated' ? '更新' : '作成'}されました`,
      data: result.data,
      rpcResult: {
        data: rpcData,
        error: rpcError ? rpcError.message : null
      }
    });
  } catch (error) {
    console.error('予期しないエラー:', error);
    return NextResponse.json({ 
      error: '予期しないエラーが発生しました', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 