/**
 * ReviewScreen - セッション終了後のレビュー画面
 * バッチ処理方式：文字起こし → 確認 → 同期
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
import { localStorage } from '../cache/storage';
import { apiClient } from '../api/client';
import { whisperService } from '../services/whisperService';
import { LocalSession, LocalLog } from '../api/types';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';

interface ReviewScreenProps {
  onComplete: () => void;
  onDiscard: () => void;
}

export function ReviewScreen({ onComplete, onDiscard }: ReviewScreenProps) {
  const [session, setSession] = useState<LocalSession | null>(null);
  const [logs, setLogs] = useState<LocalLog[]>([]);
  const [memo, setMemo] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);

  // 最新のセッションを取得 & 文字起こし実行
  useEffect(() => {
    loadSessionAndTranscribe();
  }, []);

  const loadSessionAndTranscribe = async () => {
    try {
      // セッション取得
      const sessions = await localStorage.getAllSessions();
      if (sessions.length === 0) {
        setIsTranscribing(false);
        return;
      }

      const latest = sessions[0];
      setSession(latest);
      setMemo(latest.memo || '');

      // 文字起こし実行
      console.log('[Review] Starting transcription...');
      const result = await whisperService.transcribe();

      if (result && result.text) {
        // セグメントからログを生成（重複除去付き）
        const generatedLogs: LocalLog[] = [];
        const seenTexts = new Set<string>();

        if (result.segments && result.segments.length > 0) {
          // セグメントがある場合は個別にログを作成
          // 重複テキストは最初の出現のみ保持
          result.segments.forEach((segment, index) => {
            const text = segment.text.trim();
            if (text && !seenTexts.has(text)) {
              seenTexts.add(text);
              generatedLogs.push({
                id: `log_${Date.now()}_${index}`,
                timestamp_sec: Math.floor(segment.t0 / 1000), // ms to sec
                text,
                created_at: new Date().toISOString(),
              });
            }
          });
        } else {
          // セグメントがない場合は全体を1つのログとして保存
          generatedLogs.push({
            id: `log_${Date.now()}_0`,
            timestamp_sec: 0,
            text: result.text,
            created_at: new Date().toISOString(),
          });
        }

        console.log(`[Review] Deduplication: ${result.segments?.length || 1} segments -> ${generatedLogs.length} unique logs`);

        // ローカルストレージに保存
        for (const log of generatedLogs) {
          await localStorage.addLog(latest.id, {
            timestamp_sec: log.timestamp_sec,
            text: log.text,
          });
        }

        // ログを設定
        setLogs(generatedLogs);
        console.log(`[Review] Transcription complete: ${generatedLogs.length} logs`);
      } else {
        console.log('[Review] No transcription result');
        setLogs([]);
      }
    } catch (error: any) {
      console.error('[Review] Transcription error:', error);
      setTranscriptionError(error.message || '文字起こしに失敗しました');
    } finally {
      setIsTranscribing(false);
    }
  };

  // 同期ボタン押下（DB同期 → 音声保存の順序）
  const handleSync = async () => {
    if (!session) return;

    // 先にDB同期を実行
    setIsSyncing(true);
    try {
      // セッション時間を計算
      const start = new Date(session.started_at);
      const end = session.ended_at ? new Date(session.ended_at) : new Date();
      const durationSec = Math.floor((end.getTime() - start.getTime()) / 1000);

      // ログをサーバー形式に変換
      const logsToSync = logs.map((log) => ({
        timestamp_sec: log.timestamp_sec,
        text: log.text,
        confidence: log.confidence,
      }));

      // セッションとログを一括同期
      const result = await apiClient.syncSession(
        {
          duration_sec: durationSec,
          started_at: session.started_at,
          ended_at: session.ended_at || new Date().toISOString(),
          session_memo: memo || undefined,
        },
        logsToSync
      );

      // 同期済みにマーク
      await localStorage.markSessionSynced(session.id);
      console.log(`[Review] Sync complete: ${result.savedLogs} logs saved`);

      // 音声ファイルが存在する場合、保存するか確認
      const audioPath = whisperService.getAudioFilePath();
      if (audioPath) {
        Alert.alert(
          '同期完了 - 音声を保存しますか？',
          `${result.savedLogs}件のログを保存しました。録音した音声も保存できます。`,
          [
            {
              text: '保存しない',
              style: 'cancel',
              onPress: async () => {
                await whisperService.deleteAudioFile();
                onComplete();
              },
            },
            {
              text: '保存する',
              onPress: async () => {
                const shared = await whisperService.shareAudioFile();
                if (shared) {
                  console.log('[Review] Audio shared');
                }
                await whisperService.deleteAudioFile();
                onComplete();
              },
            },
          ]
        );
      } else {
        Alert.alert(
          '同期完了',
          `セッションと${result.savedLogs}件のログを保存しました`,
          [{ text: 'OK', onPress: onComplete }]
        );
      }
    } catch (error) {
      Alert.alert('エラー', 'サーバーとの通信に失敗しました');
      console.error('[Review] Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // ローカルのみ保存
  const handleSaveLocal = async () => {
    if (!session) return;

    if (memo) {
      await localStorage.updateSessionMemo(session.id, memo);
    }

    // 音声ファイルを削除
    await whisperService.deleteAudioFile();

    Alert.alert(
      '保存完了',
      'ローカルに保存しました。後でWiFi接続時に同期できます。',
      [{ text: 'OK', onPress: onComplete }]
    );
  };

  // 破棄
  const handleDiscard = () => {
    Alert.alert(
      'セッションを破棄',
      'このセッションの全てのログと録音ファイルが削除されます。よろしいですか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '破棄する',
          style: 'destructive',
          onPress: async () => {
            if (session) {
              await localStorage.removeSession(session.id);
            }
            await whisperService.deleteAudioFile();
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

  // セッション時間をフォーマット
  const formatDuration = (): string => {
    if (!session) return '';
    const start = new Date(session.started_at);
    const end = session.ended_at ? new Date(session.ended_at) : new Date();
    const durationMs = end.getTime() - start.getTime();
    const mins = Math.floor(durationMs / 60000);
    return `${mins}分`;
  };

  // ログアイテムのレンダリング
  const renderLogItem = ({ item, index }: { item: LocalLog; index: number }) => (
    <View style={styles.logItem}>
      <View style={styles.logHeader}>
        <Text style={styles.logTime}>{formatTime(item.timestamp_sec)}</Text>
        <Text style={styles.logIndex}>#{index + 1}</Text>
      </View>
      <Text style={styles.logText}>{item.text}</Text>
    </View>
  );

  // 文字起こし中の表示
  if (isTranscribing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>文字起こし中...</Text>
          <Text style={styles.loadingSubtext}>しばらくお待ちください</Text>
        </View>
      </SafeAreaView>
    );
  }

  // エラー表示
  if (transcriptionError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>文字起こしエラー</Text>
          <Text style={styles.errorDetail}>{transcriptionError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadSessionAndTranscribe}>
            <Text style={styles.retryButtonText}>再試行</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.discardButtonStyle} onPress={handleDiscard}>
            <Text style={styles.discardButtonText}>破棄する</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // セッションなし
  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>セッションが見つかりません</Text>
          <TouchableOpacity style={styles.backButton} onPress={onDiscard}>
            <Text style={styles.backButtonText}>戻る</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>セッション完了</Text>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatDuration()}</Text>
            <Text style={styles.statLabel}>録音時間</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{logs.length}</Text>
            <Text style={styles.statLabel}>ログ数</Text>
          </View>
        </View>
      </View>

      {/* Memo Input */}
      <View style={styles.memoContainer}>
        <Text style={styles.memoLabel}>メモ（任意）</Text>
        <TextInput
          style={styles.memoInput}
          value={memo}
          onChangeText={setMemo}
          placeholder="セッションについてのメモ..."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={2}
        />
      </View>

      {/* Log List */}
      <View style={styles.logsContainer}>
        <Text style={styles.logsLabel}>文字起こし結果</Text>
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={renderLogItem}
          style={styles.logsList}
          contentContainerStyle={styles.logsContent}
          ListEmptyComponent={
            <Text style={styles.emptyLogs}>音声が検出されませんでした</Text>
          }
        />
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.syncButton]}
          onPress={handleSync}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <ActivityIndicator color={colors.textPrimary} />
          ) : (
            <Text style={styles.actionButtonText}>サーバーに同期</Text>
          )}
        </TouchableOpacity>

        <View style={styles.secondaryActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.saveButton]}
            onPress={handleSaveLocal}
          >
            <Text style={styles.saveButtonText}>ローカル保存</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.discardButtonStyle]}
            onPress={handleDiscard}
          >
            <Text style={styles.discardButtonText}>破棄</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    marginTop: spacing.lg,
  },
  loadingSubtext: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.error,
    marginBottom: spacing.sm,
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
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  stat: {
    alignItems: 'center',
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
  memoContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  memoLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
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
  logsContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  logsLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  logsList: {
    flex: 1,
  },
  logsContent: {
    paddingBottom: spacing.md,
  },
  logItem: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
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
  actions: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  actionButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  syncButton: {
    backgroundColor: colors.primary,
  },
  actionButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  discardButtonStyle: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.error,
  },
  discardButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.error,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
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
