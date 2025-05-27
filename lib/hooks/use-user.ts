'use client';

import { useState, useEffect, useRef } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Session } from '@supabase/supabase-js';
import { useSubscriptionSimple } from './use-subscription-simple';
import { getPlanByPriceId } from '@/app/stripe-config';

export interface User {
  id: string;
  email: string;
  name?: string;
  roleId: string;
  plan?: string;
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const initialized = useRef(false);
  
  // シンプルなサブスクリプション情報を取得
  const { 
    subscription, 
    loading: subscriptionLoading, 
    error: subscriptionError
  } = useSubscriptionSimple();

  // 認証状態の初期化（1回のみ実行）
  useEffect(() => {
    // 既に初期化済みの場合はスキップ
    if (initialized.current) {
      return;
    }
    
    initialized.current = true;
    console.log('認証状態初期化開始 (1回目)');

    let isMounted = true;

    const initializeAuth = async () => {
      try {
        console.log('認証状態を確認中...');
        
        // 現在のセッションを取得
        const { data: { session: currentSession }, error: sessionError } = await supabaseBrowser.auth.getSession();
        
        if (sessionError) {
          console.error('セッション取得エラー:', sessionError);
          if (isMounted) {
            setError(sessionError.message);
            setLoading(false);
          }
          return;
        }
        
        if (!isMounted) return;
        
        setSession(currentSession);
        setIsAuthenticated(!!currentSession);
        
        if (currentSession?.user) {
          console.log('ユーザー情報を設定:', currentSession.user.email);
          
          // APIエンドポイント経由でユーザー詳細を取得
          try {
            console.log('APIからユーザー詳細を取得開始...');
            
            const response = await fetch(`/api/user?userId=${currentSession.user.id}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
              },
              credentials: 'include'
            });

            if (!response.ok) {
              console.warn('ユーザー詳細API失敗:', response.status, response.statusText);
              
              // APIエラーでもデフォルト値で続行
              const userData: User = {
                id: currentSession.user.id,
                email: currentSession.user.email || '',
                name: currentSession.user.user_metadata?.name || 
                      currentSession.user.user_metadata?.full_name || 
                      currentSession.user.email?.split('@')[0],
                roleId: 'student' // デフォルト値
              };
              
              if (isMounted) {
                setUser(userData);
              }
              return;
            }

            const userDetails = await response.json();
            
            if (userDetails.error) {
              console.warn('ユーザー詳細取得エラー:', userDetails.error);
              
              // エラーでもデフォルト値で続行
              const userData: User = {
                id: currentSession.user.id,
                email: currentSession.user.email || '',
                name: currentSession.user.user_metadata?.name || 
                      currentSession.user.user_metadata?.full_name || 
                      currentSession.user.email?.split('@')[0],
                roleId: 'student' // デフォルト値
              };
              
              if (isMounted) {
                setUser(userData);
              }
            } else {
              console.log('APIからユーザー詳細を取得成功:', userDetails);
              
              // APIから取得した情報でユーザーデータを構築
              const userData: User = {
                id: currentSession.user.id,
                email: userDetails.email || currentSession.user.email || '',
                name: userDetails.name || 
                      currentSession.user.user_metadata?.name || 
                      currentSession.user.user_metadata?.full_name || 
                      currentSession.user.email?.split('@')[0],
                roleId: userDetails.roleId || userDetails.roleName || 'student'
              };
              
              if (isMounted) {
                setUser(userData);
              }
            }
          } catch (apiError) {
            console.warn('APIアクセスエラー:', apiError);
            
            // APIエラーでもデフォルト値で続行
            const userData: User = {
              id: currentSession.user.id,
              email: currentSession.user.email || '',
              name: currentSession.user.user_metadata?.name || 
                    currentSession.user.user_metadata?.full_name || 
                    currentSession.user.email?.split('@')[0],
              roleId: 'student' // デフォルト値
            };
            
            if (isMounted) {
              setUser(userData);
            }
          }
        } else {
          if (isMounted) {
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

    // 認証状態の変更を監視
    const { data: { subscription: authSubscription } } = supabaseBrowser.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('認証状態変更:', event, newSession ? 'セッションあり' : 'セッションなし');
        
        if (!isMounted) return;
        
        setSession(newSession);
        setIsAuthenticated(!!newSession);
        
        if (newSession?.user && event === 'SIGNED_IN') {
          // サインイン時のみユーザー情報を更新
          const userData: User = {
            id: newSession.user.id,
            email: newSession.user.email || '',
            name: newSession.user.user_metadata?.name || 
                  newSession.user.user_metadata?.full_name || 
                  newSession.user.email?.split('@')[0],
            roleId: 'student'
          };
          setUser(userData);
        } else if (event === 'SIGNED_OUT') {
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

  // プラン情報の計算（サブスクリプション情報から）
  const currentPlan = subscription?.priceId 
    ? getPlanByPriceId(subscription.priceId)?.name || 'Unknown'
    : 'FREE';

  // ユーザー情報にプランを追加
  const userWithPlan = user ? { ...user, plan: currentPlan } : null;

  return {
    user: userWithPlan,
    loading: loading || subscriptionLoading,
    error: error || subscriptionError,
    session,
    isAuthenticated,
    subscription
  };
} 