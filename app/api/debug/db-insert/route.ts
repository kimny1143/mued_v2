import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // リクエストボディを解析
    const body = await request.json();
    const { 
      userId, 
      subscriptionId, 
      customerId, 
      priceId, 
      status, 
      currentPeriodStart, 
      currentPeriodEnd 
    } = body;

    // 必須パラメータを検証
    if (!userId || !subscriptionId || !customerId || !priceId) {
      return NextResponse.json({ 
        error: '必須パラメータが不足しています' 
      }, { status: 400 });
    }

    // テーブル内のカラム名を確認する試み
    try {
      const { data: columnInfo, error: columnError } = await supabase.rpc('get_table_columns', {
        table_name: 'stripe_user_subscriptions'
      });

      if (columnError) {
        console.log('列情報取得エラー:', columnError);
      } else {
        console.log('テーブル列情報:', columnInfo);
      }
    } catch (err) {
      console.error('テーブル列情報取得中の例外:', err);
    }

    // カラム名を小文字に変換したサブスクリプションレコード
    const record = {
      userId,
      subscriptionId,
      customerId,
      priceId,
      status: status || 'active',
      currentPeriodStart: currentPeriodStart || Math.floor(Date.now() / 1000),
      currentPeriodEnd: currentPeriodEnd || Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('挿入するレコード:', record);

    // INSERT操作を試行
    const { data, error } = await supabase
      .from('stripe_user_subscriptions')
      .insert(record)
      .select();

    if (error) {
      console.error('INSERT操作エラー:', error);
      
      // 代替アプローチ: カラム名を別のケースで試行
      const alternativeRecord = {
        user_id: userId,
        subscription_id: subscriptionId,
        customer_id: customerId,
        price_id: priceId,
        status: status || 'active',
        current_period_start: currentPeriodStart || Math.floor(Date.now() / 1000),
        current_period_end: currentPeriodEnd || Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('代替レコード形式で試行:', alternativeRecord);
      
      const { data: altData, error: altError } = await supabase
        .from('stripe_user_subscriptions')
        .insert(alternativeRecord)
        .select();
        
      if (altError) {
        console.error('代替INSERT操作エラー:', altError);
        return NextResponse.json({ 
          error: 'サブスクリプションデータの挿入に失敗しました', 
          details: error,
          alternativeError: altError
        }, { status: 500 });
      }
      
      return NextResponse.json({ 
        success: true, 
        message: '代替方法でデータを挿入しました',
        data: altData
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'サブスクリプションデータを挿入しました',
      data
    });
  } catch (err) {
    console.error('デバッグAPI実行エラー:', err);
    return NextResponse.json({ 
      error: '予期しないエラーが発生しました', 
      details: err 
    }, { status: 500 });
  }
} 