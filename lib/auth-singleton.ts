'use client';

import { supabaseBrowser } from '@/lib/supabase-browser';
import { Session } from '@supabase/supabase-js';

export interface AuthState {
  session: Session | null;
  isInitialized: boolean;
  isInitializing: boolean;
  error: Error | null;
}

export interface UserDetails {
  id: string;
  email: string;
  name?: string;
  role_id: string;
  image?: string;
  roleCache?: string[];
}

// グローバルな認証状態
let authState: AuthState = {
  session: null,
  isInitialized: false,
  isInitializing: false,
  error: null
};

// 初期化のPromiseを保持（重複防止）
let initPromise: Promise<AuthState> | null = null;

// リスナー管理
const listeners = new Set<(state: AuthState) => void>();

// 状態変更を通知
function notifyListeners() {
  listeners.forEach(listener => listener(authState));
}

// 認証状態を購読
export function subscribeToAuthState(listener: (state: AuthState) => void) {
  listeners.add(listener);
  
  // 現在の状態を即座に通知
  listener(authState);
  
  // クリーンアップ関数を返す
  return () => {
    listeners.delete(listener);
  };
}

// 認証状態の取得（同期的）
export function getAuthState(): AuthState {
  return authState;
}

// 認証の初期化（シングルトン）
export async function initializeAuth(): Promise<AuthState> {
  // 既に初期化済みの場合は現在の状態を返す
  if (authState.isInitialized) {
    console.log('🔐 認証は既に初期化済み');
    return authState;
  }

  // 初期化中の場合は既存のPromiseを返す
  if (initPromise) {
    console.log('🔄 認証初期化中 - 既存の処理を待機');
    return initPromise;
  }

  // 新規初期化を開始
  initPromise = performInitialization();
  return initPromise;
}

// 実際の初期化処理
async function performInitialization(): Promise<AuthState> {
  console.log('🚀 認証の初期化を開始（シングルトン）');
  
  authState.isInitializing = true;
  notifyListeners();

  try {
    // 現在のセッションを取得
    const { data: { session }, error } = await supabaseBrowser.auth.getSession();
    
    if (error) {
      throw error;
    }

    // 認証状態の変更を監視
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      (event, newSession) => {
        console.log('🔄 認証状態変更検出:', event);
        
        authState = {
          ...authState,
          session: newSession,
          isInitialized: true,
          isInitializing: false
        };
        
        notifyListeners();
      }
    );

    // 初期状態を設定
    authState = {
      session,
      isInitialized: true,
      isInitializing: false,
      error: null
    };
    
    notifyListeners();
    
    console.log('✅ 認証の初期化完了（シングルトン）');
    return authState;

  } catch (error) {
    console.error('❌ 認証初期化エラー:', error);
    
    authState = {
      session: null,
      isInitialized: true,
      isInitializing: false,
      error: error as Error
    };
    
    notifyListeners();
    throw error;
    
  } finally {
    initPromise = null;
  }
}

// ユーザー詳細の取得（キャッシュ付き）
const userDetailsCache = new Map<string, { data: UserDetails; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5分

export async function fetchUserDetails(userId: string): Promise<UserDetails | null> {
  // キャッシュをチェック
  const cached = userDetailsCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('📦 ユーザー詳細をキャッシュから取得');
    return cached.data;
  }

  try {
    console.log('🔍 ユーザー詳細をAPIから取得:', userId);
    
    const response = await fetch(`/api/user?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const userDetails = await response.json();
    
    const userData: UserDetails = {
      id: userId,
      email: userDetails.email || '',
      name: userDetails.name,
      role_id: userDetails.role_id || userDetails.roleId || userDetails.roleName || 'student',
      image: userDetails.image,
      roleCache: userDetails.roleCache
    };

    // キャッシュに保存
    userDetailsCache.set(userId, {
      data: userData,
      timestamp: Date.now()
    });

    return userData;

  } catch (error) {
    console.error('ユーザー詳細取得エラー:', error);
    return null;
  }
}

// サブスクリプション情報の取得（キャッシュ付き）
export interface SimpleSubscription {
  priceId: string | null;
  status: string;
  currentPeriodEnd: number | null;
}

const subscriptionCache = new Map<string, { data: SimpleSubscription; timestamp: number }>();

export async function fetchSubscription(userId: string, userRole?: string): Promise<SimpleSubscription> {
  // メンターと管理者はサブスクリプション不要
  if (userRole === 'mentor' || userRole === 'admin') {
    console.log(`🎯 ${userRole}ロールはサブスクリプション対象外`);
    return {
      priceId: null,
      status: 'role_exempt',
      currentPeriodEnd: null
    };
  }

  // キャッシュをチェック
  const cached = subscriptionCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('📦 サブスクリプションをキャッシュから取得');
    return cached.data;
  }

  try {
    const { session } = getAuthState();
    if (!session) {
      return {
        priceId: null,
        status: 'free',
        currentPeriodEnd: null
      };
    }

    console.log('🔍 サブスクリプションをAPIから取得:', userId);
    
    const response = await fetch('/api/user/subscription', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    const subscription: SimpleSubscription = data.subscription ? {
      priceId: data.subscription.price_id || data.subscription.priceId,
      status: data.subscription.status,
      currentPeriodEnd: data.subscription.current_period_end || data.subscription.currentPeriodEnd
    } : {
      priceId: null,
      status: 'free',
      currentPeriodEnd: null
    };

    // キャッシュに保存
    subscriptionCache.set(userId, {
      data: subscription,
      timestamp: Date.now()
    });

    return subscription;

  } catch (error) {
    console.error('サブスクリプション取得エラー:', error);
    return {
      priceId: null,
      status: 'free',
      currentPeriodEnd: null
    };
  }
}

// キャッシュのクリア
export function clearAuthCache() {
  userDetailsCache.clear();
  subscriptionCache.clear();
}