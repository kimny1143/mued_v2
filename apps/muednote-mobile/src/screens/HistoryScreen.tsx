/**
 * HistoryScreen - セッション履歴画面
 *
 * 日付ごとにグループ化して表示
 * 右スワイプでホームに戻る
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../providers/ThemeProvider';
import { apiClient } from '../api/client';
import { MobileSession, MobileLog } from '../api/types';
import { spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';
import { playClickSound } from '../utils/sound';
import { formatTotalTime, formatTimeFromIso, getDateKey } from '../utils/formatTime';

interface HistoryScreenProps {
  onBack: () => void;
}

interface SessionWithLogs extends MobileSession {
  logs?: MobileLog[];
  isExpanded?: boolean;
  isLoadingLogs?: boolean;
}

interface DateGroup {
  date: string;
  displayDate: string;
  sessions: SessionWithLogs[];
  isExpanded: boolean;
  totalDuration: number;
  sessionCount: number;
}

// 日付表示フォーマット（M/D（曜日））
function formatDisplayDate(dateKey: string): string {
  const date = new Date(dateKey);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const weekday = weekdays[date.getDay()];

  // 今日・昨日の判定
  const today = new Date();
  const todayKey = getDateKey(today.toISOString());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getDateKey(yesterday.toISOString());

  if (dateKey === todayKey) return '今日';
  if (dateKey === yesterdayKey) return '昨日';
  return `${month}/${day}（${weekday}）`;
}

export function HistoryScreen({ onBack }: HistoryScreenProps) {
  const { colors } = useTheme();
  const [sessions, setSessions] = useState<SessionWithLogs[]>([]);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 日付ごとにグループ化
  const dateGroups = useMemo((): DateGroup[] => {
    const groups: Map<string, SessionWithLogs[]> = new Map();

    sessions.forEach(session => {
      const dateKey = getDateKey(session.started_at);
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(session);
    });

    // 日付の降順でソート
    const sortedKeys = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));

    return sortedKeys.map(dateKey => {
      const dateSessions = groups.get(dateKey)!;
      const totalDuration = dateSessions.reduce((sum, s) => sum + s.duration_sec, 0);
      return {
        date: dateKey,
        displayDate: formatDisplayDate(dateKey),
        sessions: dateSessions,
        isExpanded: expandedDates.has(dateKey),
        totalDuration,
        sessionCount: dateSessions.length,
      };
    });
  }, [sessions, expandedDates]);

  // セッション一覧取得
  const fetchSessions = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const response = await apiClient.getSessions({ limit: 100 });
      setSessions(response.sessions.map(s => ({ ...s, isExpanded: false })));
    } catch (err) {
      console.error('[History] Failed to fetch sessions:', err);
      setError(err instanceof Error ? err.message : 'セッションの取得に失敗しました');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // 初回ロード
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // プルリフレッシュ
  const handleRefresh = () => {
    fetchSessions(true);
  };

  // 日付グループ展開/折りたたみ
  const toggleDateGroup = (dateKey: string) => {
    playClickSound();
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  };

  // セッション展開/折りたたみ
  const toggleSession = async (sessionId: string) => {
    playClickSound();

    setSessions(prev => prev.map(session => {
      if (session.id !== sessionId) return session;

      if (session.isExpanded) {
        return { ...session, isExpanded: false };
      }

      if (!session.logs) {
        loadSessionLogs(sessionId);
      }
      return { ...session, isExpanded: true };
    }));
  };

  // セッションのログ取得
  const loadSessionLogs = async (sessionId: string) => {
    setSessions(prev => prev.map(s =>
      s.id === sessionId ? { ...s, isLoadingLogs: true } : s
    ));

    try {
      const response = await apiClient.getSessionLogs(sessionId);
      setSessions(prev => prev.map(s =>
        s.id === sessionId
          ? { ...s, logs: response.logs, isLoadingLogs: false }
          : s
      ));
    } catch (err) {
      console.error('[History] Failed to fetch logs:', err);
      setSessions(prev => prev.map(s =>
        s.id === sessionId ? { ...s, isLoadingLogs: false } : s
      ));
    }
  };

  // 戻るボタン
  const handleBack = () => {
    playClickSound();
    onBack();
  };

  // 動的スタイル
  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      minHeight: 52,
    },
    backButton: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: colors.border,
    },
    backText: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      fontWeight: fontWeight.medium,
    },
    title: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.textPrimary,
    },
    placeholder: {
      width: 60,
    },
    scrollContent: {
      padding: spacing.lg,
      paddingBottom: spacing.xxxl,
    },
    // 日付グループ
    dateGroup: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.md,
      overflow: 'hidden',
    },
    dateHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.lg,
    },
    dateInfo: {
      flex: 1,
    },
    dateTitle: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.semibold,
      color: colors.textPrimary,
    },
    dateMeta: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      marginTop: 2,
    },
    dateIcon: {
      padding: spacing.xs,
    },
    // セッションリスト（展開時）
    sessionsContainer: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    sessionItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    sessionItemLast: {
      borderBottomWidth: 0,
    },
    sessionTime: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      width: 50,
    },
    sessionDuration: {
      fontSize: fontSize.sm,
      color: colors.textPrimary,
      flex: 1,
      marginLeft: spacing.md,
    },
    sessionExpandIcon: {
      padding: spacing.xs,
    },
    // ログ表示
    logsContainer: {
      backgroundColor: 'rgba(0, 0, 0, 0.15)',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    logItem: {
      marginBottom: spacing.sm,
    },
    logTime: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      marginBottom: 2,
    },
    logText: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      lineHeight: fontSize.sm * 1.5,
    },
    noLogs: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      fontStyle: 'italic',
    },
    loadingLogs: {
      alignItems: 'center',
      padding: spacing.sm,
    },
    // 共通
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    errorText: {
      fontSize: fontSize.base,
      color: colors.error,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    emptyText: {
      fontSize: fontSize.base,
      color: colors.textMuted,
      textAlign: 'center',
    },
    retryButton: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      backgroundColor: colors.primary,
      borderRadius: borderRadius.md,
    },
    retryText: {
      fontSize: fontSize.sm,
      color: colors.textPrimary,
      fontWeight: fontWeight.medium,
    },
  });

  // ログのタイムスタンプをフォーマット
  const formatLogTime = (timestampSec: number): string => {
    const mins = Math.floor(timestampSec / 60);
    const secs = timestampSec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ローディング
  if (isLoading) {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        <View style={dynamicStyles.header}>
          <TouchableOpacity style={dynamicStyles.backButton} onPress={handleBack} activeOpacity={0.7}>
            <Text style={dynamicStyles.backText}>戻る</Text>
          </TouchableOpacity>
          <Text style={dynamicStyles.title}>履歴</Text>
          <View style={dynamicStyles.placeholder} />
        </View>
        <View style={dynamicStyles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // エラー
  if (error) {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        <View style={dynamicStyles.header}>
          <TouchableOpacity style={dynamicStyles.backButton} onPress={handleBack} activeOpacity={0.7}>
            <Text style={dynamicStyles.backText}>戻る</Text>
          </TouchableOpacity>
          <Text style={dynamicStyles.title}>履歴</Text>
          <View style={dynamicStyles.placeholder} />
        </View>
        <View style={dynamicStyles.centerContainer}>
          <Text style={dynamicStyles.errorText}>{error}</Text>
          <TouchableOpacity
            style={dynamicStyles.retryButton}
            onPress={() => fetchSessions()}
            activeOpacity={0.7}
          >
            <Text style={dynamicStyles.retryText}>再試行</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        <TouchableOpacity style={dynamicStyles.backButton} onPress={handleBack} activeOpacity={0.7}>
          <Text style={dynamicStyles.backText}>戻る</Text>
        </TouchableOpacity>
        <Text style={dynamicStyles.title}>履歴</Text>
        <View style={dynamicStyles.placeholder} />
      </View>

      {dateGroups.length === 0 ? (
        <View style={dynamicStyles.centerContainer}>
          <Text style={dynamicStyles.emptyText}>
            まだセッションがありません
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={dynamicStyles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {dateGroups.map((group) => (
            <View key={group.date} style={dynamicStyles.dateGroup}>
              {/* 日付ヘッダー */}
              <TouchableOpacity
                style={dynamicStyles.dateHeader}
                onPress={() => toggleDateGroup(group.date)}
                activeOpacity={0.7}
              >
                <View style={dynamicStyles.dateInfo}>
                  <Text style={dynamicStyles.dateTitle}>{group.displayDate}</Text>
                  <Text style={dynamicStyles.dateMeta}>
                    {group.sessionCount}回 / {formatTotalTime(group.totalDuration)}
                  </Text>
                </View>
                <View style={dynamicStyles.dateIcon}>
                  <Ionicons
                    name={group.isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </View>
              </TouchableOpacity>

              {/* セッションリスト */}
              {group.isExpanded && (
                <View style={dynamicStyles.sessionsContainer}>
                  {group.sessions.map((session, index) => (
                    <View key={session.id}>
                      <TouchableOpacity
                        style={[
                          dynamicStyles.sessionItem,
                          index === group.sessions.length - 1 && !session.isExpanded && dynamicStyles.sessionItemLast,
                        ]}
                        onPress={() => toggleSession(session.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={dynamicStyles.sessionTime}>
                          {formatTimeFromIso(session.started_at)}
                        </Text>
                        <Text style={dynamicStyles.sessionDuration}>
                          {formatTotalTime(session.duration_sec)}
                        </Text>
                        {(session.log_count ?? 0) > 0 && (
                          <View style={dynamicStyles.sessionExpandIcon}>
                            <Ionicons
                              name={session.isExpanded ? 'chevron-up' : 'chatbubble-outline'}
                              size={16}
                              color={colors.textMuted}
                            />
                          </View>
                        )}
                      </TouchableOpacity>

                      {/* ログ表示 */}
                      {session.isExpanded && (
                        <View style={dynamicStyles.logsContainer}>
                          {session.isLoadingLogs ? (
                            <View style={dynamicStyles.loadingLogs}>
                              <ActivityIndicator size="small" color={colors.primary} />
                            </View>
                          ) : session.logs && session.logs.length > 0 ? (
                            session.logs.map((log) => (
                              <View key={log.id} style={dynamicStyles.logItem}>
                                <Text style={dynamicStyles.logTime}>
                                  {formatLogTime(log.timestamp_sec)}
                                </Text>
                                <Text style={dynamicStyles.logText}>{log.text}</Text>
                              </View>
                            ))
                          ) : (
                            <Text style={dynamicStyles.noLogs}>メモなし</Text>
                          )}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
