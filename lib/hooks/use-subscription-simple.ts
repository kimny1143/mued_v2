import { useState, useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

/**
 * シンプルなサブスクリプション情報取得フック
 * 新規ユーザー（サブスクリプションなし）は正常なFREEプランとして扱う
 */
export interface SimpleSubscription {
  priceId: string | null;
  status: string;
  currentPeriodEnd: number | null;
}

export function useSubscriptionSimple() {
  const [subscription, setSubscription] = useState<SimpleSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSubscription() {
      try {
        setLoading(true);
        setError(null);

        // 現在のセッションを確認
        const { data: { session }, error: sessionError } = await supabaseBrowser.auth.getSession();
        
        if (sessionError) {
          console.error('セッション取得エラー:', sessionError);
          // セッションエラーでもFREEプランとして続行
          console.log('サブスクリプション情報なし（セッションエラー） - FREEプランとして設定');
          setSubscription({
            priceId: null,
            status: 'free',
            currentPeriodEnd: null
          });
          setLoading(false);
          return;
        }

        if (!session) {
          console.log('未認証ユーザー - FREEプランとして設定');
          setSubscription({
            priceId: null,
            status: 'free', 
            currentPeriodEnd: null
          });
          setLoading(false);
          return;
        }

        // APIエンドポイント経由でサブスクリプション情報を取得
        const token = session.access_token;
        
        console.log('🔄 サブスクリプションAPI呼び出し開始...', {
          userId: session.user.id,
          email: session.user.email
        });

        const response = await fetch('/api/user/subscription', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include'
        });

        console.log('📡 サブスクリプションAPIレスポンス:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ サブスクリプションAPI エラー:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          });
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('📋 サブスクリプションAPIデータ:', data);

        if (data.subscription) {
          console.log('✅ サブスクリプション情報を設定:', data.subscription);
          setSubscription({
            priceId: data.subscription.priceId,
            status: data.subscription.status,
            currentPeriodEnd: data.subscription.currentPeriodEnd
          });
        } else {
          console.log('サブスクリプション情報なし（新規ユーザー） - FREEプランとして設定');
          setSubscription({
            priceId: null,
            status: 'free',
            currentPeriodEnd: null
          });
        }
      } catch (err) {
        console.error('🚨 サブスクリプション取得エラー:', err);
        setError(err instanceof Error ? err.message : String(err));
        // エラー時もFREEプランとして設定
        console.log('エラー時FREEプランに設定');
        setSubscription({
          priceId: null,
          status: 'free',
          currentPeriodEnd: null
        });
      } finally {
        setLoading(false);
      }
    }

    fetchSubscription();
  }, []);

  return {
    subscription,
    loading,
    error,
    // 手動再取得用の関数
    refetch: () => {
      setLoading(true);
      setError(null);
      // useEffectが再実行される
      window.location.reload();
    }
  };
} 