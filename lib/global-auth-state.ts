/**
 * グローバル認証状態管理
 * コンポーネント間で認証状態を共有するための仕組み
 */

import { User } from '@/lib/hooks/use-user';
import { Session } from '@supabase/supabase-js';

interface GlobalAuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  initialized: boolean;
}

// グローバル状態
let globalAuthState: GlobalAuthState = {
  user: null,
  session: null,
  isAuthenticated: false,
  initialized: false
};

// 状態変更のリスナー
type AuthStateListener = (state: GlobalAuthState) => void;
const listeners: Set<AuthStateListener> = new Set();

export function getGlobalAuthState(): GlobalAuthState {
  return { ...globalAuthState };
}

export function setGlobalAuthState(state: Partial<GlobalAuthState>): void {
  globalAuthState = { ...globalAuthState, ...state };
  
  // すべてのリスナーに通知
  listeners.forEach(listener => {
    listener(globalAuthState);
  });
}

export function subscribeToAuthState(listener: AuthStateListener): () => void {
  listeners.add(listener);
  
  // 現在の状態を即座に通知
  listener(globalAuthState);
  
  // アンサブスクライブ関数を返す
  return () => {
    listeners.delete(listener);
  };
}

// 開発環境でのホットリロード対応
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // @ts-ignore
  if (module.hot) {
    // @ts-ignore
    module.hot.dispose(() => {
      globalAuthState = {
        user: null,
        session: null,
        isAuthenticated: false,
        initialized: false
      };
      listeners.clear();
    });
  }
}