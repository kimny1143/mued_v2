/**
 * ResultScreen
 * Shows game results and score
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Hoo } from '../components/Hoo';
import { Button } from '../components/ui/Button';
import { useGameStore } from '../stores/gameStore';
import { GAMES } from '../types/game';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';

interface ResultScreenProps {
  onPlayAgain: () => void;
  onBackToMenu: () => void;
}

export function ResultScreen({ onPlayAgain, onBackToMenu }: ResultScreenProps) {
  const { currentGame, score, correctAnswers, totalRounds, stats } = useGameStore();

  const game = GAMES.find((g) => g.id === currentGame);
  const accuracy = Math.round((correctAnswers / totalRounds) * 100);
  const isNewBest = currentGame && score > (stats.bestScores[currentGame] - score);

  // Determine Hoo's mood based on score
  const getMoodText = () => {
    if (accuracy >= 80) return 'Outstanding! You have golden ears!';
    if (accuracy >= 60) return 'Great job! Keep practicing!';
    if (accuracy >= 40) return 'Not bad! Room for improvement.';
    return "Don't give up! Practice makes perfect!";
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Hoo with mood */}
        <Hoo variant="icon" size="medium" />

        {/* Result Title */}
        <Text style={styles.title}>Game Complete!</Text>
        <Text style={styles.gameName}>{game?.name}</Text>

        {/* Score Card */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>Score</Text>
            <Text style={styles.scoreValue}>{score}</Text>
          </View>

          {isNewBest && (
            <View style={styles.newBestBadge}>
              <Ionicons name="trophy" size={16} color={colors.primary} />
              <Text style={styles.newBestText}>New Best!</Text>
            </View>
          )}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            <Text style={styles.statValue}>{correctAnswers}</Text>
            <Text style={styles.statLabel}>Correct</Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="close-circle" size={24} color={colors.error} />
            <Text style={styles.statValue}>{totalRounds - correctAnswers}</Text>
            <Text style={styles.statLabel}>Wrong</Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="analytics" size={24} color={colors.primary} />
            <Text style={styles.statValue}>{accuracy}%</Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </View>
        </View>

        {/* Hoo's Message */}
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>{getMoodText()}</Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Play Again"
            onPress={onPlayAgain}
            variant="primary"
            size="lg"
            fullWidth
          />
          <Button
            title="Back to Menu"
            onPress={onBackToMenu}
            variant="outline"
            size="lg"
            fullWidth
            style={styles.secondaryButton}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    color: colors.textLight,
    marginTop: spacing.xl,
  },
  gameName: {
    fontSize: fontSize.lg,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  scoreCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.xl,
    minWidth: 200,
  },
  scoreRow: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scoreValue: {
    fontSize: fontSize['5xl'],
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  newBestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 166, 35, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  newBestText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: spacing.xxl,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.textLight,
    marginTop: spacing.sm,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  messageContainer: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.xxl,
    width: '100%',
  },
  messageText: {
    fontSize: fontSize.base,
    color: colors.textLight,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actions: {
    width: '100%',
    marginTop: spacing.xxl,
  },
  secondaryButton: {
    marginTop: spacing.md,
  },
});
