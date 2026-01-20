/**
 * MUEDear Game Types
 */

// Game identifiers
export type GameId = 'mufreq' | 'mucomp' | 'murush' | 'muverb' | 'muwidth';

// Game metadata
export interface GameInfo {
  id: GameId;
  name: string;
  description: string;
  category: 'eq' | 'dynamics' | 'space';
  icon: string; // Lucide icon name
  color: string;
  isLocked: boolean;
  difficulty: 1 | 2 | 3;
}

// Game state
export type GameState = 'idle' | 'playing' | 'answered' | 'completed';

// Frequency bands for MuFreQ/MuRush
export const FREQUENCY_BANDS = [
  { label: '60Hz', value: 60 },
  { label: '125Hz', value: 125 },
  { label: '250Hz', value: 250 },
  { label: '500Hz', value: 500 },
  { label: '1kHz', value: 1000 },
  { label: '2kHz', value: 2000 },
  { label: '4kHz', value: 4000 },
  { label: '8kHz', value: 8000 },
  { label: '12kHz', value: 12000 },
] as const;

export type FrequencyBand = (typeof FREQUENCY_BANDS)[number]['value'];

// Game result
export interface GameResult {
  gameId: GameId;
  score: number;
  totalRounds: number;
  correctAnswers: number;
  playedAt: string; // ISO date
  duration: number; // seconds
}

// Player statistics
export interface PlayerStats {
  totalGames: number;
  totalCorrect: number;
  bestScores: Record<GameId, number>;
  streaks: Record<GameId, number>;
  lastPlayedAt: string | null;
}

// Daily play limit
export interface PlayLimit {
  date: string; // YYYY-MM-DD
  gamesPlayed: number;
  maxGames: number;
  bonusGames: number; // From watching ads
}

// Ad watch limit (daily)
export interface AdWatchLimit {
  date: string; // YYYY-MM-DD
  watchCount: number;
  maxWatches: number; // 5 per day
}

// Ad constants
export const AD_CONFIG = {
  PLAYS_PER_AD: 3, // Bonus plays per ad watch
  MAX_WATCHES_PER_DAY: 5, // "そろそろゲームやめて制作しようね"
} as const;

// Game definitions
export const GAMES: GameInfo[] = [
  {
    id: 'mufreq',
    name: 'MuFreQ',
    description: 'Identify the boosted frequency',
    category: 'eq',
    icon: 'Activity',
    color: '#F5A623',
    isLocked: false,
    difficulty: 1,
  },
  {
    id: 'mucomp',
    name: 'MuComp',
    description: 'Spot the compressed audio',
    category: 'dynamics',
    icon: 'Gauge',
    color: '#7D9B76',
    isLocked: false,
    difficulty: 1,
  },
  {
    id: 'murush',
    name: 'MuRush',
    description: '60-second frequency challenge',
    category: 'eq',
    icon: 'Zap',
    color: '#EF4444',
    isLocked: true,
    difficulty: 2,
  },
  {
    id: 'muverb',
    name: 'MuVerb',
    description: 'Find the different reverb',
    category: 'space',
    icon: 'Waves',
    color: '#3B82F6',
    isLocked: true,
    difficulty: 2,
  },
  {
    id: 'muwidth',
    name: 'MuWidth',
    description: 'Identify stereo width',
    category: 'space',
    icon: 'ArrowLeftRight',
    color: '#8B5CF6',
    isLocked: true,
    difficulty: 3,
  },
];

// Default play limit
export const DEFAULT_PLAY_LIMIT: PlayLimit = {
  date: new Date().toISOString().split('T')[0],
  gamesPlayed: 0,
  maxGames: 5,
  bonusGames: 0,
};

// Default ad watch limit
export const DEFAULT_AD_WATCH_LIMIT: AdWatchLimit = {
  date: new Date().toISOString().split('T')[0],
  watchCount: 0,
  maxWatches: AD_CONFIG.MAX_WATCHES_PER_DAY,
};
