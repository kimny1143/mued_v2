'use client';

import { supabaseBrowser } from './supabase-browser';

/**
 * 完全なサインアウト処理
 * Vercel環境での認証問題を解決するための包括的なサインアウト
 */
export async function performCompleteSignOut(): Promise<void> {
  try {
    console.log('完全サインアウト処理を開始...');

    // 1. Supabaseクライアントからサインアウト（セッションが存在する場合のみ）
    try {
      const { error: supabaseError } = await supabaseBrowser.auth.signOut({
        scope: 'global'
      });

      if (supabaseError) {
        // AuthSessionMissingErrorは正常な状態として扱う
        if (supabaseError.message.includes('Auth session missing')) {
          console.log('セッションは既にクリア済みです');
        } else {
          console.error('Supabaseサインアウトエラー:', supabaseError);
        }
      } else {
        console.log('Supabaseサインアウト成功');
      }
    } catch (authError) {
      // 認証関連エラーは無視して続行
      console.log('認証エラー（無視）:', authError);
    }

    // 2. ブラウザストレージを完全にクリア
    if (typeof window !== 'undefined') {
      try {
        // LocalStorageから認証関連データを削除
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (
            key.includes('supabase') || 
            key.includes('auth') ||
            key.includes('session') ||
            key.includes('token')
          )) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
          console.log(`LocalStorage削除: ${key}`);
        });

        // SessionStorageも完全にクリア
        sessionStorage.clear();
        console.log('SessionStorage完全クリア完了');

        // IndexedDBのSupabase関連データもクリア（可能であれば）
        if ('indexedDB' in window) {
          try {
            const deleteDB = indexedDB.deleteDatabase('supabase-auth');
            deleteDB.onsuccess = () => console.log('IndexedDB削除成功');
            deleteDB.onerror = () => console.log('IndexedDB削除エラー（無視可能）');
          } catch (idbError) {
            console.log('IndexedDB削除スキップ:', idbError);
          }
        }

      } catch (storageError) {
        console.error('ストレージクリアエラー:', storageError);
      }
    }

    // 3. Cookieを削除（可能な範囲で）
    if (typeof document !== 'undefined') {
      try {
        // 認証関連のCookieを削除
        const cookiesToDelete = [
          'sb-access-token',
          'sb-refresh-token',
          'supabase-auth-token',
          'supabase.auth.token'
        ];

        cookiesToDelete.forEach(cookieName => {
          // 複数のパスとドメインで削除を試行
          const domains = ['', '.vercel.app', '.mued.jp', '.dev.mued.jp'];
          const paths = ['/', '/dashboard'];
          
          domains.forEach(domain => {
            paths.forEach(path => {
              document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; domain=${domain}; SameSite=Lax;`;
            });
          });
        });

        console.log('Cookie削除処理完了');
      } catch (cookieError) {
        console.error('Cookie削除エラー:', cookieError);
      }
    }

    console.log('完全サインアウト処理完了');
  } catch (error) {
    console.error('完全サインアウト処理エラー:', error);
    throw error;
  }
}

/**
 * 認証状態をチェックして、必要に応じて強制ログアウト
 */
export async function validateAuthState(): Promise<boolean> {
  try {
    const { data: { session }, error } = await supabaseBrowser.auth.getSession();
    
    if (error) {
      console.error('認証状態チェックエラー:', error);
      return false;
    }

    return !!session;
  } catch (error) {
    console.error('認証状態検証エラー:', error);
    return false;
  }
}

/**
 * 強制的にホームページにリダイレクト
 */
export function forceRedirectToHome(): void {
  if (typeof window !== 'undefined') {
    // 現在のURLを確認
    const currentPath = window.location.pathname;
    
    // すでにホームページにいる場合はリロード
    if (currentPath === '/' || currentPath === '') {
      window.location.reload();
    } else {
      // ホームページにリダイレクト
      window.location.href = '/';
    }
  }
} 