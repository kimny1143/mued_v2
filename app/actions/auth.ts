'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Google認証へのリダイレクト
export async function signInWithGoogle() {
  // リダイレクト先のベースURLを設定
  let origin = '';
  
  // リダイレクトURLの決定ロジック
  if (process.env.VERCEL_ENV === 'production') {
    // 本番環境
    origin = 'https://mued.jp';
  } else if (process.env.VERCEL_ENV === 'preview') {
    // Vercelプレビュー環境
    origin = `https://${process.env.VERCEL_URL}`;
  } else if (process.env.VERCEL_ENV === 'development') {
    // Vercel開発環境
    origin = `https://${process.env.VERCEL_URL}`;
  } else {
    // ローカル開発環境
    origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  }
  
  console.log(`認証リダイレクト先: ${origin}, 環境: ${process.env.VERCEL_ENV || 'local'}`);

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
      redirectTo: `${origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  // エラーチェック
  if (error) {
    console.error('Google認証エラー:', error);
    return { success: false, error: error.message };
  }

  // 認証URLが取得できた場合はリダイレクト
  if (data?.url) {
    // NEXT_REDIRECTエラーをキャッチしないようにするため、return しない
    redirect(data.url);
  } else {
    console.error('認証URL取得エラー: URLがundefined');
    return { success: false, error: '認証URLの取得に失敗しました' };
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
    return { success: false, error: error.message };
  }

  // NEXT_REDIRECTエラーをキャッチしないようにするため、return しない
  redirect('/login');
} 