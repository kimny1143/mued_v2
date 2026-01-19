/**
 * MUEDear Game Store (Zustand)
 * Manages game state and player progress
 */

import { create } from 'zustand';
import {
  GameId,
  GameState,
  GameResult,
  PlayerStats,
  PlayLimit,
  DEFAULT_PLAY_LIMIT,
  FrequencyBand,
  FREQUENCY_BANDS,
} from '../types/game';

interface GameStore {
  // Current game state
  currentGame: GameId | null;
  gameState: GameState;
  currentRound: number;
  totalRounds: number;
  score: number;
  correctAnswers: number;

  // MuFreQ specific
  currentFrequency: FrequencyBand | null;
  isPlayingA: boolean;
  hasAnswered: boolean;

  // Player state
  playLimit: PlayLimit;
  stats: PlayerStats;

  // Actions
  startGame: (gameId: GameId) => void;
  endGame: () => GameResult;
  nextRound: () => void;
  submitAnswer: (answer: FrequencyBand | string) => boolean;
  setPlayingA: (isA: boolean) => void;
  togglePlayback: () => void;
  addBonusGames: (count: number) => void;
  canPlay: () => boolean;
  reset: () => void;
}

// Initial stats
const initialStats: PlayerStats = {
  totalGames: 0,
  totalCorrect: 0,
  bestScores: {
    mufreq: 0,
    mucomp: 0,
    murush: 0,
    muverb: 0,
    muwidth: 0,
  },
  streaks: {
    mufreq: 0,
    mucomp: 0,
    murush: 0,
    muverb: 0,
    muwidth: 0,
  },
  lastPlayedAt: null,
};

// Get random frequency
const getRandomFrequency = (): FrequencyBand => {
  const index = Math.floor(Math.random() * FREQUENCY_BANDS.length);
  return FREQUENCY_BANDS[index].value;
};

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  currentGame: null,
  gameState: 'idle',
  currentRound: 0,
  totalRounds: 10,
  score: 0,
  correctAnswers: 0,
  currentFrequency: null,
  isPlayingA: true,
  hasAnswered: false,
  playLimit: DEFAULT_PLAY_LIMIT,
  stats: initialStats,

  /**
   * Start a new game
   */
  startGame: (gameId: GameId) => {
    const { playLimit } = get();

    // Check if can play
    if (playLimit.gamesPlayed >= playLimit.maxGames + playLimit.bonusGames) {
      console.log('[GameStore] Play limit reached');
      return;
    }

    set({
      currentGame: gameId,
      gameState: 'playing',
      currentRound: 1,
      score: 0,
      correctAnswers: 0,
      currentFrequency: getRandomFrequency(),
      isPlayingA: true,
      hasAnswered: false,
      playLimit: {
        ...playLimit,
        gamesPlayed: playLimit.gamesPlayed + 1,
      },
    });

    console.log('[GameStore] Game started:', gameId);
  },

  /**
   * End the current game
   */
  endGame: () => {
    const { currentGame, score, totalRounds, correctAnswers, stats } = get();

    const result: GameResult = {
      gameId: currentGame!,
      score,
      totalRounds,
      correctAnswers,
      playedAt: new Date().toISOString(),
      duration: 0, // TODO: Track duration
    };

    // Update stats
    const newStats = {
      ...stats,
      totalGames: stats.totalGames + 1,
      totalCorrect: stats.totalCorrect + correctAnswers,
      lastPlayedAt: new Date().toISOString(),
    };

    // Update best score
    if (currentGame && score > stats.bestScores[currentGame]) {
      newStats.bestScores[currentGame] = score;
    }

    set({
      gameState: 'completed',
      stats: newStats,
    });

    console.log('[GameStore] Game ended:', result);
    return result;
  },

  /**
   * Move to next round
   */
  nextRound: () => {
    const { currentRound, totalRounds } = get();

    if (currentRound >= totalRounds) {
      get().endGame();
      return;
    }

    set({
      currentRound: currentRound + 1,
      currentFrequency: getRandomFrequency(),
      isPlayingA: true,
      hasAnswered: false,
      gameState: 'playing',
    });
  },

  /**
   * Submit an answer
   */
  submitAnswer: (answer: FrequencyBand | string) => {
    const { currentFrequency, score } = get();

    const isCorrect = answer === currentFrequency;
    const points = isCorrect ? 100 : 0;

    set({
      hasAnswered: true,
      gameState: 'answered',
      score: score + points,
      correctAnswers: get().correctAnswers + (isCorrect ? 1 : 0),
    });

    console.log('[GameStore] Answer submitted:', { answer, correct: isCorrect });
    return isCorrect;
  },

  /**
   * Set A/B playback
   */
  setPlayingA: (isA: boolean) => {
    set({ isPlayingA: isA });
  },

  /**
   * Toggle A/B playback
   */
  togglePlayback: () => {
    set((state) => ({ isPlayingA: !state.isPlayingA }));
  },

  /**
   * Add bonus games from watching ads
   */
  addBonusGames: (count: number) => {
    set((state) => ({
      playLimit: {
        ...state.playLimit,
        bonusGames: state.playLimit.bonusGames + count,
      },
    }));
    console.log('[GameStore] Bonus games added:', count);
  },

  /**
   * Check if player can play
   */
  canPlay: () => {
    const { playLimit } = get();
    return playLimit.gamesPlayed < playLimit.maxGames + playLimit.bonusGames;
  },

  /**
   * Reset game state
   */
  reset: () => {
    set({
      currentGame: null,
      gameState: 'idle',
      currentRound: 0,
      score: 0,
      correctAnswers: 0,
      currentFrequency: null,
      isPlayingA: true,
      hasAnswered: false,
    });
  },
}));
