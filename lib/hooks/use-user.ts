'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { products } from '@/app/stripe-config';
import { useSubscription } from './use-subscription';

type User = {
  id: string;
  email: string;
  name?: string;
  plan?: string;
  roleId?: string;
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
          // ユーザー情報をAPIから取得（Supabaseに直接アクセスしない）
          const response = await fetch(`/api/user?userId=${currentSession.user.id}`);
          
          if (response.ok) {
            userData = await response.json();
          } else {
            console.warn('APIからのユーザー情報取得エラー:', await response.text());
          }
        } catch (userErr) {
          console.warn('ユーザー情報取得例外 (継続します):', userErr);
        }
        
        // use-subscriptionフックからのデータを利用
        if (subscriptionData) {
          subData = {
            price_id: subscriptionData.priceId || null,
            subscription_status: subscriptionData.status || 'unknown',
            current_period_end: subscriptionData.currentPeriodEnd || null
          };
        }
        
        // 基本ユーザー情報
        const basicUser: User = {
          id: currentSession.user.id,
          email: currentSession.user.email || '',
          name: userData?.name || currentSession.user.user_metadata?.name || 
                currentSession.user.user_metadata?.full_name || 
                currentSession.user.email?.split('@')[0] || '',
          roleId: userData?.roleId
        };
        
        // サブスクリプション情報があればプラン情報を追加
        if (subData && subData.subscription_status === 'active') {
          setSubscription(subData);
          
          // プラン名を取得
          let planName = 'Free Plan';
          if (subData.price_id) {
            const product = products.find(p => p.priceId === subData.price_id);
            planName = product?.name || 'Premium Plan';
          }
          
          basicUser.plan = planName;
        } else if (subscriptionData && subscriptionData.status === 'active') {
          // 直接use-subscriptionフックのデータを使用する代替パス
          
          // プラン名を取得
          let planName = 'Free Plan';
          if (subscriptionData.priceId) {
            const product = products.find(p => p.priceId === subscriptionData.priceId);
            planName = product?.name || 'Premium Plan';
          }
          
          basicUser.plan = planName;
        } else {
          // サブスクリプションがない場合はデフォルトプラン
          basicUser.plan = 'Free Plan';
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
    };
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