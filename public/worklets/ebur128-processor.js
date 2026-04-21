/**
 * EBU R128 / ITU-R BS.1770-4 LUFS processor (AudioWorkletProcessor)
 *
 * K-weighting: 2-stage IIR biquad via bilinear transform (sample-rate aware)
 * Momentary:   400ms sliding window (4 × 100ms blocks)
 * Short-term:  3s sliding window   (30 × 100ms blocks)
 * Integrated:  2-pass gated (absolute -70 LUFS, relative Γ_a − 10 LU)
 *              Running sums — O(1) memory, no unbounded array growth
 *
 * Supports reset via port.postMessage({ reset: true })
 * (call on seek or take-switch to clear integrated state)
 *
 * Core math mirrors lib/audio/ebur128-core.ts (unit-tested pure functions).
 * When changing the algorithm, update both files.
 */

// BS.1770-4 §2.1: surround channel (+1.5 dB power gain for Ls, Rs)
const SURROUND_GAIN = Math.pow(10, 1.5 / 10);  // ≈ 1.41254, NOT √2 ≈ 1.41421

function computeKWeightingCoefficients(fs) {
  // Stage 1: pre-filter — high-shelf +3.999 dB at ~1682 Hz
  const f0 = 1681.974450955533;
  const G  = 3.999843853973347;
  const Q  = 0.7071752369554196;
  const K  = Math.tan(Math.PI * f0 / fs);
  const Vh = Math.pow(10, G / 20);
  const Vb = Math.pow(Vh, 0.4996667741545416);
  const a0 = 1 + K / Q + K * K;
  const s1 = {
    b0:  (Vh + Vb * K / Q + K * K) / a0,
    b1:  2 * (K * K - Vh) / a0,
    b2:  (Vh - Vb * K / Q + K * K) / a0,
    a1:  2 * (K * K - 1) / a0,
    a2:  (1 - K / Q + K * K) / a0,
  };

  // Stage 2: RLB weighting — 2nd-order HP Butterworth at ~38.14 Hz
  const f1  = 38.13574584835530;
  const Q2  = 0.5003270373238773;
  const K2  = Math.tan(Math.PI * f1 / fs);
  const a0b = 1 + K2 / Q2 + K2 * K2;
  const s2 = {
    b0:  1 / a0b,
    b1: -2 / a0b,
    b2:  1 / a0b,
    a1:  2 * (K2 * K2 - 1) / a0b,
    a2:  (1 - K2 / Q2 + K2 * K2) / a0b,
  };

  return { s1, s2 };
}

class EbuR128Processor extends AudioWorkletProcessor {
  static get parameterDescriptors() { return []; }

  constructor() {
    super();
    this._ready = false;
    this.port.onmessage = (e) => {
      if (e.data && e.data.reset) this._reset();
    };
  }

  _setup(nChannels) {
    this._nCh      = nChannels;
    this._coeffs   = computeKWeightingCoefficients(sampleRate);
    this._blockSz  = Math.round(sampleRate * 0.1); // 100 ms

    // Biquad state: [ch][stage] = {x1, x2, y1, y2}
    this._bq = Array.from({ length: nChannels }, () => [
      { x1: 0, x2: 0, y1: 0, y2: 0 },
      { x1: 0, x2: 0, y1: 0, y2: 0 },
    ]);

    this._blockAccum = new Float64Array(nChannels);
    this._blockN     = 0;

    // Sliding windows (circular — no push/shift overhead)
    this._mBuf  = new Float64Array(4);   // momentary: 4 blocks = 400 ms
    this._stBuf = new Float64Array(30);  // short-term: 30 blocks = 3 s
    this._mHead  = 0;
    this._stHead = 0;
    this._mFill  = 0;
    this._stFill = 0;

    this._reset();
    this._ready = true;
  }

  _reset() {
    if (this._bq) {
      for (const ch of this._bq) {
        for (const s of ch) { s.x1 = 0; s.x2 = 0; s.y1 = 0; s.y2 = 0; }
      }
    }
    if (this._blockAccum) this._blockAccum.fill(0);
    this._blockN = 0;
    if (this._mBuf)  { this._mBuf.fill(0);  this._mHead = 0; this._mFill = 0; }
    if (this._stBuf) { this._stBuf.fill(0); this._stHead = 0; this._stFill = 0; }

    // Integrated running sums (O(1) — no array growth)
    this._intN       = 0;    // total block count (unfiltered)
    this._intSum     = 0;    // running sum of all block meanSq (unfiltered, for abs gate)
    this._intAbsN    = 0;    // count of abs-gated blocks
    this._intAbsSum  = 0;    // sum of abs-gated block meanSq (for relative gate Γ_a)
    // Two-pass relative gate needs per-block values; we store compact ring
    // Limit to 3 hours at 10 blocks/s = 108 000 blocks (~864 KB Float64)
    this._intBlocks  = new Float64Array(108000);
    this._intBHead   = 0;
    this._intBFull   = false;
  }

