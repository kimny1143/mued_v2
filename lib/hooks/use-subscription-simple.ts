import { useState, useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

/**
 * シンプルなサブスクリプション情報取得フック
 * 新規ユーザー（サブスクリプションなし）は正常なFREEプランとして扱う
 */
interface SimpleSubscription {
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

        // サブスクリプション情報を取得
        const { data, error: subError } = await supabaseBrowser
          .from('stripe_user_subscriptions')
          .select('price_id, subscription_status, current_period_end')
          .eq('userId', session.user.id)
          .maybeSingle();

        if (subError) {
          console.warn('サブスクリプション取得エラー:', subError.message);
          
          // 権限エラーや存在しない場合はFREEプランとして設定
          if (subError.message.includes('permission denied') || 
              subError.code === '42501' ||
              subError.code === 'PGRST116') {
            console.log('権限エラー又はデータなし - FREEプランとして設定');
            setSubscription({
              priceId: null,
              status: 'free',
              currentPeriodEnd: null
            });
            setError('データベース権限の設定が必要ですが、FREEプランとして動作します。');
          } else {
            throw subError;
          }
        } else {
          // データが存在する場合
          if (data) {
            console.log('サブスクリプション情報取得成功:', data);
            setSubscription({
              priceId: data.price_id,
              status: data.subscription_status,
              currentPeriodEnd: data.current_period_end
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