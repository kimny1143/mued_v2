/**
 * MuWidthScreen
 * Stereo width identification game - identify the stereo width
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

interface MuWidthScreenProps {
  onComplete: () => void;
  onBack: () => void;
}

// Width levels for the game
const WIDTH_LEVELS = [
  { value: 0, label: 'Mono' },
  { value: 25, label: 'Narrow' },
  { value: 50, label: 'Normal' },
  { value: 75, label: 'Wide' },
  { value: 100, label: 'Extra Wide' },
] as const;

type WidthValue = (typeof WIDTH_LEVELS)[number]['value'];

export function MuWidthScreen({ onComplete, onBack }: MuWidthScreenProps) {
  const {
    currentRound,
    totalRounds,
    score,
    hasAnswered,
    isDemoMode,
    nextRound,
    submitAnswer,
  } = useGameStore();

  const [selectedAnswer, setSelectedAnswer] = useState<WidthValue | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [correctAnswer] = useState<WidthValue>(() => {
    const index = Math.floor(Math.random() * WIDTH_LEVELS.length);
    return WIDTH_LEVELS[index].value;
  });
  const [isPlaying, setIsPlaying] = useState(false);

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
    // In real implementation, would play audio here
  }, []);

  const handleAnswer = useCallback((answer: WidthValue) => {
    if (hasAnswered) return;

    setIsPlaying(false);
    setSelectedAnswer(answer);
    const correct = answer === correctAnswer;
    setIsCorrect(correct);
    submitAnswer(answer.toString());
  }, [hasAnswered, correctAnswer, submitAnswer]);

  const handleNextRound = useCallback(() => {
    if (currentRound >= totalRounds) {
      onComplete();
      return;
    }
    setSelectedAnswer(null);
    setIsCorrect(null);
    setIsPlaying(false);
    nextRound();
  }, [currentRound, totalRounds, nextRound, onComplete]);

  const getButtonStyle = (value: WidthValue) => {
    if (!hasAnswered) {
      return styles.widthButton;
    }

    if (value === correctAnswer) {
      return [styles.widthButton, styles.widthButtonCorrect];
    }

    if (value === selectedAnswer && !isCorrect) {
      return [styles.widthButton, styles.widthButtonWrong];
    }

    return [styles.widthButton, styles.widthButtonDisabled];
  };

  const getCorrectLabel = () => {
    const level = WIDTH_LEVELS.find((l) => l.value === correctAnswer);
    return level?.label || '';
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
          What is the stereo width?
        </Text>

        {/* Stereo Width Visualization */}
        <View style={styles.visualContainer}>
          <View style={styles.speakerLeft}>
            <Ionicons name="volume-medium" size={32} color={colors.textMuted} />
            <Text style={styles.speakerLabel}>L</Text>
          </View>

          <TouchableOpacity
            style={[styles.playButton, isPlaying && styles.playButtonActive]}
            onPress={handleTogglePlay}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={48}
              color={isPlaying ? colors.textDark : colors.textLight}
            />
          </TouchableOpacity>

          <View style={styles.speakerRight}>
            <Ionicons name="volume-medium" size={32} color={colors.textMuted} />
            <Text style={styles.speakerLabel}>R</Text>
          </View>
        </View>

        {/* Width Options */}
        <View style={styles.widthContainer}>
          {WIDTH_LEVELS.map((level) => (
            <TouchableOpacity
              key={level.value}
              style={getButtonStyle(level.value)}
              onPress={() => handleAnswer(level.value)}
              disabled={hasAnswered}
            >
              <View
                style={[
                  styles.widthIndicator,
                  { width: `${Math.max(10, level.value)}%` },
                  hasAnswered && level.value === correctAnswer && styles.widthIndicatorCorrect,
                  hasAnswered && level.value === selectedAnswer && !isCorrect && styles.widthIndicatorWrong,
                ]}
              />
              <Text
                style={[
                  styles.widthLabel,
                  hasAnswered && level.value === correctAnswer && styles.widthLabelCorrect,
                  hasAnswered && level.value === selectedAnswer && !isCorrect && styles.widthLabelWrong,
                ]}
              >
                {level.label}
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
                  : `Wrong! The width was "${getCorrectLabel()}"`}
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
    backgroundColor: '#8B5CF6', // Purple for MuWidth
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
    color: '#8B5CF6',
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
  visualContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xxl,
  },
  speakerLeft: {
    alignItems: 'center',
  },
  speakerRight: {
    alignItems: 'center',
  },
  speakerLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  playButton: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  playButtonActive: {
    backgroundColor: '#8B5CF6',
  },
  widthContainer: {
    gap: spacing.md,
  },
  widthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  widthButtonCorrect: {
    backgroundColor: colors.success,
  },
  widthButtonWrong: {
    backgroundColor: colors.error,
  },
  widthButtonDisabled: {
    opacity: 0.5,
  },
  widthIndicator: {
    height: 8,
    backgroundColor: '#8B5CF6',
    borderRadius: 4,
    marginRight: spacing.md,
    minWidth: 10,
  },
  widthIndicatorCorrect: {
    backgroundColor: colors.textDark,
  },
  widthIndicatorWrong: {
    backgroundColor: colors.textLight,
  },
  widthLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.textLight,
  },
  widthLabelCorrect: {
    color: colors.textDark,
  },
  widthLabelWrong: {
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
