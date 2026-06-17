/**
 * RoEx Enum Mappings
 *
 * Maps UI-facing values to RoEx API enum values.
 * Source of truth for enum values: ./types.ts
 */

import type { MusicalStyle, InstrumentGroup } from './types';

// ─── Musical Style ──────────────────────────────────────────────────────────

/** Map UI musical style keys to RoEx API MusicalStyle enum values */
export const MUSICAL_STYLE_MAP: Record<string, MusicalStyle> = {
  pop: 'POP',
  rock: 'ROCK_INDIE',
  hiphop: 'HIPHOP_GRIME',
  electronic: 'ELECTRONIC',
  acoustic: 'ACOUSTIC',
  jazz: 'OTHER',
  classical: 'ORCHESTRAL',
  rnb: 'POP',
  country: 'ACOUSTIC',
  metal: 'METAL',
  reggae: 'REGGAE_DUB',
  other: 'OTHER',
};

/** Valid RoEx MusicalStyle enum values (derived from the map's values). */
const VALID_ROEX_STYLES = new Set<MusicalStyle>(Object.values(MUSICAL_STYLE_MAP));

/**
 * Resolve a style to a RoEx MusicalStyle. Accepts BOTH UI keys (e.g. 'rock') AND values that are
 * already RoEx enums (e.g. 'ROCK_INDIE'). Idempotent: an enum value passes through unchanged instead
 * of falling through to 'OTHER'.
 *
 * Why both: `dial_sessions.musicalStyle` is a UI key when set at session creation, but the RoEx ENUM
 * when set via the `set_musical_style` chat tool. Passing the enum through the old UI-key-only lookup
 * silently downgraded a chat-chosen genre (e.g. ROCK_INDIE) to 'OTHER' for every RoEx
 * mix/master/analyze call — the user's genre was ignored. (Yuu df55abae: ROCK set in chat → mastered
 * as OTHER.)
 */
export function mapMusicalStyle(style: string): MusicalStyle {
  if (VALID_ROEX_STYLES.has(style as MusicalStyle)) return style as MusicalStyle;
  return MUSICAL_STYLE_MAP[style] ?? 'OTHER';
}

// ─── Instrument Group ───────────────────────────────────────────────────────

/** Map UI instrument group keys to RoEx API InstrumentGroup enum values */
export const INSTRUMENT_GROUP_MAP: Record<string, InstrumentGroup> = {
  VOCAL: 'VOCAL_GROUP',
  GUITAR: 'E_GUITAR_GROUP',
  BASS: 'BASS_GROUP',
  DRUMS: 'DRUMS_GROUP',
  KEYS: 'KEYS_GROUP',
  SYNTH: 'SYNTH_GROUP',
  STRINGS: 'STRINGS_GROUP',
  BRASS: 'BRASS_GROUP',
  OTHER: 'OTHER_GROUP1',
};

/** Resolve a UI instrument group string to RoEx InstrumentGroup. Defaults to 'UNKNOWN_GROUP'. */
export function mapInstrumentGroup(uiGroup: string): InstrumentGroup {
  return INSTRUMENT_GROUP_MAP[uiGroup] ?? 'UNKNOWN_GROUP';
}
