import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAdminSupabaseClient } from '@/lib/use-admin-supabase-client';

export const dynamic = 'force-dynamic';

/**
 * テスト用のウェブフックエンドポイント
 * Supabaseクライアントの動作確認とデバッグに使用します
 */
export async function POST(req: Request) {
  console.log('テストウェブフックが呼び出されました');

  const results = ["テストウェブフックのレスポンス:"];

  try {
    // 通常のクライアントでの試行
    results.push("通常のSupabaseクライアントでデータベースアクセスを試行します...");
    
    const { data: normalData, error: normalError } = await supabase
      .from('stripe_user_subscriptions')
      .select('*')
      .limit(1);
    
    if (normalError) {
      results.push(`通常クライアントエラー: ${normalError.message}`);
    } else {
      results.push(`通常クライアント結果: ${JSON.stringify(normalData || '空のデータ')}`);
    }
    
    // 管理者クライアントでの試行
    results.push("管理者Supabaseクライアントでデータベースアクセスを試行します...");
    
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('stripe_user_subscriptions')
      .select('*')
      .limit(1);
    
    if (adminError) {
      results.push(`管理者クライアントエラー: ${adminError.message}`);
    } else {
      results.push(`管理者クライアント結果: ${JSON.stringify(adminData || '空のデータ')}`);
    }
    
    // 動的に生成された管理者クライアントでの試行
    results.push("動的に生成された管理者クライアントでデータベースアクセスを試行します...");
    
    const dynamicAdmin = getAdminSupabaseClient();
    const { data: dynamicData, error: dynamicError } = await dynamicAdmin
      .from('stripe_user_subscriptions')
      .select('*')
      .limit(1);
    
    if (dynamicError) {
      results.push(`動的管理者クライアントエラー: ${dynamicError.message}`);
    } else {
      results.push(`動的管理者クライアント結果: ${JSON.stringify(dynamicData || '空のデータ')}`);
    }
    
    // データ挿入テスト
    results.push("テストデータの挿入を試行します...");
    
    const testData = {
      userId: 'test_user_' + Date.now(),
      customerId: 'test_customer_' + Date.now(),
      subscriptionId: 'test_subscription_' + Date.now(),
      status: 'active',
      updatedAt: new Date().toISOString(),
    };
    
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('stripe_user_subscriptions')
      .insert(testData)
      .select();
    
    if (insertError) {
      results.push(`データ挿入エラー: ${insertError.message}`);
    } else {
      results.push(`データ挿入成功: ${JSON.stringify(insertData)}`);
    }
    
    const responseText = results.join("\n");
    return new Response(responseText, {
      headers: { 
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push(`テストウェブフック処理エラー: ${errorMessage}`);
    const responseText = results.join("\n");
    
    return new Response(responseText, {
      status: 500,
      headers: { 
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  }
}

/**
 * GETメソッドも許可するようにハンドラーを追加
 */
export async function GET(req: Request) {
  const results = ["テストウェブフックのGETレスポンス:"];
  results.push("テストページが正常に動作しています。POSTリクエストを送信してデータベーステストを実行してください。");
  
  const responseText = results.join("\n");
  return new Response(responseText, {
    headers: { 
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    }
  });
}