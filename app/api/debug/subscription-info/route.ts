import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * デバッグ用: サブスクリプション情報のトラブルシューティングAPI
 * 複数の方法でサブスクリプション情報を取得し、結果を比較します
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId') || '';
    const results: Record<string, any> = {};
    
    // 1. 通常のクライアントでRLSを通した取得
    const { data: normalData, error: normalError } = await supabase
      .from('stripe_user_subscriptions')
      .select('*')
      .eq('userId', userId)
      .maybeSingle();
    
    results.normal = {
      success: !normalError,
      data: normalData,
      error: normalError ? normalError.message : null
    };
    
    // 2. 管理者クライアントによる取得
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('stripe_user_subscriptions')
      .select('*')
      .eq('userId', userId)
      .maybeSingle();
    
    results.admin = {
      success: !adminError,
      data: adminData,
      error: adminError ? adminError.message : null
    };
    
    // 3. SQLクエリをRPCとして実行
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'debug_get_subscription_for_user',
      { input_user_id: userId }
    );
    
    results.rpc = {
      success: !rpcError,
      data: rpcData,
      error: rpcError ? rpcError.message : null,
      note: 'RPC関数が存在しない場合はエラーになります'
    };
    
    // 4. テーブル構造の確認
    const { data: tableData, error: tableError } = await supabaseAdmin
      .from('stripe_user_subscriptions')
      .select('*')
      .limit(1);
    
    results.tableStructure = {
      success: !tableError,
      columnNames: tableData && tableData.length > 0 
        ? Object.keys(tableData[0]) 
        : [],
      error: tableError ? tableError.message : null
    };
    
    // 5. Row Level Securityポリシーの確認
    const { data: rlsData, error: rlsError } = await supabaseAdmin.rpc(
      'debug_check_rls_policies',
      { table_name: 'stripe_user_subscriptions' }
    );
    
    results.rlsPolicies = {
      success: !rlsError,
      data: rlsData,
      error: rlsError ? rlsError.message : null,
      note: 'この関数はまだ存在しない場合があります'
    };
    
    // ユーザー情報を取得する権限を確認
    const { data: userInfo, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, name')
      .eq('id', userId)
      .maybeSingle();
    
    results.userInfo = {
      success: !userError,
      data: userInfo,
      error: userError ? userError.message : null
    };
    
    // レスポンスを返す
    return NextResponse.json({
      message: 'サブスクリプション情報診断結果',
      userId: userId,
      timestamp: new Date().toISOString(),
      results: results,
      suggestedFixes: [
        "1. RLSポリシーに 'userId = auth.uid()' が正しく設定されているか確認",
        "2. APIエンドポイント経由でデータを取得するようにフロントエンドを修正",
        "3. admin権限のクライアントを使用し、外部APIでデータを中継",
        "4. デバッグ用RPC関数を作成して直接データ取得",
        "5. フロントエンドの状態管理を確認（キャッシュのクリア等）"
      ],
      sqlHelpers: {
        createRpcFunction: `
-- デバッグ用RPC関数を作成
CREATE OR REPLACE FUNCTION debug_get_subscription_for_user(input_user_id UUID)
RETURNS SETOF stripe_user_subscriptions
SECURITY DEFINER
AS $$
  SELECT * FROM public.stripe_user_subscriptions 
  WHERE "userId" = input_user_id
  LIMIT 1;
$$ LANGUAGE SQL;

-- RLSポリシーを確認する関数
CREATE OR REPLACE FUNCTION debug_check_rls_policies(table_name TEXT)
RETURNS TABLE (
  policyname TEXT,
  permissive TEXT,
  roles TEXT,
  cmd TEXT,
  qual TEXT
)
SECURITY DEFINER
AS $$
  SELECT 
    policyname,
    permissive,
    roles::TEXT,
    cmd,
    qual::TEXT
  FROM pg_policies
  WHERE tablename = table_name;
$$ LANGUAGE SQL;
`
      }
    });
  } catch (error) {
    console.error('API処理エラー:', error);
    return NextResponse.json({ 
      error: '予期しないエラーが発生しました', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 