/**
 * Focus Flow (ATT-1) - Game Logic
 *
 * 持続的注意力を測定。
 * CPT (Continuous Performance Test) 形式。
 * ターゲット刺激にだけ反応する。
 */

export const FOCUS_CONFIG = {
  stimulusDuration: 250,   // ms
  interStimulusInterval: 1000, // ms
  targetRate: 0.2,         // 20%
  totalStimuli: 180,
  targetSymbol: '♪',
};

export const FOCUS_SYMBOLS = ['♪', '♩', '♫', '♬', '𝄞'];

export interface FocusTrial {
  symbolIndex: number;
  isTarget: boolean;
  responded: boolean;
  responseTime: number | null; // ms from stimulus onset
}

export interface FocusFlowResult {
  rawScore: number;
  dPrime: number;
  rtCv: number;
  hitRate: number;
  falseAlarmRate: number;
  hits: number;
  misses: number;
  falseAlarms: number;
  correctRejections: number;
  meanRt: number;
}

/** Generate the stimulus sequence */
export function generateStimulusSequence(): { symbolIndex: number; isTarget: boolean }[] {
  const sequence: { symbolIndex: number; isTarget: boolean }[] = [];
  const targetCount = Math.round(FOCUS_CONFIG.totalStimuli * FOCUS_CONFIG.targetRate);
  const nonTargetCount = FOCUS_CONFIG.totalStimuli - targetCount;

  // Create array of target/non-target assignments
  const assignments: boolean[] = [
    ...Array(targetCount).fill(true),
    ...Array(nonTargetCount).fill(false),
  ];

  // Fisher-Yates shuffle
  for (let i = assignments.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [assignments[i], assignments[j]] = [assignments[j], assignments[i]];
  }

  for (const isTarget of assignments) {
    if (isTarget) {
      sequence.push({ symbolIndex: 0, isTarget: true }); // ♪ is target
    } else {
      // Random non-target symbol (index 1-4)
      const idx = 1 + Math.floor(Math.random() * (FOCUS_SYMBOLS.length - 1));
      sequence.push({ symbolIndex: idx, isTarget: false });
    }
  }

  return sequence;
}

/** Inverse normal CDF approximation (Rational approximation) */
function normalInv(p: number): number {
  // Abramowitz & Stegun approximation
  if (p <= 0) return -4;
  if (p >= 1) return 4;

  const a1 = -3.969683028665376e+01;
  const a2 =  2.209460984245205e+02;
  const a3 = -2.759285104469687e+02;
  const a4 =  1.383577518672690e+02;
  const a5 = -3.066479806614716e+01;
  const a6 =  2.506628277459239e+00;

  const b1 = -5.447609879822406e+01;
  const b2 =  1.615858368580409e+02;
  const b3 = -1.556989798598866e+02;
  const b4 =  6.680131188771972e+01;
  const b5 = -1.328068155288572e+01;

  const c1 = -7.784894002430293e-03;
  const c2 = -3.223964580411365e-01;
  const c3 = -2.400758277161838e+00;
  const c4 = -2.549732539343734e+00;
  const c5 =  4.374664141464968e+00;
  const c6 =  2.938163982698783e+00;

  const d1 =  7.784695709041462e-03;
  const d2 =  3.224671290700398e-01;
  const d3 =  2.445134137142996e+00;
  const d4 =  3.754408661907416e+00;

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let q: number, r: number;

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
           ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q /
           (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
            ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  }
}

/** Score the completed game */
export function scoreFocusFlow(trials: FocusTrial[]): FocusFlowResult {
  let hits = 0;
  let misses = 0;
  let falseAlarms = 0;
  let correctRejections = 0;
  const reactionTimes: number[] = [];

  for (const t of trials) {
    if (t.isTarget) {
      if (t.responded) {
        hits++;
        if (t.responseTime !== null) reactionTimes.push(t.responseTime);
      } else {
        misses++;
      }
    } else {
      if (t.responded) {
        falseAlarms++;
      } else {
        correctRejections++;
      }
    }
  }

  // Clamp rates to avoid infinite z-scores
  const hitRate = Math.max(0.01, Math.min(0.99, hits / Math.max(1, hits + misses)));
  const faRate = Math.max(0.01, Math.min(0.99, falseAlarms / Math.max(1, falseAlarms + correctRejections)));

  // d' (signal detection sensitivity)
  const dPrime = normalInv(hitRate) - normalInv(faRate);

  // RT variability (coefficient of variation)
  let meanRt = 0;
  let rtCv = 0;
  if (reactionTimes.length > 1) {
    meanRt = reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length;
    const rtSd = Math.sqrt(
      reactionTimes.reduce((sum, rt) => sum + Math.pow(rt - meanRt, 2), 0) / reactionTimes.length,
    );
    rtCv = meanRt > 0 ? rtSd / meanRt : 1;
  }

  // Raw score: higher d' and lower variability = better
  const rawScore = Math.max(0, dPrime * (1 - Math.min(rtCv, 1)));

  return {
    rawScore: Math.round(rawScore * 100) / 100,
    dPrime: Math.round(dPrime * 100) / 100,
    rtCv: Math.round(rtCv * 100) / 100,
    hitRate: Math.round(hitRate * 100) / 100,
    falseAlarmRate: Math.round(faRate * 100) / 100,
    hits,
    misses,
    falseAlarms,
    correctRejections,
    meanRt: Math.round(meanRt),
  };
}
