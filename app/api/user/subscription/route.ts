import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { auth } from '@/lib/auth';

/**
 * ユーザーのサブスクリプション情報を取得するAPIエンドポイント
 * 管理者権限を使用してデータベースにアクセスする
 */
export async function GET() {
  try {
    // セッションからユーザーを取得（認証済みユーザーのみアクセス可能）
    const session = await auth();
    
    if (!session?.user) {
      console.log('未認証ユーザーからのアクセス');
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    console.log('サブスクリプション情報取得:', { userId });
    
    try {
      // まず管理者権限を使用してサブスクリプション情報を取得
      const { data, error } = await supabaseAdmin
        .from('stripe_user_subscriptions')
        .select('*')
        .eq('userId', userId)
        .maybeSingle();
        
      if (error) {
        console.error('サブスクリプション取得エラー (通常クエリ):', error);
        
        // 代替手段としてRPC関数を使用
        console.log('RPC関数を使用して再試行...');
        const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
          'get_subscription_by_user_id',
          { user_id: userId }
        );
        
        if (rpcError) {
          console.error('サブスクリプション取得エラー (RPC):', rpcError);
          return NextResponse.json(
            { 
              error: 'サブスクリプション情報の取得に失敗しました',
              details: rpcError.message
            },
            { status: 500 }
          );
        }
        
        if (!rpcData || (Array.isArray(rpcData) && rpcData.length === 0)) {
          console.log('サブスクリプションが見つかりません (RPC)');
          return NextResponse.json({ subscription: null });
        }
        
        // RPCが配列を返す場合は最初の要素を使用
        const subscription = Array.isArray(rpcData) ? rpcData[0] : rpcData;
        return NextResponse.json({ subscription, source: 'rpc' });
      }
      
      // サブスクリプションがない場合はnullを返す
      if (!data) {
        console.log('サブスクリプションが見つかりません');
        return NextResponse.json({ subscription: null });
      }
      
      console.log('サブスクリプション情報を正常に取得');
      return NextResponse.json({ subscription: data, source: 'direct' });
    } catch (dbError) {
      console.error('データベースアクセスエラー:', dbError);
      return NextResponse.json(
        { 
          error: 'データベースアクセス中にエラーが発生しました',
          details: dbError instanceof Error ? dbError.message : String(dbError)
        },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error('サブスクリプションAPI処理エラー:', err);
    return NextResponse.json(
      { 
        error: 'サーバーエラーが発生しました',
        details: err instanceof Error ? err.message : String(err)
      },
      { status: 500 }
    );
  }
} 