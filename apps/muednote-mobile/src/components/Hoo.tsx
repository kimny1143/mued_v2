/**
 * Hoo - MUEDnoteのマスコットキャラクター
 *
 * フクロウ型AIアシスタントとして画面に常駐
 * 状態に応じて吹き出しのメッセージが変化
 * isSpeaking=true で上下バウンスアニメーション + 鳴き声
 *
 * サイズバリエーション:
 * - 'small': 小さめ（文字起こし画面など）
 * - 'medium': 標準サイズ（デフォルト）
 * - 'large': 画面いっぱい（ホーム・セッション画面）
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import { useHooSettingsStore } from '../stores/hooSettingsStore';
import { spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';
import { playHooSound } from '../utils/sound';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// サイズ定義
const SIZES = {
  small: {
    width: SCREEN_WIDTH * 0.25,
    height: SCREEN_WIDTH * 0.18,
    fontSize: fontSize.sm,
    bubblePadding: spacing.md,
  },
  medium: {
    width: SCREEN_WIDTH * 0.35,
    height: SCREEN_WIDTH * 0.25,
    fontSize: fontSize.base,
    bubblePadding: spacing.lg,
  },
  large: {
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.5,
    fontSize: fontSize.lg,
    bubblePadding: spacing.xl,
  },
};

export type HooSize = 'small' | 'medium' | 'large';
export type HooState = 'idle' | 'listening' | 'thinking' | 'done' | 'empty';

interface HooProps {
  state: HooState;
  customMessage?: string;
  /** trueにするとHooが上下にバウンス（鳴き声と連動） */
  isSpeaking?: boolean;
  /** サイズ: 'small' | 'medium' | 'large' */
  size?: HooSize;
  /** 吹き出しを非表示にする */
  hideBubble?: boolean;
  /** サウンド再生をスキップ（録音中など） */
  muteSound?: boolean;
  /** 音量レベル（0〜1）に応じてHooが反応 */
  volumeLevel?: number;
}

// 状態ごとのメッセージ
const stateMessages: Record<HooState, string> = {
  idle: '作業する？',
  listening: 'ほほう...聞いてるよ',
  thinking: '処理中...',
  done: '記録したよ',
  empty: 'まだ何も録音してないね',
};

export function Hoo({
  state,
  customMessage,
  isSpeaking = false,
  size = 'medium',
  hideBubble = false,
  muteSound = false,
  volumeLevel = 0,
}: HooProps) {
  const { colors, isDark } = useTheme();
  const { settings: hooSettings } = useHooSettingsStore();
  const message = customMessage ?? stateMessages[state];
  const sizeConfig = SIZES[size];

  // バウンスアニメーション用（isSpeaking）
  const bounceAnim = useRef(new Animated.Value(0)).current;
  // 音量反応アニメーション用（scale）
  const volumeScaleAnim = useRef(new Animated.Value(1)).current;
  // バウンス量もサイズに応じて調整
  const bounceAmount = size === 'large' ? -20 : size === 'small' ? -5 : -10;

  useEffect(() => {
    if (isSpeaking) {
      // サウンド再生（ミュートでなければ）
      if (!muteSound) {
        playHooSound();
      }

      // 「Ho Hoo」の音に合わせて2回バウンス
      // 音声タイミング: Ho: 0.35-0.55s, Hoo: 0.65-0.85s
      Animated.sequence([
        Animated.delay(300),
        // 1回目「Ho」
        Animated.timing(bounceAnim, {
          toValue: bounceAmount,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.delay(100),
        // 2回目「Hoo」
        Animated.timing(bounceAnim, {
          toValue: bounceAmount,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      bounceAnim.setValue(0);
    }
  }, [isSpeaking, bounceAnim, bounceAmount, muteSound]);

  // 音量反応アニメーション（アタック＆リリース方式 + 音量比例サイズ変化）
  // 音量ピークを検知 → 音量に比例してスケールアップ → 固定時間で戻る
  const lastVolumeRef = useRef(0);

  useEffect(() => {
    const prevVolume = lastVolumeRef.current;
    lastVolumeRef.current = volumeLevel;

    // アタック検知: 音量が急上昇した時（設定の閾値を使用）
    const delta = volumeLevel - prevVolume;
    const isAttack = volumeLevel > hooSettings.mediumThreshold && delta > hooSettings.mediumDelta;

    if (isAttack) {
      // 音量に比例したスケール - strongBounceを最大スケール変化量として使用
      // strongBounce: -25 → 0.25 (25%) のスケール変化
      const maxScaleChange = Math.abs(hooSettings.strongBounce) / 100;
      const normalizedVolume = Math.min(1, volumeLevel / 0.5);
      const targetScale = 1 + (maxScaleChange * normalizedVolume);

      // ふわっと大きくなって戻る
      Animated.sequence([
        Animated.timing(volumeScaleAnim, {
          toValue: targetScale,
          duration: hooSettings.strongAttack,
          useNativeDriver: true,
        }),
        Animated.timing(volumeScaleAnim, {
          toValue: 1,
          duration: hooSettings.strongRelease,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [volumeLevel, volumeScaleAnim, hooSettings]);

  return (
    <View style={styles.container}>
      {/* Hoo Image with bounce + volume scale animation */}
      <Animated.View
        style={[
          styles.hooWrapper,
          {
            width: sizeConfig.width,
            height: sizeConfig.height,
            transform: [
              { translateY: bounceAnim },
              { scale: volumeScaleAnim },
            ],
          },
        ]}
      >
        <Image
          source={
            isDark
              ? require('../../assets/images/hoo.png')
              : require('../../assets/images/hoo-light.png')
          }
          style={styles.hooImage}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Speech Bubble */}
      {!hideBubble && (
        <View style={styles.bubbleContainer}>
          <View style={[styles.bubbleTail, { borderBottomColor: colors.backgroundSecondary }]} />
          <View
            style={[
              styles.bubble,
              {
                paddingHorizontal: sizeConfig.bubblePadding,
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.bubbleText, { fontSize: sizeConfig.fontSize, color: colors.textPrimary }]}>
              {message}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  hooWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  hooImage: {
    width: '100%',
    height: '100%',
    opacity: 0.95,
  },
  bubbleContainer: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  bubbleTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  bubble: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    maxWidth: SCREEN_WIDTH * 0.85,
  },
  bubbleText: {
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
});
