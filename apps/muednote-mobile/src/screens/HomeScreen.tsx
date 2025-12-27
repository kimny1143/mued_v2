/**
 * HomeScreen - Hoo中心のメイン画面
 *
 * 「アプリ = Hoo」のコンセプト:
 * - Hooが画面上部で常に存在
 * - 吹き出しで状態を伝える
 * - 最小限のUIで録音開始
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSessionStore } from '../stores/sessionStore';
import { Hoo, HooState } from '../components/Hoo';
import { playSessionStartSound } from '../utils/sound';
import { colors, spacing, fontSize, fontWeight, borderRadius, TIMER_OPTIONS } from '../constants/theme';

interface HomeScreenProps {
  onStartSession: () => void;
}

export function HomeScreen({ onStartSession }: HomeScreenProps) {
  const { settings, startSession, isWhisperReady } = useSessionStore();
  const [selectedDuration, setSelectedDuration] = useState(settings.defaultDuration);

  // Hooの状態を決定
  const hooState: HooState = isWhisperReady ? 'idle' : 'thinking';

  // Hooのカスタムメッセージ
  const hooMessage = isWhisperReady ? undefined : '準備中...少し待ってね';

  const handleStart = async () => {
    await playSessionStartSound();
    await startSession(selectedDuration);
    onStartSession();
  };

  const minutes = selectedDuration / 60;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainContent}>
        {/* Hoo Section - 画面の主役 */}
        <View style={styles.hooSection}>
          <Hoo state={hooState} customMessage={hooMessage} />
        </View>

        {/* Duration Selector - ミニマル */}
        <View style={styles.selectorSection}>
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
      </View>

      {/* Start Button - 固定下部 */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={[styles.startButton, !isWhisperReady && styles.startButtonDisabled]}
          onPress={handleStart}
          disabled={!isWhisperReady}
          activeOpacity={0.8}
        >
          <View style={styles.startButtonContent}>
            <View style={styles.micIcon}>
              <Text style={styles.micEmoji}>🎙</Text>
            </View>
            <Text style={styles.startButtonText}>
              {isWhisperReady ? `${minutes}分 録音する` : '準備中...'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
  },
  hooSection: {
    paddingHorizontal: spacing.lg,
  },
  selectorSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  optionButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  optionTextActive: {
    color: colors.textPrimary,
  },
  bottomSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  startButtonDisabled: {
    backgroundColor: colors.backgroundSecondary,
    opacity: 0.6,
  },
  startButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  micIcon: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micEmoji: {
    fontSize: 20,
  },
  startButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
});
