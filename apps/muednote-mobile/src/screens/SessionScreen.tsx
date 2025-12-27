/**
 * SessionScreen - 録音中の最小UI
 * バッチ処理方式：タイマー + 録音インジケーターのみ
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSessionStore } from '../stores/sessionStore';
import { whisperService } from '../services/whisperService';
import { playSessionEndSound } from '../utils/sound';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CIRCLE_SIZE = SCREEN_WIDTH * 0.75;

interface SessionScreenProps {
  onEndSession: () => void;
}

export function SessionScreen({ onEndSession }: SessionScreenProps) {
  const {
    currentSession,
    elapsedSeconds,
    tick,
    endSession,
  } = useSessionStore();

  // Hooのメッセージ
  const [hooMessage, setHooMessage] = useState('ほほう...聞いてるよ');

  // 録音インジケーターのアニメーション
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Hooバウンスアニメーション
  const hooBounceAnim = useRef(new Animated.Value(0)).current;

  // タイマー
  useEffect(() => {
    const timer = setInterval(() => {
      tick();
    }, 1000);

    return () => clearInterval(timer);
  }, [tick]);

  // 録音インジケーターのパルスアニメーション
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [pulseAnim]);

  // 録音開始
  useEffect(() => {
    const startRecording = async () => {
      try {
        await whisperService.startRecording();
        console.log('[Session] Recording started');
      } catch (error) {
        console.error('[Session] Failed to start recording:', error);
      }
    };

    startRecording();

    return () => {
      // クリーンアップ時に録音停止
      whisperService.stopRecording();
    };
  }, []);

  // 残り時間計算
  const remainingSeconds = currentSession
    ? Math.max(0, currentSession.duration_sec - elapsedSeconds)
    : 0;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  // タイマー0になったらメッセージ変更
  useEffect(() => {
    if (remainingSeconds === 0 && currentSession) {
      setHooMessage('そろそろ休憩する？');
    }
  }, [remainingSeconds, currentSession]);

  // 進捗率
  const progress = currentSession
    ? elapsedSeconds / currentSession.duration_sec
    : 0;

  // セッション終了
  const handleEnd = async () => {
    // 録音停止
    await whisperService.stopRecording();

    // Hooが「記録したよ」と言う
    setHooMessage('記録したよ');

    // サウンド再生 + バウンスアニメーション（音声タイミングに同期）
    playSessionEndSound();

    // 「Ho Hoo」の音に合わせて2回バウンス
    // Ho: 0.35-0.55s, Hoo: 0.65-0.85s
    Animated.sequence([
      // 最初の待機（音声立ち上がりまで）
      Animated.delay(300),
      // 1回目バウンス「Ho」
      Animated.timing(hooBounceAnim, {
        toValue: -10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(hooBounceAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
      // 谷間の待機
      Animated.delay(100),
      // 2回目バウンス「Hoo」
      Animated.timing(hooBounceAnim, {
        toValue: -10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(hooBounceAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // 1.5秒後に遷移（アニメーション完了を待つ）
    setTimeout(async () => {
      await endSession();
      onEndSession();
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Hoo - 聞いてる/話してる状態 */}
      <View style={styles.hooSection}>
        <Animated.Image
          source={require('../../assets/images/hoo.png')}
          style={[
            styles.hooImage,
            { transform: [{ translateY: hooBounceAnim }] },
          ]}
          resizeMode="contain"
        />
        <View style={styles.hooMessageBox}>
          <Text style={styles.hooText}>{hooMessage}</Text>
        </View>
      </View>

      {/* タイマー表示 */}
      <View style={styles.circleContainer}>
        <View style={styles.timerCircle}>
          {/* 進捗リング（簡易版） */}
          <View style={[styles.progressRing, { opacity: progress }]} />

          <View style={styles.timerContent}>
            <Text style={styles.timerText}>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </Text>
            <Text style={styles.timerLabel}>残り時間</Text>
          </View>
        </View>
      </View>

      {/* 録音インジケーター */}
      <View style={styles.indicatorContainer}>
        <Animated.View
          style={[
            styles.recordingDot,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
        <Text style={styles.indicatorText}>録音中</Text>
      </View>

      {/* メッセージ */}
      <View style={styles.messageContainer}>
        <Text style={styles.messageText}>
          セッション終了後に文字起こしされます
        </Text>
      </View>

      {/* 終了ボタン */}
      <View style={styles.bottomSection}>
        <TouchableOpacity style={styles.endButton} onPress={handleEnd}>
          <Text style={styles.endButtonText}>セッション終了</Text>
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
  hooSection: {
    alignItems: 'center',
    paddingTop: spacing.lg,
  },
  hooImage: {
    width: SCREEN_WIDTH * 0.25,
    height: SCREEN_WIDTH * 0.18,
    opacity: 0.9,
  },
  hooMessageBox: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hooText: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  circleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.primary,
  },
  progressRing: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  timerContent: {
    alignItems: 'center',
  },
  timerText: {
    fontSize: fontSize['5xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  timerLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.recording,
  },
  indicatorText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  messageContainer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  messageText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  bottomSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  endButton: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  endButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
});
