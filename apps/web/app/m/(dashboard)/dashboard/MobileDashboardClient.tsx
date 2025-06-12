'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { RefreshCw } from 'lucide-react';

interface MobileDashboardClientProps {
  children: React.ReactNode;
}

export default function MobileDashboardClient({ children }: MobileDashboardClientProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPWA, setIsPWA] = useState(false);

  // PWA判定
  useState(() => {
    if (typeof window !== 'undefined') {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      setIsPWA(isStandalone || isIOSStandalone);
    }
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    // キャッシュをクリア
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }
    
    // ページをリロード
    router.refresh();
    
    // アニメーション用に少し待機
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  return (
    <>
      {children}
      
      {/* PWAでのみホットリロードボタンを表示 */}
      {isPWA && (
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={`
            fixed bottom-20 right-4 z-50
            w-14 h-14 rounded-full shadow-lg
            bg-blue-500 text-white
            flex items-center justify-center
            transition-all duration-300
            ${isRefreshing ? 'opacity-50' : 'hover:bg-blue-600 active:scale-95'}
          `}
          aria-label="ページを更新"
        >
          <RefreshCw 
            className={`h-6 w-6 ${isRefreshing ? 'animate-spin' : ''}`} 
          />
        </button>
      )}
    </>
  );
}