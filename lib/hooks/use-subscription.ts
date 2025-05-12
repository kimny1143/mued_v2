import { useState, useEffect, useCallback } from 'react';

/**
 * サブスクリプションデータの型定義
 */
interface Subscription {
  userId: string;
  customerId: string;
  subscriptionId: string;
  priceId?: string | null;
  status: string;
  currentPeriodStart?: number | null;
  currentPeriodEnd?: number | null;
  cancelAtPeriodEnd?: boolean;
  updatedAt?: string;
  // 必要な他のフィールドを明示的に追加
  createdAt?: string;
  id?: string | number;
  user_id?: string; // スネークケースでも対応
  customer_id?: string;
  subscription_id?: string;
}

/**
 * サブスクリプション情報を取得するカスタムフック
 * サーバーAPIを使用してデータベースから最新のサブスクリプション情報を取得
 */
export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      setLoading(true);
      
      console.log('APIからサブスクリプション情報を取得します...');
      const response = await fetch('/api/user/subscription');
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API エラー: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log('サブスクリプションAPI レスポンス:', data);
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setSubscription(data.subscription);
    } catch (err) {
      console.error('サブスクリプション取得エラー:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      
      // エラー時にはnullをセット
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
    
    // 定期的にサブスクリプション情報を更新（60秒ごと）
    const intervalId = setInterval(fetchSubscription, 60000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [fetchSubscription]);

  // 手動更新メソッドも提供
  const refreshSubscription = useCallback(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return {
    subscription,
    loading,
    error,
    refreshSubscription
  };
} 