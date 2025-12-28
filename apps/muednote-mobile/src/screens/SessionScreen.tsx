/**
 * SessionScreen - 録音中のHoo中心UI
 *
 * 「常にHooが居る」コンセプト:
 * - Hooの顔が画面の中心
 * - タイマーはHooの上部に表示
 * - メッセージはHooの下に吹き出しで表示
 * - 録音インジケーター
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSessionStore } from '../stores/sessionStore';
import { useTheme } from '../providers/ThemeProvider';
import { whisperService } from '../services/whisperService';
import { playSessionEndSound, switchToRecordingMode, playClickSound } from '../utils/sound';
import { spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';
import { Hoo } from '../components/Hoo';

interface SessionScreenProps {
  onEndSession: () => void;
}

export function SessionScreen({ onEndSession }: SessionScreenProps) {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const {
    currentSession,
    elapsedSeconds,
    tick,
    endSession,
  } = useSessionStore();

  // Hooのメッセージ
  const [hooMessage, setHooMessage] = useState('ほほう...聞いてるよ');
  // セッション終了処理中フラグ
  const [isEnding, setIsEnding] = useState(false);
  // Hooが喋るフラグ（終了時のバウンス用）
  const [hooSpeaking, setHooSpeaking] = useState(false);
  // 音量レベル（0〜1に正規化）
  const [volumeLevel, setVolumeLevel] = useState(0);

  // 録音インジケーターのアニメーション
  const pulseAnim = useRef(new Animated.Value(1)).current;

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

  // 録音開始 + メータリングコールバック設定
  useEffect(() => {
    // メータリングコールバック設定（dB → 0〜1に正規化）
    // metering: -160（無音）〜 0（最大）dB
    whisperService.setCallbacks({
      onMeteringUpdate: (metering) => {
        // -50dB以下は無視、-50〜0を0〜1に正規化（感度を上げる）
        const normalized = Math.max(0, Math.min(1, (metering + 50) / 50));
        setVolumeLevel(normalized);
      },
    });

    const startRecording = async () => {
      try {
        // 録音モードに切り替え（休憩後などでも確実に録音可能にする）
        await switchToRecordingMode();
        await whisperService.startRecording();
        console.log('[Session] Recording started');
      } catch (error) {
        console.error('[Session] Failed to start recording:', error);
      }
    };

    startRecording();

    return () => {
      // クリーンアップ時に録音停止 & コールバック解除
      whisperService.stopRecording();
      whisperService.setCallbacks({});
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

  // セッション終了
  const handleEnd = async () => {
    if (isEnding) return;
    playClickSound(); // Haptic feedback
    setIsEnding(true);

    // 録音停止 & 音声ファイルパス取得
    await whisperService.stopRecording();
    const audioFilePath = whisperService.getAudioFilePath();

    // Hooが「記録したよ」と言う + バウンスアニメーション
    setHooMessage('記録したよ');
    setHooSpeaking(true);

    // サウンド再生（Hooコンポーネントはmuteなので別途再生）
    playSessionEndSound();

    // 1.5秒後に遷移（アニメーション完了を待つ）
    setTimeout(async () => {
      await endSession(undefined, audioFilePath || undefined);
      onEndSession();
    }, 1500);
  };

  // 動的スタイル
  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    recordingDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.recording,
    },
    recordingLabel: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.semibold,
      color: colors.recording,
      letterSpacing: 1,
    },
    timerDisplay: {
      backgroundColor: colors.backgroundSecondary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.lg,
    },
    timerText: {
      fontSize: fontSize['2xl'],
      fontWeight: fontWeight.bold,
      color: colors.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    endButton: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: borderRadius.xl,
      paddingVertical: spacing.lg + spacing.xs,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    endButtonText: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.medium,
      color: colors.textSecondary,
    },
    infoText: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      textAlign: 'center',
    },
  });

  // 横向きレイアウト（Hooメイン + 下部にUI）
  if (isLandscape) {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        {/* ステータス - 右上に配置 */}
        <View style={styles.landscapeStatusBar}>
          <View style={styles.recordingBadge}>
            <Animated.View
              style={[
                dynamicStyles.recordingDot,
                { transform: [{ scale: pulseAnim }] },
              ]}
            />
            <Text style={dynamicStyles.recordingLabel}>REC</Text>
          </View>
          <View style={dynamicStyles.timerDisplay}>
            <Text style={dynamicStyles.timerText}>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </Text>
          </View>
        </View>

        {/* Hoo - 中央に */}
        <View style={styles.landscapeHooSection}>
          <Hoo
            state="listening"
            customMessage={hooMessage}
            size="medium"
            isSpeaking={hooSpeaking}
            muteSound={true}
            volumeLevel={volumeLevel}
          />
        </View>

        {/* 下部バー - 終了ボタン */}
        <View style={styles.landscapeBottomBar}>
          <TouchableOpacity
            style={[dynamicStyles.endButton, styles.landscapeEndButton, isEnding && styles.endButtonDisabled]}
            onPress={handleEnd}
            disabled={isEnding}
            activeOpacity={0.7}
          >
            <Text style={dynamicStyles.endButtonText}>
              {isEnding ? '終了中...' : '終了'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 縦向きレイアウト（従来）
  return (
    <SafeAreaView style={dynamicStyles.container}>
      {/* ステータスバー - 上部固定 */}
      <View style={styles.statusBar}>
        <View style={styles.recordingBadge}>
          <Animated.View
            style={[
              dynamicStyles.recordingDot,
              { transform: [{ scale: pulseAnim }] },
            ]}
          />
          <Text style={dynamicStyles.recordingLabel}>REC</Text>
        </View>
        <View style={dynamicStyles.timerDisplay}>
          <Text style={dynamicStyles.timerText}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </Text>
        </View>
      </View>

      {/* Hoo - 画面中央の主役（Hooコンポーネント使用で位置統一） */}
      <View style={styles.hooContainer}>
        <Hoo
          state="listening"
          customMessage={hooMessage}
          size="large"
          isSpeaking={hooSpeaking}
          muteSound={true}
          volumeLevel={volumeLevel}
        />
      </View>

      {/* 終了ボタン - 下部固定 */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={[dynamicStyles.endButton, isEnding && styles.endButtonDisabled]}
          onPress={handleEnd}
          disabled={isEnding}
          activeOpacity={0.7}
        >
          <Text style={dynamicStyles.endButtonText}>
            {isEnding ? '終了中...' : 'セッション終了'}
          </Text>
        </TouchableOpacity>
        <Text style={dynamicStyles.infoText}>
          終了後に文字起こしされます
        </Text>
      </View>
    </SafeAreaView>
  );
}

// 静的スタイル（テーマに依存しない）
const styles = StyleSheet.create({
  // HomeScreenと同じ高さに揃える
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    minHeight: 52, // HomeScreenのheaderと同じ高さ
  },
  recordingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
  },
  hooContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSection: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    minHeight: 160, // HomeScreenと揃える
  },
  endButtonDisabled: {
    opacity: 0.5,
  },
  // 横向きレイアウト用（Hooメイン + 下部UI）
  landscapeStatusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  landscapeHooSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  landscapeBottomBar: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  landscapeEndButton: {
    paddingVertical: spacing.md,
  },
});
