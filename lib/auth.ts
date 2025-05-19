import { supabaseServer } from './supabase-server';

/**
 * 現在のセッションユーザーの認証情報を取得
 * @returns サーバーサイドでのみ使用可能なセッション情報
 */
export async function auth() {
  try {
    const { data, error } = await supabaseServer.auth.getSession();
    
    if (error) {
      console.error('認証情報取得エラー:', error);
      return null;
    }
    
    return data.session;
  } catch (err) {
    console.error('認証処理エラー:', err);
    return null;
  }
} 