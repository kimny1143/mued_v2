/**
 * useGameLogic - Common game logic hook
 *
 * Shared logic for all ear training games including:
 * - Round progression
 * - Score calculation
 * - Timer management (for MuRush)
 * - Answer validation
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';

interface UseGameLogicOptions {
  /** Enable timer mode (for MuRush) */
  timerEnabled?: boolean;
  /** Timer duration in seconds */
  timerDuration?: number;
  /** Points per correct answer */
  pointsPerCorrect?: number;
  /** Callback when time runs out */
  onTimeUp?: () => void;
}

interface UseGameLogicReturn {
  // Timer state
  timeRemaining: number;
  isTimerRunning: boolean;

  // Game state helpers
  isLastRound: boolean;
  progressPercent: number;

  // Timer controls
  startTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;

  // Scoring helpers
  calculateScore: (correct: number, total: number) => number;
  getAccuracyPercent: (correct: number, total: number) => number;
}

export function useGameLogic(options: UseGameLogicOptions = {}): UseGameLogicReturn {
  const {
    timerEnabled = false,
    timerDuration = 60,
    pointsPerCorrect = 100,
    onTimeUp,
  } = options;

  const { currentRound, totalRounds } = useGameStore();

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(timerDuration);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Computed values
  const isLastRound = currentRound >= totalRounds;
  const progressPercent = (currentRound / totalRounds) * 100;

  // Timer effect
  useEffect(() => {
    if (!timerEnabled || !isTimerRunning) {
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time's up!
          setIsTimerRunning(false);
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          onTimeUp?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timerEnabled, isTimerRunning, onTimeUp]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Timer controls
  const startTimer = useCallback(() => {
    if (timerEnabled) {
      setIsTimerRunning(true);
    }
  }, [timerEnabled]);

  const stopTimer = useCallback(() => {
    setIsTimerRunning(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, []);

  const resetTimer = useCallback(() => {
    stopTimer();
    setTimeRemaining(timerDuration);
  }, [stopTimer, timerDuration]);

  // Scoring helpers
  const calculateScore = useCallback(
    (correct: number, _total: number) => {
      return correct * pointsPerCorrect;
    },
    [pointsPerCorrect]
  );

  const getAccuracyPercent = useCallback((correct: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((correct / total) * 100);
  }, []);

  return {
    // Timer state
    timeRemaining,
    isTimerRunning,

    // Game state helpers
    isLastRound,
    progressPercent,

    // Timer controls
    startTimer,
    stopTimer,
    resetTimer,

    // Scoring helpers
    calculateScore,
    getAccuracyPercent,
  };
}

/**
 * Format time as MM:SS
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get a random item from an array
 */
export function getRandomItem<T>(items: T[]): T {
  const index = Math.floor(Math.random() * items.length);
  return items[index];
}

/**
 * Shuffle an array (Fisher-Yates algorithm)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
