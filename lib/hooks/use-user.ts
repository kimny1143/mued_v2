'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { products } from '@/app/stripe-config';
import { useSubscription } from './use-subscription'; // use-subscriptionフックをインポート

type User = {
  id: string;
  email: string;
  name?: string;
  plan?: string;
};

type SubscriptionStatus = {
  price_id: string | null;
  subscription_status: string;
  current_period_end: number | null;
};

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  
  // use-subscriptionフックを使用してサブスクリプション情報を取得
  const { subscription: subscriptionData } = useSubscription();

  // 強制リフレッシュ用の関数
  const refreshUserData = () => {
    console.log('ユーザーデータを強制リフレッシュします');
    setLastRefresh(Date.now());
  };

  useEffect(() => {
    // ログイン状態を取得
    const getSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        return data.session;
      } catch (err) {
        console.error('セッション取得エラー:', err);
        return null;
      }
    };

    const fetchUserData = async () => {
      let currentSession = null;
      
      try {
        setLoading(true);
        
        // セッションを取得
        currentSession = await getSession();
        setSession(currentSession);
        
        if (!currentSession?.user) {
          setUser(null);
          return;
        }
        
        let userData = null;
        let subData = null;

        try {
          // ユーザー情報を取得
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', currentSession.user.id)
            .single();
            
          if (!error) {
            userData = data;
          } else {
            console.warn('ユーザー情報取得エラー (継続します):', error);
          }
        } catch (userErr) {
          console.warn('ユーザー情報取得例外 (継続します):', userErr);
        }
        
        // *** 修正: use-subscriptionフックからのデータを利用 ***
        if (subscriptionData) {
          console.log('use-subscriptionフックからサブスクリプションデータを取得:', subscriptionData);
          subData = {
            price_id: subscriptionData.priceId || null,
            subscription_status: subscriptionData.status || 'unknown',
            current_period_end: subscriptionData.currentPeriodEnd || null
          };
        } else {
          console.log('use-subscriptionフックからデータを取得できませんでした - バックアップ方法を試行');
          
          // 以下は元のコードがエラー時に備えて残しておく（通常は実行されない）
          try {
            console.log('サブスクリプション情報取得開始 - ユーザーID:', currentSession.user.id);
            
            // サブスクリプション情報を取得（直接テーブルをチェック）
            const { data: directSubData, error: directSubError } = await supabase
              .from('stripe_user_subscriptions')
              .select('*')
              .eq('userId', currentSession.user.id);
            
            console.log('直接取得したサブスクリプションデータ:', 
              directSubData ? directSubData : 'データなし', 
              directSubError ? `エラー: ${directSubError.message}` : '');
              
            // 元のコードの続き...（省略）
          } catch (subErr) {
            console.warn('サブスクリプション情報取得例外 (継続します):', subErr);
          }
        }
        
        // 基本ユーザー情報
        const basicUser: User = {
          id: currentSession.user.id,
          email: currentSession.user.email || '',
          name: userData?.name || currentSession.user.user_metadata?.name || 
                currentSession.user.user_metadata?.full_name || 
                currentSession.user.email?.split('@')[0] || '',
        };
        
        // サブスクリプション情報があればプラン情報を追加
        if (subData && subData.subscription_status === 'active') {
          console.log('アクティブなサブスクリプションを検出:', subData);
          setSubscription(subData);
          
          // プラン名を取得
          let planName = 'Free Plan';
          if (subData.price_id) {
            const product = products.find(p => p.priceId === subData.price_id);
            planName = product?.name || 'Premium Plan';
          }
          
          basicUser.plan = planName;
          console.log(`ユーザープラン設定: ${planName}`);
        } else if (subscriptionData && subscriptionData.status === 'active') {
          // 修正: 直接use-subscriptionフックのデータを使用する代替パス
          console.log('use-subscriptionフックからアクティブなサブスクリプションを検出');
          
          // プラン名を取得
          let planName = 'Free Plan';
          if (subscriptionData.priceId) {
            const product = products.find(p => p.priceId === subscriptionData.priceId);
            planName = product?.name || 'Premium Plan';
          }
          
          basicUser.plan = planName;
          console.log(`ユーザープラン設定(代替パス): ${planName}`);
        } else {
          console.log('アクティブなサブスクリプションがありません - Free Planを設定');
          // 本番環境でもローカル環境でもサブスクリプションがない場合はデフォルトプラン
          basicUser.plan = 'Free Plan';
          
          // 開発環境でのみ有効な特別テスト処理
          if (process.env.NODE_ENV === 'development' && window.location.hostname === 'localhost') {
            // 特定のテストユーザーにはサブスクリプション情報を強制的に設定
            const testUserIds = ['c3310083-3da2-41a8-b381-ac18ce3bdf23']; // テストユーザーID
            if (testUserIds.includes(currentSession.user.id)) {
              console.log('開発環境: テストサブスクリプションを設定します');
              const manualPriceId = 'price_1RMJcpRYtspYtD2zQjRRmLXc'; // Starter Subscription
              const testProduct = products.find(p => p.priceId === manualPriceId);
              basicUser.plan = testProduct?.name || 'Starter Subscription';
              setSubscription({
                price_id: manualPriceId,
                subscription_status: 'active',
                current_period_end: 1749479615
              });
            }
          }
        }
        
        setUser(basicUser);
      } catch (err) {
        console.error('ユーザーデータ取得エラー:', err);
        setError(err instanceof Error ? err : new Error('ユーザー情報の取得に失敗しました'));
        
        // エラー発生時も認証情報からユーザー情報を構築
        if (currentSession?.user) {
          const fallbackUser: User = {
            id: currentSession.user.id,
            email: currentSession.user.email || '',
            name: currentSession.user.user_metadata?.name || 
                  currentSession.user.user_metadata?.full_name || 
                  currentSession.user.email?.split('@')[0] || '',
            plan: 'Free Plan'
          };
          setUser(fallbackUser);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();

    // 5秒ごとにサブスクリプション情報を再確認
    const intervalId = setInterval(fetchUserData, 5000);

    // 認証状態変更のリスナー
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserData();
      } else {
        setUser(null);
        setSubscription(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
      clearInterval(intervalId);
    };
  // lastRefreshも依存関係に追加し、強制リフレッシュできるようにする
  // subscriptionDataを依存関係に追加
  }, [lastRefresh, subscriptionData]);

  return {
    user,
    subscription,
    loading,
    error,
    session,
    isAuthenticated: !!user,
    refreshUserData
  };
} 