/**
 * HomeScreen - タイマー選択・セッション開始画面
 * Modacityスタイルの洗練されたダークUI
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSessionStore } from '../stores/sessionStore';
import { colors, spacing, fontSize, fontWeight, borderRadius, TIMER_OPTIONS } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CIRCLE_SIZE = SCREEN_WIDTH * 0.7;

interface HomeScreenProps {
  onStartSession: () => void;
}

export function HomeScreen({ onStartSession }: HomeScreenProps) {
  const { settings, startSession, isWhisperReady } = useSessionStore();
  const [selectedDuration, setSelectedDuration] = useState(settings.defaultDuration);

  // 選択中のタイマーラベル
  const selectedOption = TIMER_OPTIONS.find((opt) => opt.value === selectedDuration);
  const minutes = selectedDuration / 60;

  const handleStart = async () => {
    await startSession(selectedDuration);
    onStartSession();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>MUEDnote</Text>
        <Text style={styles.subtitle}>制作の思考を記録する</Text>
      </View>

      {/* Timer Circle */}
      <View style={styles.circleContainer}>
        <View style={styles.outerCircle}>
          <View style={styles.innerCircle}>
            <Text style={styles.timerText}>{minutes}</Text>
            <Text style={styles.timerUnit}>分</Text>
          </View>
        </View>
      </View>

      {/* Duration Selector */}
      <View style={styles.selectorContainer}>
        <Text style={styles.selectorLabel}>セッション時間</Text>
        <View style={styles.optionsRow}>
          {TIMER_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionButton,
                selectedDuration === option.value && styles.optionButtonActive,
              ]}
              onPress={() => setSelectedDuration(option.value)}
            >
              <Text
                style={[
                  styles.optionText,
                  selectedDuration === option.value && styles.optionTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Start Button */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={[styles.startButton, !isWhisperReady && styles.startButtonDisabled]}
          onPress={handleStart}
          disabled={!isWhisperReady}
        >
          <View style={styles.startButtonInner}>
            <Text style={styles.startButtonText}>
              {isWhisperReady ? 'セッション開始' : '準備中...'}
            </Text>
          </View>
        </TouchableOpacity>

        {!isWhisperReady && (
          <Text style={styles.statusText}>音声認識を初期化中...</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  circleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    // グラデーション的な効果をボーダーで
    borderWidth: 2,
    borderColor: colors.border,
  },
  innerCircle: {
    width: CIRCLE_SIZE * 0.85,
    height: CIRCLE_SIZE * 0.85,
    borderRadius: (CIRCLE_SIZE * 0.85) / 2,
    backgroundColor: colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: {
    fontSize: fontSize['6xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  timerUnit: {
    fontSize: fontSize.xl,
    color: colors.textSecondary,
    marginTop: -spacing.sm,
  },
  selectorContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  selectorLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
  },
  optionButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  optionTextActive: {
    color: colors.textPrimary,
  },
  bottomSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  startButtonDisabled: {
    backgroundColor: colors.backgroundSecondary,
  },
  startButtonInner: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  statusText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
