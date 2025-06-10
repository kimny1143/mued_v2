'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { getSiteUrl } from '@/lib/utils/url';

// Google認証へのリダイレクト
export async function signInWithGoogle(options?: { isMobile?: boolean }) {
  try {
    // 現在の環境用のベースURLを取得
    const baseUrl = getSiteUrl();
    
    // コールバック用のフルURLを構築
    // モバイルの場合は /m/callback、そうでなければ /auth/callback
    const redirectUrl = options?.isMobile 
      ? `${baseUrl}/m/callback`
      : `${baseUrl}/auth/callback`;
    
    console.log(`[認証処理] 開始: ${new Date().toISOString()}`);
    console.log(`[認証処理] モバイル: ${options?.isMobile ? 'はい' : 'いいえ'}`);
    console.log(`[認証処理] ベースURL: ${baseUrl}`);
    console.log(`[認証処理] コールバックURL: ${redirectUrl}`);
    console.log(`[認証処理] 環境変数:`, {
      VERCEL_ENV: process.env.VERCEL_ENV || 'local',
      VERCEL_URL: process.env.VERCEL_URL || 'なし',
      NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL || 'なし',
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'なし',
      NEXT_PUBLIC_DEPLOY_URL: process.env.NEXT_PUBLIC_DEPLOY_URL || 'なし'
    });

    // Supabaseサーバークライアント初期化
    const supabase = createSupabaseServerClient();

    // OAuth認証URLの生成 - PKCEフローを使用
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
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
  try {
    const supabase = createSupabaseServerClient();

    // サーバー側のセッションをクリア
    const { error } = await supabase.auth.signOut({
      scope: 'global' // グローバルセッションをクリア
    });
    
    if (error) {
      console.error('サーバーログアウトエラー:', error);
      // エラーでも成功として扱う（クライアント側でも処理するため）
    }

    // セッションが確実にクリアされているか確認
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session) {
      console.warn('セッションがまだ残っています。強制的にクリアを試みます。');
      // 再度サインアウトを試行
      await supabase.auth.signOut({ scope: 'local' });
    }

    // Cookieを明示的にクリア
    const cookieStore = cookies();
    try {
      // Supabase関連のCookieをすべてクリア
      const cookieNames = [
        'sb-access-token',
        'sb-refresh-token', 
        'supabase-auth-token',
        'supabase.auth.token',
        // Vercel環境での追加Cookie
        'sb-zyesgfkhaqpbcbkhsutw-auth-token',
        'sb-zyesgfkhaqpbcbkhsutw-auth-token.0',
        'sb-zyesgfkhaqpbcbkhsutw-auth-token.1'
      ];
      
      cookieNames.forEach(name => {
        // 複数のパスとドメインで削除を試行
        const cookieOptions = [
          { path: '/', domain: undefined },
          { path: '/', domain: '.vercel.app' },
          { path: '/', domain: '.mued.jp' },
          { path: '/', domain: '.dev.mued.jp' }
        ];
        
        cookieOptions.forEach(options => {
          try {
            cookieStore.set({
              name,
              value: '',
              expires: new Date(0),
              path: options.path,
              domain: options.domain,
              httpOnly: false,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax'
            });
          } catch (individualCookieError) {
            // 個別のCookie削除エラーは無視
          }
        });
      });
      
      console.log('サーバー側Cookie削除完了');
    } catch (cookieError) {
      console.error('Cookie削除エラー:', cookieError);
    }

    return { 
      success: true, 
      redirectUrl: '/' 
    };
  } catch (err) {
    console.error('サインアウト処理エラー:', err);
    return { 
      success: false, 
      error: 'サインアウト処理中にエラーが発生しました', 
      redirectUrl: '/' 
    };
  }
}

// cookie ユーティリティ
function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      }
    }
  );
} 