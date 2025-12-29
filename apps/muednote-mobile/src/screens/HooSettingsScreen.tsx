/**
 * HooSettingsScreen - 設定画面
 *
 * - アカウント設定
 * - Hoo音声反応設定（折りたたみ式）
 *
 * デザイン: MUEDグラスモーフィズム、ミニマル
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Slider } from '@miblanchard/react-native-slider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/clerk-expo';
import { useTheme } from '../providers/ThemeProvider';
import { useHooSettingsStore, DEFAULT_HOO_SETTINGS } from '../stores/hooSettingsStore';
import { spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';
import { playClickSound } from '../utils/sound';

interface HooSettingsScreenProps {
  onBack: () => void;
}

// スライダー設定の型
interface SliderConfig {
  key: keyof typeof DEFAULT_HOO_SETTINGS;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  isNegative?: boolean; // バウンス量など負の値
}

export function HooSettingsScreen({ onBack }: HooSettingsScreenProps) {
  const { colors } = useTheme();
  const { signOut } = useAuth();
  const { settings, isLoaded, loadSettings, updateSettings, resetToDefaults } = useHooSettingsStore();

  // 折りたたみ状態
  const [isHooSettingsExpanded, setIsHooSettingsExpanded] = useState(false);

  // 初期ロード
  useEffect(() => {
    if (!isLoaded) {
      loadSettings();
    }
  }, [isLoaded, loadSettings]);

  // スライダー値変更ハンドラ
  const handleSliderChange = (key: keyof typeof DEFAULT_HOO_SETTINGS, value: number) => {
    updateSettings({ [key]: value });
  };

  // 戻るボタン
  const handleBack = () => {
    playClickSound();
    onBack();
  };

  // リセットボタン
  const handleReset = () => {
    playClickSound();
    resetToDefaults();
  };

  // ログアウト
  const handleLogout = () => {
    playClickSound();
    Alert.alert(
      'ログアウト',
      'ログアウトしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'ログアウト',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ]
    );
  };

  // 強拍設定
  const strongConfigs: SliderConfig[] = [
    { key: 'strongThreshold', label: '閾値', min: 0.1, max: 0.5, step: 0.01, unit: '' },
    { key: 'strongDelta', label: '変化量', min: 0.02, max: 0.15, step: 0.01, unit: '' },
    { key: 'strongBounce', label: 'バウンス', min: -40, max: -10, step: 1, unit: 'px', isNegative: true },
    { key: 'strongAttack', label: 'アタック', min: 20, max: 100, step: 5, unit: 'ms' },
    { key: 'strongRelease', label: 'リリース', min: 50, max: 200, step: 5, unit: 'ms' },
  ];

  // 弱拍設定
  const mediumConfigs: SliderConfig[] = [
    { key: 'mediumThreshold', label: '閾値', min: 0.05, max: 0.3, step: 0.01, unit: '' },
    { key: 'mediumDelta', label: '変化量', min: 0.01, max: 0.1, step: 0.01, unit: '' },
    { key: 'mediumBounce', label: 'バウンス', min: -25, max: -5, step: 1, unit: 'px', isNegative: true },
    { key: 'mediumAttack', label: 'アタック', min: 20, max: 100, step: 5, unit: 'ms' },
    { key: 'mediumRelease', label: 'リリース', min: 50, max: 200, step: 5, unit: 'ms' },
  ];

  // 値のフォーマット
  const formatValue = (value: number, config: SliderConfig) => {
    if (config.unit === '' && config.step < 1) {
      return value.toFixed(2);
    }
    return `${Math.abs(value)}${config.unit}`;
  };

  // スライダーレンダリング
  const renderSlider = (config: SliderConfig) => {
    const value = settings[config.key] ?? config.min;
    return (
      <View key={config.key} style={styles.sliderRow}>
        <View style={styles.sliderLabelRow}>
          <Text style={[styles.sliderLabel, { color: colors.textSecondary }]}>
            {config.label}
          </Text>
          <Text style={[styles.sliderValue, { color: colors.textPrimary }]}>
            {formatValue(value, config)}
          </Text>
        </View>
        <Slider
          containerStyle={styles.slider}
          minimumValue={config.min}
          maximumValue={config.max}
          step={config.step}
          value={value}
          onValueChange={(v) => handleSliderChange(config.key, v[0])}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.primaryLight}
        />
      </View>
    );
  };

  // 動的スタイル
  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      minHeight: 52, // HomeScreenと揃える
    },
    backButton: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: colors.border,
    },
    backText: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      fontWeight: fontWeight.medium,
    },
    title: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.textPrimary,
    },
    sectionTitle: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.semibold,
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    // グラスモーフィズムカード
    card: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: borderRadius.xxl,
      padding: spacing.xl,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      // iOS shadow for depth
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
    },
    logoutButton: {
      backgroundColor: colors.background,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderWidth: 1,
      borderColor: colors.error,
      alignItems: 'center',
    },
    logoutText: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.medium,
      color: colors.error,
    },
    // 折りたたみヘッダー
    accordionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.md,
    },
    accordionTitle: {
      flex: 1,
    },
    accordionTitleText: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.semibold,
      color: colors.textPrimary,
    },
    accordionSubtitle: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      marginTop: 2,
    },
    accordionIcon: {
      padding: spacing.xs,
    },
    accordionContent: {
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    subSectionTitle: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      color: colors.textSecondary,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    resetRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: spacing.lg,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    resetButtonSmall: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.background,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    resetButtonSmallText: {
      fontSize: fontSize.xs,
      color: colors.textSecondary,
    },
  });

  // Hoo設定トグル
  const toggleHooSettings = () => {
    playClickSound();
    setIsHooSettingsExpanded(!isHooSettingsExpanded);
  };

  return (
    <SafeAreaView style={dynamicStyles.container}>
      {/* ヘッダー */}
      <View style={dynamicStyles.header}>
        <TouchableOpacity style={dynamicStyles.backButton} onPress={handleBack} activeOpacity={0.7}>
          <Text style={dynamicStyles.backText}>戻る</Text>
        </TouchableOpacity>
        <Text style={dynamicStyles.title}>設定</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* 設定リスト */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* アカウントセクション */}
        <View style={dynamicStyles.card}>
          <Text style={dynamicStyles.sectionTitle}>アカウント</Text>
          <TouchableOpacity
            style={dynamicStyles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Text style={dynamicStyles.logoutText}>ログアウト</Text>
          </TouchableOpacity>
        </View>

        {/* Hoo音声反応設定（折りたたみ式） */}
        <View style={dynamicStyles.card}>
          <TouchableOpacity
            style={dynamicStyles.accordionHeader}
            onPress={toggleHooSettings}
            activeOpacity={0.7}
          >
            <View style={dynamicStyles.accordionTitle}>
              <Text style={dynamicStyles.accordionTitleText}>Hoo 音声反応</Text>
              <Text style={dynamicStyles.accordionSubtitle}>
                アニメーションの閾値・速度を調整
              </Text>
            </View>
            <View style={dynamicStyles.accordionIcon}>
              <Ionicons
                name={isHooSettingsExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.textSecondary}
              />
            </View>
          </TouchableOpacity>

          {isHooSettingsExpanded && (
            <View style={dynamicStyles.accordionContent}>
              {/* 強拍 */}
              <Text style={dynamicStyles.subSectionTitle}>強拍（大きな音）</Text>
              {strongConfigs.map(renderSlider)}

              {/* 弱拍 */}
              <Text style={dynamicStyles.subSectionTitle}>弱拍（中くらいの音）</Text>
              {mediumConfigs.map(renderSlider)}

              {/* リセットボタン */}
              <View style={dynamicStyles.resetRow}>
                <TouchableOpacity
                  style={dynamicStyles.resetButtonSmall}
                  onPress={handleReset}
                  activeOpacity={0.7}
                >
                  <Text style={dynamicStyles.resetButtonSmallText}>デフォルトに戻す</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
  },
  sliderRow: {
    marginBottom: spacing.lg,
  },
  sliderLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sliderLabel: {
    fontSize: fontSize.sm,
  },
  sliderValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    fontVariant: ['tabular-nums'],
  },
  slider: {
    width: '100%',
    height: 40,
  },
});
