/**
 * HomeScreen - Hoo中心のメイン画面
 *
 * 「アプリ = Hoo」のコンセプト:
 * - Hooが画面の主役として大きく表示
 * - 起動時に「Ho Hoo」の声とアニメーション
 * - モード選択時にHooがそのモードを説明
 * - 吹き出しで状態を伝える
 * - 最小限のUIで録音開始
 * - ダーク/ライトモード切替
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Slider } from '@miblanchard/react-native-slider';
import { useSessionStore } from '../stores/sessionStore';
import { useTheme } from '../providers/ThemeProvider';
import { Hoo, HooState } from '../components/Hoo';
import { ModeSelector } from '../components/ModeSelector';
import {
  playSessionStartSound,
  playClickSound,
  switchToRecordingMode,
} from '../utils/sound';
import { spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';
import {
  FOCUS_MODES,
  getFocusMode,
  CUSTOM_MODE_LIMITS,
  type FocusMode,
  type FocusModeId,
} from '../types/timer';

interface HomeScreenProps {
  onStartSession: (mode: FocusModeId) => void;
}

export function HomeScreen({ onStartSession }: HomeScreenProps) {
  const { settings, startSession, isWhisperReady } = useSessionStore();
  const { colors, mode, toggleTheme, isDark } = useTheme();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  // モード選択状態
  const [selectedModeId, setSelectedModeId] = useState<FocusModeId>('standard');
  const [customDuration, setCustomDuration] = useState(45 * 60); // カスタム用

  // Hooの状態
  const [hooSpeaking, setHooSpeaking] = useState(false);
  const [hooMessage, setHooMessage] = useState<string | undefined>(undefined);
  const [hasGreeted, setHasGreeted] = useState(false);

  // メッセージ表示タイマー
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 選択中のモード情報
  const selectedMode = getFocusMode(selectedModeId) || FOCUS_MODES[1];

  // Hooの状態を決定
  const hooState: HooState = isWhisperReady ? 'idle' : 'thinking';

  // 準備中メッセージ（モード説明がない場合のみ表示）
  const displayMessage = hooMessage || (isWhisperReady ? undefined : '準備中...少し待ってね');

  // テーマモードのラベル
  const themeModeLabel = mode === 'system' ? 'Auto' : mode === 'dark' ? 'Dark' : 'Light';

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
    // 同じモードを選択した場合は何もしない
    if (focusMode.id === selectedModeId) {
      return;
    }

    // 前のタイマーをクリア
    if (messageTimerRef.current) {
      clearTimeout(messageTimerRef.current);
    }

    setSelectedModeId(focusMode.id);
    setHooMessage(focusMode.hooMessage);
    setHooSpeaking(true);

    // Haptic feedback
    playClickSound();

    // 2.5秒後にメッセージをクリア
    messageTimerRef.current = setTimeout(() => {
      setHooMessage(undefined);
      setHooSpeaking(false);
    }, 2500);
  };

  // セッション開始
  const handleStart = async () => {
    playClickSound(); // Haptic feedback first
    await playSessionStartSound();
    await switchToRecordingMode();

    // 選択モードの時間を使用（カスタムの場合はcustomDuration）
    const duration =
      selectedModeId === 'custom' ? customDuration : selectedMode.focusDuration;

    // modeを渡してセッション開始
    await startSession(duration, selectedModeId);
    onStartSession(selectedModeId);
  };

  // 表示用の時間テキスト
  const getDurationLabel = (): string => {
    if (selectedModeId === 'custom') {
      const minutes = Math.floor(customDuration / 60);
      return `${minutes}分`;
    }
    const minutes = Math.floor(selectedMode.focusDuration / 60);
    return `${minutes}分`;
  };

  // 動的スタイル
  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    recordButton: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.recording,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.textPrimary,
    },
    recordButtonDisabled: {
      backgroundColor: colors.textMuted,
      borderColor: colors.textMuted,
    },
    durationLabel: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      color: colors.textSecondary,
      marginTop: spacing.md,
    },
    modeDescription: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      marginTop: spacing.xs,
    },
    // Custom slider styles
    sliderContainer: {
      width: '100%',
      paddingHorizontal: spacing.md,
      marginTop: spacing.md,
    },
    sliderLabel: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.semibold,
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    sliderTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.backgroundTertiary,
    },
    sliderThumb: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.primary,
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
    // 横向きスタイル
    landscapeContent: {
      flex: 1,
      flexDirection: 'column' as const,
    },
    landscapeHooSection: {
      flex: 1,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    landscapeBottomBar: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      gap: spacing.md,
    },
    landscapeModeSelector: {
      flex: 1,
    },
    landscapeRecordButton: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.recording,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderWidth: 2,
      borderColor: colors.textPrimary,
    },
    landscapeCustomSlider: {
      flex: 1,
      paddingHorizontal: spacing.sm,
    },
    landscapeDurationText: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      color: colors.textSecondary,
      minWidth: 50,
      textAlign: 'center' as const,
    },
  });

  // 横向きレイアウト
  if (isLandscape) {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        {/* Header - テーマトグル（右上） */}
        <View style={styles.landscapeHeader}>
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

        {/* Hoo - 中央に */}
        <View style={dynamicStyles.landscapeHooSection}>
          <Hoo
            state={hooState}
            customMessage={displayMessage}
            size="medium"
            isSpeaking={hooSpeaking}
          />
        </View>

        {/* 下部バー - モード選択 + 録音ボタン */}
        <View style={dynamicStyles.landscapeBottomBar}>
          <View style={dynamicStyles.landscapeModeSelector}>
            <ModeSelector
              selectedMode={selectedModeId}
              onModeSelect={handleModeSelect}
              disabled={!isWhisperReady}
            />
          </View>

          {/* カスタムモード時はスライダー表示 */}
          {selectedModeId === 'custom' && (
            <>
              <View style={dynamicStyles.landscapeCustomSlider}>
                <Slider
                  value={customDuration}
                  minimumValue={CUSTOM_MODE_LIMITS.minFocusDuration}
                  maximumValue={CUSTOM_MODE_LIMITS.maxFocusDuration}
                  step={CUSTOM_MODE_LIMITS.step}
                  onValueChange={(value) => setCustomDuration(Array.isArray(value) ? value[0] : value)}
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor={colors.backgroundTertiary}
                  thumbTintColor={colors.primary}
                  trackStyle={dynamicStyles.sliderTrack}
                  thumbStyle={dynamicStyles.sliderThumb}
                />
              </View>
              <Text style={dynamicStyles.landscapeDurationText}>
                {Math.floor(customDuration / 60)}分
              </Text>
            </>
          )}

          {/* 録音ボタン */}
          <TouchableOpacity
            style={[
              dynamicStyles.landscapeRecordButton,
              !isWhisperReady && dynamicStyles.recordButtonDisabled,
            ]}
            onPress={handleStart}
            disabled={!isWhisperReady}
            activeOpacity={0.8}
          />
        </View>
      </SafeAreaView>
    );
  }

  // 縦向きレイアウト（既存）
  return (
    <SafeAreaView style={dynamicStyles.container}>
      {/* Header - テーマトグル */}
      <View style={styles.header}>
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

      {/* Main Content - 中央寄せのフレックスレイアウト */}
      <View style={styles.mainContent}>
        {/* Hoo Section - 画面の主役（大きく表示） */}
        <View style={styles.hooSection}>
          <Hoo
            state={hooState}
            customMessage={displayMessage}
            size="large"
            isSpeaking={hooSpeaking}
          />
        </View>
      </View>

      {/* Bottom Controls - 下部固定 */}
      <View style={styles.bottomControls}>
        {/* Mode Selector */}
        <View style={styles.selectorContainer}>
          <ModeSelector
            selectedMode={selectedModeId}
            onModeSelect={handleModeSelect}
            disabled={!isWhisperReady}
          />

          {/* Custom Mode Slider */}
          {selectedModeId === 'custom' && (
            <View style={dynamicStyles.sliderContainer}>
              <Text style={dynamicStyles.sliderLabel}>
                {Math.floor(customDuration / 60)}分
              </Text>
              <Slider
                value={customDuration}
                minimumValue={CUSTOM_MODE_LIMITS.minFocusDuration}
                maximumValue={CUSTOM_MODE_LIMITS.maxFocusDuration}
                step={CUSTOM_MODE_LIMITS.step}
                onValueChange={(value) => setCustomDuration(Array.isArray(value) ? value[0] : value)}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.backgroundTertiary}
                thumbTintColor={colors.primary}
                trackStyle={dynamicStyles.sliderTrack}
                thumbStyle={dynamicStyles.sliderThumb}
              />
            </View>
          )}
        </View>

        {/* Record Button */}
        <View style={styles.recordButtonContainer}>
          <TouchableOpacity
            style={[
              dynamicStyles.recordButton,
              !isWhisperReady && dynamicStyles.recordButtonDisabled,
            ]}
            onPress={handleStart}
            disabled={!isWhisperReady}
            activeOpacity={0.8}
          />
          <Text style={dynamicStyles.durationLabel}>
            {isWhisperReady ? getDurationLabel() : '準備中...'}
          </Text>
          {isWhisperReady && (
            <Text style={dynamicStyles.modeDescription}>
              {selectedMode.description}
            </Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

// 静的スタイル（テーマに依存しない）
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    minHeight: 52,
  },
  landscapeHeader: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.lg,
    zIndex: 10,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
  },
  hooSection: {
    alignItems: 'center',
  },
  bottomControls: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  selectorContainer: {
    alignItems: 'center',
    width: '100%',
  },
  recordButtonContainer: {
    alignItems: 'center',
  },
});
