/**
 * MuFreQScreen
 * Frequency identification game with A/B audio comparison
 * Supports both portrait and landscape orientations
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/ui/Button';
import { InteractiveSpectrum } from '../../components/game/InteractiveSpectrum';
import { useGameStore } from '../../stores/gameStore';
import { audioService } from '../../services/audioService';
import { FREQUENCY_BANDS, FrequencyBand } from '../../types/game';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { logger } from '../../utils/logger';

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
    isDemoMode,
    isAudioLoaded,
    setPlayingA,
    togglePlayback,
    submitAnswer,
    nextRound,
    setAudioLoaded,
    setDemoMode,
    setCurrentTrack,
  } = useGameStore();

  const [selectedAnswer, setSelectedAnswer] = useState<FrequencyBand | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [spectrumStyle, setSpectrumStyle] = useState<'bar' | 'line' | 'mirror' | 'glow' | 'dots'>('bar');

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  // Spectrum styles for cycling
  const spectrumStyles: Array<'bar' | 'line' | 'mirror' | 'glow' | 'dots'> = ['bar', 'line', 'mirror', 'glow', 'dots'];

  // Handle swipe to change spectrum style (landscape only)
  const handleSpectrumSwipe = useCallback((direction: 'left' | 'right') => {
    setSpectrumStyle((current) => {
      const currentIndex = spectrumStyles.indexOf(current);
      if (direction === 'right') {
        // Swipe right -> previous style
        return spectrumStyles[(currentIndex - 1 + spectrumStyles.length) % spectrumStyles.length];
      } else {
        // Swipe left -> next style
        return spectrumStyles[(currentIndex + 1) % spectrumStyles.length];
      }
    });
  }, [spectrumStyles]);

  // Initialize audio system on mount
  useEffect(() => {
    const initAudio = async () => {
      try {
        await audioService.initAudioSystem();
        const hasFiles = audioService.hasAudioFiles();
        setDemoMode(!hasFiles);
        logger.log('[MuFreQScreen] Audio initialized, demo mode:', !hasFiles);
      } catch (error) {
        logger.error('[MuFreQScreen] Audio init failed:', error);
        setDemoMode(true);
      }
    };

    initAudio();

    return () => {
      // Full shutdown on unmount to release all memory
      audioService.shutdown();
    };
  }, [setDemoMode]);

  // Load track when round changes - with full cleanup and race condition protection
  useEffect(() => {
    let isMounted = true;

    const loadTrackForRound = async () => {
      if (!currentFrequency) return;

      setIsLoading(true);
      setAudioLoaded(false);

      try {
        // Full shutdown to release previous track's memory
        await audioService.shutdown();
        if (!isMounted) return;

        // Re-initialize fresh
        await audioService.initAudioSystem();
        if (!isMounted) return;

        const trackId = audioService.getRandomTrackId();
        setCurrentTrack(trackId);

        const loaded = await audioService.loadTrack(trackId, currentFrequency);
        if (!isMounted) return;

        setAudioLoaded(loaded);

        if (loaded && !isDemoMode) {
          await audioService.startSyncedPlayback();
          if (isMounted) {
            setPlayingA(true);
          }
        }
      } catch (error) {
        logger.error('[MuFreQScreen] Failed to load track:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadTrackForRound();

    return () => {
      isMounted = false;
    };
  }, [currentRound, currentFrequency, isDemoMode, setAudioLoaded, setCurrentTrack, setPlayingA]);

  // Handle pressing A button
  const handlePlayA = useCallback(async () => {
    if (isPlayingA) return;

    if (isDemoMode) {
      setPlayingA(true);
      return;
    }

    try {
      await audioService.playOriginal();
      setPlayingA(true);
    } catch (error) {
      logger.error('[MuFreQScreen] Play A failed:', error);
    }
  }, [isPlayingA, isDemoMode, setPlayingA]);

  // Handle pressing B button
  const handlePlayB = useCallback(async () => {
    if (!isPlayingA) return;

    if (isDemoMode) {
      setPlayingA(false);
      return;
    }

    try {
      await audioService.playProcessed();
      setPlayingA(false);
    } catch (error) {
      logger.error('[MuFreQScreen] Play B failed:', error);
    }
  }, [isPlayingA, isDemoMode, setPlayingA]);

  // Handle frequency selection (answer submission)
  const handleFrequencySelect = useCallback(async (freq: FrequencyBand) => {
    if (hasAnswered) return;

    if (!isDemoMode) {
      await audioService.stopPlayback();
    }

    setSelectedAnswer(freq);
    const correct = submitAnswer(freq);
    setIsCorrect(correct);
  }, [hasAnswered, isDemoMode, submitAnswer]);

  // Handle next round
  const handleNextRound = useCallback(async () => {
    if (currentRound >= totalRounds) {
      await audioService.cleanup();
      onComplete();
      return;
    }

    await audioService.cleanup();

    setSelectedAnswer(null);
    setIsCorrect(null);
    nextRound();
  }, [currentRound, totalRounds, nextRound, onComplete]);

  // Handle back button
  const handleBack = useCallback(async () => {
    await audioService.cleanup();
    onBack();
  }, [onBack]);

  // ============ LANDSCAPE LAYOUT ============
  if (isLandscape) {
    return (
      <View style={styles.landscapeContainer}>
        {/* Full-screen Interactive Spectrum */}
        <InteractiveSpectrum
          isPlaying={!isLoading && isAudioLoaded && !hasAnswered}
          onFrequencySelect={handleFrequencySelect}
          selectedFrequency={selectedAnswer}
          correctFrequency={hasAnswered ? currentFrequency : null}
          hasAnswered={hasAnswered}
          disabled={isLoading || hasAnswered}
          fullscreen
          style={spectrumStyle}
          onSwipe={handleSpectrumSwipe}
        />

        {/* Dim overlay when answered */}
        {hasAnswered && <View style={styles.landscapeDimOverlay} />}

        {/* Overlay UI */}
        <View style={styles.landscapeOverlay} pointerEvents="box-none">
          {/* Close button */}
          <TouchableOpacity
            style={styles.landscapeCloseButton}
            onPress={handleBack}
          >
            <Ionicons name="close" size={28} color={colors.textLight} />
          </TouchableOpacity>

          {/* Round & Score info */}
          <View style={styles.landscapeInfoBar}>
            <Text style={styles.landscapeRoundText}>
              Round {currentRound}/{totalRounds}
            </Text>
            <Text style={styles.landscapeScoreText}>Score: {score}</Text>
          </View>

          {/* A/B Buttons */}
          {!hasAnswered && (
            <>
              <TouchableOpacity
                style={[
                  styles.landscapeAbButton,
                  styles.landscapeAbButtonLeft,
                  isPlayingA && styles.landscapeAbButtonActive,
                ]}
                onPress={handlePlayA}
                disabled={isLoading}
              >
                <Text
                  style={[
                    styles.landscapeAbText,
                    isPlayingA && styles.landscapeAbTextActive,
                  ]}
                >
                  A
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.landscapeAbButton,
                  styles.landscapeAbButtonRight,
                  !isPlayingA && styles.landscapeAbButtonActive,
                ]}
                onPress={handlePlayB}
                disabled={isLoading}
              >
                <Text
                  style={[
                    styles.landscapeAbText,
                    !isPlayingA && styles.landscapeAbTextActive,
                  ]}
                >
                  B
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* Feedback overlay */}
          {hasAnswered && (
            <View style={styles.landscapeFeedbackCenter}>
              <View
                style={[
                  styles.landscapeFeedbackBadgeLarge,
                  isCorrect
                    ? styles.landscapeFeedbackCorrect
                    : styles.landscapeFeedbackWrong,
                ]}
              >
                <Ionicons
                  name={isCorrect ? 'checkmark-circle' : 'close-circle'}
                  size={48}
                  color={colors.textLight}
                />
                <Text style={styles.landscapeFeedbackTextLarge}>
                  {isCorrect
                    ? '+100'
                    : FREQUENCY_BANDS.find((b) => b.value === currentFrequency)
                        ?.label || '?'}
                </Text>
              </View>
            </View>
          )}

          {/* Next button (landscape position) */}
          {hasAnswered && (
            <TouchableOpacity
              style={styles.landscapeNextButtonRight}
              onPress={handleNextRound}
            >
              <Text style={styles.landscapeNextButtonText}>
                {currentRound >= totalRounds ? 'Results' : 'Next'}
              </Text>
              <Ionicons name="arrow-forward" size={24} color={colors.textDark} />
            </TouchableOpacity>
          )}

          {/* Spectrum style indicator */}
          {!hasAnswered && (
            <View style={styles.landscapeStyleIndicator}>
              {spectrumStyles.map((style) => (
                <View
                  key={style}
                  style={[
                    styles.styleIndicatorDot,
                    spectrumStyle === style && styles.styleIndicatorDotActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      </View>
    );
  }

  // ============ PORTRAIT LAYOUT ============
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
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
        {/* Instructions */}
        <Text style={styles.instruction}>
          {hasAnswered
            ? isCorrect
              ? 'Correct!'
              : 'Try again next time!'
            : 'Tap the boosted frequency on the spectrum'}
        </Text>

        {/* Interactive Spectrum Visualization */}
        <InteractiveSpectrum
          isPlaying={!isLoading && isAudioLoaded && !hasAnswered}
          onFrequencySelect={handleFrequencySelect}
          selectedFrequency={selectedAnswer}
          correctFrequency={hasAnswered ? currentFrequency : null}
          hasAnswered={hasAnswered}
          disabled={isLoading || hasAnswered}
        />

        {/* A/B Toggle */}
        <View style={styles.abContainer}>
          <TouchableOpacity
            style={[styles.abButton, isPlayingA && styles.abButtonActive]}
            onPress={handlePlayA}
            disabled={isLoading || hasAnswered}
          >
            <Ionicons
              name="volume-high"
              size={20}
              color={isPlayingA ? colors.textDark : colors.textLight}
            />
            <Text style={[styles.abText, isPlayingA && styles.abTextActive]}>
              A
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.abButton, !isPlayingA && styles.abButtonActive]}
            onPress={handlePlayB}
            disabled={isLoading || hasAnswered}
          >
            <Ionicons
              name="volume-high"
              size={20}
              color={!isPlayingA ? colors.textDark : colors.textLight}
            />
            <Text style={[styles.abText, !isPlayingA && styles.abTextActive]}>
              B
            </Text>
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
  // ============ PORTRAIT STYLES ============
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
    marginBottom: spacing.xl,
  },
  abContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
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
  feedbackContainer: {
    marginTop: spacing.lg,
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
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  feedbackWrong: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  feedbackText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  nextButton: {
    marginTop: spacing.md,
  },

  // ============ LANDSCAPE STYLES ============
  landscapeContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  landscapeDimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  landscapeOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  landscapeCloseButton: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.xl,
    padding: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: borderRadius.full,
  },
  landscapeInfoBar: {
    position: 'absolute',
    top: spacing.sm,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: borderRadius.lg,
  },
  landscapeRoundText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.textLight,
  },
  landscapeScoreText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  landscapeAbButton: {
    position: 'absolute',
    top: 50,
    width: 64,
    height: 64,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(61, 61, 61, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  landscapeAbButtonLeft: {
    left: spacing.xl,
  },
  landscapeAbButtonRight: {
    right: spacing.xl,
  },
  landscapeAbButtonActive: {
    backgroundColor: 'rgba(245, 166, 35, 0.9)',
  },
  landscapeAbText: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.textLight,
  },
  landscapeAbTextActive: {
    color: colors.textDark,
  },
  landscapeFeedbackCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  landscapeFeedbackBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.xl,
    borderRadius: borderRadius.xxl,
    gap: spacing.lg,
  },
  landscapeFeedbackCorrect: {
    backgroundColor: 'rgba(34, 197, 94, 0.95)',
  },
  landscapeFeedbackWrong: {
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
  },
  landscapeFeedbackTextLarge: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    color: colors.textLight,
  },
  landscapeNextButtonRight: {
    position: 'absolute',
    top: 50,
    right: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: 'rgba(245, 166, 35, 0.95)',
    borderRadius: borderRadius.xl,
    gap: spacing.sm,
  },
  landscapeNextButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textDark,
  },
  landscapeStyleIndicator: {
    position: 'absolute',
    bottom: 60,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: borderRadius.full,
  },
  styleIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  styleIndicatorDotActive: {
    backgroundColor: colors.primary,
  },
});
