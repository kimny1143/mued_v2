/**
 * Clerk Authentication Provider for MUEDnote Mobile
 *
 * Wraps the app with Clerk authentication context
 * and provides token management for API calls.
 */

import React, { useEffect } from 'react';
import { ClerkProvider as ClerkProviderBase, ClerkLoaded, useAuth } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '../api/client';

// Clerk Publishable Key from environment
const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';

/**
 * Secure token cache for Clerk
 * Uses expo-secure-store for secure storage
 */
const tokenCache = {
  async getToken(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('[ClerkProvider] SecureStore getToken error:', error);
      return null;
    }
  },
  async saveToken(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('[ClerkProvider] SecureStore saveToken error:', error);
    }
  },
  async clearToken(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('[ClerkProvider] SecureStore clearToken error:', error);
    }
  },
};

/**
 * Component to sync Clerk auth token with API client
 */
function AuthTokenSync({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    if (isSignedIn) {
      // getToken関数を渡すことで、APIリクエスト時に毎回新しいトークンを取得
      apiClient.setTokenGetter(getToken);
      console.log('[AuthTokenSync] Token getter set on API client');
    } else {
      apiClient.clearTokenGetter();
      console.log('[AuthTokenSync] Token getter cleared from API client');
    }
  }, [isSignedIn, getToken]);

  return <>{children}</>;
}

interface MuednoteClerkProviderProps {
  children: React.ReactNode;
}

/**
 * MUEDnote Clerk Provider
 *
 * Provides:
 * - Clerk authentication context
 * - Secure token storage
 * - Automatic API client token sync
 */
export function MuednoteClerkProvider({ children }: MuednoteClerkProviderProps) {
  if (!CLERK_PUBLISHABLE_KEY) {
    console.warn('[ClerkProvider] Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY');
    // In development, render without Clerk
    return <>{children}</>;
  }

  return (
    <ClerkProviderBase
      publishableKey={CLERK_PUBLISHABLE_KEY}
      tokenCache={tokenCache}
    >
      <ClerkLoaded>
        <AuthTokenSync>
          {children}
        </AuthTokenSync>
      </ClerkLoaded>
    </ClerkProviderBase>
  );
}
