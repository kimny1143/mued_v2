import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getSessionFromRequest } from '@/lib/session';
import type { NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

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
      role: sessionInfo?.role || "なし",
    });
    
    if (!sessionInfo) {
      console.log("未認証アクセス: セッションデータなし");
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }
    
    // ロールチェック：メンターと管理者はサブスクリプション不要
    const userRole = sessionInfo.role?.toLowerCase();
    if (userRole === 'mentor' || userRole === 'admin') {
      console.log(`ロール ${userRole} はサブスクリプション対象外`);
      return NextResponse.json({
        subscription: null,
        message: `${userRole}ロールはサブスクリプション対象外です`,
        skipReason: 'role_not_applicable'
      });
    }
    
    const userId = sessionInfo.user.id;
    console.log(`ユーザー ${userId} のサブスクリプション情報を検索中...`);
    
    // テーブル存在チェックをスキップして直接データ取得を試行
    // （テーブル存在チェックが不要なエラーを起こしているため）
    
    // まずsupabaseAdminを使用して権限エラーを回避
    try {
      console.log("管理者権限でサブスクリプションデータを取得試行");
      const { data: adminData, error: adminError } = await supabaseAdmin
        .from('stripe_user_subscriptions')
        .select('*')
        .eq('user_id', userId)
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
        const { data: normalData, error: normalError } = await supabaseServer
          .from('stripe_user_subscriptions')
          .select('*')
          .eq('user_id', userId)
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
      
      // データが正常に取得できた場合
      if (adminData) {
        console.log("✅ サブスクリプションデータ取得成功:", {
          id: adminData.id,
          status: adminData.status,
          price_id: adminData.price_id,
          user_id: adminData.user_id
        });
      }
      
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