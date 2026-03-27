/**
 * User Profiles Schema — "How Hoo Sees You"
 *
 * Stores Hoo's understanding of the user: musical preferences,
 * creative tendencies, production style, and areas still unknown.
 *
 * Data sources:
 * - MUEDlobe cognitive scores (cognitive_profiles)
 * - Hoo conversation history (hoo_conversations)
 * - DAW parameter logs (muednote_daw_logs)
 * - User custom instructions (hoo_memories)
 *
 * Designed for incremental updates: each conversation or DAW session
 * can add new insights without reprocessing the entire history.
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from '../schema';

// ========================================
// Type Definitions
// ========================================

/** Musical preferences extracted from conversations */
export interface MusicalPreferences {
  genres: string[];                  // e.g. ["indie rock", "lo-fi hip hop"]
  instruments: string[];             // e.g. ["guitar", "synth", "vocals"]
  influences: string[];              // e.g. ["Radiohead", "Nujabes"]
  productionStyle: string | null;    // e.g. "warm and analog-leaning"
  mixingPreferences: string | null;  // e.g. "vocal-forward, wide stereo image"
}

/** Creative tendencies inferred from behavior patterns */
export interface CreativeTendencies {
  focusAreas: string[];              // Most discussed topics: ["harmony", "mix", "emotion"]
  strengths: string[];               // e.g. ["melodic intuition", "detailed arrangement"]
  growthAreas: string[];             // e.g. ["mixing low end", "vocal processing"]
  workPatterns: string | null;       // e.g. "night owl, deep work sessions of 90+ mins"
}

/** Cognitive style summary from MUEDlobe */
export interface CognitiveStyle {
  summary: string | null;            // e.g. "Visual-spatial thinker, strong working memory"
  informationDensity: string | null; // low / medium / high
  pacing: string | null;             // slow / moderate / fast
  abstractionLevel: string | null;   // concrete / mixed / abstract
}

/** Full profile as Hoo understands it */
export interface UserProfileData {
  musical: MusicalPreferences;
  creative: CreativeTendencies;
  cognitive: CognitiveStyle;
  bio: string | null;                // One-line summary: "Indie rock guitarist..."
  lastExtractedFromConversation: string | null; // conversation ID
  lastExtractedFromDawLog: string | null;       // timestamp
}

// ========================================
// Table
// ========================================

export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id),

  /** Structured profile data */
  profileData: jsonb('profile_data').$type<UserProfileData>().notNull(),

  /** User corrections (overrides auto-generated data) */
  userCorrections: jsonb('user_corrections').$type<Partial<UserProfileData>>(),

  /** Number of times profile has been updated */
  updateCount: integer('update_count').notNull().default(1),

  /** Generation metadata */
  generatedBy: text('generated_by').notNull().default('system'), // system | user_edit
  generationModel: text('generation_model'),                      // e.g. "gpt-5-mini"

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: uniqueIndex('idx_user_profiles_user_id').on(table.userId),
}));

// ========================================
// Inferred Types
// ========================================

export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;

// ========================================
// Default Profile
// ========================================

export const DEFAULT_PROFILE_DATA: UserProfileData = {
  musical: {
    genres: [],
    instruments: [],
    influences: [],
    productionStyle: null,
    mixingPreferences: null,
  },
  creative: {
    focusAreas: [],
    strengths: [],
    growthAreas: [],
    workPatterns: null,
  },
  cognitive: {
    summary: null,
    informationDensity: null,
    pacing: null,
    abstractionLevel: null,
  },
  bio: null,
  lastExtractedFromConversation: null,
  lastExtractedFromDawLog: null,
};
