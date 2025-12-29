/**
 * BreakScreen - 休憩 & 次セッション準備
 *
 * Endel風コントロールバー形式:
 * - Hooが画面の中心
 * - 下部にグラスモーフィズムのコントロールバー
 *   - 左: 休憩タイマー + 累計時間
 *   - 中: 次モード選択（タップでメニュー）
 *   - 右: 開始/終了ボタン
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  useWindowDimensions,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../providers/ThemeProvider';
import { Hoo } from '../components/Hoo';
import { playHooSound, playClickSound } from '../utils/sound';
import { spacing, fontSize, fontWeight, borderRadius, hooSizes } from '../constants/theme';
import { getFocusMode, FOCUS_MODES, DAILY_LIMITS, type FocusModeId, type FocusMode } from '../types/timer';
import { localStorage } from '../cache/storage';
import { getBreakMessage } from '../constants/hooMessages';
import { whisperService } from '../services/whisperService';
import { encodeToM4A } from '../../modules/audio-encoder';
import RNFS from 'react-native-fs';

// モードアイコンマッピング
const MODE_ICONS: Record<FocusModeId, { family: 'ionicons' | 'feather' | 'material'; name: string }> = {
  pomodoro: { family: 'ionicons', name: 'timer-outline' },
  standard: { family: 'feather', name: 'coffee' },
  deepwork: { family: 'material', name: 'brain' },
  custom: { family: 'ionicons', name: 'options-outline' },
};

function ModeIcon({ modeId, size, color }: { modeId: FocusModeId; size: number; color: string }) {
  const config = MODE_ICONS[modeId];
  switch (config.family) {
    case 'ionicons':
      return <Ionicons name={config.name as any} size={size} color={color} />;
    case 'feather':
      return <Feather name={config.name as any} size={size} color={color} />;
    case 'material':
      return <MaterialCommunityIcons name={config.name as any} size={size} color={color} />;
  }
}

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

  // 次のセッションで使うモード
  const [nextModeId, setNextModeId] = useState<FocusModeId>(mode);
  const [showModeMenu, setShowModeMenu] = useState(false);
  const nextMode = getFocusMode(nextModeId);

  const [remainingSeconds, setRemainingSeconds] = useState(breakDuration);
  const [isBreakOver, setIsBreakOver] = useState(false);
  const [hooSpeaking, setHooSpeaking] = useState(false);
  const [todayTotal, setTodayTotal] = useState(0);
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
      try {
        const sessions = await localStorage.getAllSessions();
        const lastSession = sessions
          .filter((s) => s.status === 'completed' && s.ended_at)
          .sort((a, b) => new Date(b.ended_at!).getTime() - new Date(a.ended_at!).getTime())[0];

        if (!lastSession) {
          setTranscriptionDone(true);
          return;
        }

        if (lastSession.logs && lastSession.logs.length > 0) {
          setTranscriptionDone(true);
          return;
        }

        console.log('[Break] Starting transcription for session:', lastSession.id);
        const result = await whisperService.transcribe();

        if (result && result.text) {
          const segments = result.segments || [{ text: result.text, t0: 0, t1: 0 }];

          for (const segment of segments) {
            await localStorage.addLog(lastSession.id, {
              timestamp_sec: Math.floor((segment.t0 || 0) / 1000),
              text: segment.text.trim(),
              confidence: 0.9,
            });
          }
          console.log('[Break] Transcription saved:', segments.length, 'segments');
        }

        // WAV → M4A 変換
        if (lastSession.audioFilePath && lastSession.audioFilePath.endsWith('.wav')) {
          try {
            const wavPath = lastSession.audioFilePath;
            const m4aPath = wavPath.replace('.wav', '.m4a');

            const encodeResult = await encodeToM4A({
              inputPath: wavPath,
              outputPath: m4aPath,
              bitRate: 128000,
            });

            if (encodeResult.success) {
              await localStorage.updateSessionAudioPath(lastSession.id, m4aPath);
              await RNFS.unlink(wavPath);
            }
          } catch (encodeError) {
            console.error('[Break] M4A conversion error:', encodeError);
          }
        }
      } catch (error) {
        console.error('[Break] Transcription failed:', error);
      } finally {
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
      return `${hours}h${mins}m`;
    }
    return `${mins}m`;
  };

  // Hooのメッセージ（hooMessages.tsから取得）
  const hooMessage = getBreakMessage(
    breakDuration,
    isBreakOver,
    !transcriptionDone,
    isOverDailyLimit
  );

  // モード選択ハンドラ
  const handleModePress = () => {
    playClickSound();
    setShowModeMenu(true);
  };

  const handleModeSelect = (focusMode: FocusMode) => {
    playClickSound();
    setNextModeId(focusMode.id);
    setShowModeMenu(false);
    setHooSpeaking(true);
    setTimeout(() => setHooSpeaking(false), 1000);
  };

  // 次のセッション開始
  const handleStartNext = () => {
    playClickSound();
    onStartNextSession(nextModeId);
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
    // タイマーセクション（左）
    timerSection: {
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      minWidth: 80,
    },
    breakLabel: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
    },
    timerText: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      color: colors.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    totalText: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
    },
    // モード選択セクション（中央）
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
    modeLabel: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
    },
    modeName: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
      color: colors.textPrimary,
    },
    // ボタンセクション（右）
    buttonSection: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    startButton: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    finishButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    // 警告バナー
    warningBanner: {
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      borderRadius: borderRadius.lg,
      padding: spacing.sm,
      marginBottom: spacing.sm,
    },
    warningText: {
      fontSize: fontSize.xs,
      color: colors.warning,
      textAlign: 'center',
    },
    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'flex-end',
    },
    menuContainer: {
      backgroundColor: colors.backgroundSecondary,
      borderTopLeftRadius: borderRadius.xxl,
      borderTopRightRadius: borderRadius.xxl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxxl,
      paddingHorizontal: spacing.lg,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    menuHandle: {
      width: 40,
      height: 4,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: spacing.lg,
    },
    menuTitle: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.textPrimary,
      marginBottom: spacing.lg,
      textAlign: 'center',
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.sm,
      gap: spacing.md,
    },
    menuItemActive: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    menuItemIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuItemText: {
      flex: 1,
    },
    menuItemLabel: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.medium,
      color: colors.textPrimary,
    },
    menuItemDescription: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
    },
    menuItemDuration: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
      color: colors.primary,
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      {/* Hoo - 画面中央の主役 */}
      <View style={styles.hooContainer}>
        <Hoo
          state={isBreakOver ? 'done' : 'thinking'}
          customMessage={hooMessage}
          size={hooSizes.main}
          isSpeaking={hooSpeaking}
          overlayBubble={isLandscape}
        />
      </View>

      {/* コントロールバー - 下部固定 */}
      <View style={styles.controlBarContainer}>
        {/* 4時間警告 */}
        {isOverDailyLimit && (
          <View style={dynamicStyles.warningBanner}>
            <Text style={dynamicStyles.warningText}>
              4時間を超えました。明日に備えて休みましょう
            </Text>
          </View>
        )}

        <View style={dynamicStyles.controlBar}>
          {/* タイマー（左） */}
          <View style={dynamicStyles.timerSection}>
            <Text style={dynamicStyles.breakLabel}>
              {isBreakOver ? '休憩終了' : '休憩中'}
            </Text>
            <Text style={dynamicStyles.timerText}>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </Text>
            <Text style={dynamicStyles.totalText}>
              累計 {formatTotalTime(todayTotal)}
            </Text>
          </View>

          {/* モード選択（中央） */}
          <TouchableOpacity
            style={dynamicStyles.modeSection}
            onPress={handleModePress}
            activeOpacity={0.7}
          >
            <View style={dynamicStyles.modeIcon}>
              <ModeIcon modeId={nextModeId} size={18} color={colors.textPrimary} />
            </View>
            <View style={dynamicStyles.modeTextContainer}>
              <Text style={dynamicStyles.modeLabel}>次のセッション</Text>
              <Text style={dynamicStyles.modeName}>{nextMode?.label}</Text>
            </View>
          </TouchableOpacity>

          {/* ボタン（右） */}
          <View style={dynamicStyles.buttonSection}>
            <TouchableOpacity
              style={[dynamicStyles.finishButton, !transcriptionDone && dynamicStyles.buttonDisabled]}
              onPress={handleFinish}
              disabled={!transcriptionDone}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[dynamicStyles.startButton, !transcriptionDone && dynamicStyles.buttonDisabled]}
              onPress={handleStartNext}
              disabled={!transcriptionDone}
              activeOpacity={0.7}
            >
              <Ionicons name="play" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* モード選択メニュー */}
      <Modal
        visible={showModeMenu}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModeMenu(false)}
      >
        <Pressable
          style={dynamicStyles.modalOverlay}
          onPress={() => setShowModeMenu(false)}
        >
          <View style={dynamicStyles.menuContainer}>
            <View style={dynamicStyles.menuHandle} />
            <Text style={dynamicStyles.menuTitle}>次のモードを選択</Text>
            {FOCUS_MODES.map((focusMode) => {
              const isActive = focusMode.id === nextModeId;
              const duration = Math.floor(focusMode.focusDuration / 60);
              return (
                <TouchableOpacity
                  key={focusMode.id}
                  style={[
                    dynamicStyles.menuItem,
                    isActive && dynamicStyles.menuItemActive,
                  ]}
                  onPress={() => handleModeSelect(focusMode)}
                  activeOpacity={0.7}
                >
                  <View style={dynamicStyles.menuItemIcon}>
                    <ModeIcon modeId={focusMode.id} size={22} color={colors.textPrimary} />
                  </View>
                  <View style={dynamicStyles.menuItemText}>
                    <Text style={dynamicStyles.menuItemLabel}>{focusMode.label}</Text>
                    <Text style={dynamicStyles.menuItemDescription}>{focusMode.description}</Text>
                  </View>
                  {focusMode.id !== 'custom' && (
                    <Text style={dynamicStyles.menuItemDuration}>{duration}m</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
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
