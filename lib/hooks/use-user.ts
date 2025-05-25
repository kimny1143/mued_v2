'use client';

import { useEffect, useState, useRef } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const initializeCountRef = useRef(0);
  
  // サブスクリプション情報を取得
  const { 
    subscription, 
    loading: subscriptionLoading, 
    error: subscriptionError,
    refreshSubscription
  } = useSubscription();

  // 認証状態の初期化（重複実行を防ぐ）
  useEffect(() => {
    initializeCountRef.current += 1;
    const initCount = initializeCountRef.current;
    
    console.log(`認証状態初期化開始 (${initCount}回目)`);
    
    // すでに処理中の場合はスキップ
    if (initCount > 1) {
      console.log('認証初期化は既に実行中です。スキップします。');
      return;
    }

    let isMounted = true;

    const initializeAuth = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 現在のセッションを取得
        const { data: { session: currentSession }, error: sessionError } = await supabaseBrowser.auth.getSession();
        
        if (sessionError) {
          console.error('セッション取得エラー:', sessionError);
          if (isMounted) {
            setError(`セッション取得に失敗しました: ${sessionError.message}`);
            setLoading(false);
          }
          return;
        }

        console.log('現在のセッション状態:', currentSession ? '認証済み' : '未認証');
        
        if (isMounted) {
          setSession(currentSession);
          setIsAuthenticated(!!currentSession);
          
          if (currentSession?.user) {
            console.log('ユーザー情報を設定:', currentSession.user.email);
            
            // ユーザー情報を設定
            const userData: User = {
              id: currentSession.user.id,
              email: currentSession.user.email || '',
              name: currentSession.user.user_metadata?.name || 
                    currentSession.user.user_metadata?.full_name || 
                    currentSession.user.email?.split('@')[0],
              roleId: 'student' // デフォルト値
            };
            
            // データベースからユーザー詳細を取得（認証トークン付き）
            try {
              console.log('データベースからユーザー詳細を取得開始...');
              const { data: userDetails, error: userError } = await supabaseBrowser
                .from('users')
                .select('roleId, name')
                .eq('id', currentSession.user.id)
                .maybeSingle();
                
              if (!userError && userDetails) {
                console.log('データベースからユーザー詳細を取得成功:', userDetails);
                userData.roleId = userDetails.roleId || 'student';
                userData.name = userDetails.name || userData.name;
              } else if (userError) {
                console.warn('ユーザー詳細取得エラー:', userError.message);
                // エラーでもデフォルト値で続行
              }
            } catch (dbError) {
              console.warn('データベースアクセスエラー:', dbError);
              // データベースエラーでもデフォルト値で続行
            }
            
            setUser(userData);
          } else {
            setUser(null);
          }
        }
      } catch (err) {
        console.error('認証初期化エラー:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : '認証初期化に失敗しました');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // 認証状態の変更を監視（重複リスナーを防ぐ）
    const { data: { subscription: authSubscription } } = supabaseBrowser.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('認証状態変更:', event, newSession ? 'セッションあり' : 'セッションなし');
        
        if (!isMounted) return;
        
        setSession(newSession);
        setIsAuthenticated(!!newSession);
        
        if (newSession?.user) {
          const userData: User = {
            id: newSession.user.id,
            email: newSession.user.email || '',
            name: newSession.user.user_metadata?.name || 
                  newSession.user.user_metadata?.full_name || 
                  newSession.user.email?.split('@')[0],
            roleId: 'student'
          };
          setUser(userData);
          
          // サブスクリプション情報を再取得
          setTimeout(() => {
            if (refreshSubscription) {
              refreshSubscription();
            }
          }, 1000);
        } else {
          setUser(null);
        }
      }
    );

    // 初期認証状態を確認
    initializeAuth();

    // クリーンアップ
    return () => {
      isMounted = false;
      authSubscription?.unsubscribe();
    };
  }, []); // 依存配列を空にして1回だけ実行

  // プラン情報の計算
  const currentPlan = subscription?.priceId 
    ? products.find(p => p.priceId === subscription.priceId)?.name || 'Unknown'
    : 'Free';

  // ユーザー情報にプランを追加
  const userWithPlan = user ? { ...user, plan: currentPlan } : null;

  return {
    user: userWithPlan,
    loading: loading || subscriptionLoading,
    error: error || subscriptionError,
    session,
    isAuthenticated,
    subscription,
    refetchUser: () => {
      // 認証状態を再取得
      supabaseBrowser.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setIsAuthenticated(!!session);
      });
      
      // サブスクリプション情報も再取得
      if (refreshSubscription) {
        refreshSubscription();
      }
    }
  };
} 