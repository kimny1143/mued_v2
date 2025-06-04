'use client';

import { useState, useEffect, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { getPlanByPriceId } from '@/app/stripe-config';
import { 
  initializeAuth, 
  subscribeToAuthState, 
  fetchUserDetails, 
  fetchSubscription,
  type SimpleSubscription 
} from '@/lib/auth-singleton';

export interface User {
  id: string;
  email: string;
  name?: string;
  role_id: string;
  plan?: string;
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [subscription, setSubscription] = useState<SimpleSubscription | null>(null);
  const dataFetchedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    // シングルトン認証を初期化
    initializeAuth().catch(err => {
      console.error('認証初期化エラー:', err);
      if (isMounted) {
        setError(err.message);
        setLoading(false);
      }
    });

    // 認証状態を購読
    const unsubscribe = subscribeToAuthState(async (authState) => {
      if (!isMounted) return;

      setSession(authState.session);
      setIsAuthenticated(!!authState.session);
      
      if (authState.error) {
        setError(authState.error.message);
        setLoading(false);
        return;
      }

      if (authState.session?.user && !dataFetchedRef.current) {
        dataFetchedRef.current = true;
        
        try {
          // ユーザー詳細とサブスクリプションを並列で取得
          const [userDetails, subscriptionData] = await Promise.all([
            fetchUserDetails(authState.session.user.id),
            fetchSubscription(authState.session.user.id)
          ]);

          if (!isMounted) return;

          if (userDetails) {
            const userData: User = {
              id: userDetails.id,
              email: userDetails.email,
              name: userDetails.name,
              role_id: userDetails.role_id
            };
            setUser(userData);
            
            // ロールを確認してサブスクリプションを再取得（必要な場合）
            if (userDetails.role_id === 'mentor' || userDetails.role_id === 'admin') {
              const roleExemptSub = await fetchSubscription(authState.session.user.id, userDetails.role_id);
              setSubscription(roleExemptSub);
            } else {
              setSubscription(subscriptionData);
            }
          } else {
            // デフォルト値を設定
            const userData: User = {
              id: authState.session.user.id,
              email: authState.session.user.email || '',
              name: authState.session.user.user_metadata?.name || 
                    authState.session.user.user_metadata?.full_name || 
                    authState.session.user.email?.split('@')[0],
              role_id: 'student'
            };
            setUser(userData);
            setSubscription(subscriptionData);
          }
        } catch (err) {
          console.error('データ取得エラー:', err);
          if (isMounted) {
            setError(err instanceof Error ? err.message : 'データ取得に失敗しました');
          }
        }
      } else if (!authState.session) {
        setUser(null);
        setSubscription(null);
        dataFetchedRef.current = false;
      }

      if (authState.isInitialized && isMounted) {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // プラン情報の計算
  const currentPlan = subscription?.priceId 
    ? getPlanByPriceId(subscription.priceId)?.name || 'Unknown'
    : 'FREE';

  // ユーザー情報にプランを追加
  const userWithPlan = user ? { ...user, plan: currentPlan } : null;

  return {
    user: userWithPlan,
    loading,
    error,
    session,
    isAuthenticated,
    subscription
  };
}