/**
 * SessionControlBar - Endel風のセッションコントロールバー
 *
 * グラスモーフィズムデザイン:
 * - 左: モードアイコン + 名前（タップでメニュー）
 * - 中右: タイマーアイコン（カスタムモード時のみ）
 * - 右: 録音開始ボタン
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../providers/ThemeProvider';
import { spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';
import {
  FOCUS_MODES,
  CUSTOM_MODE_LIMITS,
  type FocusMode,
  type FocusModeId,
} from '../types/timer';
import { playClickSound } from '../utils/sound';

interface SessionControlBarProps {
  selectedMode: FocusModeId;
  customDuration: number;
  onModeSelect: (mode: FocusMode) => void;
  onCustomDurationChange: (duration: number) => void;
  onStartSession: () => void;
  disabled?: boolean;
}

// モードアイコンマッピング
const MODE_ICONS: Record<FocusModeId, { family: 'ionicons' | 'feather' | 'material'; name: string }> = {
  pomodoro: { family: 'ionicons', name: 'timer-outline' },
  standard: { family: 'feather', name: 'coffee' },
  deepwork: { family: 'material', name: 'brain' },
  custom: { family: 'ionicons', name: 'options-outline' },
};

function ModeIcon({ modeId, size, color }: { modeId: FocusModeId; size: number; color: string }) {
  const config = MODE_ICONS[modeId];
  switch (config.family) {
    case 'ionicons':
      return <Ionicons name={config.name as any} size={size} color={color} />;
    case 'feather':
      return <Feather name={config.name as any} size={size} color={color} />;
    case 'material':
      return <MaterialCommunityIcons name={config.name as any} size={size} color={color} />;
  }
}

// 時間オプション（5分刻み）
const DURATION_OPTIONS = Array.from(
  { length: (CUSTOM_MODE_LIMITS.maxFocusDuration - CUSTOM_MODE_LIMITS.minFocusDuration) / CUSTOM_MODE_LIMITS.step + 1 },
  (_, i) => CUSTOM_MODE_LIMITS.minFocusDuration + i * CUSTOM_MODE_LIMITS.step
);

export function SessionControlBar({
  selectedMode,
  customDuration,
  onModeSelect,
  onCustomDurationChange,
  onStartSession,
  disabled = false,
}: SessionControlBarProps) {
  const { colors } = useTheme();
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [showDurationMenu, setShowDurationMenu] = useState(false);

  const currentMode = FOCUS_MODES.find((m) => m.id === selectedMode) || FOCUS_MODES[1];
  const isCustomMode = selectedMode === 'custom';

  // 表示用時間
  const displayDuration = isCustomMode
    ? Math.floor(customDuration / 60)
    : Math.floor(currentMode.focusDuration / 60);

  const handleModePress = () => {
    playClickSound();
    setShowModeMenu(true);
  };

  const handleModeSelect = (mode: FocusMode) => {
    playClickSound();
    onModeSelect(mode);
    setShowModeMenu(false);
  };

  const handleTimerPress = () => {
    playClickSound();
    setShowDurationMenu(true);
  };

  const handleDurationSelect = (duration: number) => {
    playClickSound();
    onCustomDurationChange(duration);
    setShowDurationMenu(false);
  };

  const handleStartPress = () => {
    playClickSound();
    onStartSession();
  };

  // 動的スタイル
  const dynamicStyles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: borderRadius.xxl,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      padding: spacing.sm,
      gap: spacing.sm,
    },
    modeButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      gap: spacing.md,
    },
    modeIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modeTextContainer: {
      flex: 1,
    },
    modeLabel: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
    },
    modeName: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.semibold,
      color: colors.textPrimary,
    },
    timerButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    recordButton: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.recording,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    recordButtonDisabled: {
      backgroundColor: colors.textMuted,
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'flex-end',
    },
    menuContainer: {
      backgroundColor: colors.backgroundSecondary,
      borderTopLeftRadius: borderRadius.xxl,
      borderTopRightRadius: borderRadius.xxl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxxl,
      paddingHorizontal: spacing.lg,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    menuHandle: {
      width: 40,
      height: 4,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: spacing.lg,
    },
    menuTitle: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.textPrimary,
      marginBottom: spacing.lg,
      textAlign: 'center',
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.sm,
      gap: spacing.md,
    },
    menuItemActive: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    menuItemIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuItemText: {
      flex: 1,
    },
    menuItemLabel: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.medium,
      color: colors.textPrimary,
    },
    menuItemDescription: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
    },
    menuItemDuration: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
      color: colors.primary,
    },
    // Duration menu grid
    durationGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      justifyContent: 'center',
    },
    durationItem: {
      width: 70,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderRadius: borderRadius.lg,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      alignItems: 'center',
    },
    durationItemActive: {
      backgroundColor: colors.primary,
    },
    durationText: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.medium,
      color: colors.textSecondary,
    },
    durationTextActive: {
      color: colors.textPrimary,
    },
  });

  return (
    <>
      <View style={dynamicStyles.container}>
        {/* モード選択ボタン */}
        <TouchableOpacity
          style={dynamicStyles.modeButton}
          onPress={handleModePress}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <View style={dynamicStyles.modeIcon}>
            <ModeIcon modeId={selectedMode} size={20} color={colors.textPrimary} />
          </View>
          <View style={dynamicStyles.modeTextContainer}>
            <Text style={dynamicStyles.modeLabel}>モード</Text>
            <Text style={dynamicStyles.modeName}>
              {currentMode.label} · {displayDuration}m
            </Text>
          </View>
        </TouchableOpacity>

        {/* タイマーアイコン（カスタムモード時のみ） */}
        {isCustomMode && (
          <TouchableOpacity
            style={dynamicStyles.timerButton}
            onPress={handleTimerPress}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Ionicons name="timer-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        )}

        {/* 録音開始ボタン */}
        <TouchableOpacity
          style={[
            dynamicStyles.recordButton,
            disabled && dynamicStyles.recordButtonDisabled,
          ]}
          onPress={handleStartPress}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Ionicons name="play" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* モード選択メニュー */}
      <Modal
        visible={showModeMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModeMenu(false)}
      >
        <Pressable
          style={dynamicStyles.modalOverlay}
          onPress={() => setShowModeMenu(false)}
        >
          <View style={dynamicStyles.menuContainer}>
            <View style={dynamicStyles.menuHandle} />
            <Text style={dynamicStyles.menuTitle}>モードを選択</Text>
            {FOCUS_MODES.map((mode) => {
              const isActive = mode.id === selectedMode;
              const duration = mode.id === 'custom'
                ? Math.floor(customDuration / 60)
                : Math.floor(mode.focusDuration / 60);
              return (
                <TouchableOpacity
                  key={mode.id}
                  style={[
                    dynamicStyles.menuItem,
                    isActive && dynamicStyles.menuItemActive,
                  ]}
                  onPress={() => handleModeSelect(mode)}
                  activeOpacity={0.7}
                >
                  <View style={dynamicStyles.menuItemIcon}>
                    <ModeIcon modeId={mode.id} size={22} color={colors.textPrimary} />
                  </View>
                  <View style={dynamicStyles.menuItemText}>
                    <Text style={dynamicStyles.menuItemLabel}>{mode.label}</Text>
                    <Text style={dynamicStyles.menuItemDescription}>{mode.description}</Text>
                  </View>
                  <Text style={dynamicStyles.menuItemDuration}>{duration}m</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      {/* 時間設定メニュー */}
      <Modal
        visible={showDurationMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDurationMenu(false)}
      >
        <Pressable
          style={dynamicStyles.modalOverlay}
          onPress={() => setShowDurationMenu(false)}
        >
          <View style={dynamicStyles.menuContainer}>
            <View style={dynamicStyles.menuHandle} />
            <Text style={dynamicStyles.menuTitle}>時間を設定</Text>
            <View style={dynamicStyles.durationGrid}>
              {DURATION_OPTIONS.map((duration) => {
                const isActive = duration === customDuration;
                const minutes = Math.floor(duration / 60);
                return (
                  <TouchableOpacity
                    key={duration}
                    style={[
                      dynamicStyles.durationItem,
                      isActive && dynamicStyles.durationItemActive,
                    ]}
                    onPress={() => handleDurationSelect(duration)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        dynamicStyles.durationText,
                        isActive && dynamicStyles.durationTextActive,
                      ]}
                    >
                      {minutes}分
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
