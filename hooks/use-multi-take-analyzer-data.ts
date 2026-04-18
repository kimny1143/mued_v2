'use client';

import { useEffect, useRef, useState } from 'react';
import type { AnalyzerData } from '@/hooks/use-audio-analyzer';

const FFT_SIZE = 2048;
const GONIO_POINTS = 256;
const MOMENTARY_FRAMES = Math.round(0.4 * 60);
const SHORT_TERM_FRAMES = Math.round(3 * 60);

function buildKWeightTable(binCount: number, sampleRate: number): Float32Array {
  const table = new Float32Array(binCount);
  const binWidth = sampleRate / (binCount * 2);
  for (let i = 0; i < binCount; i++) {
    const f = i * binWidth;
    let w: number;
    if (f < 20) w = 0;
    else if (f < 100) w = (f - 20) / 80 * 0.5;
    else if (f < 500) w = 0.5 + (f - 100) / 400 * 0.5;
    else if (f < 2000) w = 1.0;
    else if (f < 8000) w = 1.0 + (f - 2000) / 6000 * 0.6;
    else if (f < 16000) w = 1.6 - (f - 8000) / 8000 * 0.6;
    else w = Math.max(0, 1.0 - (f - 16000) / 6000);
    table[i] = w * w;
  }
  return table;
}

interface Options {
  analyser: AnalyserNode | null;
  analyserL: AnalyserNode | null;
  analyserR: AnalyserNode | null;
  sampleRate: number;
}

/**
 * Reads from the multi-take player's fixed final-stage analysers to produce
 * AnalyzerData compatible with AudioAnalyzer. Uses the full stereo L/R split
 * for correlation, goniometer, width, and balance metrics.
 */
export function useMultiTakeAnalyzerData({ analyser, analyserL, analyserR, sampleRate }: Options): AnalyzerData | null {
  const rafRef = useRef<number>(0);
  const lufsHistoryRef = useRef<number[]>([]);
  const integratedHistoryRef = useRef<number[]>([]);
  const [data, setData] = useState<AnalyzerData | null>(null);

  useEffect(() => {
    if (!analyser || !analyserL || !analyserR) {
      setData(null);
      return;
    }

    const binCount = analyser.frequencyBinCount;
    const freqArray = new Uint8Array(binCount);
    const timeLArray = new Uint8Array(FFT_SIZE);
    const timeRArray = new Uint8Array(FFT_SIZE);
    const kWeight = buildKWeightTable(binCount, sampleRate);
    const dbRange = analyser.maxDecibels - analyser.minDecibels;
    const dbMin = analyser.minDecibels;
    const gonioStep = Math.max(1, Math.floor(FFT_SIZE / GONIO_POINTS));

    lufsHistoryRef.current = [];
    integratedHistoryRef.current = [];

    const tick = () => {
      analyser.getByteFrequencyData(freqArray);
      analyserL.getByteTimeDomainData(timeLArray);
      analyserR.getByteTimeDomainData(timeRArray);

      // Stereo metrics: correlation, width, balance, per-channel peak/RMS, goniometer
      let sumLR = 0, sumLL = 0, sumRR = 0;
      let sideE = 0, midE = 0;
      let peakLch = 0, peakRch = 0;
      const gonioL: number[] = [];
      const gonioR: number[] = [];

      for (let i = 0; i < FFT_SIZE; i++) {
        const l = (timeLArray[i] - 128) / 128;
        const r = (timeRArray[i] - 128) / 128;
        sumLR += l * r;
        sumLL += l * l;
        sumRR += r * r;
        sideE += (r - l) * (r - l);
        midE += (l + r) * (l + r);
        const al = Math.abs(l);
        const ar = Math.abs(r);
        if (al > peakLch) peakLch = al;
        if (ar > peakRch) peakRch = ar;
        if (i % gonioStep === 0) {
          gonioL.push(l);
          gonioR.push(r);
        }
      }

      const denom = Math.sqrt(sumLL * sumRR);
      const correlation = denom > 1e-10 ? sumLR / denom : 1;
      const stereoWidth = (sideE + midE) > 1e-10 ? sideE / (sideE + midE) : 0;
      const lPow = Math.sqrt(sumLL / FFT_SIZE);
      const rPow = Math.sqrt(sumRR / FFT_SIZE);
      const balance = (lPow + rPow) > 1e-10 ? (rPow - lPow) / (lPow + rPow) : 0;

      // Mixed RMS for LUFS base (average of L/R)
      const rms = Math.sqrt((sumLL + sumRR) / (2 * FFT_SIZE));

      // K-weighted LUFS
      let totalPower = 0, kWeightedPower = 0;
      for (let i = 1; i < binCount; i++) {
        const dbVal = (freqArray[i] / 255) * dbRange + dbMin;
        const lp = Math.pow(10, dbVal / 10);
        totalPower += lp;
        kWeightedPower += lp * kWeight[i];
      }
      const kCorrDb = totalPower > 1e-20 ? 10 * Math.log10(kWeightedPower / totalPower) : 0;
      const kMeanSq = rms > 0 ? rms * rms * Math.pow(10, kCorrDb / 10) : 0;

      const hist = lufsHistoryRef.current;
      hist.push(kMeanSq);
      if (hist.length > SHORT_TERM_FRAMES) hist.shift();
      const mSlice = hist.slice(-MOMENTARY_FRAMES);
      const mAvg = mSlice.reduce((a, b) => a + b, 0) / mSlice.length;
      const momentaryLufs = mAvg > 1e-20 ? -0.691 + 10 * Math.log10(mAvg) : -70;
      const stAvg = hist.reduce((a, b) => a + b, 0) / hist.length;
      const shortTermLufs = stAvg > 1e-20 ? -0.691 + 10 * Math.log10(stAvg) : -70;

      const intHist = integratedHistoryRef.current;
      if (kMeanSq > 1e-7) intHist.push(kMeanSq);
      if (intHist.length > 216000) intHist.splice(0, intHist.length - 216000);
      const intAvg = intHist.length > 0 ? intHist.reduce((a, b) => a + b, 0) / intHist.length : 0;
      const integratedLufs = intAvg > 1e-20 ? -0.691 + 10 * Math.log10(intAvg) : -70;

      setData({
        frequencyData: Array.from(freqArray),
        peakL: peakLch,
        peakR: peakRch,
        rmsL: lPow,
        rmsR: rPow,
        momentaryLufs: Math.max(-70, momentaryLufs),
        shortTermLufs: Math.max(-70, shortTermLufs),
        integratedLufs: Math.max(-70, integratedLufs),
        correlation,
        stereoWidth,
        balance,
        goniometerL: gonioL,
        goniometerR: gonioR,
        sampleRate,
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser, analyserL, analyserR, sampleRate]);

  return data;
}
