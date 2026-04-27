import { describe, it, expect } from 'vitest';
import {
  mapLufsToDesiredLoudness,
  getLufsGapJudgment,
  DELIVERY_TARGET_LUFS,
} from '@/lib/dial/lufs-presets';

describe('mapLufsToDesiredLoudness', () => {
  it('returns LOW for broadcast (-23 LUFS)', () => {
    expect(mapLufsToDesiredLoudness(-23)).toBe('LOW');
  });

  it('returns LOW for anything <= -20', () => {
    expect(mapLufsToDesiredLoudness(-20)).toBe('LOW');
    expect(mapLufsToDesiredLoudness(-25)).toBe('LOW');
  });

  it('returns MEDIUM for Apple Music / Podcast range (-16)', () => {
    expect(mapLufsToDesiredLoudness(-16)).toBe('MEDIUM');
  });

  it('returns MEDIUM for range -19 to -15', () => {
    expect(mapLufsToDesiredLoudness(-19)).toBe('MEDIUM');
    expect(mapLufsToDesiredLoudness(-15)).toBe('MEDIUM');
  });

  it('returns HIGH for Spotify / YouTube (-14 LUFS)', () => {
    expect(mapLufsToDesiredLoudness(-14)).toBe('HIGH');
  });

  it('returns HIGH for anything above -15', () => {
    expect(mapLufsToDesiredLoudness(-14)).toBe('HIGH');
    expect(mapLufsToDesiredLoudness(-9)).toBe('HIGH');
  });
});

describe('getLufsGapJudgment', () => {
  it('returns ok when within ±1.0 dB', () => {
    const result = getLufsGapJudgment(-14, -14);
    expect(result.status).toBe('ok');
  });

  it('returns ok at exactly +1.0 boundary', () => {
    expect(getLufsGapJudgment(-13, -14).status).toBe('ok');
  });

  it('returns ok at exactly -1.0 boundary', () => {
    expect(getLufsGapJudgment(-15, -14).status).toBe('ok');
  });

  it('returns over when measured is louder than target by more than 1 dB', () => {
    const result = getLufsGapJudgment(-12, -14);
    expect(result.status).toBe('over');
    if (result.status === 'over') {
      expect(result.gapDb).toBeCloseTo(2);
    }
  });

  it('returns boost when measured is quieter than target by more than 1 dB', () => {
    const result = getLufsGapJudgment(-17, -14);
    expect(result.status).toBe('boost');
    if (result.status === 'boost') {
      expect(result.gapDb).toBeCloseTo(3);
    }
  });

  it('reflects correct gap for Spotify target (-14)', () => {
    const target = DELIVERY_TARGET_LUFS.spotify;
    const result = getLufsGapJudgment(-18, target);
    expect(result.status).toBe('boost');
    if (result.status === 'boost') {
      expect(result.gapDb).toBeCloseTo(4);
    }
  });

  it('reflects correct gap for broadcast target (-23)', () => {
    const target = DELIVERY_TARGET_LUFS.broadcast;
    const result = getLufsGapJudgment(-14, target);
    expect(result.status).toBe('over');
    if (result.status === 'over') {
      expect(result.gapDb).toBeCloseTo(9);
    }
  });
});
