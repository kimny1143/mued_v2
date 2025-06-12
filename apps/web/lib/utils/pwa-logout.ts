// PWA環境でのログアウトヘルパー
export async function cleanupPWASession() {
  try {
    // 1. Service WorkerのキャッシュをクリアPWA
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          // 認証関連のキャッシュを削除
          if (cacheName.includes('auth') || cacheName.includes('session')) {
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        })
      );
      console.log('PWA: キャッシュクリア完了');
    }

    // 2. LocalStorageのSupabase関連データをクリア
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('sb-'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log('PWA: LocalStorageクリア完了');

    // 3. SessionStorageもクリア
    const sessionKeysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('sb-'))) {
        sessionKeysToRemove.push(key);
      }
    }
    sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
    console.log('PWA: SessionStorageクリア完了');

    // 4. IndexedDBのSupabaseデータをクリア
    if ('indexedDB' in window) {
      const dbs = await window.indexedDB.databases();
      const supabaseDBs = dbs.filter(db => db.name?.includes('supabase'));
      
      for (const db of supabaseDBs) {
        if (db.name) {
          await window.indexedDB.deleteDatabase(db.name);
          console.log(`PWA: IndexedDB ${db.name} 削除完了`);
        }
      }
    }

    // 5. Service Workerを更新（強制リロード）
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
      console.log('PWA: Service Worker更新リクエスト送信');
    }

    // 6. ブラウザのクッキーをクライアント側でもクリア（可能な範囲で）
    document.cookie.split(";").forEach(cookie => {
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      
      if (name.includes('supabase') || name.includes('sb-') || name.includes('auth')) {
        // 複数のパスとドメインで削除を試行
        const paths = ['/', '/m/', '/dashboard/'];
        const domains = ['', '.mued.jp', '.dev.mued.jp', window.location.hostname];
        
        paths.forEach(path => {
          domains.forEach(domain => {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=${path};domain=${domain};`;
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=${path};`;
          });
        });
      }
    });
    console.log('PWA: ブラウザクッキークリア完了');

    return true;
  } catch (error) {
    console.error('PWAセッションクリーンアップエラー:', error);
    return false;
  }
}

// PWA環境かどうかを判定
export function isPWA(): boolean {
  // スタンドアロンモードで動作している
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
  
  // iOS PWA
  const isIOSPWA = 'standalone' in window.navigator && (window.navigator as any).standalone === true;
  
  // Service Workerが登録されている
  const hasServiceWorker = 'serviceWorker' in navigator;
  
  return isStandalone || isIOSPWA || hasServiceWorker;
}