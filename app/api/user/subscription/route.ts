import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getSessionFromRequest } from '@/lib/session';
import type { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * ユーザーのサブスクリプション情報を取得するAPIエンドポイント
 */
export async function GET(request: NextRequest) {
  console.log("サブスクリプション情報取得API呼び出し");
  
  try {
    // getSessionFromRequestを使用してヘッダーからトークンを取得
    const sessionInfo = await getSessionFromRequest(request);
    
    console.log("セッション取得結果:", {
      hasSession: !!sessionInfo,
      userId: sessionInfo?.user?.id || "なし",
      email: sessionInfo?.user?.email || "なし",
    });
    
    if (!sessionInfo) {
      console.log("未認証アクセス: セッションデータなし");
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    
    const userId = sessionInfo.user.id;
    console.log(`ユーザー ${userId} のサブスクリプション情報を検索中...`);
    
    // まずsupabaseAdminを使用して権限エラーを回避
    try {
      console.log("管理者権限でサブスクリプションデータを取得試行");
      const { data: adminData, error: adminError } = await supabaseAdmin
        .from('stripe_user_subscriptions')
        .select('*')
        .eq('userId', userId)
        .maybeSingle();
      
      if (adminError) {
        console.error("管理者権限でのサブスクリプション取得エラー:", adminError);
        console.log("通常権限でサブスクリプションデータを取得試行");
        
        // 通常のsupabaseクライアントでも試行
        const { data: normalData, error: normalError } = await supabase
          .from('stripe_user_subscriptions')
          .select('*')
          .eq('userId', userId)
          .maybeSingle();
        
        if (normalError) {
          console.error("通常権限でのサブスクリプション取得エラー:", normalError);
          
          return NextResponse.json({
            subscription: null,
            error: normalError.message,
            details: {
              adminError: adminError.message,
              normalError: normalError.message,
              code: normalError.code,
              hint: normalError.hint
            }
          });
        }
        
        console.log("通常権限でサブスクリプション取得結果:", normalData ? "データあり" : "データなし");
        return NextResponse.json({ subscription: normalData });
      }
      
      console.log("管理者権限でサブスクリプション取得結果:", adminData ? "データあり" : "データなし");
      return NextResponse.json({ subscription: adminData });
      
    } catch (err) {
      console.error("サブスクリプションクエリエラー:", err);
      return NextResponse.json({
        subscription: null,
        error: err instanceof Error ? err.message : String(err),
        details: {
          timestamp: new Date().toISOString(),
          userId: userId,
          errorType: err instanceof Error ? err.constructor.name : typeof err
        }
      });
    }
  } catch (err) {
    console.error("サブスクリプションAPI全体エラー:", err);
    return NextResponse.json(
      { 
        error: 'サーバーエラーが発生しました',
        details: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 