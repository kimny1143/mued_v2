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

/** Resolve a UI style string to RoEx MusicalStyle. Defaults to 'OTHER'. */
export function mapMusicalStyle(uiStyle: string): MusicalStyle {
  return MUSICAL_STYLE_MAP[uiStyle] ?? 'OTHER';
}

// ─── Instrument Group ───────────────────────────────────────────────────────

/** Map UI instrument group keys to RoEx API InstrumentGroup enum values */
export const INSTRUMENT_GROUP_MAP: Record<string, InstrumentGroup> = {
  VOCAL: 'VOCAL_GROUP',
  GUITAR: 'GUITAR_GROUP',
  BASS: 'BASS_GROUP',
  DRUMS: 'DRUM_GROUP',
  KEYS: 'KEYS_GROUP',
  SYNTH: 'SYNTH_GROUP',
  STRINGS: 'STRINGS_GROUP',
  BRASS: 'BRASS_GROUP',
  OTHER: 'OTHER_GROUP',
};

/** Resolve a UI instrument group string to RoEx InstrumentGroup. Defaults to 'OTHER_GROUP'. */
export function mapInstrumentGroup(uiGroup: string): InstrumentGroup {
  return INSTRUMENT_GROUP_MAP[uiGroup] ?? 'OTHER_GROUP';
}
