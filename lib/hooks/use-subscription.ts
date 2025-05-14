import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

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
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  const fetchSubscription = useCallback(async () => {
    try {
      setLoading(true);
      
      // 連続した呼び出しを防ぐ（最低1秒の間隔を確保）
      const now = Date.now();
      if (now - lastFetchTime < 1000) {
        console.log('サブスクリプション取得: 連続呼び出しを制限');
        setLoading(false);
        return;
      }
      
      setLastFetchTime(now);
      console.log('APIからサブスクリプション情報を取得します...');
      
      // Supabaseから認証トークンを取得
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      if (!token) {
        console.warn('認証トークンがありません - サブスクリプション情報の取得をスキップします');
        setSubscription(null);
        setLoading(false);
        return;
      }
      
      console.log('認証トークン取得成功:', token.substring(0, 10) + '...');
      
      // APIエンドポイントからデータを取得（認証ヘッダーを追加）
      const response = await fetch('/api/user/subscription', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Authorization': `Bearer ${token}` // 認証トークンを明示的に設定
        },
        credentials: 'include' // クッキーも念のため含める
      });
      
      // レスポンスステータスが正常でない場合
      if (!response.ok) {
        let errorText = '';
        try {
          const errorData = await response.json();
          errorText = JSON.stringify(errorData);
        } catch {
          errorText = await response.text();
        }
        throw new Error(`API エラー: ${response.status} ${errorText}`);
      }
      
      // レスポンスをJSONとしてパース
      const data = await response.json();
      console.log('サブスクリプションAPI レスポンス:', data);
      
      // APIがエラーを返した場合
      if (data.error) {
        throw new Error(data.error);
      }
      
      // サブスクリプションデータを状態に設定
      setSubscription(data.subscription);
      setError(null);
    } catch (err) {
      console.error('サブスクリプション取得エラー:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      
      // エラー時にはnullをセット
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [lastFetchTime]);

  // コンポーネントマウント時と定期的に取得
  useEffect(() => {
    // 初回読み込み
    fetchSubscription();
    
    // 定期的にサブスクリプション情報を更新（60秒ごと）
    const intervalId = setInterval(fetchSubscription, 60000);
    
    // クリーンアップ
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