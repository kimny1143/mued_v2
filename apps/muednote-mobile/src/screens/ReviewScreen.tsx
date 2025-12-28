/**
 * ReviewScreen - セッション終了後のレビュー画面
 * バッチ処理方式：文字起こし → 確認 → 同期
 *
 * 「常にHooが居る」コンセプト:
 * - 文字起こし中は小さなHooが表示
 * - 完了画面でもHooが表示
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { localStorage } from '../cache/storage';
import { apiClient } from '../api/client';
import { whisperService } from '../services/whisperService';
import { LocalSession, LocalLog } from '../api/types';
import { useTheme } from '../providers/ThemeProvider';
import { spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';
import { Hoo } from '../components/Hoo';
import { playClickSound } from '../utils/sound';
import * as Sharing from 'expo-sharing';
import RNFS from 'react-native-fs';

// react-native-fs の型定義が不完全なため拡張
const RNFSExt = RNFS as typeof RNFS & {
  copyFile: (source: string, dest: string) => Promise<void>;
};

interface ReviewScreenProps {
  onComplete: () => void;
  onDiscard: () => void;
}

export function ReviewScreen({ onComplete, onDiscard }: ReviewScreenProps) {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const [sessions, setSessions] = useState<LocalSession[]>([]);
  const [allLogs, setAllLogs] = useState<LocalLog[]>([]);
  const [audioFilePaths, setAudioFilePaths] = useState<string[]>([]);
  const [memo, setMemo] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // 全セッションのログを取得
  useEffect(() => {
    loadAllSessionLogs();
  }, []);

  const loadAllSessionLogs = async () => {
    try {
      // 当日のcompletedセッションを取得
      const allSessions = await localStorage.getAllSessions();
      const today = new Date().toISOString().split('T')[0];

      const todaySessions = allSessions
        .filter((s) => s.status === 'completed' && s.started_at.startsWith(today))
        .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());

      if (todaySessions.length === 0) {
        setIsLoading(false);
        return;
      }

      setSessions(todaySessions);

      // 全セッションのログを結合（セッション順、タイムスタンプ順）
      const combinedLogs: LocalLog[] = [];
      const collectedAudioPaths: string[] = [];
      let sessionOffset = 0;

      for (const session of todaySessions) {
        if (session.audioFilePath) {
          collectedAudioPaths.push(session.audioFilePath);
        }

        if (session.logs && session.logs.length > 0) {
          // 各セッションのログにオフセットを追加して時系列を維持
          session.logs.forEach((log) => {
            combinedLogs.push({
              ...log,
              timestamp_sec: sessionOffset + log.timestamp_sec,
            });
          });
        }
        // 次のセッション用のオフセット（セッションの長さ + 休憩を考慮）
        if (session.ended_at) {
          const start = new Date(session.started_at).getTime();
          const end = new Date(session.ended_at).getTime();
          sessionOffset += Math.floor((end - start) / 1000);
        }
      }

      setAllLogs(combinedLogs);
      setAudioFilePaths(collectedAudioPaths);
      console.log(`[Review] Loaded ${todaySessions.length} sessions, ${combinedLogs.length} total logs, ${collectedAudioPaths.length} audio files`);
    } catch (error: any) {
      console.error('[Review] Load error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // セッションを取得（最新のものを代表として使用）
  const session = sessions.length > 0 ? sessions[sessions.length - 1] : null;

  // 音声ファイルを保存（共有）
  // Caches/AVディレクトリはexpo-sharingでアクセスできないため、Documentsにコピーしてから共有
  const saveAudioFiles = async (): Promise<boolean> => {
    if (audioFilePaths.length === 0) return true;

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('エラー', '共有機能が利用できません');
        return false;
      }

      const tempFiles: string[] = [];

      for (let i = 0; i < audioFilePaths.length; i++) {
        const originalPath = audioFilePaths[i];
        const cleanPath = originalPath.replace('file://', '');
        let filePath = cleanPath;

        // Caches内のファイルはDocumentsにコピーして共有
        if (cleanPath.includes('/Caches/')) {
          const fileName = cleanPath.split('/').pop() || `recording_${i}.m4a`;
          const destPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

          await RNFSExt.copyFile(cleanPath, destPath);
          filePath = destPath;
          tempFiles.push(destPath);
        }

        await Sharing.shareAsync(filePath, {
          mimeType: 'audio/m4a',
          dialogTitle: `MUEDnote 録音 ${i + 1}/${audioFilePaths.length}`,
        });
      }

      // 共有後に一時コピーを削除
      for (const tempFile of tempFiles) {
        try {
          await RNFS.unlink(tempFile);
        } catch {
          // 削除失敗は無視
        }
      }

      return true;
    } catch (error) {
      console.error('[Review] Audio save error:', error);
      return false;
    }
  };

  // 同期完了後の処理
  const finishAfterSync = async (totalLogsSynced: number, savedAudio: boolean) => {
    // 全ての音声ファイルを削除
    await whisperService.deleteAudioFiles(audioFilePaths);

    const audioMessage = savedAudio && audioFilePaths.length > 0
      ? `\n録音ファイル${audioFilePaths.length}件を保存しました`
      : '';

    Alert.alert(
      '同期完了',
      `${sessions.length}件のセッションと${totalLogsSynced}件のログを保存しました${audioMessage}`,
      [{ text: 'OK', onPress: onComplete }]
    );
  };

  // 同期ボタン押下（全セッションをDB同期）
  const handleSync = async () => {
    if (sessions.length === 0) return;
    playClickSound();
    setIsSyncing(true);
    try {
      let totalLogsSynced = 0;

      // 各セッションを順番に同期
      for (const sess of sessions) {
        const start = new Date(sess.started_at);
        const end = sess.ended_at ? new Date(sess.ended_at) : new Date();
        const durationSec = Math.floor((end.getTime() - start.getTime()) / 1000);

        const logsToSync = (sess.logs || []).map((log) => ({
          timestamp_sec: log.timestamp_sec,
          text: log.text,
          confidence: log.confidence,
        }));

        const result = await apiClient.syncSession(
          {
            duration_sec: durationSec,
            started_at: sess.started_at,
            ended_at: sess.ended_at || new Date().toISOString(),
            session_memo: sess.id === session?.id ? memo : sess.memo,
          },
          logsToSync
        );

        await localStorage.markSessionSynced(sess.id);
        totalLogsSynced += result.savedLogs;
      }

      console.log(`[Review] Sync complete: ${sessions.length} sessions, ${totalLogsSynced} logs`);
      setIsSyncing(false);

      // 音声ファイルがある場合は保存確認
      if (audioFilePaths.length > 0) {
        Alert.alert(
          '録音ファイルの保存',
          `${audioFilePaths.length}件の録音ファイルがあります。保存しますか？`,
          [
            {
              text: '保存しない',
              style: 'cancel',
              onPress: () => finishAfterSync(totalLogsSynced, false),
            },
            {
              text: '保存する',
              onPress: async () => {
                const saved = await saveAudioFiles();
                finishAfterSync(totalLogsSynced, saved);
              },
            },
          ]
        );
      } else {
        finishAfterSync(totalLogsSynced, false);
      }
    } catch (error) {
      Alert.alert('エラー', 'サーバーとの通信に失敗しました');
      console.error('[Review] Sync error:', error);
      setIsSyncing(false);
    }
  };

  // ローカル保存完了後の処理
  const finishAfterLocalSave = async (savedAudio: boolean) => {
    // 全ての音声ファイルを削除
    await whisperService.deleteAudioFiles(audioFilePaths);

    const audioMessage = savedAudio && audioFilePaths.length > 0
      ? '\n録音ファイルを保存しました'
      : '';

    Alert.alert(
      '保存完了',
      `ローカルに保存しました。後でWiFi接続時に同期できます。${audioMessage}`,
      [{ text: 'OK', onPress: onComplete }]
    );
  };

  // ローカルのみ保存
  const handleSaveLocal = async () => {
    if (!session) return;
    playClickSound();
    if (memo) {
      await localStorage.updateSessionMemo(session.id, memo);
    }

    // 音声ファイルがある場合は保存確認
    if (audioFilePaths.length > 0) {
      Alert.alert(
        '録音ファイルの保存',
        `${audioFilePaths.length}件の録音ファイルがあります。保存しますか？`,
        [
          {
            text: '保存しない',
            style: 'cancel',
            onPress: () => finishAfterLocalSave(false),
          },
          {
            text: '保存する',
            onPress: async () => {
              const saved = await saveAudioFiles();
              finishAfterLocalSave(saved);
            },
          },
        ]
      );
    } else {
      finishAfterLocalSave(false);
    }
  };

  // 破棄
  const handleDiscard = () => {
    playClickSound();
    const audioCount = audioFilePaths.length;
    Alert.alert(
      'セッションを破棄',
      `${sessions.length}件のセッションと全てのログ${audioCount > 0 ? `、${audioCount}件の録音ファイル` : ''}が削除されます。よろしいですか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '破棄する',
          style: 'destructive',
          onPress: async () => {
            for (const sess of sessions) {
              await localStorage.removeSession(sess.id);
            }
            // 全ての音声ファイルを削除
            await whisperService.deleteAudioFiles(audioFilePaths);
            onDiscard();
          },
        },
      ]
    );
  };

  // タイムスタンプをフォーマット
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // 全セッションの合計時間をフォーマット
  const formatDuration = (): string => {
    if (sessions.length === 0) return '';
    let totalMs = 0;
    for (const sess of sessions) {
      const start = new Date(sess.started_at);
      const end = sess.ended_at ? new Date(sess.ended_at) : new Date();
      totalMs += end.getTime() - start.getTime();
    }
    const mins = Math.floor(totalMs / 60000);
    return `${mins}分`;
  };

  // 動的スタイル
  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingSubtext: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      marginTop: spacing.md,
    },
    errorDetail: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      textAlign: 'center',
      marginBottom: spacing.xl,
    },
    retryButton: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      backgroundColor: colors.primary,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.md,
    },
    retryButtonText: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.medium,
      color: colors.textPrimary,
    },
    statCard: {
      backgroundColor: colors.backgroundSecondary,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
      alignItems: 'center',
      minWidth: 100,
    },
    statValue: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      color: colors.primary,
    },
    statLabel: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    memoInput: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      color: colors.textPrimary,
      fontSize: fontSize.base,
      minHeight: 60,
      textAlignVertical: 'top',
    },
    logsLabel: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    logItem: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    logTime: {
      fontSize: fontSize.sm,
      color: colors.primary,
      fontWeight: fontWeight.medium,
    },
    logIndex: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
    },
    logText: {
      fontSize: fontSize.base,
      color: colors.textPrimary,
      lineHeight: 22,
    },
    emptyLogs: {
      fontSize: fontSize.base,
      color: colors.textMuted,
      textAlign: 'center',
      paddingVertical: spacing.xl,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      paddingVertical: spacing.lg,
      borderRadius: borderRadius.xl,
      alignItems: 'center',
    },
    primaryButtonText: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.semibold,
      color: colors.textPrimary,
    },
    secondaryButton: {
      flex: 1,
      backgroundColor: colors.backgroundSecondary,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryButtonText: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      color: colors.textSecondary,
    },
    dangerButton: {
      flex: 1,
      backgroundColor: 'transparent',
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.error,
    },
    dangerButtonText: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      color: colors.error,
    },
    backButton: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      backgroundColor: colors.primary,
      borderRadius: borderRadius.lg,
    },
    backButtonText: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.medium,
      color: colors.textPrimary,
    },
  });

  // ログアイテムのレンダリング
  const renderLogItem = ({ item, index }: { item: LocalLog; index: number }) => (
    <View style={dynamicStyles.logItem}>
      <View style={styles.logHeader}>
        <Text style={dynamicStyles.logTime}>{formatTime(item.timestamp_sec)}</Text>
        <Text style={dynamicStyles.logIndex}>#{index + 1}</Text>
      </View>
      <Text style={dynamicStyles.logText}>{item.text}</Text>
    </View>
  );

  // ローディング中の表示
  if (isLoading) {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        <View style={styles.loadingContainer}>
          <Hoo state="thinking" customMessage="読み込み中..." size="small" />
          <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />
          <Text style={dynamicStyles.loadingSubtext}>しばらくお待ちください</Text>
        </View>
      </SafeAreaView>
    );
  }

  // セッションなし
  if (!session) {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        <View style={styles.emptyContainer}>
          <Hoo state="empty" size="small" />
          <TouchableOpacity style={dynamicStyles.backButton} onPress={onDiscard}>
            <Text style={dynamicStyles.backButtonText}>戻る</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 横向きレイアウト
  if (isLandscape) {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        <View style={styles.landscapeContainer}>
          {/* 左側: Hoo + 統計 + メモ + アクション */}
          <View style={styles.landscapeLeft}>
            <Hoo state="done" customMessage="記録したよ" size="small" />
            <View style={styles.statsRow}>
              <View style={dynamicStyles.statCard}>
                <Text style={dynamicStyles.statValue}>{formatDuration()}</Text>
                <Text style={dynamicStyles.statLabel}>録音時間</Text>
              </View>
              <View style={dynamicStyles.statCard}>
                <Text style={dynamicStyles.statValue}>{allLogs.length}</Text>
                <Text style={dynamicStyles.statLabel}>ログ数</Text>
              </View>
            </View>
            <TextInput
              style={[dynamicStyles.memoInput, styles.landscapeMemo]}
              value={memo}
              onChangeText={setMemo}
              placeholder="セッションメモを追加..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={2}
            />
            <View style={styles.landscapeActions}>
              <TouchableOpacity
                style={[dynamicStyles.primaryButton, styles.landscapePrimaryButton, isSyncing && styles.buttonDisabled]}
                onPress={handleSync}
                disabled={isSyncing}
                activeOpacity={0.8}
              >
                {isSyncing ? (
                  <ActivityIndicator color={colors.textPrimary} />
                ) : (
                  <Text style={dynamicStyles.primaryButtonText}>同期</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[dynamicStyles.secondaryButton, styles.landscapeSecondaryButton]}
                onPress={handleSaveLocal}
                activeOpacity={0.7}
              >
                <Text style={dynamicStyles.secondaryButtonText}>保存</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[dynamicStyles.dangerButton, styles.landscapeSecondaryButton]}
                onPress={handleDiscard}
                activeOpacity={0.7}
              >
                <Text style={dynamicStyles.dangerButtonText}>破棄</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 右側: ログリスト */}
          <View style={styles.landscapeRight}>
            <Text style={dynamicStyles.logsLabel}>文字起こし結果</Text>
            <FlatList
              data={allLogs}
              keyExtractor={(item) => item.id}
              renderItem={renderLogItem}
              style={styles.landscapeLogsList}
              contentContainerStyle={styles.logsContent}
              showsVerticalScrollIndicator={true}
              ListEmptyComponent={
                <Text style={dynamicStyles.emptyLogs}>音声が検出されませんでした</Text>
              }
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // 縦向きレイアウト（既存）
  return (
    <SafeAreaView style={dynamicStyles.container}>
      {/* Header - Hoo + 統計 */}
      <View style={styles.header}>
        <Hoo state="done" customMessage="記録したよ" size="small" />
        <View style={styles.statsRow}>
          <View style={dynamicStyles.statCard}>
            <Text style={dynamicStyles.statValue}>{formatDuration()}</Text>
            <Text style={dynamicStyles.statLabel}>録音時間</Text>
          </View>
          <View style={dynamicStyles.statCard}>
            <Text style={dynamicStyles.statValue}>{allLogs.length}</Text>
            <Text style={dynamicStyles.statLabel}>ログ数</Text>
          </View>
        </View>
      </View>

      {/* Memo Input */}
      <View style={styles.memoContainer}>
        <TextInput
          style={dynamicStyles.memoInput}
          value={memo}
          onChangeText={setMemo}
          placeholder="セッションメモを追加..."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={2}
        />
      </View>

      {/* Log List */}
      <View style={styles.logsContainer}>
        <Text style={dynamicStyles.logsLabel}>文字起こし結果</Text>
        <FlatList
          data={allLogs}
          keyExtractor={(item) => item.id}
          renderItem={renderLogItem}
          style={styles.logsList}
          contentContainerStyle={styles.logsContent}
          showsVerticalScrollIndicator={true}
          ListEmptyComponent={
            <Text style={dynamicStyles.emptyLogs}>音声が検出されませんでした</Text>
          }
        />
      </View>

      {/* Actions - 固定下部 */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[dynamicStyles.primaryButton, isSyncing && styles.buttonDisabled]}
          onPress={handleSync}
          disabled={isSyncing}
          activeOpacity={0.8}
        >
          {isSyncing ? (
            <ActivityIndicator color={colors.textPrimary} />
          ) : (
            <Text style={dynamicStyles.primaryButtonText}>サーバーに同期</Text>
          )}
        </TouchableOpacity>

        <View style={styles.secondaryActions}>
          <TouchableOpacity
            style={dynamicStyles.secondaryButton}
            onPress={handleSaveLocal}
            activeOpacity={0.7}
          >
            <Text style={dynamicStyles.secondaryButtonText}>ローカル保存</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={dynamicStyles.dangerButton}
            onPress={handleDiscard}
            activeOpacity={0.7}
          >
            <Text style={dynamicStyles.dangerButtonText}>破棄</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// 静的スタイル（テーマに依存しない）
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  memoContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  logsContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  logsList: {
    flex: 1,
  },
  logsContent: {
    paddingBottom: spacing.md,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  actions: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 横向きレイアウト用
  landscapeContainer: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.lg,
  },
  landscapeLeft: {
    width: 280,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  landscapeRight: {
    flex: 1,
  },
  landscapeMemo: {
    width: '100%',
    minHeight: 50,
  },
  landscapeActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  landscapePrimaryButton: {
    flex: 1,
    paddingVertical: spacing.md,
  },
  landscapeSecondaryButton: {
    flex: 0,
    paddingHorizontal: spacing.md,
  },
  landscapeLogsList: {
    flex: 1,
  },
});
