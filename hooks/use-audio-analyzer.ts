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

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useAudioAnalyzer(audioRef: RefObject<HTMLAudioElement | null>) {
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const connectedElRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const analyserLRef = useRef<AnalyserNode | null>(null);
  const analyserRRef = useRef<AnalyserNode | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const rafRef = useRef<number>(0);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const workletLufsRef = useRef({ momentary: -70, shortTerm: -70, integrated: -70 });
  const [data, setData] = useState<AnalyzerData | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [rafKey, setRafKey] = useState(0);

  const connect = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;

    // Same element already connected — resume if suspended (e.g. reconnect from non-gesture context)
    if (sourceRef.current && connectedElRef.current === el) {
      ctxRef.current?.resume().catch(() => {});
      return;
    }

    // Different element (e.g. Take switch) — tear down entire audio graph and rebuild.
    // createMediaElementSource() can only be called once per element per AudioContext,
    // and reusing nodes across different sources causes silent failures.
    if (ctxRef.current) {
      cancelAnimationFrame(rafRef.current);
      try { ctxRef.current.close(); } catch { /* already closed */ }
      ctxRef.current = null;
      sourceRef.current = null;
      connectedElRef.current = null;
      analyserRef.current = null;
      analyserLRef.current = null;
      analyserRRef.current = null;
      workletRef.current = null;
    }

    (async () => {
      try {
        const ctx = new AudioContext();
        ctx.resume().catch(() => {});
        const source = ctx.createMediaElementSource(el);

        // Load EBU R128 worklet for proper BS.1770-4 LUFS
        await ctx.audioWorklet.addModule('/worklets/ebur128-processor.js');
        const worklet = new AudioWorkletNode(ctx, 'ebur128-processor');
        worklet.port.onmessage = (e: MessageEvent<{ momentary: number; shortTerm: number; integrated: number }>) => {
          const { momentary, shortTerm, integrated } = e.data;
          workletLufsRef.current = {
            momentary:  isFinite(momentary)  ? Math.max(-70, momentary)  : -70,
            shortTerm:  isFinite(shortTerm)  ? Math.max(-70, shortTerm)  : -70,
            integrated: isFinite(integrated) ? Math.max(-70, integrated) : -70,
          };
        };
        source.connect(worklet);
        worklet.connect(ctx.destination);

        // Main analyser (spectrum) — tap after worklet passthrough
        const analyser = ctx.createAnalyser();
        analyser.fftSize = FFT_SIZE;
        analyser.smoothingTimeConstant = 0.8;
        worklet.connect(analyser);

        // Stereo split for phase/goniometer
        const splitter = ctx.createChannelSplitter(2);
        const analyserL = ctx.createAnalyser();
        const analyserR = ctx.createAnalyser();
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

        // Reset integrated on seek (seek = discontinuity in loudness measurement)
        el.addEventListener('seeked', () => {
          worklet.port.postMessage({ reset: true });
        });

        workletLufsRef.current = { momentary: -70, shortTerm: -70, integrated: -70 };
        ctxRef.current = ctx;
        sourceRef.current = source;
        connectedElRef.current = el;
        analyserRef.current = analyser;
        analyserLRef.current = analyserL;
        analyserRRef.current = analyserR;
        workletRef.current = worklet;
        setIsActive(true);
        setRafKey((k) => k + 1); // force RAF loop to restart with fresh analyser captures
      } catch (err) {
        console.error('[useAudioAnalyzer] connect failed:', err);
      }
    })();
  }, [audioRef]);

  useEffect(() => {
    if (!isActive || !analyserRef.current || !ctxRef.current) return;

    const analyser = analyserRef.current;
    const analyserL = analyserLRef.current!;
    const analyserR = analyserRRef.current!;
    const sampleRate = ctxRef.current.sampleRate;
    const binCount = analyser.frequencyBinCount;
    const freqArray = new Uint8Array(binCount);
    const timeLArray = new Uint8Array(FFT_SIZE);
    const timeRArray = new Uint8Array(FFT_SIZE);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channelRef.current = channel;
    } catch { /* no popup */ }

    const gonioStep = Math.floor(FFT_SIZE / GONIO_POINTS);

    const tick = () => {
      analyser.getByteFrequencyData(freqArray);
      analyserL.getByteTimeDomainData(timeLArray);
      analyserR.getByteTimeDomainData(timeRArray);

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

      // ── LUFS from AudioWorklet (BS.1770-4 compliant) ──
      const { momentary: momentaryLufs, shortTerm: shortTermLufs, integrated: integratedLufs } = workletLufsRef.current;

      const payload: AnalyzerData = {
        frequencyData: Array.from(freqArray),
        peakL: peakLch,
        peakR: peakRch,
        rmsL: lPow,
        rmsR: rPow,
        momentaryLufs,
        shortTermLufs,
        integratedLufs,
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
  }, [isActive, rafKey]);

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
