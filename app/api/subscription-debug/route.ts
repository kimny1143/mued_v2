import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * サブスクリプション情報を直接デバッグするためのエンドポイント
 * 管理者権限で直接データベースにアクセス
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ error: 'ユーザーIDが必要です' }, { status: 400 });
  }
  
  try {
    // 管理者権限で直接テーブルにアクセス
    const { data: directData, error: directError } = await supabaseAdmin
      .from('stripe_user_subscriptions')
      .select('*')
      .eq('userId', userId)
      .maybeSingle();
      
    // RPC関数を使用
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
      'debug_get_subscription_for_user',
      { user_id: userId }
    );
    
    // ユーザー情報も取得
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, name')
      .eq('id', userId)
      .maybeSingle();
    
    // 結果をすべて返す
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      userId,
      directQuery: {
        data: directData,
        error: directError ? directError.message : null
      },
      rpcQuery: {
        data: rpcData,
        error: rpcError ? rpcError.message : null
      },
      userData: {
        data: userData,
        error: userError ? userError.message : null
      },
      tips: [
        "1. ユーザーIDが正しいことを確認",
        "2. stripe_user_subscriptionsテーブルにデータが存在するか確認",
        "3. RLSポリシーが正しく設定されているか確認",
        "4. データベースの権限設定を確認"
      ]
    });
  } catch (error) {
    return NextResponse.json({ 
      error: '予期しないエラーが発生しました', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 