  process(inputs, outputs) {
    const input = inputs[0];
    if (!input || !input.length) return true;

    // Passthrough: copy input to output so the audio graph stays active.
    // Without this, Chrome may withhold audio from inputs[0] when the worklet
    // output is unused, causing incorrect LUFS measurements.
    const output = outputs[0];
    if (output) {
      for (let ch = 0; ch < input.length && ch < output.length; ch++) {
        output[ch].set(input[ch]);
      }
    }

    const nCh = input.length;
    if (!this._ready || nCh !== this._nCh) this._setup(nCh);

    const c  = this._coeffs;
    const bq = this._bq;

    for (let i = 0, len = input[0].length; i < len; i++) {
      let chSum = 0;
      for (let ch = 0; ch < nCh; ch++) {
        const x    = input[ch][i];
        const bq1  = bq[ch][0];
        const y1   = c.s1.b0 * x  + c.s1.b1 * bq1.x1 + c.s1.b2 * bq1.x2
                   - c.s1.a1 * bq1.y1 - c.s1.a2 * bq1.y2;
        bq1.x2 = bq1.x1; bq1.x1 = x; bq1.y2 = bq1.y1; bq1.y1 = y1;

        const bq2  = bq[ch][1];
        const y2   = c.s2.b0 * y1 + c.s2.b1 * bq2.x1 + c.s2.b2 * bq2.x2
                   - c.s2.a1 * bq2.y1 - c.s2.a2 * bq2.y2;
        bq2.x2 = bq2.x1; bq2.x1 = y1; bq2.y2 = bq2.y1; bq2.y1 = y2;

        // BS.1770-4 channel weights (Web Audio 5.1 layout: L R C LFE Ls Rs)
        // LFE (ch 3): excluded (weight 0). Ls/Rs (ch 4-5): +1.5 dB power gain.
        const g = ch === 3 ? 0 : ch >= 4 ? SURROUND_GAIN : 1.0;
        chSum  += g * y2 * y2;
      }
      this._blockAccum[0] += chSum; // reuse index 0 as accumulator
      this._blockN++;

      if (this._blockN >= this._blockSz) this._emitBlock();
    }

    return true;
  }

  _emitBlock() {
    const meanSq = this._blockAccum[0] / this._blockN;
    this._blockAccum[0] = 0;
    this._blockN = 0;

    // ── Momentary (400 ms) ──────────────────────────────────────────────────
    this._mBuf[this._mHead] = meanSq;
    this._mHead = (this._mHead + 1) % 4;
    if (this._mFill < 4) this._mFill++;
    const momentary = this._slidingLufs(this._mBuf, this._mFill);

    // ── Short-term (3 s) ────────────────────────────────────────────────────
    this._stBuf[this._stHead] = meanSq;
    this._stHead = (this._stHead + 1) % 30;
    if (this._stFill < 30) this._stFill++;
    const shortTerm = this._slidingLufs(this._stBuf, this._stFill);

    // ── Integrated (gated, running O(1)) ────────────────────────────────────
    // Absolute gate threshold: -70 LUFS → meanSq equivalent
    const absThresh = Math.pow(10, (-70 + 0.691) / 10);

    this._intN++;
    this._intSum += meanSq;

    if (meanSq >= absThresh) {
      this._intAbsN++;
      this._intAbsSum += meanSq;

      // Store block for relative-gate pass (compact ring)
      this._intBlocks[this._intBHead] = meanSq;
      this._intBHead = (this._intBHead + 1) % this._intBlocks.length;
      if (this._intBHead === 0) this._intBFull = true;
    }

    const integrated = this._computeIntegrated();

    this.port.postMessage({ momentary, shortTerm, integrated });
  }

  _slidingLufs(buf, fill) {
    if (!fill) return -Infinity;
    let sum = 0;
    for (let i = 0; i < fill; i++) sum += buf[i];
    const mean = sum / fill;
    return mean > 0 ? -0.691 + 10 * Math.log10(mean) : -Infinity;
  }

  _computeIntegrated() {
    if (this._intAbsN === 0) return -Infinity;
    // Relative gate: Γ_r = Γ_a − 10 LU
    const gammaA    = this._intAbsSum / this._intAbsN;
    const relThresh = gammaA * Math.pow(10, -10 / 10); // − 10 LU

    // Walk stored abs-gated blocks to apply relative gate
    const len   = this._intBFull ? this._intBlocks.length : this._intBHead;
    let relSum  = 0, relN = 0;
    for (let i = 0; i < len; i++) {
      if (this._intBlocks[i] >= relThresh) {
        relSum += this._intBlocks[i];
        relN++;
      }
    }
    if (!relN) return -Infinity;
    const mean = relSum / relN;
    return mean > 0 ? -0.691 + 10 * Math.log10(mean) : -Infinity;
  }
}

registerProcessor('ebur128-processor', EbuR128Processor);
