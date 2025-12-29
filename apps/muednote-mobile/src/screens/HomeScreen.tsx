/**
 * HomeScreen - Hoo中心のメイン画面 + ダッシュボード
 *
 * 「アプリ = Hoo」のコンセプト:
 * - Hooが画面の主役として大きく表示
 * - 上スワイプでダッシュボード（Hooが縮小して上に移動）
 * - 下スワイプでダッシュボードを閉じる
 * - モード選択、録音開始
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSessionStore } from '../stores/sessionStore';
import { useTheme } from '../providers/ThemeProvider';
import { Hoo, HooState } from '../components/Hoo';
import { SessionControlBar } from '../components/SessionControlBar';
import { DashboardContent } from '../components/DashboardContent';
import { switchToRecordingMode, playClickSound } from '../utils/sound';
import { spacing, fontSize, fontWeight, borderRadius, hooSizes } from '../constants/theme';
import {
  FOCUS_MODES,
  getFocusMode,
  type FocusMode,
  type FocusModeId,
} from '../types/timer';
import { getHomeMessage, MODE_MESSAGES } from '../constants/hooMessages';

interface HomeScreenProps {
  onStartSession: (mode: FocusModeId) => void;
}

// 時間フォーマット（1h 30m形式）
function formatTotalTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// ダッシュボード展開時のスケール（通常サイズの割合）
const DASHBOARD_HOO_SCALE = 0.4; // 40%に縮小
const SWIPE_THRESHOLD = 80;

export function HomeScreen({ onStartSession }: HomeScreenProps) {
  const { settings, startSession, isWhisperReady, updateSettings, dailyTotal } = useSessionStore();
  const { colors, mode, toggleTheme, isDark } = useTheme();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  // モード選択状態
  const [selectedModeId, setSelectedModeId] = useState<FocusModeId>('standard');

  // カスタム時間は設定から取得
  const customDuration = settings.customDuration || 45 * 60;

  // Hooの状態
  const [hooSpeaking, setHooSpeaking] = useState(false);
  const [hooMessage, setHooMessage] = useState<string | undefined>(undefined);
  const [hasGreeted, setHasGreeted] = useState(false);

  // ダッシュボード展開状態
  const [isDashboardExpanded, setIsDashboardExpanded] = useState(false);
  const dashboardAnim = useRef(new Animated.Value(0)).current;

  // メッセージ表示タイマー
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 選択中のモード情報
  const selectedMode = getFocusMode(selectedModeId) || FOCUS_MODES[1];

  // Hooの状態を決定
  const hooState: HooState = isWhisperReady ? 'idle' : 'thinking';

  // 4時間超過チェック
  const isOverLimitEarly = dailyTotal.totalSeconds >= 4 * 60 * 60;

  // 準備中メッセージ
  const displayMessage = getHomeMessage(isOverLimitEarly, isWhisperReady, hooMessage);

  // テーマモードのラベル
  const themeModeLabel = mode === 'system' ? 'Auto' : mode === 'dark' ? 'Dark' : 'Light';

  // ダッシュボード用の計算値
  const dashboardHeight = height * 0.65;

  // アニメーション値の補間
  const hooScale = dashboardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, DASHBOARD_HOO_SCALE],
  });

  const hooTranslateY = dashboardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -(height * 0.42)], // ダッシュボード上部に配置
  });

  const controlBarOpacity = dashboardAnim.interpolate({
    inputRange: [0, 0.3],
    outputRange: [1, 0],
  });

  const dashboardTranslateY = dashboardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [dashboardHeight, 0],
  });

  // PanResponder for vertical swipe
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // 垂直方向の動きを検出
        const isVerticalSwipe = Math.abs(gestureState.dy) > 20 && Math.abs(gestureState.dx) < 30;
        return isVerticalSwipe;
      },
      onPanResponderMove: (_, gestureState) => {
        if (!isDashboardExpanded && gestureState.dy < 0) {
          // 上スワイプ（ダッシュボード展開）
          const progress = Math.min(1, Math.abs(gestureState.dy) / dashboardHeight);
          dashboardAnim.setValue(progress);
        } else if (isDashboardExpanded && gestureState.dy > 0) {
          // 下スワイプ（ダッシュボード閉じる）
          const progress = Math.max(0, 1 - gestureState.dy / dashboardHeight);
          dashboardAnim.setValue(progress);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!isDashboardExpanded && gestureState.dy < -SWIPE_THRESHOLD) {
          // 上スワイプ完了 → ダッシュボード展開
          Animated.spring(dashboardAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 50,
            friction: 8,
          }).start(() => setIsDashboardExpanded(true));
        } else if (isDashboardExpanded && gestureState.dy > SWIPE_THRESHOLD) {
          // 下スワイプ完了 → ダッシュボード閉じる
          Animated.spring(dashboardAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 8,
          }).start(() => setIsDashboardExpanded(false));
        } else {
          // スワイプ不十分 → 元に戻す
          Animated.spring(dashboardAnim, {
            toValue: isDashboardExpanded ? 1 : 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // ダッシュボード閉じるハンドラ
  const closeDashboard = () => {
    Animated.spring(dashboardAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start(() => setIsDashboardExpanded(false));
  };

  // 準備完了時にHooが挨拶
  useEffect(() => {
    if (isWhisperReady && !hasGreeted) {
      setHooSpeaking(true);
      setHasGreeted(true);
      const timer = setTimeout(() => {
        setHooSpeaking(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isWhisperReady, hasGreeted]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (messageTimerRef.current) {
        clearTimeout(messageTimerRef.current);
      }
    };
  }, []);

  // モード選択ハンドラ
  const handleModeSelect = async (focusMode: FocusMode) => {
    if (focusMode.id === selectedModeId) return;

    if (messageTimerRef.current) {
      clearTimeout(messageTimerRef.current);
    }

    setSelectedModeId(focusMode.id);
    setHooMessage(MODE_MESSAGES[focusMode.id]);
    setHooSpeaking(true);
    playClickSound();

    messageTimerRef.current = setTimeout(() => {
      setHooMessage(undefined);
      setHooSpeaking(false);
    }, 2500);
  };

  // セッション開始
  const handleStart = async () => {
    setHooSpeaking(true);

    setTimeout(async () => {
      setHooSpeaking(false);
      await switchToRecordingMode();

      const duration =
        selectedModeId === 'custom' ? customDuration : selectedMode.focusDuration;

      await startSession(duration, selectedModeId);
      onStartSession(selectedModeId);
    }, 1000);
  };

  // カスタム時間変更ハンドラ
  const handleCustomDurationChange = (duration: number) => {
    updateSettings({ customDuration: duration });
  };

  // 動的スタイル
  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    dailyTotalContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isOverLimitEarly ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: isOverLimitEarly ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.1)',
      gap: spacing.xs,
    },
    dailyTotalLabel: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
    },
    dailyTotalValue: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
      color: isOverLimitEarly ? colors.error : colors.textPrimary,
    },
    themeToggle: {
      backgroundColor: colors.backgroundSecondary,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: colors.border,
    },
    themeToggleText: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.medium,
      color: colors.textSecondary,
    },
    // ダッシュボードスタイル
    dashboardContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: dashboardHeight,
      backgroundColor: colors.background,
      borderTopLeftRadius: borderRadius.xxl,
      borderTopRightRadius: borderRadius.xxl,
      borderTopWidth: 1,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    dashboardHeader: {
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingBottom: spacing.lg,
    },
    dashboardHandleArea: {
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xxl,
    },
    dashboardHandle: {
      width: 48,
      height: 5,
      backgroundColor: 'rgba(255, 255, 255, 0.4)',
      borderRadius: 3,
      marginBottom: spacing.sm,
    },
    dashboardHint: {
      fontSize: fontSize.xs,
      color: colors.textSecondary,
    },
    closeButton: {
      position: 'absolute',
      right: spacing.lg,
      top: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    closeButtonText: {
      fontSize: fontSize.xs,
      color: colors.textSecondary,
    },
    // 横向きスタイル
    landscapeHooSection: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: spacing.xl,
    },
  });

  // 横向きレイアウト（ダッシュボードなし）
  if (isLandscape) {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        <View style={styles.landscapeHeader}>
          <View style={dynamicStyles.dailyTotalContainer}>
            <Text style={dynamicStyles.dailyTotalLabel}>今日</Text>
            <Text style={dynamicStyles.dailyTotalValue}>
              {formatTotalTime(dailyTotal.totalSeconds)}
            </Text>
          </View>
          <TouchableOpacity
            style={dynamicStyles.themeToggle}
            onPress={toggleTheme}
            activeOpacity={0.7}
          >
            <Text style={dynamicStyles.themeToggleText}>
              {isDark ? '\u25D0' : '\u25CB'} {themeModeLabel}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={dynamicStyles.landscapeHooSection}>
          <Hoo
            state={hooState}
            customMessage={displayMessage}
            size={hooSizes.main}
            isSpeaking={hooSpeaking}
            overlayBubble
          />
        </View>
        <View style={styles.landscapeControlBar}>
          <SessionControlBar
            selectedMode={selectedModeId}
            customDuration={customDuration}
            onModeSelect={handleModeSelect}
            onCustomDurationChange={handleCustomDurationChange}
            onStartSession={handleStart}
            disabled={!isWhisperReady}
          />
        </View>
      </SafeAreaView>
    );
  }

  // 縦向きレイアウト（ダッシュボード対応）
  return (
    <SafeAreaView style={dynamicStyles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={dynamicStyles.dailyTotalContainer}>
          <Text style={dynamicStyles.dailyTotalLabel}>今日</Text>
          <Text style={dynamicStyles.dailyTotalValue}>
            {formatTotalTime(dailyTotal.totalSeconds)}
          </Text>
        </View>
        <TouchableOpacity
          style={dynamicStyles.themeToggle}
          onPress={toggleTheme}
          activeOpacity={0.7}
        >
          <Text style={dynamicStyles.themeToggleText}>
            {isDark ? '\u25D0' : '\u25CB'} {themeModeLabel}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content with PanResponder */}
      <View style={styles.mainContent} {...panResponder.panHandlers}>
        {/* Hoo Section - アニメーション付き */}
        <Animated.View
          style={[
            styles.hooSection,
            {
              transform: [
                { scale: hooScale },
                { translateY: hooTranslateY },
              ],
            },
          ]}
        >
          <Hoo
            state={hooState}
            customMessage={isDashboardExpanded ? undefined : displayMessage}
            size={hooSizes.main}
            isSpeaking={hooSpeaking}
            hideBubble={isDashboardExpanded}
          />
        </Animated.View>
      </View>

      {/* Bottom Controls - ダッシュボード展開時は非表示 */}
      <Animated.View style={[styles.bottomControls, { opacity: controlBarOpacity }]}>
        <SessionControlBar
          selectedMode={selectedModeId}
          customDuration={customDuration}
          onModeSelect={handleModeSelect}
          onCustomDurationChange={handleCustomDurationChange}
          onStartSession={handleStart}
          disabled={!isWhisperReady || isDashboardExpanded}
        />
      </Animated.View>

      {/* Dashboard - 下からスライドイン */}
      <Animated.View
        style={[
          dynamicStyles.dashboardContainer,
          { transform: [{ translateY: dashboardTranslateY }] },
        ]}
      >
        {/* ダッシュボードヘッダー */}
        <View style={dynamicStyles.dashboardHeader}>
          <TouchableOpacity
            style={dynamicStyles.dashboardHandleArea}
            onPress={closeDashboard}
            activeOpacity={0.8}
          >
            <View style={dynamicStyles.dashboardHandle} />
            <Text style={dynamicStyles.dashboardHint}>下にスワイプで閉じる</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={dynamicStyles.closeButton}
            onPress={closeDashboard}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={16} color={colors.textSecondary} />
            <Text style={dynamicStyles.closeButtonText}>閉じる</Text>
          </TouchableOpacity>
        </View>

        {/* ダッシュボードコンテンツ */}
        <DashboardContent scrollEnabled={isDashboardExpanded} />
      </Animated.View>
    </SafeAreaView>
  );
}

// 静的スタイル
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    minHeight: 52,
    zIndex: 10,
  },
  landscapeHeader: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
  },
  hooSection: {
    alignItems: 'center',
  },
  bottomControls: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  landscapeControlBar: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
});
