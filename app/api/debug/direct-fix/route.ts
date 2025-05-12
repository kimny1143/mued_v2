import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * デバッグ用: サブスクリプション情報を直接修正するAPI
 * このAPIは開発環境でのみ使用し、本番環境では無効化すべきです
 */
export async function GET(req: Request) {
  // 本番環境では無効化
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: '本番環境では利用できません' }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const action = url.searchParams.get('action') || 'info';
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'ユーザーIDが必要です', 
        example: '?userId=xxx&action=info|reset|activate|deactivate' 
      }, { status: 400 });
    }
    
    // ユーザー情報の確認
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (userError) {
      return NextResponse.json({ 
        error: 'ユーザー情報の取得に失敗しました', 
        details: userError.message 
      }, { status: 500 });
    }
    
    if (!userData) {
      return NextResponse.json({ 
        error: '指定されたIDのユーザーが見つかりません', 
        userId 
      }, { status: 404 });
    }
    
    // 現在のサブスクリプション情報を取得
    const { data: subscriptionData, error: subscriptionError } = await supabaseAdmin
      .from('stripe_user_subscriptions')
      .select('*')
      .eq('userId', userId)
      .maybeSingle();
    
    // 結果を保持する変数
    let result: any = {
      userId,
      userEmail: userData.email,
      action,
      timestamp: new Date().toISOString()
    };
    
    switch (action) {
      case 'info':
        // 情報取得のみ
        result.subscription = subscriptionData || null;
        result.hasActiveSubscription = subscriptionData && subscriptionData.status === 'active';
        break;
        
      case 'activate':
        // アクティブなサブスクリプションを作成または更新
        const testSubscription = {
          userId: userId,
          customerId: subscriptionData?.customerId || 'cus_test_' + Math.random().toString(36).substring(2, 10),
          subscriptionId: subscriptionData?.subscriptionId || 'sub_test_' + Math.random().toString(36).substring(2, 10),
          priceId: 'price_1RMJcpRYtspYtD2zQjRRmLXc', // Starter Subscription
          status: 'active',
          currentPeriodStart: Math.floor(Date.now() / 1000),
          currentPeriodEnd: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30日後
          cancelAtPeriodEnd: false,
          updatedAt: new Date().toISOString()
        };
        
        if (subscriptionData) {
          // 既存のサブスクリプションを更新
          const { data: updatedData, error: updateError } = await supabaseAdmin
            .from('stripe_user_subscriptions')
            .update(testSubscription)
            .eq('userId', userId)
            .select()
            .single();
            
          if (updateError) {
            return NextResponse.json({ 
              error: 'サブスクリプションの更新に失敗しました', 
              details: updateError.message 
            }, { status: 500 });
          }
          
          result.subscription = updatedData;
          result.action = 'updated';
        } else {
          // 新規サブスクリプションを作成
          const { data: insertedData, error: insertError } = await supabaseAdmin
            .from('stripe_user_subscriptions')
            .insert({
              ...testSubscription,
              createdAt: new Date().toISOString()
            })
            .select()
            .single();
            
          if (insertError) {
            return NextResponse.json({ 
              error: 'サブスクリプションの作成に失敗しました', 
              details: insertError.message 
            }, { status: 500 });
          }
          
          result.subscription = insertedData;
          result.action = 'created';
        }
        break;
        
      case 'deactivate':
        // サブスクリプションを非アクティブに設定
        if (subscriptionData) {
          const { data: deactivatedData, error: deactivateError } = await supabaseAdmin
            .from('stripe_user_subscriptions')
            .update({
              status: 'canceled',
              cancelAtPeriodEnd: true,
              updatedAt: new Date().toISOString()
            })
            .eq('userId', userId)
            .select()
            .single();
            
          if (deactivateError) {
            return NextResponse.json({ 
              error: 'サブスクリプションの無効化に失敗しました', 
              details: deactivateError.message 
            }, { status: 500 });
          }
          
          result.subscription = deactivatedData;
          result.action = 'deactivated';
        } else {
          result.message = 'サブスクリプションが存在しないため、無効化は不要です';
          result.action = 'no_action_needed';
        }
        break;
        
      case 'reset':
        // サブスクリプションを削除
        if (subscriptionData) {
          const { error: deleteError } = await supabaseAdmin
            .from('stripe_user_subscriptions')
            .delete()
            .eq('userId', userId);
            
          if (deleteError) {
            return NextResponse.json({ 
              error: 'サブスクリプションの削除に失敗しました', 
              details: deleteError.message 
            }, { status: 500 });
          }
          
          result.action = 'deleted';
          result.message = 'サブスクリプションを削除しました';
        } else {
          result.message = 'サブスクリプションが存在しないため、削除は不要です';
          result.action = 'no_action_needed';
        }
        break;
        
      default:
        return NextResponse.json({ 
          error: '不明なアクション', 
          supportedActions: ['info', 'activate', 'deactivate', 'reset'] 
        }, { status: 400 });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('API処理エラー:', error);
    return NextResponse.json({ 
      error: '予期しないエラーが発生しました', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 