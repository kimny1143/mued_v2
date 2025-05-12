'use server';

import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

/**
 * 現在の環境に応じたベースURLを取得する関数
 * Vercel環境変数を自動検出して適切なURLを返す
 */
function getBaseUrl() {
  // Vercel環境変数があればそれを使用
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // 本番環境の場合（VERCEL_ENV=production）
  if (process.env.VERCEL_ENV === 'production') {
    return 'https://mued-lms-fgm.vercel.app';
  }
  
  // 明示的に設定された場合はそれを使用
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  
  // ローカル開発環境
  return 'http://localhost:3000';
}

// Google認証へのリダイレクト
export async function signInWithGoogle() {
  // 現在の環境用のベースURLを取得
  const baseUrl = getBaseUrl();
  const redirectUrl = `${baseUrl}/auth/callback`;
  
  console.log(`認証コールバックURL: ${redirectUrl}`);
  console.log(`環境情報: VERCEL_ENV=${process.env.VERCEL_ENV || 'local'}, VERCEL_URL=${process.env.VERCEL_URL || 'なし'}`);

  // Supabaseサーバークライアント初期化
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
      }
    }
  );

  // OAuth認証URLの生成
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
    redirectUrl: '/login' 
  };
} 