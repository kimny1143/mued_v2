/**
 * ReviewScreen - セッション終了後のレビュー画面
 *
 * Endel風コントロールバー形式:
 * - 上部: Hoo（小さめ）+ 統計カード
 * - 中央: ログリスト（スクロール可能）
 * - 下部: グラスモーフィズムのコントロールバー
 *   - 左: メモ入力
 *   - 右: 同期/保存/破棄ボタン
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { localStorage } from '../cache/storage';
import { apiClient } from '../api/client';
import { whisperService } from '../services/whisperService';
import { LocalSession, LocalLog } from '../api/types';
import { useTheme } from '../providers/ThemeProvider';
import { spacing, fontSize, fontWeight, borderRadius, hooSizes } from '../constants/theme';
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

      const combinedLogs: LocalLog[] = [];
      const collectedAudioPaths: string[] = [];
      let sessionOffset = 0;

      for (const session of todaySessions) {
        if (session.audioFilePath) {
          collectedAudioPaths.push(session.audioFilePath);
        }

        if (session.logs && session.logs.length > 0) {
          session.logs.forEach((log) => {
            combinedLogs.push({
              ...log,
              timestamp_sec: sessionOffset + log.timestamp_sec,
            });
          });
        }
        if (session.ended_at) {
          const start = new Date(session.started_at).getTime();
          const end = new Date(session.ended_at).getTime();
          sessionOffset += Math.floor((end - start) / 1000);
        }
      }

      setAllLogs(combinedLogs);
      setAudioFilePaths(collectedAudioPaths);
    } catch (error: any) {
      console.error('[Review] Load error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const session = sessions.length > 0 ? sessions[sessions.length - 1] : null;

  // 音声ファイルを保存（共有）
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

  const finishAfterSync = async (totalLogsSynced: number, savedAudio: boolean) => {
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

  const handleSync = async () => {
    if (sessions.length === 0) return;
    playClickSound();
    setIsSyncing(true);
    try {
      let totalLogsSynced = 0;

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

      setIsSyncing(false);

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

  const finishAfterLocalSave = async (savedAudio: boolean) => {
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

  const handleSaveLocal = async () => {
    if (!session) return;
    playClickSound();
    if (memo) {
      await localStorage.updateSessionMemo(session.id, memo);
    }

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
            await whisperService.deleteAudioFiles(audioFilePaths);
            onDiscard();
          },
        },
      ]
    );
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const formatDuration = (): string => {
    if (sessions.length === 0) return '0m';
    let totalMs = 0;
    for (const sess of sessions) {
      const start = new Date(sess.started_at);
      const end = sess.ended_at ? new Date(sess.ended_at) : new Date();
      totalMs += end.getTime() - start.getTime();
    }
    const mins = Math.floor(totalMs / 60000);
    return `${mins}m`;
  };

  // 動的スタイル
  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    // ヘッダー（Hoo + 統計）
    headerSection: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      gap: spacing.md,
    },
    statsRow: {
      flex: 1,
      flexDirection: 'row',
      gap: spacing.sm,
    },
    statCard: {
      flex: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.lg,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    statValue: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.primary,
    },
    statLabel: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
    },
    // ログリスト
    logsContainer: {
      flex: 1,
      paddingHorizontal: spacing.lg,
    },
    logsLabel: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      marginBottom: spacing.sm,
    },
    logItem: {
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      borderRadius: borderRadius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    logTime: {
      fontSize: fontSize.xs,
      color: colors.primary,
      fontWeight: fontWeight.medium,
    },
    logText: {
      fontSize: fontSize.sm,
      color: colors.textPrimary,
      lineHeight: 20,
      marginTop: spacing.xs,
    },
    emptyLogs: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      textAlign: 'center',
      paddingVertical: spacing.xl,
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
    // メモ入力
    memoInput: {
      flex: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      color: colors.textPrimary,
      fontSize: fontSize.sm,
      maxHeight: 60,
    },
    // ボタンセクション
    buttonSection: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    syncButton: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    discardButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(239, 68, 68, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    // ローディング/エンプティ
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    backButton: {
      marginTop: spacing.lg,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: borderRadius.xxl,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    backButtonText: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.medium,
      color: colors.textPrimary,
    },
  });

  // ログアイテムのレンダリング
  const renderLogItem = ({ item }: { item: LocalLog }) => (
    <View style={dynamicStyles.logItem}>
      <Text style={dynamicStyles.logTime}>{formatTime(item.timestamp_sec)}</Text>
      <Text style={dynamicStyles.logText}>{item.text}</Text>
    </View>
  );

  // ローディング中
  if (isLoading) {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        <View style={dynamicStyles.centerContainer}>
          <Hoo state="thinking" customMessage="読み込み中..." size={hooSizes.compact} />
          <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: spacing.md }} />
        </View>
      </SafeAreaView>
    );
  }

  // セッションなし
  if (!session) {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        <View style={dynamicStyles.centerContainer}>
          <Hoo state="empty" size={hooSizes.compact} />
          <TouchableOpacity style={dynamicStyles.backButton} onPress={onDiscard}>
            <Text style={dynamicStyles.backButtonText}>戻る</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={dynamicStyles.container}>
      {/* ヘッダー（Hoo + 統計） */}
      <View style={dynamicStyles.headerSection}>
        <Hoo state="done" customMessage="記録したよ" size={hooSizes.compact} hideBubble />
        <View style={dynamicStyles.statsRow}>
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

      {/* ログリスト */}
      <View style={dynamicStyles.logsContainer}>
        <Text style={dynamicStyles.logsLabel}>文字起こし結果</Text>
        <FlatList
          data={allLogs}
          keyExtractor={(item) => item.id}
          renderItem={renderLogItem}
          showsVerticalScrollIndicator={true}
          ListEmptyComponent={
            <Text style={dynamicStyles.emptyLogs}>音声が検出されませんでした</Text>
          }
        />
      </View>

      {/* コントロールバー - 下部固定 */}
      <View style={styles.controlBarContainer}>
        <View style={dynamicStyles.controlBar}>
          {/* メモ入力 */}
          <TextInput
            style={dynamicStyles.memoInput}
            value={memo}
            onChangeText={setMemo}
            placeholder="メモを追加..."
            placeholderTextColor={colors.textMuted}
            multiline
          />

          {/* ボタン */}
          <View style={dynamicStyles.buttonSection}>
            <TouchableOpacity
              style={dynamicStyles.discardButton}
              onPress={handleDiscard}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            </TouchableOpacity>
            <TouchableOpacity
              style={dynamicStyles.saveButton}
              onPress={handleSaveLocal}
              activeOpacity={0.7}
            >
              <Ionicons name="download-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[dynamicStyles.syncButton, isSyncing && dynamicStyles.buttonDisabled]}
              onPress={handleSync}
              disabled={isSyncing}
              activeOpacity={0.7}
            >
              {isSyncing ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Ionicons name="cloud-upload-outline" size={24} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

// 静的スタイル
const styles = StyleSheet.create({
  controlBarContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
});
