'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from 'next-themes';
import { useState } from 'react';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5分間はキャッシュを新鮮と見なす
        gcTime: 10 * 60 * 1000, // 10分間キャッシュを保持（v5ではgcTimeを使用）
        retry: 1, // エラー時に1回だけリトライ
        refetchOnWindowFocus: false, // ウィンドウフォーカス時の自動再取得を無効化
        refetchOnMount: false, // コンポーネントマウント時の再取得を無効化（重複防止）
        refetchOnReconnect: true, // 再接続時の再取得は有効
        // 重複排除の設定
        structuralSharing: true, // 構造的な共有を有効化
        networkMode: 'offlineFirst', // オフラインファーストで動作
      },
      mutations: {
        retry: 0, // mutationのリトライは無効
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
        <Toaster position="top-right" richColors closeButton />
        <ReactQueryDevtools initialIsOpen={false} />
      </ThemeProvider>
    </QueryClientProvider>
  );
} 