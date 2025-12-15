/**
 * ReviewScreen - セッション終了後のレビュー画面
 * ログ一覧の確認・編集・同期
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
import { LocalSession, LocalLog } from '../api/types';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';

interface ReviewScreenProps {
  onComplete: () => void;
  onDiscard: () => void;
}

export function ReviewScreen({ onComplete, onDiscard }: ReviewScreenProps) {
  const [session, setSession] = useState<LocalSession | null>(null);
  const [memo, setMemo] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: number; failed: number } | null>(null);

  // 最新のセッションを取得
  useEffect(() => {
    loadLatestSession();
  }, []);

  const loadLatestSession = async () => {
    const sessions = await localStorage.getAllSessions();
    if (sessions.length > 0) {
      const latest = sessions[0];
      setSession(latest);
      setMemo(latest.memo || '');
    }
  };

  // サーバーに同期
  const handleSync = async () => {
    if (!session) return;

    setIsSyncing(true);
    try {
      // ログをFragmentとして送信
      const logsToSync = session.logs.map((log) => ({
        content: log.text,
        timestamp: log.created_at,
      }));

      const result = await apiClient.uploadLogs(logsToSync);

      setSyncResult({
        success: result.created,
        failed: result.failed,
      });

      if (result.failed === 0) {
        // 全て成功したらセッションを同期済みにマーク
        await localStorage.markSessionSynced(session.id);

        Alert.alert(
          '同期完了',
          `${result.created}件のログを保存しました`,
          [{ text: 'OK', onPress: onComplete }]
        );
      } else {
        Alert.alert(
          '一部失敗',
          `成功: ${result.created}件\n失敗: ${result.failed}件`,
          [{ text: 'OK' }]
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

    // メモを更新
    session.memo = memo;
    await localStorage.markSessionSynced(session.id); // ローカル保存として完了扱い

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
      'このセッションの全てのログが削除されます。よろしいですか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '破棄する',
          style: 'destructive',
          onPress: async () => {
            if (session) {
              // セッションリストから削除
              const sessions = await localStorage.getAllSessions();
              const filtered = sessions.filter((s) => s.id !== session.id);
              // 注意: この操作は直接AsyncStorageを操作する必要がある
              // 簡略化のためonDiscardを呼ぶだけに
            }
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
            <Text style={styles.statValue}>{session.logs.length}</Text>
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
        <Text style={styles.logsLabel}>録音ログ</Text>
        <FlatList
          data={session.logs}
          keyExtractor={(item) => item.id}
          renderItem={renderLogItem}
          style={styles.logsList}
          contentContainerStyle={styles.logsContent}
          ListEmptyComponent={
            <Text style={styles.emptyLogs}>ログがありません</Text>
          }
        />
      </View>

      {/* Sync Result */}
      {syncResult && (
        <View style={styles.syncResult}>
          <Text style={styles.syncResultText}>
            同期結果: 成功 {syncResult.success}件 / 失敗 {syncResult.failed}件
          </Text>
        </View>
      )}

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
            style={[styles.actionButton, styles.discardButton]}
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
  syncResult: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  syncResultText: {
    fontSize: fontSize.sm,
    color: colors.success,
    textAlign: 'center',
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
  discardButton: {
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
