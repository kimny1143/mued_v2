import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

/**
 * ユーザーのサブスクリプション情報を取得するAPIエンドポイント
 */
export async function GET() {
  console.log("サブスクリプション情報取得API呼び出し");
  
  try {
    // セッションからユーザーを取得（認証済みユーザーのみアクセス可能）
    const supabase = createServerComponentClient({ cookies });
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    console.log("セッション取得結果:", {
      hasSession: !!sessionData?.session,
      userId: sessionData?.session?.user?.id || "なし",
      email: sessionData?.session?.user?.email || "なし",
      error: sessionError ? sessionError.message : "なし"
    });
    
    if (sessionError) {
      console.error("セッション取得エラー:", sessionError);
      return NextResponse.json(
        { error: 'セッションの取得に失敗しました', details: sessionError.message },
        { status: 401 }
      );
    }
    
    if (!sessionData?.session?.user) {
      console.log("未認証アクセス: セッションデータなし");
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    
    const userId = sessionData.session.user.id;
    console.log(`ユーザー ${userId} のサブスクリプション情報を検索中...`);
    
    // 直接テーブルクエリ
    try {
      const { data, error } = await supabaseAdmin
        .from('stripe_user_subscriptions')
        .select('*')
        .eq('userId', userId)
        .maybeSingle();
      
      if (error) {
        console.error("サブスクリプション取得エラー:", error);
        return NextResponse.json({
          subscription: null,
          error: error.message
        });
      }
      
      console.log("サブスクリプション取得結果:", data ? "データあり" : "データなし");
      
      // サブスクリプションがない場合は404ではなく正常応答でnullを返す
      return NextResponse.json({
        subscription: data
      });
    } catch (err) {
      console.error("サブスクリプションクエリエラー:", err);
      return NextResponse.json({
        subscription: null,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  } catch (err) {
    console.error("サブスクリプションAPI全体エラー:", err);
    return NextResponse.json(
      { 
        error: 'サーバーエラーが発生しました',
        details: err instanceof Error ? err.message : String(err)
      },
      { status: 500 }
    );
  }
} 