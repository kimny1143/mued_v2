import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

/**
 * ユーザーのサブスクリプション情報を取得するAPIエンドポイント
 */
export async function GET() {
  try {
    // セッションからユーザーを取得（認証済みユーザーのみアクセス可能）
    const supabase = createServerComponentClient({ cookies });
    const { data: sessionData } = await supabase.auth.getSession();
    
    if (!sessionData?.session?.user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    
    const userId = sessionData.session.user.id;
    
    // 直接テーブルクエリ
    try {
      const { data, error } = await supabaseAdmin
        .from('stripe_user_subscriptions')
        .select('*')
        .eq('userId', userId)
        .maybeSingle();
      
      if (error) {
        return NextResponse.json({
          subscription: null,
          error: error.message
        });
      }
      
      return NextResponse.json({
        subscription: data
      });
    } catch (err) {
      return NextResponse.json({
        subscription: null,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  } catch (err) {
    return NextResponse.json(
      { 
        error: 'サーバーエラーが発生しました',
        details: err instanceof Error ? err.message : String(err)
      },
      { status: 500 }
    );
  }
} 