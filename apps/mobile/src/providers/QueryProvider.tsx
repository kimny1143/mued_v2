import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// QueryClientの設定
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Web版と同じ設定
      staleTime: 30 * 1000, // 30秒
      gcTime: 5 * 60 * 1000, // 5分（旧cacheTime）
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false, // モバイルでは不要な再フェッチを避ける
      refetchOnReconnect: true, // ネットワーク復帰時は再フェッチ
    },
    mutations: {
      retry: 1,
    },
  },
});

interface QueryProviderProps {
  children: React.ReactNode;
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
    </QueryClientProvider>
  );
};