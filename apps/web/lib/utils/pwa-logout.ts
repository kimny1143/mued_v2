// PWA環境でのログアウトヘルパー
export async function cleanupPWASession() {
  try {
    // 1. Service WorkerのキャッシュをクリアPWA（すべてのキャッシュを削除）
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('PWA: すべてのキャッシュクリア完了');
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
    if ('indexedDB' in window && 'databases' in window.indexedDB) {
      try {
        const dbs = await (window.indexedDB as any).databases();
        const supabaseDBs = dbs.filter((db: any) => db.name?.includes('supabase'));
        
        for (const db of supabaseDBs) {
          if (db.name) {
            window.indexedDB.deleteDatabase(db.name);
            console.log(`PWA: IndexedDB ${db.name} 削除完了`);
          }
        }
      } catch (e) {
        console.log('PWA: IndexedDB削除スキップ（未サポート）');
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
      const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
      
      // すべてのクッキーを削除（PWA環境では新規ログインを強制）
      const paths = ['/', '/m/', '/dashboard/', '/api/', '/auth/'];
      const domains = ['', '.mued.jp', '.dev.mued.jp', 'dev.mued.jp', 'localhost', window.location.hostname];
      
      paths.forEach(path => {
        domains.forEach(domain => {
          // 各種組み合わせで削除を試行
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=${path};domain=${domain};secure;`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=${path};domain=${domain};`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=${path};`;
          document.cookie = `${name}=;max-age=0;path=${path};domain=${domain};`;
        });
      });
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
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  
  // iOS PWA（iOS Safari特有のプロパティ）
  const isIOSPWA = 'standalone' in window.navigator && (window.navigator as any).standalone === true;
  
  // フルスクリーンモード
  const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
  
  // minimal-uiモード（一部のPWA）
  const isMinimalUI = window.matchMedia('(display-mode: minimal-ui)').matches;
  
  return isStandalone || isIOSPWA || isFullscreen || isMinimalUI;
}