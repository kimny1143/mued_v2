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
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // 管理者権限を使用してサブスクリプション情報を取得
    const { data, error } = await supabaseAdmin
      .from('stripe_user_subscriptions')
      .select('*')
      .eq('userId', userId)
      .maybeSingle();
      
    if (error) {
      console.error('サブスクリプション取得エラー:', error);
      return NextResponse.json(
        { error: 'サブスクリプション情報の取得に失敗しました' },
        { status: 500 }
      );
    }
    
    // サブスクリプションがない場合は空のオブジェクトを返す
    if (!data) {
      return NextResponse.json({ subscription: null });
    }
    
    return NextResponse.json({ subscription: data });
  } catch (err) {
    console.error('サブスクリプションAPI処理エラー:', err);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
} 