import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * デバッグ用: サブスクリプションデータを直接追加するAPI
 * このAPIは開発環境でのみ使用し、本番環境では無効化すべきです
 */
export async function GET(req: Request) {
  // 本番環境では無効化
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: '本番環境では利用できません' }, { status: 403 });
  }

  try {
    // URLからテスト用ユーザーIDを取得
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'ユーザーIDが必要です (例: ?userId=xxxx)' }, { status: 400 });
    }
    
    console.log(`テストデータ作成: ユーザーID=${userId}のサブスクリプションデータを追加します`);
    
    // テスト用のサブスクリプションデータ
    const testSubscription = {
      userId: userId,
      customerId: 'cus_test_' + Math.random().toString(36).substring(2, 10),
      subscriptionId: 'sub_test_' + Math.random().toString(36).substring(2, 10),
      priceId: 'price_1RMJcpRYtspYtD2zQjRRmLXc', // Starter Subscriptionのプライス
      status: 'active',
      currentPeriodStart: Math.floor(Date.now() / 1000),
      currentPeriodEnd: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30日後
      cancelAtPeriodEnd: false,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    
    // supabaseAdminを使用して直接データを挿入
    const { data, error } = await supabaseAdmin
      .from('stripe_user_subscriptions')
      .upsert(testSubscription)
      .select();
    
    if (error) {
      console.error('サブスクリプションデータ挿入エラー:', error);
      
      // スネークケースでも試す
      const snakeCaseSubscription = {
        user_id: userId,
        customer_id: testSubscription.customerId,
        subscription_id: testSubscription.subscriptionId,
        price_id: testSubscription.priceId,
        status: testSubscription.status,
        current_period_start: testSubscription.currentPeriodStart,
        current_period_end: testSubscription.currentPeriodEnd,
        cancel_at_period_end: testSubscription.cancelAtPeriodEnd,
        updated_at: testSubscription.updatedAt,
        created_at: testSubscription.createdAt
      };
      
      const { data: altData, error: altError } = await supabaseAdmin
        .from('stripe_user_subscriptions')
        .upsert(snakeCaseSubscription)
        .select();
      
      if (altError) {
        console.error('スネークケースでもエラー:', altError);
        return NextResponse.json({ 
          error: 'サブスクリプションデータの追加に失敗しました',
          details: altError
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        message: 'スネークケース形式でサブスクリプションデータを追加しました',
        subscription: altData
      });
    }
    
    return NextResponse.json({ 
      message: 'サブスクリプションデータを追加しました',
      subscription: data
    });
  } catch (error) {
    console.error('API処理エラー:', error);
    return NextResponse.json({ 
      error: '予期しないエラーが発生しました', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 