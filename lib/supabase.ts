import { createClient } from '@supabase/supabase-js';

/**
 * 環境に応じたベースURLを取得
 */
function getSiteUrl() {
  // デプロイURLが明示的に設定されていれば最優先
  // if (process.env.NEXT_PUBLIC_DEPLOY_URL) {
  //   return process.env.NEXT_PUBLIC_DEPLOY_URL;
  // }

  // 環境変数を出力（デバッグ用）
  console.log('環境変数:', {
    NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL || 'なし',
    VERCEL_URL: process.env.VERCEL_URL || 'なし',
    NODE_ENV: process.env.NODE_ENV || 'development',
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'なし'
  });

  // Vercel環境変数があれば使用
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    const url = `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
    console.log(`Vercel公開URL(NEXT_PUBLIC)を使用: ${url}`);
    return url;
  }
  
  // Vercel環境変数（サーバーサイド）
  if (process.env.VERCEL_URL) {
    const url = `https://${process.env.VERCEL_URL}`;
    console.log(`Vercel公開URL(サーバー)を使用: ${url}`);
    return url;
  }

  // 本番環境なら固定URL
  if (process.env.NODE_ENV === 'production') {
    const url = 'https://mued-lms-fgm.vercel.app';
    console.log(`本番固定URLを使用: ${url}`);
    return url;
  }

  // サイトURLが設定されていれば使用
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    console.log(`NEXT_PUBLIC_SITE_URLを使用: ${process.env.NEXT_PUBLIC_SITE_URL}`);
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  // ローカル開発環境のデフォルト
  console.log(`ローカル開発URLを使用: http://localhost:3000`);
  return 'http://localhost:3000';
}

// Supabase環境変数
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// 環境変数チェック
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase環境変数が設定されていません");
  console.error("URL:", supabaseUrl ? "設定済み" : "未設定");
  console.error("ANON_KEY:", supabaseAnonKey ? "設定済み" : "未設定");
}

// 現在の環境に合わせたサイトURL
const siteUrl = getSiteUrl();
console.log(`Supabase初期化 - サイトURL: ${siteUrl}`);

// Supabaseクライアント設定
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // 明示的な認証フロー設定
    flowType: 'implicit'
  },
  global: {
    // こちらがリダイレクトURLのベースとなるURL
    headers: {
      'x-site-url': siteUrl  // カスタムヘッダーでサイトURLを通知
    }
  }
});

// このファイルがインポートされた時点でSupabaseクライアントの初期状態をログ出力
console.log(`Supabase認証設定 - ${new Date().toISOString()}`);
console.log(`- サイトURL: ${siteUrl}`);
console.log(`- 環境: ${process.env.NODE_ENV || 'development'}`);
console.log(`- Vercel URL: ${process.env.VERCEL_URL || 'なし'}`);

// Supabaseの認証状態が変わったときのハンドラーを設定
if (typeof window !== 'undefined') {
  // クライアント側でのみ実行
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'INITIAL_SESSION') {
      console.log(`認証設定: コールバックURLを設定 - ${siteUrl}/api/auth/callback`);
      // 非推奨のsetAuth()を使わない方法で設定
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${siteUrl}/api/auth/callback`
        }
      });
      if (error) console.error("リダイレクト設定エラー:", error);
    } else if (event === 'SIGNED_IN' && session) {
      console.log('ログイン検知 - ユーザー:', session.user.email);
    } else if (event === 'SIGNED_OUT') {
      console.log('ログアウト検知');
    } else {
      console.log('認証状態変更:', event);
    }
  });
}