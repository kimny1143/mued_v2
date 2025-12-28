/**
 * MUEDnote Mobile App
 * メインエントリーポイント
 *
 * Authentication: Clerk
 * Storage: AsyncStorage + Neon PostgreSQL
 * Theme: Dark/Light mode support
 */

import React, { useEffect, useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { useAuth } from '@clerk/clerk-expo';

import { MuednoteClerkProvider } from './src/providers/ClerkProvider';
import { ThemeProvider, useTheme } from './src/providers/ThemeProvider';
import { HomeScreen } from './src/screens/HomeScreen';
import { SessionScreen } from './src/screens/SessionScreen';
import { BreakScreen } from './src/screens/BreakScreen';
import { ReviewScreen } from './src/screens/ReviewScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { SignInScreen } from './src/screens/SignInScreen';
import { HooSettingsScreen } from './src/screens/HooSettingsScreen';
import { useSessionStore } from './src/stores/sessionStore';
import { useHooSettingsStore } from './src/stores/hooSettingsStore';
import { whisperService } from './src/services/whisperService';
import { localStorage } from './src/cache/storage';
import { initSounds, unloadSounds, playSessionStartSound, switchToRecordingMode } from './src/utils/sound';
import { fontSize, fontWeight, spacing } from './src/constants/theme';
import { getFocusMode, type FocusModeId } from './src/types/timer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25; // 25%スワイプで遷移

// 画面の種類
type Screen = 'loading' | 'onboarding' | 'home' | 'settings' | 'session' | 'break' | 'review';

/**
 * Main App Content - requires ClerkProvider and ThemeProvider context
 */
function AppContent() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('loading');
  const [initError, setInitError] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState<FocusModeId>('standard');

  const { isSignedIn, isLoaded } = useAuth();
  const { initialize, setWhisperReady, startSession } = useSessionStore();
  const { loadSettings: loadHooSettings } = useHooSettingsStore();
  const { colors, isDark } = useTheme();

  // スワイプナビゲーション用
  const slideAnim = useRef(new Animated.Value(0)).current;
  const currentScreenRef = useRef(currentScreen);

  // currentScreenの変更を追跡
  useEffect(() => {
    currentScreenRef.current = currentScreen;
  }, [currentScreen]);

  // Home/Settings間のスワイプ検出
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // 水平方向に十分な移動があればスワイプと判定
        const isHorizontalSwipe = Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dy) < 30;
        return isHorizontalSwipe;
      },
      onPanResponderGrant: () => {
        // スワイプ開始
      },
      onPanResponderMove: (_, gestureState) => {
        // スワイプ方向に応じてアニメーション（制限付き）
        const screen = currentScreenRef.current;
        // Home: 左スワイプのみ許可
        if (screen === 'home' && gestureState.dx < 0) {
          slideAnim.setValue(gestureState.dx);
        }
        // Settings: 右スワイプのみ許可
        else if (screen === 'settings' && gestureState.dx > 0) {
          slideAnim.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const screen = currentScreenRef.current;

        // 左スワイプ → 設定画面へ
        if (gestureState.dx < -SWIPE_THRESHOLD && screen === 'home') {
          Animated.timing(slideAnim, {
            toValue: -SCREEN_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setCurrentScreen('settings');
            slideAnim.setValue(0);
          });
        }
        // 右スワイプ → ホームへ
        else if (gestureState.dx > SWIPE_THRESHOLD && screen === 'settings') {
          Animated.timing(slideAnim, {
            toValue: SCREEN_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setCurrentScreen('home');
            slideAnim.setValue(0);
          });
        }
        // スワイプ不十分 → 元に戻す
        else {
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

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

      // Hoo設定読み込み
      await loadHooSettings();

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

  const handleStartSession = (mode?: FocusModeId) => {
    if (mode) {
      setCurrentMode(mode);
    }
    setCurrentScreen('session');
  };

  const handleEndSession = () => {
    // セッション終了 → 休憩画面へ（自動的に休憩開始）
    setCurrentScreen('break');
  };

  // 休憩画面から次のセッション開始
  const handleStartNextSession = async (mode: FocusModeId, customDuration?: number) => {
    const focusMode = getFocusMode(mode);
    // カスタムモードの場合は渡された時間を使用、それ以外はモードのデフォルト
    const duration = mode === 'custom' && customDuration
      ? customDuration
      : focusMode?.focusDuration || 50 * 60;

    setCurrentMode(mode);
    await playSessionStartSound();
    await startSession(duration, mode);
    setCurrentScreen('session');
  };

  const handleFinishSession = () => {
    // 完全終了 → レビュー画面へ
    setCurrentScreen('review');
  };

  const handleReviewComplete = () => {
    setCurrentScreen('home');
  };

  const handleReviewDiscard = () => {
    setCurrentScreen('home');
  };

  const handleSettingsBack = () => {
    setCurrentScreen('home');
  };

  // 動的スタイル
  const dynamicStyles = {
    loadingContainer: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    loadingTitle: {
      fontSize: fontSize['3xl'],
      fontWeight: fontWeight.bold,
      color: colors.textPrimary,
      marginBottom: spacing.xl,
    },
    loadingText: {
      fontSize: fontSize.base,
      color: colors.textSecondary,
    },
    errorText: {
      fontSize: fontSize.sm,
      color: colors.error,
      marginTop: spacing.md,
      textAlign: 'center' as const,
      paddingHorizontal: spacing.xl,
    },
  };

  // Clerk読み込み中
  if (!isLoaded) {
    return (
      <View style={dynamicStyles.loadingContainer}>
        <Text style={dynamicStyles.loadingTitle}>MUEDnote</Text>
        <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
        <Text style={dynamicStyles.loadingText}>認証を確認中...</Text>
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </View>
    );
  }

  // 未認証 → サインイン画面
  if (!isSignedIn) {
    return (
      <>
        <SignInScreen onSignIn={handleSignIn} />
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </>
    );
  }

  // アプリ初期化中
  if (currentScreen === 'loading') {
    return (
      <View style={dynamicStyles.loadingContainer}>
        <Text style={dynamicStyles.loadingTitle}>MUEDnote</Text>
        <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
        <Text style={dynamicStyles.loadingText}>初期化中...</Text>
        {initError && (
          <Text style={dynamicStyles.errorText}>{initError}</Text>
        )}
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </View>
    );
  }

  // メイン画面
  return (
    <>
      {currentScreen === 'onboarding' && (
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      )}
      {/* Home/Settings はスワイプ対応 */}
      {(currentScreen === 'home' || currentScreen === 'settings') && (
        <Animated.View
          style={[styles.swipeContainer, { transform: [{ translateX: slideAnim }] }]}
          {...panResponder.panHandlers}
        >
          {currentScreen === 'home' && (
            <HomeScreen onStartSession={handleStartSession} />
          )}
          {currentScreen === 'settings' && (
            <HooSettingsScreen onBack={handleSettingsBack} />
          )}
        </Animated.View>
      )}
      {currentScreen === 'session' && (
        <SessionScreen onEndSession={handleEndSession} />
      )}
      {currentScreen === 'break' && (
        <BreakScreen
          mode={currentMode}
          onStartNextSession={handleStartNextSession}
          onFinish={handleFinishSession}
        />
      )}
      {currentScreen === 'review' && (
        <ReviewScreen
          onComplete={handleReviewComplete}
          onDiscard={handleReviewDiscard}
        />
      )}
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

/**
 * Root App Component
 * Wraps with ClerkProvider, ThemeProvider and SafeAreaProvider
 */
export default function App() {
  return (
    <ThemeProvider>
      <MuednoteClerkProvider>
        <SafeAreaProvider>
          <AppContent />
        </SafeAreaProvider>
      </MuednoteClerkProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  spinner: {
    marginVertical: spacing.lg,
  },
  swipeContainer: {
    flex: 1,
    width: '100%',
  },
});
