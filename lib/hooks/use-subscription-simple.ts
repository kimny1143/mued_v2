import { useState, useEffect, useRef } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { isAuthInitialized } from '@/lib/auth-initialization';

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
  const fetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);

  useEffect(() => {
    async function fetchSubscription() {
      // 認証が初期化されていない場合はスキップ
      if (!isAuthInitialized()) {
        console.log('認証未初期化 - サブスクリプション取得をスキップ');
        return;
      }
      
      // 既に取得中の場合はスキップ
      if (fetchingRef.current) {
        console.log('サブスクリプション取得中 - スキップ');
        return;
      }

      // 前回取得から5秒以内の場合はスキップ（重複防止）
      const now = Date.now();
      if (now - lastFetchTimeRef.current < 5000) {
        console.log('サブスクリプション取得間隔制限 - スキップ');
        return;
      }

      fetchingRef.current = true;
      lastFetchTimeRef.current = now;

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

        // ユーザーロールを確認（メンター・管理者はサブスクリプション不要）
        const userRole = session.user.user_metadata?.role?.toLowerCase();
        if (userRole === 'mentor' || userRole === 'admin') {
          console.log(`🎯 ${userRole}ロールはサブスクリプション対象外 - スキップ`);
          setSubscription({
            priceId: null,
            status: 'role_exempt', // ロール免除を示す特別なステータス
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
          console.error('サブスクリプションAPI失敗:', response.status, response.statusText);
          
          // APIエラーでもFREEプランとして続行
          console.log('サブスクリプション情報なし（APIエラー） - FREEプランとして設定');
          setSubscription({
            priceId: null,
            status: 'free',
            currentPeriodEnd: null
          });
          setLoading(false);
          return;
        }

        const data = await response.json();
        console.log('📋 サブスクリプションAPIデータ:', data);

        if (data.subscription) {
          // アクティブなサブスクリプションがある場合
          const subData: SimpleSubscription = {
            priceId: data.subscription.price_id || data.subscription.priceId,
            status: data.subscription.status,
            currentPeriodEnd: data.subscription.current_period_end || data.subscription.currentPeriodEnd
          };
          
          console.log('✅ アクティブなサブスクリプション:', subData);
          setSubscription(subData);
        } else {
          // サブスクリプションがない場合（正常なFREEユーザー）
          console.log('サブスクリプション情報なし（新規ユーザー） - FREEプランとして設定');
          setSubscription({
            priceId: null,
            status: 'free',
            currentPeriodEnd: null
          });
        }

      } catch (err) {
        console.error('サブスクリプション取得エラー:', err);
        
        // エラーが発生してもFREEプランとして続行
        setSubscription({
          priceId: null,
          status: 'free',
          currentPeriodEnd: null
        });
        
        setError(err instanceof Error ? err.message : 'サブスクリプション情報の取得に失敗しました');
      } finally {
        setLoading(false);
        fetchingRef.current = false;
      }
    }

    // 認証が初期化されていない場合は、500ms後に再試行
    if (!isAuthInitialized()) {
      const timer = setTimeout(() => {
        fetchSubscription();
      }, 500);
      return () => clearTimeout(timer);
    }
    
    fetchSubscription();
  }, []); // 依存配列を空にして1回だけ実行

  return { subscription, loading, error };
} 