'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Google認証へのリダイレクト
export async function signInWithGoogle() {
  // リダイレクトURLを常にlocalhostに固定（開発環境）
  const origin = process.env.NODE_ENV === 'production'
    ? 'https://mued.jp' // 本番URLを適宜変更
    : 'http://localhost:3000'; // 開発環境は常にlocalhostに固定
  
  // Supabaseサーバークライアント
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
        response_type: 'code',
      },
    },
  });

  if (error) {
    console.error('Googleログインエラー:', error.message);
    return { success: false, error: error.message };
  }

  if (data?.url) {
    // リダイレクトURLが取得できたら、そこにリダイレクト
    redirect(data.url);
  }

  return { success: false, error: '認証URLの取得に失敗しました' };
}

// ログアウト処理
export async function signOut() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('ログアウトエラー:', error.message);
    return { success: false, error: error.message };
  }

  redirect('/login');
} 