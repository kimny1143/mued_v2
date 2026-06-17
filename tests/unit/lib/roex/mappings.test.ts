import { describe, it, expect } from 'vitest';
import {
  MUSICAL_STYLE_MAP,
  INSTRUMENT_GROUP_MAP,
  mapMusicalStyle,
  mapInstrumentGroup,
} from '@/lib/roex/mappings';
import { MusicalStyle, InstrumentGroup } from '@/lib/roex/types';

// ─── MUSICAL_STYLE_MAP ──────────────────────────────────────────────────────

describe('MUSICAL_STYLE_MAP', () => {
  it('maps all UI styles to valid RoEx MusicalStyle values', () => {
    const validValues = Object.values(MusicalStyle);
    for (const [_uiKey, roexValue] of Object.entries(MUSICAL_STYLE_MAP)) {
      expect(validValues).toContain(roexValue);
    }
  });

  it('covers all expected UI styles', () => {
    const expectedKeys = [
      'pop', 'rock', 'hiphop', 'electronic', 'acoustic',
      'jazz', 'classical', 'rnb', 'country', 'metal',
      'reggae', 'other',
    ];
    for (const key of expectedKeys) {
      expect(MUSICAL_STYLE_MAP).toHaveProperty(key);
    }
  });

  it('maps specific styles correctly', () => {
    expect(MUSICAL_STYLE_MAP.pop).toBe('POP');
    expect(MUSICAL_STYLE_MAP.rock).toBe('ROCK_INDIE');
    expect(MUSICAL_STYLE_MAP.hiphop).toBe('HIPHOP_GRIME');
    expect(MUSICAL_STYLE_MAP.electronic).toBe('ELECTRONIC');
    expect(MUSICAL_STYLE_MAP.acoustic).toBe('ACOUSTIC');
    expect(MUSICAL_STYLE_MAP.jazz).toBe('OTHER');
    expect(MUSICAL_STYLE_MAP.classical).toBe('ORCHESTRAL');
    expect(MUSICAL_STYLE_MAP.rnb).toBe('POP');
    expect(MUSICAL_STYLE_MAP.country).toBe('ACOUSTIC');
    expect(MUSICAL_STYLE_MAP.metal).toBe('METAL');
    expect(MUSICAL_STYLE_MAP.reggae).toBe('REGGAE_DUB');
    expect(MUSICAL_STYLE_MAP.other).toBe('OTHER');
  });
});

describe('mapMusicalStyle', () => {
  it('returns mapped value for known styles', () => {
    expect(mapMusicalStyle('pop')).toBe('POP');
    expect(mapMusicalStyle('rock')).toBe('ROCK_INDIE');
    expect(mapMusicalStyle('metal')).toBe('METAL');
  });

  it('returns OTHER for unknown styles', () => {
    expect(mapMusicalStyle('unknown')).toBe('OTHER');
    expect(mapMusicalStyle('')).toBe('OTHER');
    expect(mapMusicalStyle('funk')).toBe('OTHER');
  });

  it('is idempotent: an already-RoEx-enum value passes through (not downgraded to OTHER)', () => {
    // session.musicalStyle is the RoEx enum when set via the set_musical_style chat tool.
    expect(mapMusicalStyle('ROCK_INDIE')).toBe('ROCK_INDIE');
    expect(mapMusicalStyle('POP')).toBe('POP');
    expect(mapMusicalStyle('HIPHOP_GRIME')).toBe('HIPHOP_GRIME');
    expect(mapMusicalStyle('ORCHESTRAL')).toBe('ORCHESTRAL');
    expect(mapMusicalStyle('REGGAE_DUB')).toBe('REGGAE_DUB');
    expect(mapMusicalStyle('OTHER')).toBe('OTHER');
    // every enum value round-trips
    for (const enumVal of Object.values(MUSICAL_STYLE_MAP)) {
      expect(mapMusicalStyle(enumVal)).toBe(enumVal);
    }
  });
});

// ─── INSTRUMENT_GROUP_MAP ────────────────────────────────────────────────────

describe('INSTRUMENT_GROUP_MAP', () => {
  it('maps all UI groups to valid RoEx InstrumentGroup values', () => {
    const validValues = Object.values(InstrumentGroup);
    for (const [_uiKey, roexValue] of Object.entries(INSTRUMENT_GROUP_MAP)) {
      expect(validValues).toContain(roexValue);
    }
  });

  it('covers all expected UI groups', () => {
    const expectedKeys = [
      'VOCAL', 'GUITAR', 'BASS', 'DRUMS', 'KEYS',
      'SYNTH', 'STRINGS', 'BRASS', 'OTHER',
    ];
    for (const key of expectedKeys) {
      expect(INSTRUMENT_GROUP_MAP).toHaveProperty(key);
    }
  });

  it('maps specific groups correctly (verified against RoEx API enum)', () => {
    expect(INSTRUMENT_GROUP_MAP.DRUMS).toBe('DRUMS_GROUP');
    expect(INSTRUMENT_GROUP_MAP.GUITAR).toBe('E_GUITAR_GROUP');
    expect(INSTRUMENT_GROUP_MAP.OTHER).toBe('OTHER_GROUP1');
  });

  it('maps all groups correctly', () => {
    expect(INSTRUMENT_GROUP_MAP.VOCAL).toBe('VOCAL_GROUP');
    expect(INSTRUMENT_GROUP_MAP.BASS).toBe('BASS_GROUP');
    expect(INSTRUMENT_GROUP_MAP.KEYS).toBe('KEYS_GROUP');
    expect(INSTRUMENT_GROUP_MAP.SYNTH).toBe('SYNTH_GROUP');
    expect(INSTRUMENT_GROUP_MAP.STRINGS).toBe('STRINGS_GROUP');
    expect(INSTRUMENT_GROUP_MAP.BRASS).toBe('BRASS_GROUP');
  });
});

describe('mapInstrumentGroup', () => {
  it('returns mapped value for known groups', () => {
    expect(mapInstrumentGroup('VOCAL')).toBe('VOCAL_GROUP');
    expect(mapInstrumentGroup('DRUMS')).toBe('DRUMS_GROUP');
    expect(mapInstrumentGroup('GUITAR')).toBe('E_GUITAR_GROUP');
  });

  it('returns UNKNOWN_GROUP for unknown groups', () => {
    expect(mapInstrumentGroup('UNKNOWN')).toBe('UNKNOWN_GROUP');
    expect(mapInstrumentGroup('')).toBe('UNKNOWN_GROUP');
    expect(mapInstrumentGroup('FLUTE')).toBe('UNKNOWN_GROUP');
  });
});
