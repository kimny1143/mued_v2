/**
 * SessionScreen - 録音中の最小UI
 * Modacityスタイル：タイマーと録音インジケーターのみ
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
import { whisperService, TranscriptionResult, VadStatusType } from '../services/whisperService';
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
    vadStatus,
    tick,
    setVadStatus,
    addLog,
    endSession,
  } = useSessionStore();

  // 録音インジケーターのアニメーション
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [recentText, setRecentText] = useState<string>('');

  // タイマー
  useEffect(() => {
    const timer = setInterval(() => {
      tick();
    }, 1000);

    return () => clearInterval(timer);
  }, [tick]);

  // 録音インジケーターのパルスアニメーション
  useEffect(() => {
    if (vadStatus === 'speech_start' || vadStatus === 'speech_continue') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [vadStatus, pulseAnim]);

  // Whisper コールバック設定
  useEffect(() => {
    whisperService.setCallbacks({
      onVadChange: (status: VadStatusType) => {
        setVadStatus(status);
      },
      onTranscribe: async (result: TranscriptionResult) => {
        // 直近のテキストを表示
        setRecentText(result.text);

        // ログ追加
        try {
          await addLog({
            timestamp_sec: result.startTime,
            text: result.text,
            confidence: result.confidence,
          });
        } catch (error) {
          console.error('[Session] Failed to add log:', error);
        }

        // 3秒後にテキストをフェードアウト
        setTimeout(() => setRecentText(''), 3000);
      },
      onError: (error: string) => {
        console.error('[Session] Whisper error:', error);
      },
    });

    // リアルタイム文字起こし開始
    whisperService.startRealtimeTranscription().catch(console.error);

    return () => {
      whisperService.stopRealtimeTranscription();
    };
  }, [setVadStatus, addLog]);

  // 残り時間計算
  const remainingSeconds = currentSession
    ? Math.max(0, currentSession.duration_sec - elapsedSeconds)
    : 0;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  // 進捗率
  const progress = currentSession
    ? elapsedSeconds / currentSession.duration_sec
    : 0;

  // セッション終了
  const handleEnd = async () => {
    await whisperService.stopRealtimeTranscription();
    await endSession();
    onEndSession();
  };

  // VADステータスに応じた色
  const getIndicatorColor = () => {
    switch (vadStatus) {
      case 'speech_start':
      case 'speech_continue':
        return colors.recording;
      case 'speech_end':
        return colors.warning;
      default:
        return colors.textMuted;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 最小ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.statusText}>Recording</Text>
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
              backgroundColor: getIndicatorColor(),
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
        <Text style={styles.indicatorText}>
          {vadStatus === 'silence' ? '待機中...' : '録音中'}
        </Text>
      </View>

      {/* 直近の文字起こし */}
      {recentText ? (
        <View style={styles.transcriptContainer}>
          <Text style={styles.transcriptText} numberOfLines={2}>
            {recentText}
          </Text>
        </View>
      ) : (
        <View style={styles.transcriptContainer}>
          <Text style={styles.transcriptPlaceholder}>
            話し始めると文字が表示されます
          </Text>
        </View>
      )}

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
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    alignItems: 'center',
  },
  statusText: {
    fontSize: fontSize.sm,
    color: colors.recording,
    fontWeight: fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 2,
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
  },
  indicatorText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  transcriptContainer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    minHeight: 80,
    justifyContent: 'center',
  },
  transcriptText: {
    fontSize: fontSize.base,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 24,
  },
  transcriptPlaceholder: {
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
