'use client';

import { Session } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';

import { supabaseBrowser } from '@/lib/supabase-browser';

export interface User {
  id: string;
  email: string;
  name?: string;
  role_id: string;
  roleName?: string;
  plan?: string;
}

export interface SimpleSubscription {
  priceId: string | null;
  status: string;
  currentPeriodEnd: number | null;
}

/**
 * 最小限のユーザー情報フック
 * SSRと併用する場合は、サーバーから取得したデータを優先する
 */
export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // セッション情報のみ取得（APIコールは最小限）
    const checkSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabaseBrowser.auth.getSession();
        
        if (!isMounted) return;

        setSession(currentSession);
        setIsAuthenticated(!!currentSession);

        if (currentSession?.user) {
          // APIからより詳細なユーザー情報を取得
          try {
            const response = await fetch(`/api/user?userId=${currentSession.user.id}`);
            if (response.ok) {
              const userData = await response.json();
              const detailedUser: User = {
                id: userData.id,
                email: userData.email || currentSession.user.email || '',
                name: userData.name || currentSession.user.email?.split('@')[0],
                role_id: userData.role_id || 'student',
                roleName: userData.roleName || 'student',
                plan: 'FREE'
              };
              setUser(detailedUser);
            } else {
              // APIが失敗した場合は基本情報のみ
              const basicUser: User = {
                id: currentSession.user.id,
                email: currentSession.user.email || '',
                name: currentSession.user.user_metadata?.name || currentSession.user.email?.split('@')[0],
                role_id: currentSession.user.user_metadata?.role_id || 'student',
                plan: 'FREE'
              };
              setUser(basicUser);
            }
          } catch (err) {
            console.error('ユーザー情報API呼び出しエラー:', err);
            // エラー時は基本情報のみ
            const basicUser: User = {
              id: currentSession.user.id,
              email: currentSession.user.email || '',
              name: currentSession.user.user_metadata?.name || currentSession.user.email?.split('@')[0],
              role_id: currentSession.user.user_metadata?.role_id || 'student',
              plan: 'FREE'
            };
            setUser(basicUser);
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'セッション確認エラー');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // 認証状態の変更を監視（軽量化）
    const { data: { subscription: authSubscription } } = supabaseBrowser.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!isMounted) return;

        setSession(newSession);
        setIsAuthenticated(!!newSession);

        if (newSession?.user) {
          // 認証状態変更時もAPIから情報を取得
          fetch(`/api/user?userId=${newSession.user.id}`)
            .then(res => res.ok ? res.json() : null)
            .then(userData => {
              if (userData) {
                const detailedUser: User = {
                  id: userData.id,
                  email: userData.email || newSession.user.email || '',
                  name: userData.name || newSession.user.email?.split('@')[0],
                  role_id: userData.role_id || 'student',
                  roleName: userData.roleName || 'student',
                  plan: 'FREE'
                };
                setUser(detailedUser);
              } else {
                const basicUser: User = {
                  id: newSession.user.id,
                  email: newSession.user.email || '',
                  name: newSession.user.user_metadata?.name || newSession.user.email?.split('@')[0],
                  role_id: newSession.user.user_metadata?.role_id || 'student',
                  plan: 'FREE'
                };
                setUser(basicUser);
              }
            })
            .catch(() => {
              const basicUser: User = {
                id: newSession.user.id,
                email: newSession.user.email || '',
                name: newSession.user.user_metadata?.name || newSession.user.email?.split('@')[0],
                role_id: newSession.user.user_metadata?.role_id || 'student',
                plan: 'FREE'
              };
              setUser(basicUser);
            });
        } else {
          setUser(null);
        }
      }
    );

    checkSession();

    return () => {
      isMounted = false;
      authSubscription?.unsubscribe();
    };
  }, []);

  // 互換性のためのダミーサブスクリプション
  const dummySubscription = {
    priceId: null,
    status: 'free',
    currentPeriodEnd: null
  };

  return {
    user,
    loading,
    error,
    session,
    isAuthenticated,
    subscription: dummySubscription
  };
}