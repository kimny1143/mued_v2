/**
 * Hoo - MUEDnoteのマスコットキャラクター
 *
 * フクロウ型AIアシスタントとして画面に常駐
 * 状態に応じて吹き出しのメッセージが変化
 */

import React from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HOO_SIZE = SCREEN_WIDTH * 0.35;

export type HooState = 'idle' | 'listening' | 'thinking' | 'done' | 'empty';

interface HooProps {
  state: HooState;
  customMessage?: string;
}

// 状態ごとのメッセージ
const stateMessages: Record<HooState, string> = {
  idle: '何か録音する？',
  listening: 'ほほう...聞いてるよ',
  thinking: '処理中...',
  done: '記録したよ',
  empty: 'まだ何も録音してないね',
};

export function Hoo({ state, customMessage }: HooProps) {
  const message = customMessage ?? stateMessages[state];

  return (
    <View style={styles.container}>
      {/* Hoo Image */}
      <View style={styles.hooWrapper}>
        <Image
          source={require('../../assets/images/hoo.png')}
          style={styles.hooImage}
          resizeMode="contain"
        />
      </View>

      {/* Speech Bubble */}
      <View style={styles.bubbleContainer}>
        <View style={styles.bubbleTail} />
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{message}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  hooWrapper: {
    width: HOO_SIZE,
    height: HOO_SIZE * 0.7, // ロゴは横長
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
    borderBottomColor: colors.backgroundSecondary,
  },
  bubble: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: SCREEN_WIDTH * 0.8,
  },
  bubbleText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
    textAlign: 'center',
  },
});
