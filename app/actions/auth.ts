'use server';

import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
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
    const supabase = createSupabaseServerClient();

    // OAuth認証URLの生成 - クエリパラメータでアクセスタイプを指定
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    // エラーチェック
    if (error) {
      console.error('Google認証エラー:', error);
      return { success: false, error: error.message, redirectUrl: null };
    }

    // 認証URLが取得できた場合はリダイレクトURLを返す（クライアント側でリダイレクト実行）
    if (data?.url) {
      console.log('認証URL生成成功:', data.url.substring(0, 50) + '...');
      
      // 追加のデバッグ情報
      try {
        // URLオブジェクトのパラメータを確認
        const parsedUrl = new URL(data.url);
        console.log('認証URLパラメータ:');
        parsedUrl.searchParams.forEach((value, key) => {
          if (key !== 'access_token' && key !== 'refresh_token') {
            console.log(`- ${key}: ${value}`);
          } else {
            console.log(`- ${key}: [存在]`);
          }
        });
      } catch (e) {
        console.error('URL解析エラー:', e);
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
  const supabase = createSupabaseServerClient();

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

// cookie ユーティリティ
function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        }
      }
    }
  );
} 