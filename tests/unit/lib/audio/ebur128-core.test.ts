import { describe, it, expect } from 'vitest';
import {
  SURROUND_GAIN,
  ABS_GATE_THRESH,
  computeKWeightingCoefficients,
  slidingLufs,
  computeIntegrated,
  channelGain,
} from '@/lib/audio/ebur128-core';

// ─── Constants ────────────────────────────────────────────────────────────────

describe('BS.1770-4 constants', () => {
  it('SURROUND_GAIN = 10^(1.5/10) ≈ 1.41254 — NOT 1.41 (√2)', () => {
    expect(SURROUND_GAIN).toBeCloseTo(1.41254, 4);
    expect(SURROUND_GAIN).not.toBeCloseTo(Math.SQRT2, 4);  // √2 ≈ 1.41421 is wrong
  });

  it('ABS_GATE_THRESH matches -70 LUFS absolute gate', () => {
    // -70 LUFS → meanSq via: LUFS = -0.691 + 10*log10(meanSq)
    const expected = Math.pow(10, (-70 + 0.691) / 10);
    expect(ABS_GATE_THRESH).toBeCloseTo(expected, 10);
  });

  it('ABS_GATE_THRESH round-trips to -70 LUFS', () => {
    const lufs = -0.691 + 10 * Math.log10(ABS_GATE_THRESH);
    expect(lufs).toBeCloseTo(-70, 5);
  });
});

// ─── K-weighting coefficients ─────────────────────────────────────────────────

describe('computeKWeightingCoefficients', () => {
  it('produces non-trivial stage-1 high-shelf coefficients at 48000 Hz', () => {
    const { s1, s2 } = computeKWeightingCoefficients(48000);
    // Stage 1: high-shelf has b0 > 1 (gain at high frequencies)
    expect(s1.b0).toBeGreaterThan(1);
    // Stage 1 b1 negative (high-shelf characteristic)
    expect(s1.b1).toBeLessThan(0);
    // All coefficients finite
    for (const c of [s1.b0, s1.b1, s1.b2, s1.a1, s1.a2, s2.b0, s2.b1, s2.b2, s2.a1, s2.a2]) {
      expect(isFinite(c)).toBe(true);
    }
  });

  it('stage-2 HP removes DC: b0 + b1 + b2 ≈ 0 (zero gain at DC)', () => {
    const { s2 } = computeKWeightingCoefficients(48000);
    // For HP filter: sum of numerator coefficients = 0 (null at ω=0)
    expect(s2.b0 + s2.b1 + s2.b2).toBeCloseTo(0, 8);
  });

  it('44100 Hz and 48000 Hz produce different coefficients (sample-rate aware)', () => {
    const c44 = computeKWeightingCoefficients(44100);
    const c48 = computeKWeightingCoefficients(48000);
    expect(c44.s1.b0).not.toBeCloseTo(c48.s1.b0, 6);
  });

  it('stage-1 coefficients match BS.1770-4 reference values at 48000 Hz (±1e-6)', () => {
    const { s1 } = computeKWeightingCoefficients(48000);
    // Reference values from ITU-R BS.1770-4 Annex 1, Table 1
    expect(s1.b0).toBeCloseTo( 1.53512485958697, 5);
    expect(s1.b1).toBeCloseTo(-2.69169618940638, 5);
    expect(s1.b2).toBeCloseTo( 1.19839281085285, 5);
    expect(s1.a1).toBeCloseTo(-1.69065929318241, 5);
    expect(s1.a2).toBeCloseTo( 0.73248077421585, 5);
  });
});

// ─── slidingLufs ──────────────────────────────────────────────────────────────

