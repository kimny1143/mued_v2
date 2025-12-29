/**
 * OnboardingScreen - 初回起動時のオンボーディング画面
 * MUED哲学に基づく三層構造
 *
 * Layer 0: タグライン（スプラッシュ）
 * Layer 1: 要約カード（3枚スライダー）
 * Layer 2: 設定画面からリンク（別途実装）
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
  Animated,
  ViewToken,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { localStorage } from '../cache/storage';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';
import { playClickSound } from '../utils/sound';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 背景画像
const heroBg = require('../../assets/images/hero-bg.jpg');

interface OnboardingScreenProps {
  onComplete: () => void;
}

// 三層構造のコンテンツ
const TAGLINE = {
  line1: '集中して、休む。',
  line2: 'それだけでいい。',
};

const CARDS = [
  {
    id: '1',
    title: '時間を決めて集中',
    description: '25分、50分、90分。あなたに合ったモードを選んで開始。Hooが適切なタイミングで休憩を促します。',
  },
  {
    id: '2',
    title: '声で気づきを記録',
    description: '作業中のアイデアや違和感を声に出すだけ。Hooが書き起こして保存します。',
  },
  {
    id: '3',
    title: '記録を振り返る',
    description: '集中した時間はすべて記録されます。ホーム画面を右スワイプで履歴を確認。',
  },
];

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [showCards, setShowCards] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);

  // スプラッシュ表示後にカードへ遷移
  React.useEffect(() => {
    // フェードイン
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // 3秒後にカードへ
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setShowCards(true);
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, [fadeAnim]);

  // カードのスクロール位置を追跡
  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        setCurrentIndex(viewableItems[0].index ?? 0);
      }
    },
    []
  );

  // オンボーディング完了
  const handleComplete = async () => {
    await localStorage.setOnboardingComplete();
    onComplete();
  };

  // 次のカードへ
  const handleNext = () => {
    playClickSound();
    if (currentIndex < CARDS.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      handleComplete();
    }
  };

  // スキップ
  const handleSkip = () => {
    playClickSound();
    handleComplete();
  };

  // レイヤー0: タグライン（スプラッシュ）
  if (!showCards) {
    return (
      <ImageBackground source={heroBg} style={styles.splashContainer} resizeMode="cover">
        <View style={styles.splashOverlay}>
          <SafeAreaView style={styles.splashContent}>
            <Animated.View style={[styles.taglineContainer, { opacity: fadeAnim }]}>
              <Text style={styles.taglineLine1}>{TAGLINE.line1}</Text>
              <Text style={styles.taglineLine2}>{TAGLINE.line2}</Text>
            </Animated.View>
          </SafeAreaView>
        </View>
      </ImageBackground>
    );
  }

  // レイヤー1: 要約カード
  return (
    <ImageBackground source={heroBg} style={styles.splashContainer} resizeMode="cover">
      <BlurView intensity={80} tint="systemMaterialDark" style={styles.blurContainer}>
        <SafeAreaView style={styles.container}>
          {/* Skip button */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>スキップ</Text>
            </TouchableOpacity>
          </View>

          {/* Card slider */}
          <FlatList
            ref={flatListRef}
            data={CARDS}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            renderItem={({ item }) => (
              <View style={styles.cardWrapper}>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardDescription}>{item.description}</Text>
                </View>
              </View>
            )}
          />

          {/* Pagination dots */}
          <View style={styles.pagination}>
            {CARDS.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentIndex && styles.dotActive,
                ]}
              />
            ))}
          </View>

          {/* Next/Start button */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>
                {currentIndex === CARDS.length - 1 ? 'はじめる' : '次へ'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </BlurView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  // Splash (Layer 0)
  splashContainer: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  splashOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  splashContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taglineContainer: {
    alignItems: 'center',
  },
  taglineLine1: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  taglineLine2: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.medium,
    color: colors.primary,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  // Cards (Layer 1)
  blurContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  skipButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  skipText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  cardWrapper: {
    width: SCREEN_WIDTH,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'rgba(30, 30, 50, 0.85)',
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    minHeight: 300,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    lineHeight: 28,
    textAlign: 'center',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.backgroundSecondary,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 24,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  nextButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
});
