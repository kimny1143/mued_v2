/**
 * デバッグヘルパー関数
 * 認証・サブスクリプション関連の問題を診断するためのユーティリティ
 */

import { getPlanByPriceId } from '@/app/stripe-config';

import { supabaseBrowser } from './supabase-browser';


/**
 * 認証状態の詳細情報を取得
 */
export async function debugAuthStatus() {
  try {
    console.log('=== 認証状態デバッグ開始 ===');
    
    // セッション情報を取得
    const { data: { session }, error: sessionError } = await supabaseBrowser.auth.getSession();
    
    console.log('セッション情報:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id || 'なし',
      userEmail: session?.user?.email || 'なし',
      hasAccessToken: !!session?.access_token,
      sessionError: sessionError?.message || 'なし'
    });
    
    if (session?.user) {
      // ユーザー詳細情報を取得
      try {
        const { data: userData, error: userError } = await supabaseBrowser
          .from('users')
          .select('id, email, name, roleId')
          .eq('id', session.user.id)
          .maybeSingle();
          
        console.log('ユーザーデータベース情報:', {
          データ取得: userData ? '成功' : '失敗',
          userError: userError?.message || 'なし',
          userData: userData || '取得できず'
        });
      } catch (dbError) {
        console.log('データベースアクセスエラー:', dbError);
      }
      
      // サブスクリプション情報を取得
      try {
        const { data: subData, error: subError } = await supabaseBrowser
          .from('stripe_user_subscriptions')
          .select('userId, price_id, subscription_status, current_period_end')
          .eq('userId', session.user.id)
          .maybeSingle();
          
        console.log('サブスクリプション情報:', {
          データ取得: subData ? '成功' : '失敗（正常な場合もある）',
          subError: subError?.message || 'なし',
          subData: subData || 'なし（新規ユーザーの場合は正常）'
        });
        
        if (subData?.price_id) {
          const plan = getPlanByPriceId(subData.price_id);
          console.log('現在のプラン:', plan?.name || '不明');
        } else {
          console.log('現在のプラン: FREE（サブスクリプションなし）');
        }
      } catch (subDbError) {
        console.log('サブスクリプションデータベースアクセスエラー:', subDbError);
      }
    }
    
    console.log('=== 認証状態デバッグ終了 ===');
    
    return {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id || null,
      sessionError: sessionError?.message || null
    };
  } catch (error) {
    console.error('認証状態デバッグエラー:', error);
    return {
      hasSession: false,
      hasUser: false,
      userId: null,
      sessionError: error instanceof Error ? error.message : '不明なエラー'
    };
  }
}

/**
 * API呼び出しテスト
 */
export async function debugApiCall() {
  try {
    console.log('=== API呼び出しテスト開始 ===');
    
    // 認証情報を取得
    const { data: { session } } = await supabaseBrowser.auth.getSession();
    const authToken = session?.access_token;
    
    if (!authToken) {
      console.log('認証トークンなし - APIテストをスキップ');
      return { success: false, reason: '認証トークンなし' };
    }
    
    console.log('認証トークン取得成功 - APIテスト実行');
    
    // テスト用APIコール（サブスクリプション情報取得）
    const response = await fetch('/api/user/subscription', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      credentials: 'include'
    });
    
    console.log('API応答:', {
      status: response.status,
      ok: response.ok,
      statusText: response.statusText
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('APIデータ:', data);
      return { success: true, data };
    } else {
      const errorText = await response.text();
      console.log('APIエラー:', errorText);
      return { success: false, reason: errorText };
    }
  } catch (error) {
    console.error('API呼び出しテストエラー:', error);
    return { 
      success: false, 
      reason: error instanceof Error ? error.message : '不明なエラー' 
    };
  }
}

/**
 * 完全な診断を実行
 */
export async function runFullDiagnostic() {
  console.log('🔍 MUED LMS 診断開始');
  console.log('時刻:', new Date().toISOString());
  
  const authStatus = await debugAuthStatus();
  const apiTest = await debugApiCall();
  
  console.log('📊 診断結果まとめ:');
  console.log('- 認証状態:', authStatus.hasSession ? '✅ OK' : '❌ NG');
  console.log('- ユーザー情報:', authStatus.hasUser ? '✅ OK' : '❌ NG');
  console.log('- API呼び出し:', apiTest.success ? '✅ OK' : '❌ NG');
  
  if (!authStatus.hasSession) {
    console.log('💡 推奨アクション: ログインが必要です');
  } else if (!apiTest.success) {
    console.log('💡 推奨アクション: API認証の設定を確認してください');
    console.log('エラー詳細:', apiTest.reason);
  } else {
    console.log('✨ すべて正常に動作しています！');
  }
  
  return {
    authStatus,
    apiTest,
    overall: authStatus.hasSession && authStatus.hasUser && apiTest.success
  };
}

// グローバルに関数を公開（デバッグ時にコンソールから呼び出せるように）
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).debugMUED = {
    auth: debugAuthStatus,
    api: debugApiCall,
    full: runFullDiagnostic
  };
} 