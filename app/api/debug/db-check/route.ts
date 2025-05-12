import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // URLパラメータからuserIdを取得
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    console.log('データベースチェックAPI: ユーザーID =', userId || '指定なし');

    // テーブル定義の確認 - 管理者権限で実行
    const { data: tableInfo, error: tableError } = await supabaseAdmin
      .from('stripe_user_subscriptions')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('テーブル情報取得エラー:', tableError);
      return NextResponse.json({
        error: 'テーブル情報取得エラー',
        details: tableError
      }, { status: 500 });
    }

    // テーブルに何も入っていないかチェック
    const { count, error: countError } = await supabaseAdmin
      .from('stripe_user_subscriptions')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('レコード数取得エラー:', countError);
    }

    // ユーザーのサブスクリプション情報を確認
    let userData = null;
    if (userId) {
      const { data, error } = await supabaseAdmin
        .from('stripe_user_subscriptions')
        .select('*')
        .eq('userId', userId);

      if (error) {
        console.error('ユーザーサブスクリプション取得エラー:', error);
        
        // スネークケースでも試してみる
        const { data: altData, error: altError } = await supabaseAdmin
          .from('stripe_user_subscriptions')
          .select('*')
          .eq('user_id', userId);
          
        if (altError) {
          console.error('代替クエリでもエラー:', altError);
        } else if (altData && altData.length > 0) {
          console.log('ユーザーデータをスネークケースで取得成功');
          userData = altData;
        }
      } else {
        userData = data;
      }
    }

    // すべてのデータを取得
    const { data: allData, error: allDataError } = await supabaseAdmin
      .from('stripe_user_subscriptions')
      .select('*')
      .limit(10);

    if (allDataError) {
      console.error('全データ取得エラー:', allDataError);
    }

    // テーブル構造を取得（RLSが無効なら機能する）
    let columnData = null;
    try {
      const res = await supabaseAdmin.rpc('get_table_info', {
        table_name: 'stripe_user_subscriptions'
      });
      
      if (res.error) {
        console.error('テーブル情報RPC実行エラー:', res.error);
      } else {
        columnData = res.data;
      }
    } catch (err) {
      console.error('RPCエラー:', err);
    }

    return NextResponse.json({
      tableExists: tableInfo !== null,
      totalRecords: count || 0,
      allDataError: allDataError ? allDataError.message : null,
      userData,
      allData: allData || [],
      schema: {
        example: tableInfo?.length > 0 ? tableInfo[0] : null,
        columnNames: tableInfo?.length > 0 ? Object.keys(tableInfo[0]) : [],
        columnData
      }
    });
  } catch (err) {
    console.error('デバッグAPI実行エラー:', err);
    return NextResponse.json({ error: '予期しないエラーが発生しました', details: err }, { status: 500 });
  }
} 