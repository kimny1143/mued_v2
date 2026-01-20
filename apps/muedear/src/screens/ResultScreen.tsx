/**
 * ResultScreen
 * Shows game results and score
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  useWindowDimensions,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Hoo } from '../components/Hoo';
import { Button } from '../components/ui/Button';
import { AdModal } from '../components/AdModal';
import { useGameStore } from '../stores/gameStore';
import { GAMES, AD_CONFIG } from '../types/game';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';

interface ResultScreenProps {
  onPlayAgain: () => void;
  onBackToMenu: () => void;
}

export function ResultScreen({ onPlayAgain, onBackToMenu }: ResultScreenProps) {
  const {
    currentGame,
    score,
    correctAnswers,
    totalRounds,
    stats,
    getRemainingPlays,
    canWatchAd,
  } = useGameStore();

  const [showAdModal, setShowAdModal] = useState(false);

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const game = GAMES.find((g) => g.id === currentGame);
  const accuracy = Math.round((correctAnswers / totalRounds) * 100);
  const isNewBest = currentGame && score > (stats.bestScores[currentGame] - score);

  const remainingPlays = getRemainingPlays();
  const hasPlaysLeft = remainingPlays > 0;
  const canGetMorePlays = canWatchAd();

  // Handle play again - check if plays available
  const handlePlayAgain = () => {
    if (hasPlaysLeft) {
      onPlayAgain();
    } else {
      setShowAdModal(true);
    }
  };

  // Handle after watching ad
  const handleAdWatched = () => {
    // Plays will be added by recordAdWatch in AdModal
    // Just close the modal and let user choose to play again
  };

  // Determine Hoo's mood based on score
  const getMoodText = () => {
    if (accuracy >= 80) return 'Outstanding! You have golden ears!';
    if (accuracy >= 60) return 'Great job! Keep practicing!';
    if (accuracy >= 40) return 'Not bad! Room for improvement.';
    return "Don't give up! Practice makes perfect!";
  };

  // ============ LANDSCAPE: MINIMAL UI ============
  if (isLandscape) {
    return (
      <SafeAreaView style={styles.landscapeContainer}>
        {/* Center content: Score */}
        <View style={styles.landscapeContent}>
          <Text style={styles.landscapeScoreLabel}>SCORE</Text>
          <Text style={styles.landscapeScoreValue}>{score}</Text>
          {isNewBest && (
            <View style={styles.landscapeNewBest}>
              <Ionicons name="trophy" size={20} color={colors.primary} />
              <Text style={styles.landscapeNewBestText}>New Best!</Text>
            </View>
          )}
          <Text style={styles.landscapeHint}>Rotate to portrait for details</Text>
        </View>

        {/* Back to Menu button */}
        <TouchableOpacity
          style={styles.landscapeBackButton}
          onPress={onBackToMenu}
        >
          <Ionicons name="home" size={24} color={colors.textDark} />
          <Text style={styles.landscapeBackText}>Menu</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ============ PORTRAIT: FULL DETAILS ============
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

        {/* Remaining Plays Info */}
        <View style={styles.playsInfoContainer}>
          <Ionicons
            name={hasPlaysLeft ? 'game-controller' : 'alert-circle'}
            size={16}
            color={hasPlaysLeft ? colors.textMuted : colors.warning}
          />
          <Text style={[styles.playsInfoText, !hasPlaysLeft && styles.playsInfoWarning]}>
            {hasPlaysLeft
              ? `${remainingPlays} play${remainingPlays !== 1 ? 's' : ''} remaining today`
              : 'No plays remaining today'}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {hasPlaysLeft ? (
            <Button
              title="Play Again"
              onPress={handlePlayAgain}
              variant="primary"
              size="lg"
              fullWidth
            />
          ) : canGetMorePlays ? (
            <Button
              title={`Watch Ad for +${AD_CONFIG.PLAYS_PER_AD} Plays`}
              onPress={() => setShowAdModal(true)}
              variant="primary"
              size="lg"
              fullWidth
            />
          ) : (
            <View style={styles.noPlaysContainer}>
              <Ionicons name="time" size={20} color={colors.warning} />
              <Text style={styles.noPlaysText}>
                Come back tomorrow for more plays!
              </Text>
            </View>
          )}
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

      {/* Ad Modal */}
      <AdModal
        visible={showAdModal}
        onClose={() => setShowAdModal(false)}
        onAdWatched={handleAdWatched}
      />
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
  playsInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  playsInfoText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  playsInfoWarning: {
    color: colors.warning,
  },
  noPlaysContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  noPlaysText: {
    fontSize: fontSize.base,
    color: colors.warning,
    fontStyle: 'italic',
  },
  actions: {
    width: '100%',
    marginTop: spacing.xl,
  },
  secondaryButton: {
    marginTop: spacing.md,
  },

  // ============ LANDSCAPE STYLES ============
  landscapeContainer: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  landscapeContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  landscapeScoreLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  landscapeScoreValue: {
    fontSize: 72,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginTop: spacing.sm,
  },
  landscapeNewBest: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 166, 35, 0.15)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  landscapeNewBestText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  landscapeHint: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xl,
    fontStyle: 'italic',
  },
  landscapeBackButton: {
    position: 'absolute',
    right: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.xl,
    gap: spacing.sm,
  },
  landscapeBackText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textDark,
  },
});
