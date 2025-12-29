/**
 * ModeSelector - フォーカスモード選択コンポーネント
 *
 * 研究に基づいた集中メソッドを選択するセグメントコントロール
 * - Pomodoro: 25分
 * - Standard: 50分
 * - Deep Work: 90分
 * - Custom: カスタム設定
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import { ModeIcon } from './ModeIcon';
import { FOCUS_MODES, type FocusMode, type FocusModeId } from '../types/timer';
import { spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';
import { formatDurationMinutes } from '../utils/formatTime';

interface ModeSelectorProps {
  selectedMode: FocusModeId;
  onModeSelect: (mode: FocusMode) => void;
  disabled?: boolean;
  /** カスタムモードの時間（秒） */
  customDuration?: number;
}

export function ModeSelector({
  selectedMode,
  onModeSelect,
  disabled = false,
  customDuration = 45 * 60,
}: ModeSelectorProps) {
  const { colors } = useTheme();

  const dynamicStyles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: colors.backgroundSecondary,
      borderRadius: borderRadius.xl,
      padding: spacing.xs,
      gap: spacing.xs,
      width: '100%',
    },
    modeButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderRadius: borderRadius.lg,
    },
    modeButtonActive: {
      backgroundColor: colors.primary,
    },
    modeButtonDisabled: {
      opacity: 0.5,
    },
    iconContainer: {
      marginBottom: spacing.xs,
      height: 24,
      width: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modeLabel: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.medium,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    modeLabelActive: {
      color: colors.textPrimary,
    },
    modeDuration: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
      color: colors.textPrimary,
    },
    modeDurationActive: {
      color: colors.textPrimary,
    },
  });

  return (
    <View style={dynamicStyles.container}>
      {FOCUS_MODES.map((mode) => {
        const isActive = selectedMode === mode.id;
        const isCustom = mode.id === 'custom';

        return (
          <TouchableOpacity
            key={mode.id}
            style={[
              dynamicStyles.modeButton,
              isActive && dynamicStyles.modeButtonActive,
              disabled && dynamicStyles.modeButtonDisabled,
            ]}
            onPress={() => onModeSelect(mode)}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <View style={dynamicStyles.iconContainer}>
              <ModeIcon
                modeId={mode.id}
                size={20}
                color={isActive ? colors.textPrimary : colors.textSecondary}
              />
            </View>
            <Text
              style={[
                dynamicStyles.modeLabel,
                isActive && dynamicStyles.modeLabelActive,
              ]}
            >
              {mode.shortLabel}
            </Text>
            <Text
              style={[
                dynamicStyles.modeDuration,
                isActive && dynamicStyles.modeDurationActive,
              ]}
            >
              {isCustom ? formatDurationMinutes(customDuration) : formatDurationMinutes(mode.focusDuration)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
