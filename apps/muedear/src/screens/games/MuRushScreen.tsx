/**
 * MuRushScreen
 * 60-second timed frequency identification challenge
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
import { useGameLogic, formatTime } from '../../hooks/useGameLogic';
import { FREQUENCY_BANDS, FrequencyBand } from '../../types/game';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';

interface MuRushScreenProps {
  onComplete: () => void;
  onBack: () => void;
}

export function MuRushScreen({ onComplete, onBack }: MuRushScreenProps) {
  const {
    score,
    currentFrequency,
    isPlayingA,
    isDemoMode,
    setPlayingA,
  } = useGameStore();

  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState<FrequencyBand | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [localScore, setLocalScore] = useState(0);
  const [currentTargetFreq, setCurrentTargetFreq] = useState<FrequencyBand>(() => {
    const index = Math.floor(Math.random() * FREQUENCY_BANDS.length);
    return FREQUENCY_BANDS[index].value;
  });
  const [showFeedback, setShowFeedback] = useState(false);
  const [isLastAnswerCorrect, setIsLastAnswerCorrect] = useState(false);

  const handleTimeUp = useCallback(() => {
    setGameEnded(true);
  }, []);

  const {
    timeRemaining,
    isTimerRunning,
    startTimer,
    stopTimer,
  } = useGameLogic({
    timerEnabled: true,
    timerDuration: 60,
    onTimeUp: handleTimeUp,
  });

  const handleStartGame = useCallback(() => {
    setGameStarted(true);
    startTimer();
  }, [startTimer]);

  const getNextFrequency = useCallback(() => {
    const index = Math.floor(Math.random() * FREQUENCY_BANDS.length);
    return FREQUENCY_BANDS[index].value;
  }, []);

  const handleFrequencySelect = useCallback((freq: FrequencyBand) => {
    if (!gameStarted || gameEnded) return;

    const isCorrect = freq === currentTargetFreq;
    setQuestionsAnswered((prev) => prev + 1);

    if (isCorrect) {
      setCorrectAnswers((prev) => prev + 1);
      setLocalScore((prev) => prev + 100);
    }

    setCurrentAnswer(freq);
    setIsLastAnswerCorrect(isCorrect);
    setShowFeedback(true);

    // Quick feedback then next question
    setTimeout(() => {
      setShowFeedback(false);
      setCurrentAnswer(null);
      setCurrentTargetFreq(getNextFrequency());
    }, 500);
  }, [gameStarted, gameEnded, currentTargetFreq, getNextFrequency]);

  const handleComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const getButtonStyle = (freq: FrequencyBand) => {
    if (!showFeedback) {
      return styles.freqButton;
    }

    if (freq === currentTargetFreq) {
      return [styles.freqButton, styles.freqButtonCorrect];
    }

    if (freq === currentAnswer && !isLastAnswerCorrect) {
      return [styles.freqButton, styles.freqButtonWrong];
    }

    return styles.freqButton;
  };

  // Pre-game screen
  if (!gameStarted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="close" size={24} color={colors.textLight} />
          </TouchableOpacity>
        </View>

        <View style={styles.preGameContent}>
          <Ionicons name="flash" size={64} color={colors.error} />
          <Text style={styles.preGameTitle}>MuRush</Text>
          <Text style={styles.preGameDesc}>
            Identify as many frequencies as you can in 60 seconds!
          </Text>

          <View style={styles.rulesContainer}>
            <Text style={styles.rulesTitle}>Rules:</Text>
            <Text style={styles.rulesText}>• 60 seconds on the clock</Text>
            <Text style={styles.rulesText}>• +100 points per correct answer</Text>
            <Text style={styles.rulesText}>• No penalty for wrong answers</Text>
            <Text style={styles.rulesText}>• Answer as fast as you can!</Text>
          </View>

          <Button
            title="Start Rush!"
            onPress={handleStartGame}
            variant="primary"
            size="lg"
            fullWidth
            style={styles.startButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Game ended screen
  if (gameEnded) {
    const accuracy = questionsAnswered > 0
      ? Math.round((correctAnswers / questionsAnswered) * 100)
      : 0;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.endGameContent}>
          <Ionicons name="trophy" size={64} color={colors.primary} />
          <Text style={styles.endGameTitle}>Time's Up!</Text>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{localScore}</Text>
              <Text style={styles.statLabel}>Score</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{correctAnswers}/{questionsAnswered}</Text>
              <Text style={styles.statLabel}>Correct</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{accuracy}%</Text>
              <Text style={styles.statLabel}>Accuracy</Text>
            </View>
          </View>

          <Button
            title="See Results"
            onPress={handleComplete}
            variant="primary"
            size="lg"
            fullWidth
            style={styles.endButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Main game screen
  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Timer */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="close" size={24} color={colors.textLight} />
        </TouchableOpacity>

        <View style={styles.timerContainer}>
          <Ionicons name="time" size={20} color={timeRemaining <= 10 ? colors.error : colors.textLight} />
          <Text style={[styles.timerText, timeRemaining <= 10 && styles.timerDanger]}>
            {formatTime(timeRemaining)}
          </Text>
        </View>

        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>Score</Text>
          <Text style={styles.scoreValue}>{localScore}</Text>
        </View>
      </View>

      {/* Demo Mode Banner */}
      {isDemoMode && (
        <View style={styles.demoBanner}>
          <Ionicons name="volume-mute" size={16} color={colors.warning} />
          <Text style={styles.demoText}>Demo Mode</Text>
        </View>
      )}

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {correctAnswers}/{questionsAnswered} correct
        </Text>
      </View>

      {/* Game Content */}
      <View style={styles.content}>
        <Text style={styles.instruction}>
          Which frequency is boosted?
        </Text>

        {/* A/B Toggle */}
        <View style={styles.abContainer}>
          <TouchableOpacity
            style={[styles.abButton, isPlayingA && styles.abButtonActive]}
            onPress={() => setPlayingA(true)}
          >
            <Text style={[styles.abText, isPlayingA && styles.abTextActive]}>
              A
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.abButton, !isPlayingA && styles.abButtonActive]}
            onPress={() => setPlayingA(false)}
          >
            <Text style={[styles.abText, !isPlayingA && styles.abTextActive]}>
              B
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
            >
              <Text style={styles.freqText}>{band.label}</Text>
            </TouchableOpacity>
          ))}
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
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.backgroundCard,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  timerText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textLight,
  },
  timerDanger: {
    color: colors.error,
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
    color: colors.error,
  },
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  demoText: {
    fontSize: fontSize.sm,
    color: colors.warning,
  },
  statsBar: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  statsText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  instruction: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  abContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  abButton: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  abButtonActive: {
    backgroundColor: colors.error,
  },
  abText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
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
  freqText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textLight,
  },
  preGameContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  preGameTitle: {
    fontSize: fontSize['4xl'],
    fontWeight: fontWeight.bold,
    color: colors.error,
    marginTop: spacing.lg,
  },
  preGameDesc: {
    fontSize: fontSize.lg,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
  },
  rulesContainer: {
    backgroundColor: colors.backgroundCard,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    width: '100%',
    marginBottom: spacing.xxl,
  },
  rulesTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textLight,
    marginBottom: spacing.md,
  },
  rulesText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  startButton: {
    marginTop: spacing.lg,
  },
  endGameContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  endGameTitle: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    color: colors.textLight,
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: spacing.xxl,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  endButton: {
    marginTop: spacing.lg,
  },
});
