import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * サブスクリプションデータを強制的に更新/作成するためのエンドポイント
 * 管理者権限で直接データベースにアクセス
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, subscriptionData, force } = body;
    
    if (!userId) {
      return NextResponse.json({ error: 'ユーザーIDが必要です' }, { status: 400 });
    }
    
    if (!subscriptionData) {
      return NextResponse.json({ error: 'サブスクリプションデータが必要です' }, { status: 400 });
    }
    
    // まずユーザーの存在を確認
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
      
    if (userError) {
      return NextResponse.json({ 
        error: 'ユーザー情報の取得に失敗しました', 
        details: userError.message 
      }, { status: 500 });
    }
    
    if (!userData) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }
    
    // 既存のサブスクリプションを検索
    const { data: existingData, error: existingError } = await supabaseAdmin
      .from('stripe_user_subscriptions')
      .select('*')
      .eq('userId', userId)
      .maybeSingle();
      
    // 既存のデータがあり、強制上書きでなければエラー
    if (existingData && !force) {
      return NextResponse.json({ 
        error: 'サブスクリプションデータが既に存在します', 
        details: 'force=trueを指定して強制上書きしてください',
        existingData
      }, { status: 409 });
    }
    
    // stripe_customersテーブルのデータを確認
    const { data: customerData, error: customerError } = await supabaseAdmin
      .from('stripe_customers')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
      
    let customerId = subscriptionData.customerId || null;
    
    // ユーザーのStripe顧客IDがなければ作成
    if (!customerData) {
      // 顧客IDが提供されていなければtestユーザーとして作成
      if (!customerId) {
        customerId = `cus_test_${Date.now()}_${userId.substring(0, 8)}`;
      }
      
      // 顧客データを登録
      const { error: createCustomerError } = await supabaseAdmin
        .from('stripe_customers')
        .insert({
          user_id: userId,
          customer_id: customerId
        });
        
      if (createCustomerError) {
        return NextResponse.json({ 
          error: '顧客データの作成に失敗しました', 
          details: createCustomerError.message 
        }, { status: 500 });
      }
    } else {
      customerId = customerData.customer_id;
    }
    
    // サブスクリプションデータの構築
    const subscriptionRecord = {
      userId,
      customerId: customerId,
      subscriptionId: subscriptionData.subscriptionId || `sub_test_${Date.now()}`,
      priceId: subscriptionData.priceId || 'price_1RMJdXRYtspYtD2zESbuO5mG', // Premium Subscription
      status: subscriptionData.status || 'active',
      currentPeriodStart: subscriptionData.currentPeriodStart || Math.floor(Date.now() / 1000),
      currentPeriodEnd: subscriptionData.currentPeriodEnd || Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30日後
      ...subscriptionData
    };
    
    // 既存データがある場合は更新、なければ挿入
    let result;
    if (existingData) {
      const { data, error } = await supabaseAdmin
        .from('stripe_user_subscriptions')
        .update(subscriptionRecord)
        .eq('userId', userId)
        .select()
        .single();
        
      if (error) {
        return NextResponse.json({ 
          error: 'サブスクリプションの更新に失敗しました', 
          details: error.message 
        }, { status: 500 });
      }
      
      result = { updated: true, data };
    } else {
      const { data, error } = await supabaseAdmin
        .from('stripe_user_subscriptions')
        .insert(subscriptionRecord)
        .select()
        .single();
        
      if (error) {
        return NextResponse.json({ 
          error: 'サブスクリプションの作成に失敗しました', 
          details: error.message 
        }, { status: 500 });
      }
      
      result = { created: true, data };
    }
    
    return NextResponse.json({
      success: true,
      operation: result.updated ? 'updated' : 'created',
      data: result.data,
      message: `サブスクリプションが正常に${result.updated ? '更新' : '作成'}されました`
    });
  } catch (error) {
    return NextResponse.json({ 
      error: '予期しないエラーが発生しました', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 