describe('slidingLufs', () => {
  it('empty buffer → -Infinity', () => {
    expect(slidingLufs(new Float64Array(4), 0)).toBe(-Infinity);
  });

  it('zero-power buffer → -Infinity', () => {
    const buf = new Float64Array([0, 0, 0, 0]);
    expect(slidingLufs(buf, 4)).toBe(-Infinity);
  });

  it('single block: known power → correct LUFS', () => {
    // LUFS = -0.691 + 10*log10(meanSq)
    // For meanSq = 0.5 → LUFS = -0.691 + 10*log10(0.5) ≈ -3.701
    const buf = new Float64Array([0.5, 0, 0, 0]);
    const result = slidingLufs(buf, 1);
    expect(result).toBeCloseTo(-3.701, 2);
  });

  it('power for -23 LUFS target', () => {
    // -23 = -0.691 + 10*log10(power) → power = 10^(-22.309/10) ≈ 0.005887
    const targetPower = Math.pow(10, (-23 + 0.691) / 10);
    const buf = new Float64Array([targetPower, 0, 0, 0]);
    expect(slidingLufs(buf, 1)).toBeCloseTo(-23.0, 3);
  });

  it('4-block momentary window averages correctly', () => {
    // Four identical blocks of power P → LUFS same as single block
    const p = Math.pow(10, (-14 + 0.691) / 10);
    const buf = new Float64Array([p, p, p, p]);
    expect(slidingLufs(buf, 4)).toBeCloseTo(-14.0, 3);
  });

  it('partial fill (2 of 4 blocks)', () => {
    // Only first 2 slots used
    const p = Math.pow(10, (-18 + 0.691) / 10);
    const buf = new Float64Array([p, p, 0, 0]);
    expect(slidingLufs(buf, 2)).toBeCloseTo(-18.0, 3);
  });
});

// ─── computeIntegrated ───────────────────────────────────────────────────────

describe('computeIntegrated', () => {
  it('no abs-gated blocks → -Infinity', () => {
    expect(computeIntegrated(new Float64Array(100), 0, 0)).toBe(-Infinity);
  });

  it('blocks above relative gate → correct integrated LUFS', () => {
    // 10 identical blocks at -14 LUFS
    const p = Math.pow(10, (-14 + 0.691) / 10);
    const blocks = new Float64Array(10).fill(p);
    const n = 10;
    const sum = p * n;
    expect(computeIntegrated(blocks, n, sum)).toBeCloseTo(-14.0, 2);
  });

  it('relative gate excludes quiet blocks (Γ_a − 10 LU)', () => {
    // 8 loud blocks at -14 LUFS, 2 very quiet blocks just above abs gate
    const loudP = Math.pow(10, (-14 + 0.691) / 10);
    const quietP = ABS_GATE_THRESH * 1.1;  // just above absolute gate

    const blocks = new Float64Array(10);
    for (let i = 0; i < 8; i++) blocks[i] = loudP;
    for (let i = 8; i < 10; i++) blocks[i] = quietP;

    const absGatedN = 10;
    const absGatedSum = 8 * loudP + 2 * quietP;

    // Relative gate Γ_r = Γ_a - 10 LU
    // Γ_a ≈ loudP (since loudP >> quietP)
    // quiet blocks (≈-70 LUFS) are well below Γ_a - 10 LU (≈-24 LUFS)
    // → only loud blocks should be included
    const result = computeIntegrated(blocks, absGatedN, absGatedSum);
    expect(result).toBeCloseTo(-14.0, 1);
  });
});

// ─── channelGain ─────────────────────────────────────────────────────────────

describe('channelGain (BS.1770-4 channel weighting)', () => {
  it('L (ch 0) = 1.0', () => expect(channelGain(0)).toBe(1.0));
  it('R (ch 1) = 1.0', () => expect(channelGain(1)).toBe(1.0));
  it('C (ch 2) = 1.0', () => expect(channelGain(2)).toBe(1.0));
  it('LFE (ch 3) = 0 — excluded per BS.1770-4', () => expect(channelGain(3)).toBe(0));
  it('Ls (ch 4) = SURROUND_GAIN (+1.5 dB)', () => expect(channelGain(4)).toBe(SURROUND_GAIN));
  it('Rs (ch 5) = SURROUND_GAIN (+1.5 dB)', () => expect(channelGain(5)).toBe(SURROUND_GAIN));
  it('stereo inputs (ch 0, 1) always get gain 1.0 — no surround weighting', () => {
    expect(channelGain(0)).toBe(1.0);
    expect(channelGain(1)).toBe(1.0);
  });
});
