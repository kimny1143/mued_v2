import React, { createContext, useContext, useEffect, useState } from 'react';
import SecureStore from '../utils/storage';
import { User } from '@mued/shared/types';
import { ApiClient } from '@mued/shared/api';
import { AuthEndpoints, UsersEndpoints } from '@mued/shared/api/endpoints';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

const TOKEN_KEY = 'auth_token';
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const apiClient = new ApiClient({ 
    baseURL: API_URL,
    getToken: async () => {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    }
  });

  const authEndpoints = new AuthEndpoints(apiClient);
  const usersEndpoints = new UsersEndpoints(apiClient);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        const userData = await usersEndpoints.getMe();
        setUser(userData);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authEndpoints.login({ email, password });
      await SecureStore.setItemAsync(TOKEN_KEY, response.token);
      setUser(response.user);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authEndpoints.logout();
    } catch (error) {
      console.error('Logout API failed:', error);
    } finally {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      setUser(null);
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    try {
      const response = await authEndpoints.signup({ email, password, name });
      await SecureStore.setItemAsync(TOKEN_KEY, response.token);
      setUser(response.user);
    } catch (error) {
      console.error('Signup failed:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider 
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        signup,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}