/**
 * HooSettingsScreen - Hooの音声反応アニメーション設定
 *
 * 強拍・弱拍のアタック/リリース、閾値を調整可能
 * 左スワイプでホームに戻る
 *
 * デザイン: MUEDグラスモーフィズム、ミニマル
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Slider } from '@miblanchard/react-native-slider';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const { settings, isLoaded, loadSettings, updateSettings, resetToDefaults } = useHooSettingsStore();

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
    resetButton: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: colors.border,
    },
    resetText: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      fontWeight: fontWeight.medium,
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
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      {/* ヘッダー */}
      <View style={dynamicStyles.header}>
        <TouchableOpacity style={dynamicStyles.backButton} onPress={handleBack} activeOpacity={0.7}>
          <Text style={dynamicStyles.backText}>戻る</Text>
        </TouchableOpacity>
        <Text style={dynamicStyles.title}>Hoo 設定</Text>
        <TouchableOpacity style={dynamicStyles.resetButton} onPress={handleReset} activeOpacity={0.7}>
          <Text style={dynamicStyles.resetText}>リセット</Text>
        </TouchableOpacity>
      </View>

      {/* 設定リスト */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 強拍セクション */}
        <View style={dynamicStyles.card}>
          <Text style={dynamicStyles.sectionTitle}>強拍（大きな音）</Text>
          {strongConfigs.map(renderSlider)}
        </View>

        {/* 弱拍セクション */}
        <View style={dynamicStyles.card}>
          <Text style={dynamicStyles.sectionTitle}>弱拍（中くらいの音）</Text>
          {mediumConfigs.map(renderSlider)}
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
