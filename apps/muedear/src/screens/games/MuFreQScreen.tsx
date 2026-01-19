/**
 * MuFreQScreen
 * Frequency identification game
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/ui/Button';
import { useGameStore } from '../../stores/gameStore';
import { FREQUENCY_BANDS, FrequencyBand } from '../../types/game';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';

interface MuFreQScreenProps {
  onComplete: () => void;
  onBack: () => void;
}

export function MuFreQScreen({ onComplete, onBack }: MuFreQScreenProps) {
  const {
    currentRound,
    totalRounds,
    score,
    currentFrequency,
    isPlayingA,
    hasAnswered,
    gameState,
    togglePlayback,
    submitAnswer,
    nextRound,
  } = useGameStore();

  const [selectedAnswer, setSelectedAnswer] = useState<FrequencyBand | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const handleFrequencySelect = (freq: FrequencyBand) => {
    if (hasAnswered) return;

    setSelectedAnswer(freq);
    const correct = submitAnswer(freq);
    setIsCorrect(correct);
  };

  const handleNextRound = () => {
    if (currentRound >= totalRounds) {
      onComplete();
      return;
    }
    setSelectedAnswer(null);
    setIsCorrect(null);
    nextRound();
  };

  const getButtonStyle = (freq: FrequencyBand) => {
    if (!hasAnswered) {
      return styles.freqButton;
    }

    if (freq === currentFrequency) {
      return [styles.freqButton, styles.freqButtonCorrect];
    }

    if (freq === selectedAnswer && !isCorrect) {
      return [styles.freqButton, styles.freqButtonWrong];
    }

    return [styles.freqButton, styles.freqButtonDisabled];
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="close" size={24} color={colors.textLight} />
        </TouchableOpacity>

        <View style={styles.progressContainer}>
          <Text style={styles.roundText}>
            Round {currentRound}/{totalRounds}
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(currentRound / totalRounds) * 100}%` },
              ]}
            />
          </View>
        </View>

        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>Score</Text>
          <Text style={styles.scoreValue}>{score}</Text>
        </View>
      </View>

      {/* Game Content */}
      <View style={styles.content}>
        {/* Instructions */}
        <Text style={styles.instruction}>
          Which frequency is boosted?
        </Text>

        {/* A/B Toggle */}
        <View style={styles.abContainer}>
          <TouchableOpacity
            style={[styles.abButton, isPlayingA && styles.abButtonActive]}
            onPress={() => !isPlayingA && togglePlayback()}
          >
            <Ionicons
              name="play"
              size={20}
              color={isPlayingA ? colors.textDark : colors.textLight}
            />
            <Text style={[styles.abText, isPlayingA && styles.abTextActive]}>
              A (Original)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.abButton, !isPlayingA && styles.abButtonActive]}
            onPress={() => isPlayingA && togglePlayback()}
          >
            <Ionicons
              name="play"
              size={20}
              color={!isPlayingA ? colors.textDark : colors.textLight}
            />
            <Text style={[styles.abText, !isPlayingA && styles.abTextActive]}>
              B (Boosted)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Frequency Grid */}
        <View style={styles.freqGrid}>
          {FREQUENCY_BANDS.map((band) => (
            <TouchableOpacity
              key={band.value}
              style={getButtonStyle(band.value)}
              onPress={() => handleFrequencySelect(band.value)}
              disabled={hasAnswered}
            >
              <Text
                style={[
                  styles.freqText,
                  hasAnswered && band.value === currentFrequency && styles.freqTextCorrect,
                  hasAnswered && band.value === selectedAnswer && !isCorrect && styles.freqTextWrong,
                ]}
              >
                {band.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Feedback */}
        {hasAnswered && (
          <View style={styles.feedbackContainer}>
            <View
              style={[
                styles.feedbackBadge,
                isCorrect ? styles.feedbackCorrect : styles.feedbackWrong,
              ]}
            >
              <Ionicons
                name={isCorrect ? 'checkmark-circle' : 'close-circle'}
                size={24}
                color={isCorrect ? colors.success : colors.error}
              />
              <Text
                style={[
                  styles.feedbackText,
                  { color: isCorrect ? colors.success : colors.error },
                ]}
              >
                {isCorrect
                  ? 'Correct! +100 points'
                  : `Wrong! The answer was ${FREQUENCY_BANDS.find((b) => b.value === currentFrequency)?.label}`}
              </Text>
            </View>

            <Button
              title={currentRound >= totalRounds ? 'See Results' : 'Next Round'}
              onPress={handleNextRound}
              variant="primary"
              size="lg"
              fullWidth
              style={styles.nextButton}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    padding: spacing.sm,
  },
  progressContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: spacing.lg,
  },
  roundText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: colors.backgroundCard,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  scoreValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  instruction: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  abContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  abButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundCard,
    gap: spacing.sm,
    ...shadows.sm,
  },
  abButtonActive: {
    backgroundColor: colors.primary,
  },
  abText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.textLight,
  },
  abTextActive: {
    color: colors.textDark,
  },
  freqGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  freqButton: {
    width: '30%',
    aspectRatio: 1.5,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  freqButtonCorrect: {
    backgroundColor: colors.success,
  },
  freqButtonWrong: {
    backgroundColor: colors.error,
  },
  freqButtonDisabled: {
    opacity: 0.5,
  },
  freqText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textLight,
  },
  freqTextCorrect: {
    color: colors.textDark,
  },
  freqTextWrong: {
    color: colors.textLight,
  },
  feedbackContainer: {
    marginTop: spacing.xxl,
  },
  feedbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  feedbackCorrect: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  feedbackWrong: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  feedbackText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  nextButton: {
    marginTop: spacing.md,
  },
});
