/**
 * BreakScreen - 休憩 & 次セッション準備
 *
 * セッション終了後に自動遷移:
 * - 休憩タイマー自動開始
 * - 次のモード選択（デフォルトは同じモード）
 * - 当日累計時間表示
 * - 4時間警告（強制しない）
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, useWindowDimensions, ScrollView } from 'react-native';
import { Slider } from '@miblanchard/react-native-slider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../providers/ThemeProvider';
import { Hoo } from '../components/Hoo';
import { ModeSelector } from '../components/ModeSelector';
import { playHooSound, playClickSound } from '../utils/sound';
import { spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';
import { getFocusMode, DAILY_LIMITS, CUSTOM_MODE_LIMITS, type FocusModeId, type FocusMode } from '../types/timer';
import { localStorage } from '../cache/storage';
import { whisperService } from '../services/whisperService';
import { encodeToM4A } from '../../modules/audio-encoder';
import RNFS from 'react-native-fs';

interface BreakScreenProps {
  mode: FocusModeId;
  onStartNextSession: (mode: FocusModeId, customDuration?: number) => void;
  onFinish: () => void;
}

export function BreakScreen({
  mode,
  onStartNextSession,
  onFinish,
}: BreakScreenProps) {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const initialMode = getFocusMode(mode);
  const breakDuration = initialMode?.breakDuration || 10 * 60;

  // 次のセッションで使うモード（変更可能）
  const [nextModeId, setNextModeId] = useState<FocusModeId>(mode);
  const [customDuration, setCustomDuration] = useState(45 * 60); // カスタム用
  const nextMode = getFocusMode(nextModeId);

  const [remainingSeconds, setRemainingSeconds] = useState(breakDuration);
  const [isBreakOver, setIsBreakOver] = useState(false);
  const [hooSpeaking, setHooSpeaking] = useState(false);
  const [todayTotal, setTodayTotal] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionDone, setTranscriptionDone] = useState(false);

  // プログレスアニメーション
  const progressAnim = useRef(new Animated.Value(0)).current;

  const isOverDailyLimit = todayTotal >= DAILY_LIMITS.warningThreshold;

  // 当日の累計時間を計算
  useEffect(() => {
    const calculateTodayTotal = async () => {
      const sessions = await localStorage.getAllSessions();
      const today = new Date().toISOString().split('T')[0];

      const totalSeconds = sessions
        .filter((s) => s.started_at.startsWith(today))
        .filter((s) => s.status !== 'active')
        .reduce((acc, s) => {
          if (s.ended_at) {
            const start = new Date(s.started_at).getTime();
            const end = new Date(s.ended_at).getTime();
            return acc + Math.floor((end - start) / 1000);
          }
          return acc;
        }, 0);

      setTodayTotal(totalSeconds);
    };

    calculateTodayTotal();
  }, []);

  // 初回表示時にHooが喋る
  useEffect(() => {
    const greet = async () => {
      setHooSpeaking(true);
      await playHooSound();
      setTimeout(() => setHooSpeaking(false), 1000);
    };
    greet();
  }, []);

  // バックグラウンドで文字起こし実行
  useEffect(() => {
    const transcribeAndSave = async () => {
      setIsTranscribing(true);
      try {
        // 最後に終了したセッションを取得
        const sessions = await localStorage.getAllSessions();
        const lastSession = sessions
          .filter((s) => s.status === 'completed' && s.ended_at)
          .sort((a, b) => new Date(b.ended_at!).getTime() - new Date(a.ended_at!).getTime())[0];

        if (!lastSession) {
          console.warn('[Break] No completed session found for transcription');
          setIsTranscribing(false);
          setTranscriptionDone(true);
          return;
        }

        // 既にログがあればスキップ（再マウント対策）
        if (lastSession.logs && lastSession.logs.length > 0) {
          console.log('[Break] Session already has logs, skipping transcription');
          setIsTranscribing(false);
          setTranscriptionDone(true);
          return;
        }

        console.log('[Break] Starting transcription for session:', lastSession.id);
        const result = await whisperService.transcribe();

        if (result && result.text) {
          // 文字起こし結果をログとして保存
          // segments.t0 は開始時刻 (ms) なので秒に変換
          const segments = result.segments || [{ text: result.text, t0: 0, t1: 0 }];

          for (const segment of segments) {
            await localStorage.addLog(lastSession.id, {
              timestamp_sec: Math.floor((segment.t0 || 0) / 1000), // ms → sec
              text: segment.text.trim(),
              confidence: 0.9,
            });
          }
          console.log('[Break] Transcription saved:', segments.length, 'segments');
        } else {
          console.log('[Break] No transcription result');
        }

        // 文字起こし完了後、WAV → M4A 変換（容量削減）
        if (lastSession.audioFilePath && lastSession.audioFilePath.endsWith('.wav')) {
          try {
            const wavPath = lastSession.audioFilePath;
            const m4aPath = wavPath.replace('.wav', '.m4a');

            console.log('[Break] Converting WAV to M4A...');
            const encodeResult = await encodeToM4A({
              inputPath: wavPath,
              outputPath: m4aPath,
              bitRate: 128000,
            });

            if (encodeResult.success) {
              console.log(
                `[Break] Encoded: ${(encodeResult.inputSizeBytes / 1024 / 1024).toFixed(1)}MB → ${(encodeResult.outputSizeBytes / 1024 / 1024).toFixed(1)}MB`
              );
              // セッションのパスを更新
              await localStorage.updateSessionAudioPath(lastSession.id, m4aPath);
              // 元のWAVを削除
              await RNFS.unlink(wavPath);
              console.log('[Break] WAV deleted, M4A saved');
            } else {
              console.warn('[Break] M4A encode failed:', encodeResult.error);
            }
          } catch (encodeError) {
            console.error('[Break] M4A conversion error:', encodeError);
          }
        }
      } catch (error) {
        console.error('[Break] Transcription failed:', error);
      } finally {
        setIsTranscribing(false);
        setTranscriptionDone(true);
      }
    };

    transcribeAndSave();
  }, []);

  // タイマー
  useEffect(() => {
    if (remainingSeconds <= 0) {
      setIsBreakOver(true);
      playHooSound();
      setHooSpeaking(true);
      setTimeout(() => setHooSpeaking(false), 1000);
      return;
    }

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingSeconds]);

  // プログレスバーアニメーション
  useEffect(() => {
    const progress = 1 - remainingSeconds / breakDuration;
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [remainingSeconds, breakDuration, progressAnim]);

  // 時間フォーマット
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  // 累計時間をフォーマット
  const formatTotalTime = (secs: number): string => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    if (hours > 0) {
      return `${hours}時間${mins}分`;
    }
    return `${mins}分`;
  };

  // Hooのメッセージ
  const getHooMessage = (): string => {
    if (!transcriptionDone) {
      return '録音を処理中...少し待ってね';
    }
    if (isOverDailyLimit) {
      return '今日はそろそろ終わりにしませんか？';
    }
    if (isBreakOver) {
      return 'リフレッシュできた？';
    }
    return 'お疲れさま！ゆっくり休んでね';
  };

  // モード選択ハンドラ
  const handleModeSelect = (focusMode: FocusMode) => {
    if (focusMode.id === nextModeId) return;
    setNextModeId(focusMode.id);
    playClickSound();
    setHooSpeaking(true);
    setTimeout(() => setHooSpeaking(false), 1000);
  };

  // 次のセッション開始
  const handleStartNext = () => {
    playClickSound();
    if (nextModeId === 'custom') {
      onStartNextSession(nextModeId, customDuration);
    } else {
      onStartNextSession(nextModeId);
    }
  };

  // 終了
  const handleFinish = () => {
    playClickSound();
    onFinish();
  };

  // 動的スタイル
  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    breakLabel: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.medium,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    timerDisplay: {
      fontSize: fontSize['5xl'],
      fontWeight: fontWeight.bold,
      color: colors.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    timerDisplayLandscape: {
      fontSize: fontSize['3xl'],
      fontWeight: fontWeight.bold,
      color: colors.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    progressContainer: {
      width: '100%',
      height: 8,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 4,
      marginTop: spacing.xl,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      backgroundColor: colors.success,
      borderRadius: 4,
    },
    todayTotal: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    warningBanner: {
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.warning,
    },
    warningText: {
      fontSize: fontSize.sm,
      color: colors.warning,
      textAlign: 'center',
    },
    sectionLabel: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: borderRadius.xl,
      paddingVertical: spacing.lg,
      alignItems: 'center',
      marginTop: spacing.lg,
    },
    buttonText: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.semibold,
      color: '#ffffff',
    },
    secondaryButton: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: borderRadius.xl,
      paddingVertical: spacing.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: spacing.md,
    },
    secondaryButtonText: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.medium,
      color: colors.textSecondary,
    },
    // Custom slider styles
    sliderContainer: {
      width: '100%',
      paddingHorizontal: spacing.md,
      marginTop: spacing.md,
    },
    sliderLabel: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.semibold,
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    sliderTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.backgroundTertiary,
    },
    sliderThumb: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.primary,
    },
  });

  // 共通コンテンツ: タイマー & アクション
  const timerAndActions = (
    <>
      {/* Timer Section */}
      <View style={isLandscape ? styles.landscapeTimerSection : styles.timerSection}>
        <Text style={dynamicStyles.breakLabel}>
          {isBreakOver ? '休憩終了' : '休憩中'}
        </Text>
        <Text style={isLandscape ? dynamicStyles.timerDisplayLandscape : dynamicStyles.timerDisplay}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </Text>

        {/* Progress Bar */}
        <View style={dynamicStyles.progressContainer}>
          <Animated.View
            style={[
              dynamicStyles.progressBar,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      </View>

      {/* Actions */}
      <View style={isLandscape ? styles.landscapeActionsSection : styles.actionsSection}>
        {/* 累計時間表示 */}
        <Text style={dynamicStyles.todayTotal}>
          今日の累計: {formatTotalTime(todayTotal)}
        </Text>

        {/* 4時間警告 */}
        {isOverDailyLimit && (
          <View style={dynamicStyles.warningBanner}>
            <Text style={dynamicStyles.warningText}>
              4時間を超えました。明日に備えて休みましょう
            </Text>
          </View>
        )}

        {/* 次のモード選択 */}
        <Text style={dynamicStyles.sectionLabel}>次のセッション</Text>
        <ModeSelector
          selectedMode={nextModeId}
          onModeSelect={handleModeSelect}
        />

        {/* Custom Mode Slider */}
        {nextModeId === 'custom' && (
          <View style={dynamicStyles.sliderContainer}>
            <Text style={dynamicStyles.sliderLabel}>
              {Math.floor(customDuration / 60)}分
            </Text>
            <Slider
              value={customDuration}
              minimumValue={CUSTOM_MODE_LIMITS.minFocusDuration}
              maximumValue={CUSTOM_MODE_LIMITS.maxFocusDuration}
              step={CUSTOM_MODE_LIMITS.step}
              onValueChange={(value) => setCustomDuration(Array.isArray(value) ? value[0] : value)}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.backgroundTertiary}
              thumbTintColor={colors.primary}
              trackStyle={dynamicStyles.sliderTrack}
              thumbStyle={dynamicStyles.sliderThumb}
            />
          </View>
        )}

        {/* ボタン行（横向きでは横並び） */}
        <View style={isLandscape ? styles.landscapeButtonRow : undefined}>
          {/* 開始ボタン */}
          <TouchableOpacity
            style={[
              dynamicStyles.button,
              isLandscape && styles.landscapeButtonFlex,
              !transcriptionDone && styles.buttonDisabled,
            ]}
            onPress={handleStartNext}
            disabled={!transcriptionDone}
            activeOpacity={0.8}
          >
            <Text style={dynamicStyles.buttonText}>
              {transcriptionDone ? `${nextMode?.label}で開始` : '処理中...'}
            </Text>
          </TouchableOpacity>

          {/* 終了ボタン */}
          <TouchableOpacity
            style={[
              dynamicStyles.secondaryButton,
              isLandscape && styles.landscapeButtonFlex,
              !transcriptionDone && styles.buttonDisabled,
            ]}
            onPress={handleFinish}
            disabled={!transcriptionDone}
            activeOpacity={0.7}
          >
            <Text style={dynamicStyles.secondaryButtonText}>
              {transcriptionDone ? '終了する' : '処理中...'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  // 横向きレイアウト（Hooメイン + 下部にUI）
  if (isLandscape) {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        {/* Hoo - 中央に大きく */}
        <View style={styles.landscapeHooSection}>
          <Hoo
            state={isBreakOver ? 'done' : 'thinking'}
            customMessage={getHooMessage()}
            size="medium"
            isSpeaking={hooSpeaking}
          />
        </View>

        {/* 下部バー - タイマー + モード選択 + ボタン */}
        <View style={styles.landscapeBottomBar}>
          {/* 左: タイマー */}
          <View style={styles.landscapeTimerBox}>
            <Text style={dynamicStyles.breakLabel}>
              {isBreakOver ? '休憩終了' : '休憩中'}
            </Text>
            <Text style={dynamicStyles.timerDisplayLandscape}>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </Text>
            <Text style={[dynamicStyles.todayTotal, { marginBottom: 0, marginTop: spacing.xs }]}>
              累計: {formatTotalTime(todayTotal)}
            </Text>
          </View>

          {/* 中央: モード選択 */}
          <View style={styles.landscapeModeBox}>
            <ModeSelector
              selectedMode={nextModeId}
              onModeSelect={handleModeSelect}
            />
          </View>

          {/* 右: ボタン */}
          <View style={styles.landscapeButtonBox}>
            <TouchableOpacity
              style={[dynamicStyles.button, styles.landscapeCompactButton, !transcriptionDone && styles.buttonDisabled]}
              onPress={handleStartNext}
              disabled={!transcriptionDone}
              activeOpacity={0.8}
            >
              <Text style={dynamicStyles.buttonText}>
                {transcriptionDone ? '開始' : '処理中'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[dynamicStyles.secondaryButton, styles.landscapeCompactButton, !transcriptionDone && styles.buttonDisabled]}
              onPress={handleFinish}
              disabled={!transcriptionDone}
              activeOpacity={0.7}
            >
              <Text style={dynamicStyles.secondaryButtonText}>終了</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // 縦向きレイアウト（従来）
  return (
    <SafeAreaView style={dynamicStyles.container}>
      {/* Hoo Section */}
      <View style={styles.hooSection}>
        <Hoo
          state={isBreakOver ? 'done' : 'thinking'}
          customMessage={getHooMessage()}
          size="medium"
          isSpeaking={hooSpeaking}
        />
      </View>

      {timerAndActions}
    </SafeAreaView>
  );
}

// 静的スタイル
const styles = StyleSheet.create({
  hooSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  timerSection: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  actionsSection: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  // 横向きレイアウト用（Hooメイン + 下部UI）
  landscapeHooSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  landscapeBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  landscapeTimerBox: {
    alignItems: 'center',
    minWidth: 100,
  },
  landscapeModeBox: {
    flex: 1,
  },
  landscapeButtonBox: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  landscapeCompactButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: 0,
  },
  // 縦向き用（残す）
  landscapeTimerSection: {
    alignItems: 'center',
    paddingBottom: spacing.md,
  },
  landscapeActionsSection: {
    paddingBottom: spacing.md,
  },
  landscapeButtonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  landscapeButtonFlex: {
    flex: 1,
    marginTop: 0,
  },
});
