'use server';

import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { getBaseUrl } from '@/lib/utils';

// Google認証へのリダイレクト
export async function signInWithGoogle() {
  try {
    // 現在の環境用のベースURLを取得
    const baseUrl = getBaseUrl();
    
    // コールバック用のフルURLを構築
    // 明示的に /auth/callback に戻す
    const redirectUrl = `${baseUrl}/auth/callback`;
    
    console.log(`認証処理開始: ${new Date().toISOString()}`);
    console.log(`認証コールバックURL: ${redirectUrl}`);
    console.log(`環境情報: VERCEL_ENV=${process.env.VERCEL_ENV || 'local'}, VERCEL_URL=${process.env.VERCEL_URL || 'なし'}`);

    // Supabaseサーバークライアント初期化
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        }
      }
    );

    // OAuth認証URLの生成 - Implicit Grantフロー
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        // Implicit Grantフローはデフォルトで使用される
      },
    });

    // エラーチェック
    if (error) {
      console.error('Google認証エラー:', error);
      return { success: false, error: error.message, redirectUrl: null };
    }

    // 認証URLが取得できた場合はリダイレクトURLを返す（クライアント側でリダイレクト実行）
    if (data?.url) {
      // URL内のリダイレクト先パラメータを確認
      const authUrl = new URL(data.url);
      const encodedRedirect = authUrl.searchParams.get('redirect_to');
      console.log('認証URL生成成功:', data.url.substring(0, 50) + '...');
      console.log('エンコードされたリダイレクト:', encodedRedirect);
      
      // リダイレクト先がlocalhostだがVercel環境の場合、URLを修正
      if (encodedRedirect && encodedRedirect.includes('localhost') && baseUrl.includes('vercel.app')) {
        // VercelのURLに置換したリダイレクトURL
        const correctedRedirect = encodedRedirect.replace('http://localhost:3000', baseUrl);
        console.log('リダイレクト先修正:', correctedRedirect);
        
        authUrl.searchParams.set('redirect_to', correctedRedirect);
        return { 
          success: true, 
          redirectUrl: authUrl.toString() 
        };
      }
      
      return { 
        success: true, 
        redirectUrl: data.url
      };
    } else {
      console.error('認証URL取得エラー: URLがundefined');
      return { 
        success: false, 
        error: '認証URLの取得に失敗しました', 
        redirectUrl: null 
      };
    }
  } catch (err) {
    console.error('認証処理エラー:', err);
    return {
      success: false,
      error: '認証処理中にエラーが発生しました',
      redirectUrl: null
    };
  }
}

// ログアウト処理
export async function signOut() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
      }
    }
  );

  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('ログアウトエラー:', error);
    return { 
      success: false, 
      error: error.message, 
      redirectUrl: null 
    };
  }

  // リダイレクト先を返す（クライアント側でリダイレクト実行）
  return { 
    success: true, 
    redirectUrl: '/' 
  };
} 