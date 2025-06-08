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
    try {
      const response = await apiClient.request(`/api/user?userId=${userId}`, {
        method: 'GET',
      });
      
      if (response) {
        return {
          ...baseUser,
          roleName: response.roleName || 'student',
          roleInfo: response.role,
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch user role:', error);
      return null;
    }
  };

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        const userWithRole = await fetchUserRole(session.user.id, session.user);
        setUser(userWithRole || session.user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        const userWithRole = await fetchUserRole(session.user.id, session.user);
        setUser(userWithRole || session.user);
      } else {
        setUser(null);
      }
      setLoading(false);
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