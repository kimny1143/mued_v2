/**
 * MuVerbScreen
 * Reverb identification game - find the different reverb
 */

import React, { useState, useCallback, useEffect } from 'react';
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
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';

interface MuVerbScreenProps {
  onComplete: () => void;
  onBack: () => void;
}

// Reverb types for the game
const REVERB_TYPES = ['room', 'hall', 'plate', 'spring', 'chamber'] as const;
type ReverbType = (typeof REVERB_TYPES)[number];

export function MuVerbScreen({ onComplete, onBack }: MuVerbScreenProps) {
  const {
    currentRound,
    totalRounds,
    score,
    hasAnswered,
    isDemoMode,
    nextRound,
    submitAnswer,
  } = useGameStore();

  const [selectedAnswer, setSelectedAnswer] = useState<'A' | 'B' | 'C' | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [correctAnswer] = useState<'A' | 'B' | 'C'>(() => {
    const options: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C'];
    return options[Math.floor(Math.random() * options.length)];
  });
  const [currentlyPlaying, setCurrentlyPlaying] = useState<'A' | 'B' | 'C' | null>(null);

  const handlePlay = useCallback((option: 'A' | 'B' | 'C') => {
    setCurrentlyPlaying(option);
    // In real implementation, would play audio here
    // For demo, just set the state
  }, []);

  const handleAnswer = useCallback((answer: 'A' | 'B' | 'C') => {
    if (hasAnswered) return;

    setCurrentlyPlaying(null);
    setSelectedAnswer(answer);
    const correct = answer === correctAnswer;
    setIsCorrect(correct);
    submitAnswer(answer);
  }, [hasAnswered, correctAnswer, submitAnswer]);

  const handleNextRound = useCallback(() => {
    if (currentRound >= totalRounds) {
      onComplete();
      return;
    }
    setSelectedAnswer(null);
    setIsCorrect(null);
    setCurrentlyPlaying(null);
    nextRound();
  }, [currentRound, totalRounds, nextRound, onComplete]);

  const getOptionStyle = (option: 'A' | 'B' | 'C') => {
    const isPlaying = currentlyPlaying === option;

    if (!hasAnswered) {
      if (isPlaying) {
        return [styles.optionButton, styles.optionPlaying];
      }
      return styles.optionButton;
    }

    if (option === correctAnswer) {
      return [styles.optionButton, styles.optionCorrect];
    }

    if (option === selectedAnswer && !isCorrect) {
      return [styles.optionButton, styles.optionWrong];
    }

    return [styles.optionButton, styles.optionDisabled];
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

      {/* Demo Mode Banner */}
      {isDemoMode && (
        <View style={styles.demoBanner}>
          <Ionicons name="volume-mute" size={16} color={colors.warning} />
          <Text style={styles.demoText}>Demo Mode - No audio files</Text>
        </View>
      )}

      {/* Game Content */}
      <View style={styles.content}>
        <Text style={styles.instruction}>
          Which one has a different reverb?
        </Text>

        <Text style={styles.subInstruction}>
          Two samples have the same reverb. Find the odd one out.
        </Text>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {(['A', 'B', 'C'] as const).map((option) => (
            <View key={option} style={styles.optionWrapper}>
              <TouchableOpacity
                style={getOptionStyle(option)}
                onPress={() => handlePlay(option)}
                disabled={hasAnswered}
              >
                <Ionicons
                  name={currentlyPlaying === option ? 'pause' : 'play'}
                  size={32}
                  color={currentlyPlaying === option ? colors.textDark : colors.textLight}
                />
                <Text
                  style={[
                    styles.optionLabel,
                    currentlyPlaying === option && styles.optionLabelActive,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.selectButton,
                  hasAnswered && option === correctAnswer && styles.selectButtonCorrect,
                  hasAnswered && option === selectedAnswer && !isCorrect && styles.selectButtonWrong,
                ]}
                onPress={() => handleAnswer(option)}
                disabled={hasAnswered}
              >
                <Text style={styles.selectText}>
                  {hasAnswered && option === correctAnswer
                    ? 'Different!'
                    : hasAnswered && option === selectedAnswer
                    ? 'Your pick'
                    : 'This one'}
                </Text>
              </TouchableOpacity>
            </View>
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
                  : `Wrong! ${correctAnswer} had the different reverb`}
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
    backgroundColor: colors.info,
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
    color: colors.info,
  },
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  demoText: {
    fontSize: fontSize.sm,
    color: colors.warning,
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
    marginBottom: spacing.sm,
  },
  subInstruction: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.xl,
  },
  optionWrapper: {
    alignItems: 'center',
    gap: spacing.md,
  },
  optionButton: {
    width: 90,
    height: 90,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  optionPlaying: {
    backgroundColor: colors.info,
  },
  optionCorrect: {
    backgroundColor: colors.success,
  },
  optionWrong: {
    backgroundColor: colors.error,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  optionLabelActive: {
    color: colors.textDark,
  },
  selectButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectButtonCorrect: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  selectButtonWrong: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  selectText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textLight,
  },
  feedbackContainer: {
    marginTop: spacing.xl,
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
