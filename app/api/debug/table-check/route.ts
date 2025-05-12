import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * デバッグ用: 指定されたテーブルの内容を確認するAPI
 * このAPIは開発環境でのみ使用し、本番環境では無効化すべきです
 */
export async function GET(req: Request) {
  // 本番環境では無効化
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: '本番環境では利用できません' }, { status: 403 });
  }

  try {
    // URLからテーブル名を取得
    const url = new URL(req.url);
    const tableName = url.searchParams.get('table');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    
    if (!tableName) {
      return NextResponse.json({ 
        error: 'テーブル名が必要です',
        example: '/api/debug/table-check?table=users'
      }, { status: 400 });
    }
    
    console.log(`テーブル確認: ${tableName} のデータを最大${limit}件取得します`);
    
    // supabaseAdminを使用してテーブルの内容を取得
    const { data, error, count } = await supabaseAdmin
      .from(tableName)
      .select('*', { count: 'exact' })
      .limit(limit);
    
    if (error) {
      console.error(`テーブル ${tableName} の取得エラー:`, error);
      return NextResponse.json({ 
        error: 'テーブルデータの取得に失敗しました',
        details: error
      }, { status: 500 });
    }
    
    return NextResponse.json({
      table: tableName,
      count: count,
      data: data,
      sample: data && data.length > 0 ? data[0] : null,
      message: `${tableName} テーブルから ${data?.length || 0} 件のデータを取得しました (全 ${count} 件中)`
    });
  } catch (error) {
    console.error('API処理エラー:', error);
    return NextResponse.json({ 
      error: '予期しないエラーが発生しました', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 