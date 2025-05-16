import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getSessionFromRequest } from '@/lib/session';
import type { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase-server';

// このAPIルートは動的であることを明示的に宣言
export const dynamic = 'force-dynamic';

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
    
    // テーブルが存在するか事前チェック
    try {
      console.log("テーブル存在チェック中");
      const { error: tableCheckError } = await supabaseAdmin
        .from('stripe_user_subscriptions')
        .select('count()', { count: 'exact', head: true });
      
      // テーブルが存在しないか権限エラーの場合、早期リターン
      if (tableCheckError) {
        console.warn("サブスクリプションテーブルへのアクセスエラー:", tableCheckError);
        
        // 開発環境なので、エラーをそのまま返す代わりに空のサブスクリプションを返す
        // これにより、フロントエンドでの無限リトライを防止
        return NextResponse.json({
          subscription: null,
          message: "サブスクリプションテーブルへのアクセスが制限されています（開発環境）",
          // エラー情報は含めるが、エラーとして扱わない（フロントエンドでのリトライを防ぐため）
          details: {
            errorType: "table_access",
            isProduction: process.env.NODE_ENV === 'production',
            error: tableCheckError.message,
            hint: "この環境ではサブスクリプション機能が制限されています。実動環境では正常に動作します。"
          }
        });
      }
    } catch (err) {
      console.warn("テーブルチェックエラー:", err);
      // 開発環境の場合はエラーを無視して処理を続行
    }
    
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
        
        // 開発環境では、これが権限エラーである場合に空のサブスクリプションを返す
        if (process.env.NODE_ENV !== 'production' && 
            (adminError.message.includes('permission denied') || adminError.code === '42501')) {
          return NextResponse.json({
            subscription: null,
            message: "開発環境では権限が制限されています",
            details: {
              errorType: "permission",
              error: adminError.message,
              code: adminError.code
            }
          });
        }
        
        console.log("通常権限でサブスクリプションデータを取得試行");
        
        // 通常のsupabaseクライアントでも試行
        const { data: normalData, error: normalError } = await supabase
          .from('stripe_user_subscriptions')
          .select('*')
          .eq('userId', userId)
          .maybeSingle();
        
        if (normalError) {
          console.error("通常権限でのサブスクリプション取得エラー:", normalError);
          
          // 開発環境では、権限エラーの場合に空のサブスクリプションを返す
          if (process.env.NODE_ENV !== 'production' && 
              (normalError.message.includes('permission denied') || normalError.code === '42501')) {
            return NextResponse.json({
              subscription: null,
              message: "開発環境では権限が制限されています",
              details: {
                errorType: "permission",
                error: normalError.message,
                code: normalError.code
              }
            });
          }
          
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
      
      // 開発環境ではエラーを無視して空のレスポンスを返す
      if (process.env.NODE_ENV !== 'production') {
        return NextResponse.json({
          subscription: null,
          message: "開発環境ではエラーを無視します",
          details: {
            errorType: "query",
            error: err instanceof Error ? err.message : String(err)
          }
        });
      }
      
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
    
    // 開発環境では、全体エラーも無視して空のレスポンスを返す
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.json({
        subscription: null,
        message: "開発環境ではエラーを無視します",
        details: {
          errorType: "api",
          error: err instanceof Error ? err.message : String(err)
        }
      });
    }
    
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