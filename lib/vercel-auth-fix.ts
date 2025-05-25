'use client';

/**
 * Vercel環境でのサインアウト問題を解決するための専用ユーティリティ
 */

import { supabaseBrowser } from './supabase-browser';

/**
 * Vercel環境でのサインアウト処理
 * AuthSessionMissingErrorを適切に処理し、確実にサインアウトを実行
 */
export async function vercelSafeSignOut(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('🔄 Vercel環境対応サインアウト開始...');

    // 1. 現在のセッション状態を確認
    let hasSession = false;
    try {
      const { data: { session }, error } = await supabaseBrowser.auth.getSession();
      hasSession = !!session && !error;
      console.log('📊 セッション状態:', hasSession ? '存在' : '不存在');
    } catch (sessionCheckError) {
      console.log('⚠️ セッション確認エラー（無視）:', sessionCheckError);
      hasSession = false;
    }

    // 2. セッションが存在する場合のみSupabaseサインアウトを実行
    if (hasSession) {
      try {
        console.log('🔐 Supabaseサインアウト実行中...');
        const { error } = await supabaseBrowser.auth.signOut({ scope: 'global' });
        
        if (error) {
          if (error.message.includes('Auth session missing')) {
            console.log('✅ セッションは既にクリア済み');
          } else {
            console.error('❌ Supabaseサインアウトエラー:', error);
          }
        } else {
          console.log('✅ Supabaseサインアウト成功');
        }
      } catch (signOutError) {
        console.log('⚠️ サインアウトエラー（無視）:', signOutError);
      }
    } else {
      console.log('⏭️ セッション不存在のためSupabaseサインアウトをスキップ');
    }

    // 3. ブラウザストレージを完全にクリア
    await clearAllAuthStorage();

    // 4. Cookieを削除
    clearAuthCookies();

    console.log('✅ Vercel環境対応サインアウト完了');
    return { success: true, message: 'サインアウト完了' };

  } catch (error) {
    console.error('❌ Vercel環境サインアウトエラー:', error);
    
    // エラーでもストレージクリアは実行
    try {
      await clearAllAuthStorage();
      clearAuthCookies();
    } catch (cleanupError) {
      console.error('❌ クリーンアップエラー:', cleanupError);
    }
    
    return { success: false, message: 'サインアウト中にエラーが発生しましたが、ローカルデータはクリアされました' };
  }
}

/**
 * 認証関連のストレージを完全にクリア
 */
async function clearAllAuthStorage(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    console.log('🧹 ストレージクリア開始...');

    // LocalStorageから認証関連データを削除
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.includes('supabase') || 
        key.includes('auth') ||
        key.includes('session') ||
        key.includes('token') ||
        key.includes('sb-') ||
        key.includes('zyesgfkhaqpbcbkhsutw')
      )) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`🗑️ LocalStorage削除: ${key}`);
    });

    // SessionStorageも完全にクリア
    sessionStorage.clear();
    console.log('🗑️ SessionStorage完全クリア');

    // IndexedDBのSupabase関連データもクリア
    if ('indexedDB' in window) {
      try {
        const dbNames = ['supabase-auth', 'supabase-js', 'sb-zyesgfkhaqpbcbkhsutw'];
        dbNames.forEach(dbName => {
          const deleteDB = indexedDB.deleteDatabase(dbName);
          deleteDB.onsuccess = () => console.log(`🗑️ IndexedDB削除成功: ${dbName}`);
          deleteDB.onerror = () => console.log(`⚠️ IndexedDB削除エラー（無視可能）: ${dbName}`);
        });
      } catch (idbError) {
        console.log('⚠️ IndexedDB削除スキップ:', idbError);
      }
    }

    console.log('✅ ストレージクリア完了');
  } catch (error) {
    console.error('❌ ストレージクリアエラー:', error);
    throw error;
  }
}

/**
 * 認証関連のCookieを削除
 */
function clearAuthCookies(): void {
  if (typeof document === 'undefined') return;

  try {
    console.log('🍪 Cookie削除開始...');

    const cookiesToDelete = [
      'sb-access-token',
      'sb-refresh-token',
      'supabase-auth-token',
      'supabase.auth.token',
      'sb-zyesgfkhaqpbcbkhsutw-auth-token',
      'sb-zyesgfkhaqpbcbkhsutw-auth-token.0',
      'sb-zyesgfkhaqpbcbkhsutw-auth-token.1',
      'sb-zyesgfkhaqpbcbkhsutw-auth-token.2'
    ];

    const domains = ['', '.vercel.app', '.mued.jp', '.dev.mued.jp'];
    const paths = ['/', '/dashboard', '/auth'];

    cookiesToDelete.forEach(cookieName => {
      domains.forEach(domain => {
        paths.forEach(path => {
          try {
            const cookieString = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; ${domain ? `domain=${domain};` : ''} SameSite=Lax;`;
            document.cookie = cookieString;
          } catch (cookieError) {
            // 個別のCookie削除エラーは無視
          }
        });
      });
      console.log(`🍪 Cookie削除: ${cookieName}`);
    });

    console.log('✅ Cookie削除完了');
  } catch (error) {
    console.error('❌ Cookie削除エラー:', error);
  }
}

/**
 * 安全なリダイレクト処理
 */
export function safeRedirectToHome(): void {
  if (typeof window === 'undefined') return;

  try {
    console.log('🔄 ホームページリダイレクト開始...');
    
    // 現在のURLを確認
    const currentPath = window.location.pathname;
    console.log('📍 現在のパス:', currentPath);
    
    // リダイレクト実行
    if (currentPath === '/' || currentPath === '') {
      console.log('🔄 ホームページでリロード');
      window.location.reload();
    } else {
      console.log('🔄 ホームページにリダイレクト');
      window.location.href = '/';
    }
  } catch (error) {
    console.error('❌ リダイレクトエラー:', error);
    // フォールバック
    try {
      window.location.href = '/';
    } catch (fallbackError) {
      console.error('❌ フォールバックリダイレクトエラー:', fallbackError);
    }
  }
} 