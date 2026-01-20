/**
 * StorageService - MUEDear Data Persistence
 *
 * Handles local storage for game progress and player stats
 * using AsyncStorage with Zustand persist middleware.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlayerStats, PlayLimit, AdWatchLimit, AD_CONFIG } from '../types/game';

// Storage keys
const STORAGE_KEYS = {
  PLAYER_STATS: '@muedear/player_stats',
  PLAY_LIMIT: '@muedear/play_limit',
  SETTINGS: '@muedear/settings',
} as const;

/**
 * Save player statistics
 */
export async function savePlayerStats(stats: PlayerStats): Promise<void> {
  try {
    const jsonValue = JSON.stringify(stats);
    await AsyncStorage.setItem(STORAGE_KEYS.PLAYER_STATS, jsonValue);
    console.log('[StorageService] Player stats saved');
  } catch (error) {
    console.error('[StorageService] Failed to save player stats:', error);
    throw error;
  }
}

/**
 * Load player statistics
 */
export async function loadPlayerStats(): Promise<PlayerStats | null> {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.PLAYER_STATS);
    if (jsonValue === null) {
      console.log('[StorageService] No player stats found');
      return null;
    }
    const stats = JSON.parse(jsonValue) as PlayerStats;
    console.log('[StorageService] Player stats loaded');
    return stats;
  } catch (error) {
    console.error('[StorageService] Failed to load player stats:', error);
    return null;
  }
}

/**
 * Save play limit data
 */
export async function savePlayLimit(limit: PlayLimit): Promise<void> {
  try {
    const jsonValue = JSON.stringify(limit);
    await AsyncStorage.setItem(STORAGE_KEYS.PLAY_LIMIT, jsonValue);
    console.log('[StorageService] Play limit saved');
  } catch (error) {
    console.error('[StorageService] Failed to save play limit:', error);
    throw error;
  }
}

/**
 * Load play limit data
 */
export async function loadPlayLimit(): Promise<PlayLimit | null> {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.PLAY_LIMIT);
    if (jsonValue === null) {
      console.log('[StorageService] No play limit found');
      return null;
    }
    const limit = JSON.parse(jsonValue) as PlayLimit;
    console.log('[StorageService] Play limit loaded');
    return limit;
  } catch (error) {
    console.error('[StorageService] Failed to load play limit:', error);
    return null;
  }
}

/**
 * Get today's date string (YYYY-MM-DD)
 */
export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Check if the play limit needs to be reset (new day)
 */
export function shouldResetPlayLimit(savedDate: string): boolean {
  const today = getTodayString();
  return savedDate !== today;
}

/**
 * Create a fresh play limit for today
 */
export function createFreshPlayLimit(): PlayLimit {
  return {
    date: getTodayString(),
    gamesPlayed: 0,
    maxGames: 5,
    bonusGames: 0,
  };
}

/**
 * Create a fresh ad watch limit for today
 */
export function createFreshAdWatchLimit(): AdWatchLimit {
  return {
    date: getTodayString(),
    watchCount: 0,
    maxWatches: AD_CONFIG.MAX_WATCHES_PER_DAY,
  };
}

/**
 * Clear all stored data (for debugging/testing)
 */
export async function clearAllData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
    console.log('[StorageService] All data cleared');
  } catch (error) {
    console.error('[StorageService] Failed to clear data:', error);
    throw error;
  }
}

/**
 * Export storage interface for Zustand persist middleware
 */
export const zustandStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const value = await AsyncStorage.getItem(name);
      return value;
    } catch (error) {
      console.error('[StorageService] getItem error:', error);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(name, value);
    } catch (error) {
      console.error('[StorageService] setItem error:', error);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(name);
    } catch (error) {
      console.error('[StorageService] removeItem error:', error);
    }
  },
};
