/**
 * MUEDear Game Store (Zustand)
 * Manages game state and player progress with persistence
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  GameId,
  GameState,
  GameResult,
  PlayerStats,
  PlayLimit,
  DEFAULT_PLAY_LIMIT,
  AdWatchLimit,
  DEFAULT_AD_WATCH_LIMIT,
  AD_CONFIG,
  FrequencyBand,
  FREQUENCY_BANDS,
} from '../types/game';
import { TrackId } from '../services/audioService';
import {
  zustandStorage,
  getTodayString,
  shouldResetPlayLimit,
  createFreshPlayLimit,
  createFreshAdWatchLimit,
} from '../services/storageService';
import { logger } from '../utils/logger';

interface GameStore {
  // Current game state (not persisted)
  currentGame: GameId | null;
  gameState: GameState;
  currentRound: number;
  totalRounds: number;
  score: number;
  correctAnswers: number;

  // MuFreQ specific (not persisted)
  currentFrequency: FrequencyBand | null;
  isPlayingA: boolean;
  hasAnswered: boolean;

  // Audio state (not persisted)
  currentTrackId: TrackId | null;
  isAudioLoaded: boolean;
  isDemoMode: boolean;

  // Persisted state
  playLimit: PlayLimit;
  adWatchLimit: AdWatchLimit;
  stats: PlayerStats;

  // Hydration state
  _hasHydrated: boolean;

  // Actions
  startGame: (gameId: GameId) => boolean;
  endGame: () => GameResult;
  nextRound: () => void;
  submitAnswer: (answer: FrequencyBand | string) => boolean;
  setPlayingA: (isA: boolean) => void;
  togglePlayback: () => void;
  addBonusGames: (count: number) => void;
  canPlay: () => boolean;
  canWatchAd: () => boolean;
  recordAdWatch: () => void;
  getRemainingPlays: () => number;
  getRemainingAdWatches: () => number;
  reset: () => void;

  // Audio actions
  setCurrentTrack: (trackId: TrackId | null) => void;
  setAudioLoaded: (loaded: boolean) => void;
  setDemoMode: (demo: boolean) => void;

  // Persistence actions
  setHasHydrated: (state: boolean) => void;
  checkDailyReset: () => void;
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

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
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
      currentTrackId: null,
      isAudioLoaded: false,
      isDemoMode: true,
      playLimit: DEFAULT_PLAY_LIMIT,
      adWatchLimit: DEFAULT_AD_WATCH_LIMIT,
      stats: initialStats,
      _hasHydrated: false,

      /**
       * Start a new game
       * @returns true if game started successfully, false if play limit reached
       */
      startGame: (gameId: GameId) => {
        // Check daily reset first
        get().checkDailyReset();

        // Re-get playLimit after potential reset
        const currentPlayLimit = get().playLimit;

        // Check if can play
        if (currentPlayLimit.gamesPlayed >= currentPlayLimit.maxGames + currentPlayLimit.bonusGames) {
          logger.log('[GameStore] Play limit reached');
          return false;
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
            ...currentPlayLimit,
            gamesPlayed: currentPlayLimit.gamesPlayed + 1,
          },
        });

        logger.log('[GameStore] Game started:', gameId);
        return true;
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
          duration: 0,
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

        logger.log('[GameStore] Game ended:', result);
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

        // Input validation: ensure answer is a valid frequency band
        const validFrequencies = FREQUENCY_BANDS.map((b) => b.value);
        if (typeof answer === 'number' && !validFrequencies.includes(answer as FrequencyBand)) {
          logger.warn('[GameStore] Invalid frequency answer:', answer);
          return false;
        }

        const isCorrect = answer === currentFrequency;
        const points = isCorrect ? 100 : 0;

        set({
          hasAnswered: true,
          gameState: 'answered',
          score: score + points,
          correctAnswers: get().correctAnswers + (isCorrect ? 1 : 0),
        });

        logger.log('[GameStore] Answer submitted:', { answer, correct: isCorrect });
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
        logger.log('[GameStore] Bonus games added:', count);
      },

      /**
       * Check if player can play
       */
      canPlay: () => {
        // Check daily reset first
        get().checkDailyReset();
        const { playLimit } = get();
        return playLimit.gamesPlayed < playLimit.maxGames + playLimit.bonusGames;
      },

      /**
       * Check if player can watch more ads today
       */
      canWatchAd: () => {
        get().checkDailyReset();
        const { adWatchLimit } = get();
        return adWatchLimit.watchCount < adWatchLimit.maxWatches;
      },

      /**
       * Record an ad watch and add bonus plays
       */
      recordAdWatch: () => {
        const { adWatchLimit, playLimit } = get();

        if (adWatchLimit.watchCount >= adWatchLimit.maxWatches) {
          logger.log('[GameStore] Ad watch limit reached for today');
          return;
        }

        set({
          adWatchLimit: {
            ...adWatchLimit,
            watchCount: adWatchLimit.watchCount + 1,
          },
          playLimit: {
            ...playLimit,
            bonusGames: playLimit.bonusGames + AD_CONFIG.PLAYS_PER_AD,
          },
        });

        logger.log('[GameStore] Ad watched, bonus plays added:', AD_CONFIG.PLAYS_PER_AD);
      },

      /**
       * Get remaining plays for today
       */
      getRemainingPlays: () => {
        get().checkDailyReset();
        const { playLimit } = get();
        return Math.max(0, playLimit.maxGames + playLimit.bonusGames - playLimit.gamesPlayed);
      },

      /**
       * Get remaining ad watches for today
       */
      getRemainingAdWatches: () => {
        get().checkDailyReset();
        const { adWatchLimit } = get();
        return Math.max(0, adWatchLimit.maxWatches - adWatchLimit.watchCount);
      },

      /**
       * Reset game state (not persisted data)
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
          currentTrackId: null,
          isAudioLoaded: false,
        });
      },

      /**
       * Set current audio track
       */
      setCurrentTrack: (trackId: TrackId | null) => {
        set({ currentTrackId: trackId });
        logger.log('[GameStore] Track set:', trackId);
      },

      /**
       * Set audio loaded state
       */
      setAudioLoaded: (loaded: boolean) => {
        set({ isAudioLoaded: loaded });
        logger.log('[GameStore] Audio loaded:', loaded);
      },

      /**
       * Set demo mode (no audio files available)
       */
      setDemoMode: (demo: boolean) => {
        set({ isDemoMode: demo });
        logger.log('[GameStore] Demo mode:', demo);
      },

      /**
       * Set hydration state
       */
      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },

      /**
       * Check and perform daily reset if needed
       */
      checkDailyReset: () => {
        const { playLimit, adWatchLimit } = get();

        if (shouldResetPlayLimit(playLimit.date)) {
          logger.log('[GameStore] Daily reset triggered');
          set({
            playLimit: createFreshPlayLimit(),
            adWatchLimit: createFreshAdWatchLimit(),
          });
        }
      },
    }),
    {
      name: '@muedear/game-store',
      storage: createJSONStorage(() => zustandStorage),
      // Only persist stats, playLimit, and adWatchLimit
      partialize: (state) => ({
        stats: state.stats,
        playLimit: state.playLimit,
        adWatchLimit: state.adWatchLimit,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Check for daily reset after rehydration
          state.checkDailyReset();
          state.setHasHydrated(true);
          logger.log('[GameStore] Rehydrated from storage');
        }
      },
    }
  )
);

// Export a hook to wait for hydration
export const useGameStoreHydrated = () => useGameStore((state) => state._hasHydrated);
