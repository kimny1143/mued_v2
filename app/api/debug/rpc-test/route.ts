import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * デバッグ用: RPCを使用してデータを取得するAPI
 * このAPIは開発環境でのみ使用し、本番環境では無効化すべきです
 */
export async function GET(req: Request) {
  // 本番環境では無効化
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: '本番環境では利用できません' }, { status: 403 });
  }

  try {
    // 環境変数情報を出力（デバッグ用）
    const envInfo = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE,
      nodeEnv: process.env.NODE_ENV,
      isDocker: process.env.IS_DOCKER === 'true'
    };

    console.log('環境変数情報:', envInfo);

    // RPC呼び出しによるユーザー取得を試みる
    const { data: users, error: userError } = await supabase.rpc('get_all_users_debug');
    
    if (userError) {
      console.error('RPC呼び出しエラー:', userError);
      
      // 代替データを生成
      return NextResponse.json({
        message: 'RPCメソッドが存在しないか、アクセスエラーが発生しました',
        error: userError,
        envInfo,
        alternative: {
          manually_generated: true,
          message: 'ダッシュボードでSupabase SQLエディタを使用して以下のSQLを実行してください'
        },
        sql_to_execute: `
-- 1. デバッグ用のRPC関数を作成
CREATE OR REPLACE FUNCTION get_all_users_debug()
RETURNS SETOF auth.users
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM auth.users LIMIT 10;
$$;

-- 2. サブスクリプションテーブルの構造を確認
CREATE OR REPLACE FUNCTION debug_list_tables()
RETURNS TABLE (table_name text, table_schema text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT table_name, table_schema
  FROM information_schema.tables
  WHERE table_schema IN ('public', 'auth')
  ORDER BY table_schema, table_name;
$$;

-- 3. サブスクリプションデータ挿入用のヘルパー関数
CREATE OR REPLACE FUNCTION insert_test_subscription(
  user_id uuid,
  price_id text DEFAULT 'price_1RMJcpRYtspYtD2zQjRRmLXc'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  test_customer_id text := 'cus_test_' || substr(md5(random()::text), 1, 10);
  test_subscription_id text := 'sub_test_' || substr(md5(random()::text), 1, 10);
  current_ts bigint := extract(epoch from now())::bigint;
  result json;
BEGIN
  INSERT INTO public.stripe_user_subscriptions (
    user_id, customer_id, subscription_id, price_id, status,
    current_period_start, current_period_end, cancel_at_period_end,
    created_at, updated_at
  ) VALUES (
    user_id, test_customer_id, test_subscription_id, price_id, 'active',
    current_ts, current_ts + 30*24*60*60, false,
    now(), now()
  )
  RETURNING to_json(stripe_user_subscriptions.*) INTO result;
  
  RETURN result;
END;
$$;
`
      });
    }

    return NextResponse.json({
      message: 'RPCによるユーザー情報取得成功',
      users,
      envInfo
    });
  } catch (error) {
    console.error('API処理エラー:', error);
    return NextResponse.json({ 
      error: '予期しないエラーが発生しました', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 