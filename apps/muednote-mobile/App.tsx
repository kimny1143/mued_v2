/**
 * MUEDnote Mobile App
 * メインエントリーポイント
 *
 * Authentication: Clerk
 * Storage: AsyncStorage + Neon PostgreSQL
 */

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';

import { MuednoteClerkProvider } from './src/providers/ClerkProvider';
import { HomeScreen } from './src/screens/HomeScreen';
import { SessionScreen } from './src/screens/SessionScreen';
import { ReviewScreen } from './src/screens/ReviewScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { SignInScreen } from './src/screens/SignInScreen';
import { useSessionStore } from './src/stores/sessionStore';
import { whisperService } from './src/services/whisperService';
import { localStorage } from './src/cache/storage';
import { initSounds, unloadSounds } from './src/utils/sound';
import { colors, fontSize, fontWeight, spacing } from './src/constants/theme';

// 画面の種類
type Screen = 'loading' | 'onboarding' | 'home' | 'session' | 'review';

/**
 * Main App Content - requires ClerkProvider context
 */
function AppContent() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('loading');
  const [initError, setInitError] = useState<string | null>(null);

  const { isSignedIn, isLoaded } = useAuth();
  const { initialize, setWhisperReady } = useSessionStore();

  // アプリ初期化
  useEffect(() => {
    if (isLoaded) {
      initializeApp();
    }

    // クリーンアップ
    return () => {
      unloadSounds();
    };
  }, [isLoaded]);

  const initializeApp = async () => {
    try {
      // ストア初期化
      await initialize();

      // サウンド初期化
      await initSounds();

      // Whisper初期化
      const result = await whisperService.initialize();
      if (result.success) {
        setWhisperReady(true);
        console.log('[App] Whisper ready');
      } else {
        console.warn('[App] Whisper init failed:', result.error);
        // エラーでも続行（録音は使えないが閲覧は可能）
      }

      // オンボーディング完了チェック
      const onboardingComplete = await localStorage.isOnboardingComplete();

      // アクティブセッションがあれば復元
      const { appState: state } = useSessionStore.getState();
      if (state === 'recording') {
        setCurrentScreen('session');
      } else if (state === 'reviewing') {
        setCurrentScreen('review');
      } else if (!onboardingComplete) {
        setCurrentScreen('onboarding');
      } else {
        setCurrentScreen('home');
      }
    } catch (error) {
      console.error('[App] Initialize error:', error);
      setInitError(error instanceof Error ? error.message : 'Unknown error');
      setCurrentScreen('home'); // エラーでもホームは表示
    }
  };

  // 画面遷移ハンドラー
  const handleSignIn = () => {
    // 認証後、オンボーディングチェック
    initializeApp();
  };

  const handleOnboardingComplete = () => {
    setCurrentScreen('home');
  };

  const handleStartSession = () => {
    setCurrentScreen('session');
  };

  const handleEndSession = () => {
    setCurrentScreen('review');
  };

  const handleReviewComplete = () => {
    setCurrentScreen('home');
  };

  const handleReviewDiscard = () => {
    setCurrentScreen('home');
  };

  // Clerk読み込み中
  if (!isLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingTitle}>MUEDnote</Text>
        <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
        <Text style={styles.loadingText}>認証を確認中...</Text>
      </View>
    );
  }

  // 未認証 → サインイン画面
  if (!isSignedIn) {
    return <SignInScreen onSignIn={handleSignIn} />;
  }

  // アプリ初期化中
  if (currentScreen === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingTitle}>MUEDnote</Text>
        <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
        <Text style={styles.loadingText}>初期化中...</Text>
        {initError && (
          <Text style={styles.errorText}>{initError}</Text>
        )}
      </View>
    );
  }

  // メイン画面
  return (
    <>
      {currentScreen === 'onboarding' && (
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      )}
      {currentScreen === 'home' && (
        <HomeScreen onStartSession={handleStartSession} />
      )}
      {currentScreen === 'session' && (
        <SessionScreen onEndSession={handleEndSession} />
      )}
      {currentScreen === 'review' && (
        <ReviewScreen
          onComplete={handleReviewComplete}
          onDiscard={handleReviewDiscard}
        />
      )}
    </>
  );
}

/**
 * Root App Component
 * Wraps with ClerkProvider and SafeAreaProvider
 */
export default function App() {
  return (
    <MuednoteClerkProvider>
      <SafeAreaProvider>
        <AppContent />
        <StatusBar style="light" />
      </SafeAreaProvider>
    </MuednoteClerkProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingTitle: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
  },
  spinner: {
    marginVertical: spacing.lg,
  },
  loadingText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginTop: spacing.md,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
