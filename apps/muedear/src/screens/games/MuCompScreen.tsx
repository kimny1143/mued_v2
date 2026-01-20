/**
 * MuCompScreen
 * Compression detection game - identify which audio is compressed
 */

import React, { useState, useCallback } from 'react';
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

interface MuCompScreenProps {
  onComplete: () => void;
  onBack: () => void;
}

// Compression amounts for the game
const COMPRESSION_LEVELS = ['none', 'light', 'medium', 'heavy'] as const;
type CompressionLevel = (typeof COMPRESSION_LEVELS)[number];

export function MuCompScreen({ onComplete, onBack }: MuCompScreenProps) {
  const {
    currentRound,
    totalRounds,
    score,
    hasAnswered,
    gameState,
    nextRound,
    submitAnswer,
    isDemoMode,
  } = useGameStore();

  const [selectedAnswer, setSelectedAnswer] = useState<'A' | 'B' | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [correctAnswer] = useState<'A' | 'B'>(() =>
    Math.random() < 0.5 ? 'A' : 'B'
  );
  const [isPlayingA, setIsPlayingA] = useState(true);

  const handleAnswer = useCallback((answer: 'A' | 'B') => {
    if (hasAnswered) return;

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
    nextRound();
  }, [currentRound, totalRounds, nextRound, onComplete]);

  const getButtonStyle = (option: 'A' | 'B') => {
    if (!hasAnswered) {
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
          Which audio is compressed?
        </Text>

        {/* Playback Controls */}
        <View style={styles.playbackContainer}>
          <TouchableOpacity
            style={[styles.playButton, isPlayingA && styles.playButtonActive]}
            onPress={() => setIsPlayingA(true)}
          >
            <Ionicons
              name={isPlayingA ? 'pause' : 'play'}
              size={32}
              color={isPlayingA ? colors.textDark : colors.textLight}
            />
            <Text style={[styles.playLabel, isPlayingA && styles.playLabelActive]}>
              A
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.playButton, !isPlayingA && styles.playButtonActive]}
            onPress={() => setIsPlayingA(false)}
          >
            <Ionicons
              name={!isPlayingA ? 'pause' : 'play'}
              size={32}
              color={!isPlayingA ? colors.textDark : colors.textLight}
            />
            <Text style={[styles.playLabel, !isPlayingA && styles.playLabelActive]}>
              B
            </Text>
          </TouchableOpacity>
        </View>

        {/* Answer Options */}
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={getButtonStyle('A')}
            onPress={() => handleAnswer('A')}
            disabled={hasAnswered}
          >
            <Text style={styles.optionText}>A is Compressed</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={getButtonStyle('B')}
            onPress={() => handleAnswer('B')}
            disabled={hasAnswered}
          >
            <Text style={styles.optionText}>B is Compressed</Text>
          </TouchableOpacity>
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
                  : `Wrong! ${correctAnswer} was compressed`}
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
    backgroundColor: colors.secondary,
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
    color: colors.secondary,
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
    marginBottom: spacing.xxl,
  },
  playbackContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    marginBottom: spacing.xxl,
  },
  playButton: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  playButtonActive: {
    backgroundColor: colors.secondary,
  },
  playLabel: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  playLabelActive: {
    color: colors.textDark,
  },
  optionsContainer: {
    gap: spacing.md,
  },
  optionButton: {
    padding: spacing.xl,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.sm,
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
  optionText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
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
