/**
 * SessionScreen - 録音中のHoo中心UI
 *
 * Endel風コントロールバー形式:
 * - Hooが画面の中心
 * - 下部にグラスモーフィズムのコントロールバー
 *   - 左: モード情報（アイコン + 名前 + 説明）
 *   - 中: タイマー表示
 *   - 右: 終了ボタン
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
import { Ionicons } from '@expo/vector-icons';
import { useSessionStore } from '../stores/sessionStore';
import { useTheme } from '../providers/ThemeProvider';
import { whisperService } from '../services/whisperService';
import { playSessionEndSound, switchToRecordingMode, playClickSound } from '../utils/sound';
import { spacing, fontSize, fontWeight, borderRadius, hooSizes } from '../constants/theme';
import { Hoo } from '../components/Hoo';
import { ModeIcon } from '../components/ModeIcon';
import { getFocusMode, FOCUS_MODES } from '../types/timer';

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

  // 現在のモード情報
  const currentModeId = currentSession?.mode || 'standard';
  const currentMode = getFocusMode(currentModeId) || FOCUS_MODES[1];

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
    whisperService.setCallbacks({
      onMeteringUpdate: (metering) => {
        const normalized = Math.max(0, Math.min(1, (metering + 50) / 50));
        setVolumeLevel(normalized);
      },
    });

    const startRecording = async () => {
      try {
        await switchToRecordingMode();
        await whisperService.startRecording();
        console.log('[Session] Recording started');
      } catch (error) {
        console.error('[Session] Failed to start recording:', error);
      }
    };

    startRecording();

    return () => {
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
    playClickSound();
    setIsEnding(true);

    await whisperService.stopRecording();
    const audioFilePath = whisperService.getAudioFilePath();

    setHooMessage('記録したよ');
    setHooSpeaking(true);
    playSessionEndSound();

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
    // グラスモーフィズムコントロールバー
    controlBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: borderRadius.xxl,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      padding: spacing.sm,
      gap: spacing.sm,
    },
    // モード情報セクション
    modeSection: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      gap: spacing.md,
    },
    modeIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modeTextContainer: {
      flex: 1,
    },
    modeName: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
      color: colors.textPrimary,
    },
    modeDescription: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
    },
    // タイマーセクション
    timerSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    recordingDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.recording,
    },
    timerText: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    // 終了ボタン
    endButton: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.recording,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    endButtonDisabled: {
      backgroundColor: colors.textMuted,
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      {/* Hoo - 画面中央の主役 */}
      <View style={styles.hooContainer}>
        <Hoo
          state="listening"
          customMessage={hooMessage}
          size={hooSizes.main}
          isSpeaking={hooSpeaking}
          muteSound={true}
          volumeLevel={volumeLevel}
          overlayBubble={isLandscape}
        />
      </View>

      {/* コントロールバー - 下部固定 */}
      <View style={styles.controlBarContainer}>
        <View style={dynamicStyles.controlBar}>
          {/* モード情報 */}
          <View style={dynamicStyles.modeSection}>
            <View style={dynamicStyles.modeIcon}>
              <ModeIcon modeId={currentModeId} size={18} color={colors.textPrimary} />
            </View>
            <View style={dynamicStyles.modeTextContainer}>
              <Text style={dynamicStyles.modeName}>{currentMode.label}</Text>
              <Text style={dynamicStyles.modeDescription} numberOfLines={1}>
                {currentMode.description}
              </Text>
            </View>
          </View>

          {/* タイマー */}
          <View style={dynamicStyles.timerSection}>
            <Animated.View
              style={[
                dynamicStyles.recordingDot,
                { transform: [{ scale: pulseAnim }] },
              ]}
            />
            <Text style={dynamicStyles.timerText}>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </Text>
          </View>

          {/* 終了ボタン */}
          <TouchableOpacity
            style={[
              dynamicStyles.endButton,
              isEnding && dynamicStyles.endButtonDisabled,
            ]}
            onPress={handleEnd}
            disabled={isEnding}
            activeOpacity={0.7}
          >
            <Ionicons name="stop" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// 静的スタイル
const styles = StyleSheet.create({
  hooContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBarContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
});
