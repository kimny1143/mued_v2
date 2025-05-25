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
        // ビューを使用してカラム名の問題を回避
        const { data, error: subError } = await supabaseBrowser
          .from('stripe_subscriptions_view')  // ビューを使用
          .select('price_id, subscription_status, current_period_end')  // スネークケースで選択
          .eq('user_id', session.user.id)  // user_idもスネークケース
          .maybeSingle();

        if (subError) {
          console.warn('サブスクリプション取得エラー:', subError.message);
          
          // カラム名エラーの場合は、元のテーブルから取得を試みる
          if (subError.message.includes('stripe_subscriptions_view')) {
            console.log('ビューが存在しない - 元のテーブルから取得を試行');
            
            // 元のテーブルから全カラムを取得
            try {
              const { data: rawData, error: rawError } = await supabaseBrowser
                .from('stripe_user_subscriptions')
                .select('*')  // 全カラムを取得
                .eq('userId', session.user.id)
                .maybeSingle();
                
              if (!rawError && rawData) {
                console.log('生データ取得成功:', rawData);
                // 可能なカラム名のバリエーションを試す
                const priceId = rawData.priceId || rawData.price_id || null;
                const status = rawData.status || rawData.subscription_status || 'free';
                const periodEnd = rawData.currentPeriodEnd || rawData.current_period_end || null;
                
                setSubscription({
                  priceId: priceId,
                  status: status,
                  currentPeriodEnd: periodEnd ? Number(periodEnd) : null
                });
                setLoading(false);
                return;
              }
            } catch (altError) {
              console.warn('代替クエリも失敗:', altError);
            }
          }
          
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
            // その他のエラーでもFREEプランとして設定
            console.log('その他のエラー - FREEプランとして設定');
            setSubscription({
              priceId: null,
              status: 'free',
              currentPeriodEnd: null
            });
          }
        } else {
          // データが存在する場合
          if (data) {
            console.log('サブスクリプション情報取得成功:', data);
            
            setSubscription({
              priceId: data.price_id || null,
              status: data.subscription_status || 'free',
              currentPeriodEnd: data.current_period_end ? Number(data.current_period_end) : null
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