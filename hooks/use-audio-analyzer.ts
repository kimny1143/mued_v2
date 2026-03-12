'use client';

import { useEffect, useRef, useCallback, useState, type RefObject } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AnalyzerData {
  frequencyData: number[];   // 0–255 per bin
  peakL: number;             // 0–1
  peakR: number;             // 0–1
  rmsL: number;              // 0–1
  rmsR: number;              // 0–1
  momentaryLufs: number;
  shortTermLufs: number;
  integratedLufs: number;    // gated long-term
  correlation: number;       // -1 to +1 stereo correlation
  stereoWidth: number;       // 0 (mono) to 1 (full stereo)
  balance: number;           // -1 (L) to +1 (R)
  goniometerL: number[];     // downsampled L channel (-1..1)
  goniometerR: number[];     // downsampled R channel (-1..1)
  sampleRate: number;
}

const CHANNEL_NAME = 'mued-dial-analyzer';
const FFT_SIZE = 2048;
const GONIO_POINTS = 256;

// ─── K-weighting (ITU-R BS.1770 simplified) ─────────────────────────────────

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

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useAudioAnalyzer(audioRef: RefObject<HTMLAudioElement | null>) {
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const connectedElRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const analyserLRef = useRef<AnalyserNode | null>(null);
  const analyserRRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const kWeightRef = useRef<Float32Array | null>(null);
  const lufsHistoryRef = useRef<number[]>([]);
  const integratedHistoryRef = useRef<number[]>([]);
  const [data, setData] = useState<AnalyzerData | null>(null);
  const [isActive, setIsActive] = useState(false);

  const connect = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;

    // Same element already connected — nothing to do
    if (sourceRef.current && connectedElRef.current === el) return;

    // Different element (e.g. Take switch) — disconnect old source, reuse AudioContext
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch { /* already disconnected */ }
      sourceRef.current = null;
      connectedElRef.current = null;
    }

    try {
      // Reuse existing AudioContext or create new one
      const ctx = ctxRef.current?.state !== 'closed' ? ctxRef.current! : new AudioContext();
      const source = ctx.createMediaElementSource(el);

      // Main analyser (spectrum) — reuse existing or create
      let analyser = analyserRef.current;
      if (!analyser || !ctxRef.current || ctxRef.current.state === 'closed') {
        analyser = ctx.createAnalyser();
        analyser.fftSize = FFT_SIZE;
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;
      }
      source.connect(analyser);
      analyser.connect(ctx.destination);

      // Stereo split for phase/goniometer — reuse existing or create
      let analyserL = analyserLRef.current;
      let analyserR = analyserRRef.current;
      if (!analyserL || !analyserR || !ctxRef.current || ctxRef.current.state === 'closed') {
        const splitter = ctx.createChannelSplitter(2);
        analyserL = ctx.createAnalyser();
        analyserR = ctx.createAnalyser();
        analyserL.fftSize = FFT_SIZE;
        analyserR.fftSize = FFT_SIZE;
        analyserL.smoothingTimeConstant = 0;
        analyserR.smoothingTimeConstant = 0;

        source.connect(splitter);
        splitter.connect(analyserL, 0);
        splitter.connect(analyserR, 1);

        // Keep L/R analysers alive via silent output
        const silence = ctx.createGain();
        silence.gain.value = 0;
        analyserL.connect(silence);
        analyserR.connect(silence);
        silence.connect(ctx.destination);

        analyserLRef.current = analyserL;
        analyserRRef.current = analyserR;
      } else {
        // Reconnect source to existing splitter chain
        const splitter = ctx.createChannelSplitter(2);
        source.connect(splitter);
        splitter.connect(analyserL, 0);
        splitter.connect(analyserR, 1);
      }

      kWeightRef.current = buildKWeightTable(analyser.frequencyBinCount, ctx.sampleRate);

      ctxRef.current = ctx;
      sourceRef.current = source;
      connectedElRef.current = el;
      setIsActive(true);
    } catch {
      // MediaElementSourceNode already created for this element
    }
  }, [audioRef]);

  useEffect(() => {
    if (!isActive || !analyserRef.current || !ctxRef.current) return;

    const analyser = analyserRef.current;
    const analyserL = analyserLRef.current!;
    const analyserR = analyserRRef.current!;
    const sampleRate = ctxRef.current.sampleRate;
    const binCount = analyser.frequencyBinCount;
    const freqArray = new Uint8Array(binCount);
    const timeArray = new Uint8Array(FFT_SIZE);
    const timeLArray = new Uint8Array(FFT_SIZE);
    const timeRArray = new Uint8Array(FFT_SIZE);
    const kWeight = kWeightRef.current!;

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channelRef.current = channel;
    } catch { /* no popup */ }

    const MOMENTARY_FRAMES = Math.round(0.4 * 60);
    const SHORT_TERM_FRAMES = Math.round(3 * 60);
    const dbRange = analyser.maxDecibels - analyser.minDecibels;
    const dbMin = analyser.minDecibels;
    const gonioStep = Math.floor(FFT_SIZE / GONIO_POINTS);

    const tick = () => {
      analyser.getByteFrequencyData(freqArray);
      analyser.getByteTimeDomainData(timeArray);
      analyserL.getByteTimeDomainData(timeLArray);
      analyserR.getByteTimeDomainData(timeRArray);

      // ── Mixed RMS (for LUFS base) ──
      let sumSq = 0;
      for (let i = 0; i < timeArray.length; i++) {
        const s = (timeArray[i] - 128) / 128;
        sumSq += s * s;
      }
      const rms = Math.sqrt(sumSq / timeArray.length);

      // ── Stereo: correlation, width, balance, per-channel peak/RMS, goniometer ──
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

      // ── K-weighted LUFS ──
      let totalPower = 0, kWeightedPower = 0;
      for (let i = 1; i < binCount; i++) {
        const dbVal = (freqArray[i] / 255) * dbRange + dbMin;
        const lp = Math.pow(10, dbVal / 10);
        totalPower += lp;
        kWeightedPower += lp * kWeight[i];
      }
      const kCorrDb = totalPower > 1e-20 ? 10 * Math.log10(kWeightedPower / totalPower) : 0;
      const kMeanSq = rms > 0 ? rms * rms * Math.pow(10, kCorrDb / 10) : 0;

      // Momentary (400ms)
      const hist = lufsHistoryRef.current;
      hist.push(kMeanSq);
      if (hist.length > SHORT_TERM_FRAMES) hist.shift();
      const mSlice = hist.slice(-MOMENTARY_FRAMES);
      const mAvg = mSlice.reduce((a, b) => a + b, 0) / mSlice.length;
      const momentaryLufs = mAvg > 1e-20 ? -0.691 + 10 * Math.log10(mAvg) : -70;

      // Short-term (3s)
      const stAvg = hist.reduce((a, b) => a + b, 0) / hist.length;
      const shortTermLufs = stAvg > 1e-20 ? -0.691 + 10 * Math.log10(stAvg) : -70;

      // Integrated (gated long-term)
      const intHist = integratedHistoryRef.current;
      if (kMeanSq > 1e-7) intHist.push(kMeanSq); // gate out silence
      if (intHist.length > 216000) intHist.splice(0, intHist.length - 216000); // cap 1hr
      const intAvg = intHist.length > 0 ? intHist.reduce((a, b) => a + b, 0) / intHist.length : 0;
      const integratedLufs = intAvg > 1e-20 ? -0.691 + 10 * Math.log10(intAvg) : -70;

      const payload: AnalyzerData = {
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
      };

      setData(payload);
      try { channel?.postMessage(payload); } catch { /* closed */ }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      channel?.close();
      channelRef.current = null;
    };
  }, [isActive]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      channelRef.current?.close();
      if (ctxRef.current?.state !== 'closed') ctxRef.current?.close();
    };
  }, []);

  return { data, isActive, connect };
}

// ─── Popup receiver ─────────────────────────────────────────────────────────

export function useAnalyzerReceiver() {
  const [data, setData] = useState<AnalyzerData | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let channel: BroadcastChannel;
    try { channel = new BroadcastChannel(CHANNEL_NAME); } catch { return; }

    let timeout: ReturnType<typeof setTimeout>;
    const resetTimeout = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => setConnected(false), 3000);
    };
    channel.onmessage = (event: MessageEvent<AnalyzerData>) => {
      setData(event.data);
      if (!connected) setConnected(true);
      resetTimeout();
    };
    resetTimeout();
    return () => { clearTimeout(timeout); channel.close(); };
  }, [connected]);

  return { data, connected };
}
