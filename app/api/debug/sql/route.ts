import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // リクエストボディを解析
    const body = await request.json();
    const { query, userId } = body;

    // 必須パラメータを検証
    if (!query) {
      return NextResponse.json({ 
        error: 'クエリが必要です' 
      }, { status: 400 });
    }

    // 安全なクエリかどうかの簡易チェック - SELECT文のみ許可
    if (!query.trim().toLowerCase().startsWith('select')) {
      return NextResponse.json({ 
        error: '安全性のためSELECT文のみ実行可能です' 
      }, { status: 403 });
    }

    // 特定のテーブルに対して直接テスト用のクエリを作成
    let safeQuery = '';
    let params: any[] = [];

    if (userId) {
      // ユーザーIDがある場合はそのユーザーのサブスクリプション情報だけに制限
      safeQuery = `
        SELECT * FROM stripe_user_subscriptions 
        WHERE "userId" = $1 OR user_id = $1
      `;
      params = [userId];
    } else {
      // すべてのサブスクリプションを取得（制限付き）
      safeQuery = `
        SELECT * FROM stripe_user_subscriptions
        LIMIT 10
      `;
    }

    // SQLクエリを実行
    const { data, error } = await supabase.rpc('execute_sql', {
      sql_query: safeQuery,
      params
    });

    if (error) {
      console.error('SQL実行エラー:', error);
      
      // 代替アプローチ: 別のビューから取得
      try {
        const { data: altData, error: altError } = await supabase
          .from('stripe_subscriptions_view')
          .select('*')
          .limit(10);
          
        if (altError) {
          console.error('代替クエリエラー:', altError);
        } else {
          console.log('代替ビューからのデータ:', altData);
          return NextResponse.json({ 
            success: true, 
            message: '代替ビューからデータを取得しました',
            data: altData
          });
        }
      } catch (altErr) {
        console.error('代替アプローチエラー:', altErr);
      }
      
      return NextResponse.json({ 
        error: 'SQLクエリの実行に失敗しました', 
        details: error
      }, { status: 500 });
    }

    // 結果を返す
    return NextResponse.json({ 
      success: true, 
      data,
      query: safeQuery,
      params
    });
  } catch (err) {
    console.error('デバッグAPI実行エラー:', err);
    return NextResponse.json({ 
      error: '予期しないエラーが発生しました', 
      details: err 
    }, { status: 500 });
  }
} 