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
        
        const response = await fetch('/api/user/subscription', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include'
        });

        if (!response.ok) {
          console.warn('サブスクリプション取得API失敗:', response.status, response.statusText);
          
          // APIエラーでもFREEプランとして設定
          setSubscription({
            priceId: null,
            status: 'free',
            currentPeriodEnd: null
          });
          setError('サブスクリプション情報の取得に失敗しましたが、FREEプランとして動作します。');
          setLoading(false);
          return;
        }

        const data = await response.json();
        
        if (data.error) {
          console.warn('サブスクリプション取得エラー:', data.error);
          
          // エラーでもFREEプランとして設定
          setSubscription({
            priceId: null,
            status: 'free',
            currentPeriodEnd: null
          });
          
          if (data.error.includes('permission denied')) {
            setError('データベース権限の設定が必要ですが、FREEプランとして動作します。');
          } else {
            setError('サブスクリプション情報の取得に失敗しましたが、FREEプランとして動作します。');
          }
        } else {
          // データが存在する場合
          if (data.subscription) {
            console.log('サブスクリプション情報取得成功:', data.subscription);
            
            setSubscription({
              priceId: data.subscription.priceId || null,
              status: data.subscription.status || 'free',
              currentPeriodEnd: data.subscription.currentPeriodEnd ? Number(data.subscription.currentPeriodEnd) : null
            });
          } else {
            // データが存在しない場合（新規ユーザー）
            console.log('サブスクリプション情報なし（新規ユーザー） - FREEプランとして設定');
            setSubscription({
              priceId: null,
              status: 'free',
              currentPeriodEnd: null
            });
          }
        }
      } catch (err) {
        console.error('サブスクリプション取得エラー:', err);
        
        // エラーが発生してもFREEプランとして設定
        setSubscription({
          priceId: null,
          status: 'free',
          currentPeriodEnd: null
        });
        
        setError(err instanceof Error ? err.message : 'サブスクリプション情報の取得に失敗しました');
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