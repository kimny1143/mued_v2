import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';

/**
 * デバッグ用: 現在のログインユーザー情報を取得するAPI
 * このAPIは開発環境でのみ使用し、本番環境では無効化すべきです
 */
export async function GET(req: Request) {
  // 本番環境では無効化
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: '本番環境では利用できません' }, { status: 403 });
  }

  try {
    // Supabaseのセッションを取得
    const cookieStore = cookies();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('セッション取得エラー:', sessionError);
      return NextResponse.json({ error: sessionError.message }, { status: 500 });
    }

    // Docker環境対応：認証がなくてもユーザー一覧を返す
    if (!session || !session.user) {
      console.log('セッション認証なし - 全ユーザー一覧を返します');
      
      // 管理者権限で全ユーザーを取得（テスト用）
      const { data: users, error: usersError } = await supabaseAdmin
        .from('users')
        .select('id, email, created_at')
        .limit(5);
        
      if (usersError) {
        console.error('ユーザー一覧取得エラー:', usersError);
        return NextResponse.json({ error: 'ユーザー一覧の取得に失敗しました' }, { status: 500 });
      }
      
      return NextResponse.json({
        message: '認証なし - デバッグモードのユーザー一覧',
        users: users || [],
        note: 'これらのIDをsubscription-testエンドポイントで使用できます'
      });
    }

    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.user_metadata?.name || session.user.user_metadata?.full_name,
        created_at: session.user.created_at
      },
      session: {
        expires_at: session.expires_at
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