/**
 * EBU R128 / ITU-R BS.1770-4 core computation — pure functions.
 *
 * This module contains the mathematical core of the BS.1770-4 loudness
 * measurement extracted from the AudioWorklet for testability.
 *
 * The AudioWorklet (`public/worklets/ebur128-processor.js`) mirrors this logic.
 * When changing the measurement algorithm, update both files.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** +1.5 dB power-domain gain for surround channels (Ls, Rs) per BS.1770-4 §2.1 */
export const SURROUND_GAIN = Math.pow(10, 1.5 / 10);  // ≈ 1.41254

/**
 * Absolute gate threshold in mean-square domain.
 * -70 LUFS → meanSq equivalent via LUFS = -0.691 + 10*log10(meanSq)
 */
export const ABS_GATE_THRESH = Math.pow(10, (-70 + 0.691) / 10);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BiquadCoeffs {
  b0: number; b1: number; b2: number; a1: number; a2: number;
}

export interface KWeightingCoeffs {
  s1: BiquadCoeffs;
  s2: BiquadCoeffs;
}

// ─── K-weighting filter ───────────────────────────────────────────────────────

/**
 * Compute sample-rate-aware K-weighting biquad coefficients.
 * Stage 1: high-shelf pre-filter (+3.999 dB at ~1682 Hz)
 * Stage 2: RLB weighting — 2nd-order HP Butterworth at ~38.14 Hz
 */
export function computeKWeightingCoefficients(fs: number): KWeightingCoeffs {
  const f0 = 1681.974450955533;
  const G  = 3.999843853973347;
  const Q  = 0.7071752369554196;
  const K  = Math.tan(Math.PI * f0 / fs);
  const Vh = Math.pow(10, G / 20);
  const Vb = Math.pow(Vh, 0.4996667741545416);
  const a0 = 1 + K / Q + K * K;
  const s1: BiquadCoeffs = {
    b0:  (Vh + Vb * K / Q + K * K) / a0,
    b1:  2 * (K * K - Vh) / a0,
    b2:  (Vh - Vb * K / Q + K * K) / a0,
    a1:  2 * (K * K - 1) / a0,
    a2:  (1 - K / Q + K * K) / a0,
  };

  const f1  = 38.13574584835530;
  const Q2  = 0.5003270373238773;
  const K2  = Math.tan(Math.PI * f1 / fs);
  const a0b = 1 + K2 / Q2 + K2 * K2;
  const s2: BiquadCoeffs = {
    b0:  1 / a0b,
    b1: -2 / a0b,
    b2:  1 / a0b,
    a1:  2 * (K2 * K2 - 1) / a0b,
    a2:  (1 - K2 / Q2 + K2 * K2) / a0b,
  };

  return { s1, s2 };
}

// ─── Loudness formulas ────────────────────────────────────────────────────────

/**
 * Compute LUFS from a sliding window of mean-square block values.
 * @param buf  Circular buffer of mean-square values (Float64Array)
 * @param fill Number of valid entries (≤ buf.length)
 */
export function slidingLufs(buf: Float64Array, fill: number): number {
  if (!fill) return -Infinity;
  let sum = 0;
  for (let i = 0; i < fill; i++) sum += buf[i];
  const mean = sum / fill;
  return mean > 0 ? -0.691 + 10 * Math.log10(mean) : -Infinity;
}

/**
 * Compute integrated (gated) LUFS from stored abs-gated block values.
 * Two-pass: absolute gate (-70 LUFS) then relative gate (Γ_a − 10 LU).
 *
 * @param absGatedBlocks  Ring buffer of mean-square values that passed absolute gate
 * @param head            Write head position (next write slot)
 * @param full            Whether the ring buffer has wrapped around
 */
export function computeIntegrated(
  absGatedBlocks: Float64Array,
  absGatedN: number,
  absGatedSum: number,
): number {
  if (absGatedN === 0) return -Infinity;
  const gammaA    = absGatedSum / absGatedN;
  const relThresh = gammaA * Math.pow(10, -10 / 10);  // Γ_a − 10 LU

  let relSum = 0, relN = 0;
  for (let i = 0; i < absGatedBlocks.length; i++) {
    const v = absGatedBlocks[i];
    if (v > 0 && v >= relThresh) {
      relSum += v;
      relN++;
    }
  }
  if (!relN) return -Infinity;
  const mean = relSum / relN;
  return mean > 0 ? -0.691 + 10 * Math.log10(mean) : -Infinity;
}

// ─── Channel weight helper ────────────────────────────────────────────────────

/**
 * BS.1770-4 channel weighting for the standard Web Audio 5.1 layout:
 *   ch 0 L, 1 R, 2 C  → 1.0 (0 dB)
 *   ch 3 LFE           → 0   (excluded)
 *   ch 4 Ls, 5 Rs      → SURROUND_GAIN (+1.5 dB)
 *
 * For stereo (ch 0–1) this always returns 1.0.
 */
export function channelGain(ch: number): number {
  if (ch === 3) return 0;           // LFE excluded
  if (ch >= 4)  return SURROUND_GAIN;
  return 1.0;
}
