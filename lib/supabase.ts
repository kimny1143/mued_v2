import { createClient } from '@supabase/supabase-js';

/**
 * 環境に応じたベースURLを取得
 */
function getSiteUrl() {
  // デプロイURLが明示的に設定されていれば最優先
  // if (process.env.NEXT_PUBLIC_DEPLOY_URL) {
  //   return process.env.NEXT_PUBLIC_DEPLOY_URL;
  // }

  // Vercel環境変数があれば使用
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  
  // Vercel環境変数（サーバーサイド）
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // 本番環境なら固定URL
  if (process.env.NODE_ENV === 'production') {
    return 'https://mued-lms-fgm.vercel.app';
  }

  // サイトURLが設定されていれば使用
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  // ローカル開発環境
  return 'http://localhost:3000';
}

// Supabase環境変数
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// 環境変数チェック
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase環境変数が設定されていません");
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
    // 以下の設定はSupabaseの側で機能しない可能性がありますが、
    // 重要なのは明示的なURLの指定が必要なことです
    flowType: 'implicit'  // 明示的にImplicitフローを指定
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
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      console.log('ログイン検知 - ユーザー:', session.user.email);
    } else if (event === 'SIGNED_OUT') {
      console.log('ログアウト検知');
    }
  });
}