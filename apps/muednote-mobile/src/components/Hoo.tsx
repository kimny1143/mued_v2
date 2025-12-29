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
  Animated,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import { useHooSettingsStore } from '../stores/hooSettingsStore';
import { spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';
import { playHooSound } from '../utils/sound';

// サイズ係数（短辺ベースで計算するので縦横で一貫したサイズになる）
const SIZE_FACTORS = {
  small: { width: 0.35, height: 0.25 },
  medium: { width: 0.5, height: 0.36 },
  mediumLarge: { width: 0.65, height: 0.47 },
  large: { width: 0.8, height: 0.57 },
};

export type HooSize = 'small' | 'medium' | 'mediumLarge' | 'large';
export type HooState = 'idle' | 'listening' | 'thinking' | 'done' | 'empty';

interface HooProps {
  state: HooState;
  customMessage?: string;
  /** trueにするとHooが上下にバウンス（鳴き声と連動） */
  isSpeaking?: boolean;
  /** サイズ: 'small' | 'medium' | 'mediumLarge' | 'large' */
  size?: HooSize;
  /** 吹き出しを非表示にする */
  hideBubble?: boolean;
  /** 吹き出しをHooの上に重ねて表示（横向き用） */
  overlayBubble?: boolean;
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
  overlayBubble = false,
  muteSound = false,
  volumeLevel = 0,
}: HooProps) {
  const { colors, isDark } = useTheme();
  const { settings: hooSettings } = useHooSettingsStore();
  const { width, height } = useWindowDimensions();
  const message = customMessage ?? stateMessages[state];

  // 短辺ベースでサイズ計算（縦横回転しても一貫したサイズになる）
  const shortSide = Math.min(width, height);
  const factors = SIZE_FACTORS[size];
  const sizeConfig = {
    width: shortSide * factors.width,
    height: shortSide * factors.height,
    fontSize: size === 'small' ? fontSize.sm : size === 'large' ? fontSize.lg : fontSize.base,
    bubblePadding: size === 'small' ? spacing.md : size === 'large' ? spacing.xl : spacing.lg,
  };

  // バウンスアニメーション用（isSpeaking）
  const bounceAnim = useRef(new Animated.Value(0)).current;
  // 音量反応アニメーション用（scale）
  const volumeScaleAnim = useRef(new Animated.Value(1)).current;
  // バウンス量もサイズに応じて調整
  const bounceAmount = size === 'large' ? -20 : size === 'mediumLarge' ? -15 : size === 'small' ? -5 : -10;

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
    <View style={[styles.container, overlayBubble && styles.containerOverlay]}>
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
        <View style={[
          styles.bubbleContainer,
          overlayBubble && styles.bubbleContainerOverlay,
        ]}>
          {!overlayBubble && (
            <View style={[styles.bubbleTail, { borderBottomColor: colors.backgroundSecondary }]} />
          )}
          <View
            style={[
              styles.bubble,
              {
                paddingHorizontal: sizeConfig.bubblePadding,
                backgroundColor: overlayBubble ? 'rgba(22, 33, 62, 0.9)' : colors.backgroundSecondary,
                borderColor: colors.border,
                maxWidth: width * 0.85,
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
  containerOverlay: {
    // オーバーレイモード時は相対配置の親要素として機能
    position: 'relative',
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
  bubbleContainerOverlay: {
    // Hooの口あたりに重ねて表示（横向き用）
    position: 'absolute',
    top: '55%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
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
    alignSelf: 'center',
  },
  bubbleText: {
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
});
