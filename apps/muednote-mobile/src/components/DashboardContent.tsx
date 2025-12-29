/**
 * DashboardContent - 上スワイプで表示されるダッシュボードコンテンツ
 *
 * 研究に基づいた集中・休憩のTipsを表示
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../providers/ThemeProvider';
import { spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';

// 記事データ
const ARTICLES = [
  {
    id: 'pomodoro',
    icon: 'timer-outline',
    title: 'ポモドーロとは？',
    subtitle: '25分集中の科学',
    content: `1980年代にイタリアの大学生フランチェスコ・シリロが考案した時間管理術。

トマト型のキッチンタイマー（イタリア語でPomodoro）を使ったことが名前の由来です。

【基本ルール】
• 25分集中 → 5分休憩を1セット
• 4セット終わったら15〜30分の長い休憩
• タイマーが鳴るまで作業に集中

短い時間なので「まず25分だけ」と始めやすく、先延ばし防止に効果的。細かいタスクや集中力を鍛えたい人におすすめ。`,
    source: 'Francesco Cirillo - The Pomodoro Technique',
    url: 'https://www.todoist.com/productivity-methods/pomodoro-technique',
  },
  {
    id: 'ultradian',
    icon: 'time-outline',
    title: '90分の秘密',
    subtitle: 'ウルトラディアンリズム',
    content: `人間の脳は自然と90〜120分の集中と15〜20分の休憩を繰り返すリズムを持っています。

これは睡眠研究者クレイトマンが発見した「基本的休息活動サイクル」。睡眠中のレム・ノンレムサイクルと同じリズムが、起きている間も続いているんです。

90分サイクルで働いた人は、ランダムな時間で働いた人より40%高い生産性を報告しています。

Deep Workモードはこのウルトラディアンリズムに基づいています。`,
    source: 'Kleitman, N. - Basic Rest-Activity Cycle',
    url: 'https://www.asianefficiency.com/productivity/ultradian-rhythms/',
  },
  {
    id: 'modes',
    icon: 'options-outline',
    title: '3つのモード',
    subtitle: 'あなたに合った時間を',
    content: `【25分 - Pomodoro】
短い集中と休憩を繰り返す。初心者や細かいタスクに最適。先延ばし防止に。

【50分 - Standard】
バランスの取れた標準セッション。DeskTime社が800万人のデータから発見した「最も生産的な人の働き方」に基づく。

【90分 - Deep Work】
ウルトラディアンリズム（人間の自然な集中サイクル）に沿った時間。創作・コーディング・作曲など、深い没入が必要な作業に。`,
    source: 'DeskTime (2014), Cal Newport - Deep Work',
    url: 'https://www.inc.com/jessica-stillman/this-is-the-ideal-number-of-hours-a-day-ac.html',
  },
  {
    id: 'creative',
    icon: 'bulb-outline',
    title: 'クリエイターの集中',
    subtitle: '創作に必要な時間',
    content: `完全に没入するには40〜50分かかると言われています。

コーディング、執筆、作曲などの「フロー状態」が必要な作業には、25分だと短すぎることも。

60〜90分の途切れないセッションが、最良の結果を出すことが研究で示されています。`,
    source: 'Cognitive Research: Principles and Implications (2018)',
    url: 'https://www.getclockwise.com/blog/what-is-focus-time',
  },
  {
    id: 'limit',
    icon: 'battery-half-outline',
    title: '1日4時間の壁',
    subtitle: '集中力には限界がある',
    content: `バイオリニストの練習スケジュール研究から、創造的作業は1日約4時間が上限であることがわかっています。

エリートパフォーマーでさえ、4時間以下のチャンクで練習しています。

4時間を超えたら、明日のために休みましょう。無理をしても効率は下がるだけです。`,
    source: 'K. Anders Ericsson - Deliberate Practice',
    url: 'https://excentration.com/concentration-foundations/optimal-concentration-duration/',
  },
  {
    id: 'break',
    icon: 'cafe-outline',
    title: '休憩の大切さ',
    subtitle: '脳のサインを聞こう',
    content: `集中力が途切れ始めたら、それは怠けではありません。脳が休憩を必要としているサインです。

休憩中は：
• ストレッチや軽い運動
• 水分補給
• 窓の外を眺める
• 深呼吸

これらが次のセッションの集中力を高めます。`,
    source: 'Andrew Huberman - Neurobiological Perspective',
    url: 'https://www.nsdr.co/post/the-ideal-length-of-time-for-focused-work-a-neurobiological-perspective-from-andrew-huberman',
  },
];

interface DashboardContentProps {
  scrollEnabled?: boolean;
}

export function DashboardContent({ scrollEnabled = true }: DashboardContentProps) {
  const { colors } = useTheme();

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxxl,
    },
    header: {
      marginBottom: spacing.xl,
    },
    headerTitle: {
      fontSize: fontSize['2xl'],
      fontWeight: fontWeight.bold,
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    headerSubtitle: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
    },
    card: {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      padding: spacing.lg,
      marginBottom: spacing.md,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
      gap: spacing.md,
    },
    cardIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitleContainer: {
      flex: 1,
    },
    cardTitle: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.semibold,
      color: colors.textPrimary,
    },
    cardSubtitle: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
    },
    cardContent: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      lineHeight: fontSize.sm * 1.6,
    },
    cardSourceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.md,
      gap: spacing.xs,
    },
    cardSource: {
      fontSize: fontSize.xs,
      color: colors.textMuted,
      fontStyle: 'italic',
      flex: 1,
    },
    cardSourceLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    cardSourceLinkText: {
      fontSize: fontSize.xs,
      color: colors.primary,
      textDecorationLine: 'underline',
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <ScrollView
        contentContainerStyle={dynamicStyles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
      >
        {/* ヘッダー */}
        <View style={dynamicStyles.header}>
          <Text style={dynamicStyles.headerTitle}>集中の科学</Text>
          <Text style={dynamicStyles.headerSubtitle}>
            研究に基づいた、より良い集中のためのヒント
          </Text>
        </View>

        {/* 記事カード */}
        {ARTICLES.map((article) => (
          <View key={article.id} style={dynamicStyles.card}>
            <View style={dynamicStyles.cardHeader}>
              <View style={dynamicStyles.cardIcon}>
                <Ionicons
                  name={article.icon as any}
                  size={20}
                  color={colors.textPrimary}
                />
              </View>
              <View style={dynamicStyles.cardTitleContainer}>
                <Text style={dynamicStyles.cardTitle}>{article.title}</Text>
                <Text style={dynamicStyles.cardSubtitle}>{article.subtitle}</Text>
              </View>
            </View>
            <Text style={dynamicStyles.cardContent}>{article.content}</Text>
            <View style={dynamicStyles.cardSourceContainer}>
              <Text style={dynamicStyles.cardSource}>{article.source}</Text>
              <TouchableOpacity
                style={dynamicStyles.cardSourceLink}
                onPress={() => Linking.openURL(article.url)}
                activeOpacity={0.7}
              >
                <Ionicons name="link-outline" size={12} color={colors.primary} />
                <Text style={dynamicStyles.cardSourceLinkText}>詳細</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
