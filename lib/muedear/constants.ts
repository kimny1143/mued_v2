/**
 * MUEDear Landing Page Constants
 */

export const MUEDEAR_COLORS = {
  background: "#1A1A2E",
  mufreq: "#F5A623",   // Orange
  mucomp: "#7D9B76",   // Sage Green
  murush: "#EF4444",   // Red
  muverb: "#3B82F6",   // Blue
  mupan: "#8B5CF6",    // Purple
  muhorse: "#14B8A6",  // Teal
} as const;

export type GameKey = "mufreq" | "mucomp" | "murush" | "muverb" | "mupan" | "muhorse";

export const GAME_COLORS: Record<GameKey, string> = {
  mufreq: MUEDEAR_COLORS.mufreq,
  mucomp: MUEDEAR_COLORS.mucomp,
  murush: MUEDEAR_COLORS.murush,
  muverb: MUEDEAR_COLORS.muverb,
  mupan: MUEDEAR_COLORS.mupan,
  muhorse: MUEDEAR_COLORS.muhorse,
};

export const MUEDEAR_APP_STORE_URL = "https://apps.apple.com/app/muedear/id6758307988";
