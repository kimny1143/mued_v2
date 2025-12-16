/**
 * MUEDnote Mobile App
 * メインエントリーポイント
 */

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

import { HomeScreen } from './src/screens/HomeScreen';
import { SessionScreen } from './src/screens/SessionScreen';
import { ReviewScreen } from './src/screens/ReviewScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { useSessionStore } from './src/stores/sessionStore';
import { whisperService } from './src/services/whisperService';
import { localStorage } from './src/cache/storage';
import { colors, fontSize, fontWeight, spacing } from './src/constants/theme';

// 画面の種類
type Screen = 'loading' | 'onboarding' | 'home' | 'session' | 'review';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('loading');
  const [initError, setInitError] = useState<string | null>(null);

  const { initialize, setWhisperReady, appState } = useSessionStore();

  // アプリ初期化
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // ストア初期化
      await initialize();

      // Whisper初期化
      const result = await whisperService.initialize();
      if (result.success) {
        setWhisperReady(true);
        console.log('[App] Whisper ready, VAD:', result.hasVad);
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

  // ローディング画面
  if (currentScreen === 'loading') {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingTitle}>MUEDnote</Text>
          <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
          <Text style={styles.loadingText}>初期化中...</Text>
          {initError && (
            <Text style={styles.errorText}>{initError}</Text>
          )}
        </View>
        <StatusBar style="light" />
      </SafeAreaProvider>
    );
  }

  // メイン画面
  return (
    <SafeAreaProvider>
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
      <StatusBar style="light" />
    </SafeAreaProvider>
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
