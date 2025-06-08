import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { apiClient } from '../services/api';

interface UserWithRole extends User {
  roleName?: string;
  roleInfo?: {
    id: string;
    name: string;
    description: string | null;
  };
}

interface AuthContextType {
  user: UserWithRole | null;
  session: Session | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  isStudent: boolean;
  isMentor: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserWithRole | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // ロール情報を取得する関数
  const fetchUserRole = async (userId: string, baseUser: User): Promise<UserWithRole | null> => {
    console.log('fetchUserRole called for userId:', userId);
    
    try {
      // タイムアウトを設定（10秒に延長）
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('User role fetch timeout')), 10000);
      });
      
      const fetchPromise = apiClient.getUser(userId).catch(err => {
        console.error('API client error:', err);
        throw err;
      });
      
      console.log('Fetching user role from API...');
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      
      console.log('User role API response:', response);
      
      if (response) {
        const userWithRole = {
          ...baseUser,
          roleName: response.roleName || 'student',
          roleInfo: response.role,
        };
        console.log('User with role created:', { roleName: userWithRole.roleName });
        return userWithRole;
      }
      
      console.log('No response from user role API, returning base user');
      return { ...baseUser, roleName: 'student' };
    } catch (error) {
      console.error('Failed to fetch user role:', error);
      // エラー時でも基本的なユーザー情報を返す
      return { ...baseUser, roleName: 'student' };
    }
  };

  useEffect(() => {
    console.log('AuthProvider useEffect started');
    
    // Check active sessions and sets the user
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      console.log('getSession result:', { session: !!session, error });
      
      if (error) {
        console.error('getSession error:', error);
      }
      
      setSession(session);
      if (session?.user) {
        const userWithRole = await fetchUserRole(session.user.id, session.user);
        setUser(userWithRole || session.user);
      } else {
        setUser(null);
      }
      setLoading(false);
      console.log('Initial loading set to false');
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, { session: !!session });
      
      if (event === 'SIGNED_IN' && session) {
        console.log('Processing SIGNED_IN event...');
        setSession(session);
        
        // 認証コールバックページの場合は即座にリダイレクト
        if (window.location.pathname === '/auth/callback') {
          console.log('Currently on auth callback page, redirecting to home');
          window.location.href = '/';
          return;
        }
        
        try {
          const userWithRole = await fetchUserRole(session.user.id, session.user);
          console.log('User with role fetched:', !!userWithRole);
          setUser(userWithRole || session.user);
        } catch (err) {
          console.error('Error fetching user role:', err);
          setUser(session.user);
        }
        
        setLoading(false);
        console.log('Loading set to false after SIGNED_IN');
      } else if (event === 'SIGNED_OUT') {
        console.log('Processing SIGNED_OUT event...');
        setSession(null);
        setUser(null);
        setLoading(false);
        console.log('Loading set to false after SIGNED_OUT');
      } else if (event === 'TOKEN_REFRESHED' && session) {
        console.log('Processing TOKEN_REFRESHED event...');
        setSession(session);
        // トークンリフレッシュ時はloadingを変更しない
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) throw error;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ロールベースの権限チェック
  const isStudent = user?.roleName === 'student' || !user?.roleName;
  const isMentor = user?.roleName === 'mentor' || user?.roleName === 'teacher';
  const isAdmin = user?.roleName === 'admin';

  const value = {
    user,
    session,
    loading,
    signIn,
    signOut,
    isStudent,
    isMentor,
    isAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};