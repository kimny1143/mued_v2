'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

export interface TakeDef {
  id: string;
  label: 'RAW' | 'MIXED' | 'MASTERED';
  /** Proxy URLs keyed by stem name. MASTERED uses { main: url }. */
  stemUrls: Record<string, string>;
  /** Loudness compensation offset in dB applied to this take's output (e.g. -14 - rawLufs). */
  gainOffsetDb?: number;
}

export interface StemState {
  muted: boolean;
  solo: boolean;
}

export interface DecodeProgress {
  done: number;
  total: number;
}

/** Per-take decode status for pill UI (spinner/disabled until ready). */
export type TakeDecodeStatus = 'decoding' | 'ready' | 'error';

export interface UseMultiTakePlayerReturn {
  isReady: boolean;
  isPlaying: boolean;
  /** True while active take is being decoded (gates isReady). */
  isDecoding: boolean;
  decodeProgress: DecodeProgress;
  /** Per-take decode status keyed by take ID — use for pill spinner/disabled state. */
  takeDecodeStatus: Record<string, TakeDecodeStatus>;
  currentTime: number;
  duration: number;
  activeTakeId: string;
  setActiveTake(id: string): void;
  play(): void;
  pause(): void;
  seek(time: number): void;
  stemStates: Record<string, Record<string, StemState>>;
  toggleStemMute(takeId: string, stemName: string): void;
  toggleStemSolo(takeId: string, stemName: string): void;
  setStemGain(takeId: string, stemName: string, db: number): void;
  setStemPan(takeId: string, stemName: string, pan: number): void;
  /** AnalyserNode fixed at chain's final stage (masterGain → analyser → destination). */
  analyserNode: AnalyserNode | null;
  /** Stereo L/R analysers split from masterGain — for phase/goniometer/stereo-width metrics. */
  analyserL: AnalyserNode | null;
  analyserR: AnalyserNode | null;
  sampleRate: number;
  /** Per-stem AnalyserNodes tapped after stemGain (before pan). Keyed by stemName. */
  getStemAnalysers(takeId: string): Record<string, AnalyserNode> | null;
  destroy(): void;
}

interface StemNodes {
  gainNode: GainNode;
  panNode: StereoPannerNode;
  stemAnalyser: AnalyserNode;
  /** Recreated on each play/seek — null when stopped. */
  source: AudioBufferSourceNode | null;
  /** Decoded PCM data — null until fetch+decode completes. */
  buffer: AudioBuffer | null;
}

interface TakeNodes {
  stems: Record<string, StemNodes>;
  /** Gain 0=muted / 1=active — switched on take change */
  takeMixGain: GainNode;
  /** Fixed loudness-compensation gain (set once on init, never changed). */
  loudnessGain: GainNode;
}

// ─── Module-level helpers ─────────────────────────────────────────────────────

async function fetchAndDecode(url: string, ctx: AudioContext): Promise<AudioBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
  const arrayBuffer = await response.arrayBuffer();
  return ctx.decodeAudioData(arrayBuffer);
}

/**
 * Create and start an AudioBufferSourceNode for every stem that has a buffer.
 * All sources are scheduled at the same AudioContext time (`when`) so playback
 * is sample-accurate across all takes and stems — eliminates MediaElementSource drift.
 *
 * Returns `startedAt = when - offset`, the AudioContext time at which position 0 would be.
 * currentTime = ctx.currentTime - startedAt
 */
function startAllSources(
  ctx: AudioContext,
  takeNodes: Record<string, TakeNodes>,
  offset: number,
): number {
  const when = ctx.currentTime + 0.05;
  for (const tn of Object.values(takeNodes)) {
    for (const sn of Object.values(tn.stems)) {
      if (!sn.buffer) continue;
      const source = ctx.createBufferSource();
      source.buffer = sn.buffer;
      source.connect(sn.gainNode);
      source.start(when, Math.max(0, offset));
      sn.source = source;
    }
  }
  return when - offset;
}

function stopAllSources(takeNodes: Record<string, TakeNodes>): void {
  for (const tn of Object.values(takeNodes)) {
    for (const sn of Object.values(tn.stems)) {
      if (sn.source) {
        try { sn.source.stop(); } catch { /* already finished */ }
        sn.source.disconnect();
        sn.source = null;
      }
    }
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMultiTakePlayer(takes: TakeDef[]): UseMultiTakePlayerReturn {
  const ctxRef = useRef<AudioContext | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [analyserL, setAnalyserL] = useState<AnalyserNode | null>(null);
  const [analyserR, setAnalyserR] = useState<AnalyserNode | null>(null);
  const [sampleRate, setSampleRate] = useState(44100);
  const takeNodesRef = useRef<Record<string, TakeNodes>>({});
  const rafRef = useRef<number>(0);
  const pausedAtRef = useRef(0);
  /** AudioContext time at which position 0 would be. currentTime = ctx.now - startedAt */
  const startedAtRef = useRef(0);
  const activeTakeIdRef = useRef(takes[0]?.id ?? '');
  const isPlayingRef = useRef(false);
  /** Take ID queued for activation once its decode completes. */
  const pendingActivateRef = useRef<string | null>(null);
  /** Ref to retry-decode function — set inside the mount effect to close over takeNodes/counts. */
  const retryTakeRef = useRef<((id: string) => void) | null>(null);
  /** Stable ref for takeDecodeStatus — accessible in setActiveTake without closure stale. */
  const takeDecodeStatusRef = useRef<Record<string, TakeDecodeStatus>>(
    Object.fromEntries(takes.map((t) => [t.id, 'decoding' as TakeDecodeStatus])),
  );

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDecoding, setIsDecoding] = useState(false);
  const [decodeProgress, setDecodeProgress] = useState<DecodeProgress>({ done: 0, total: 0 });
  const [takeDecodeStatus, setTakeDecodeStatus] = useState<Record<string, TakeDecodeStatus>>(
    takeDecodeStatusRef.current,
  );
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeTakeId, _setActiveTakeId] = useState(takes[0]?.id ?? '');
  const [stemStates, setStemStates] = useState<Record<string, Record<string, StemState>>>(() =>
    Object.fromEntries(
      takes.map((t) => [
        t.id,
        Object.fromEntries(Object.keys(t.stemUrls).map((k) => [k, { muted: false, solo: false }])),
      ]),
    ),
  );

  // Build Web Audio graph on mount. Signal chain per stem:
  //   AudioBufferSourceNode → gainNode → panNode → takeMixGain
  //                        ↘ stemAnalyser (tap, no output effect)
  //   takeMixGain → masterGain → analyser → destination
  //   masterGain → splitter → aL/aR (stereo metrics, via silentGain)
  useEffect(() => {
    if (takes.length === 0) return;

    const ctx = new AudioContext();
    ctxRef.current = ctx;

    const masterGain = ctx.createGain();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
    masterGain.connect(analyser);
    analyser.connect(ctx.destination);

    const splitter = ctx.createChannelSplitter(2);
    const aL = ctx.createAnalyser();
    const aR = ctx.createAnalyser();
    aL.fftSize = 2048;
    aR.fftSize = 2048;
    aL.smoothingTimeConstant = 0;
    aR.smoothingTimeConstant = 0;
    masterGain.connect(splitter);
    splitter.connect(aL, 0);
    splitter.connect(aR, 1);
    const silentGain = ctx.createGain();
    silentGain.gain.value = 0;
    aL.connect(silentGain);
    aR.connect(silentGain);
    silentGain.connect(ctx.destination);

    setAnalyserNode(analyser);
    setAnalyserL(aL);
    setAnalyserR(aR);
    setSampleRate(ctx.sampleRate);

    const defaultId = activeTakeIdRef.current;
    const newTakeNodes: Record<string, TakeNodes> = {};

    // Phase 0: build permanent nodes for all takes/stems (no buffers yet)
    for (const take of takes) {
      const takeMixGain = ctx.createGain();
      takeMixGain.gain.value = take.id === defaultId ? 1 : 0;

      // Fixed loudness-compensation gain: compensates RAW loudness to match processed takes.
      // Chain: takeMixGain → loudnessGain → masterGain
      const loudnessGain = ctx.createGain();
      loudnessGain.gain.value = Math.pow(10, (take.gainOffsetDb ?? 0) / 20);
      takeMixGain.connect(loudnessGain);
      loudnessGain.connect(masterGain);

      const stems: Record<string, StemNodes> = {};
      for (const stemName of Object.keys(take.stemUrls)) {
        const gainNode = ctx.createGain();
        const panNode = ctx.createStereoPanner();
        const stemAnalyser = ctx.createAnalyser();
        stemAnalyser.fftSize = 256;
        stemAnalyser.smoothingTimeConstant = 0.8;

        gainNode.connect(panNode);
        gainNode.connect(stemAnalyser);
        panNode.connect(takeMixGain);

        stems[stemName] = { gainNode, panNode, stemAnalyser, source: null, buffer: null };
      }

      newTakeNodes[take.id] = { stems, takeMixGain, loudnessGain };
    }

    takeNodesRef.current = newTakeNodes;

    const totalCount = takes.reduce((sum, t) => sum + Object.keys(t.stemUrls).length, 0);
    setDecodeProgress({ done: 0, total: totalCount });
    setIsDecoding(true);

    // Per-take decode counting
    const takeDecodeCounts = new Map<string, { done: number; success: number; total: number }>();
    for (const take of takes) {
      takeDecodeCounts.set(take.id, {
        done: 0,
        success: 0,
        total: Object.keys(take.stemUrls).length,
      });
    }

    let activeReadySet = false;
    let decodedCount = 0;
    let cancelled = false;

    const onStemDecoded = (takeId: string, success: boolean) => {
      if (cancelled) return;
      decodedCount++;
      setDecodeProgress({ done: decodedCount, total: totalCount });

      const counts = takeDecodeCounts.get(takeId)!;
      counts.done++;
      if (success) counts.success++;

      // When all stems for a take are done, update per-take status
      if (counts.done === counts.total) {
        const status: TakeDecodeStatus = counts.success > 0 ? 'ready' : 'error';
        const upd = { ...takeDecodeStatusRef.current, [takeId]: status };
        takeDecodeStatusRef.current = upd;
        setTakeDecodeStatus({ ...upd });

        // Gate isReady on active take (both ready and error unblock the spinner)
        if (takeId === defaultId && !activeReadySet) {
          activeReadySet = true;
          if (status === 'ready') {
            const durations = Object.values(newTakeNodes[takeId].stems)
              .map((s) => s.buffer?.duration ?? 0)
              .filter((d) => isFinite(d) && d > 0);
            if (durations.length > 0) setDuration(Math.max(...durations));
            setIsReady(true);
          }
          setIsDecoding(false);
        }
      }
    };

    const decodeStem = async (takeId: string, stemName: string, url: string) => {
      if (cancelled) return;
      if (!url) {
        console.error(`[dial:decode] empty URL for stem "${stemName}" in take ${takeId}`);
        onStemDecoded(takeId, false);
        return;
      }
      let buffer: AudioBuffer | null = null;
      try {
        buffer = await fetchAndDecode(url, ctx);
      } catch (e1) {
        console.error(`[dial:decode] attempt 1 failed: "${stemName}" take=${takeId.slice(-8)}`, e1);
        try {
          if (!cancelled) buffer = await fetchAndDecode(url, ctx);
        } catch (e2) {
          console.error(`[dial:decode] retry failed: "${stemName}" take=${takeId.slice(-8)}`, e2);
        }
      }
      if (cancelled) return;
      if (buffer) newTakeNodes[takeId].stems[stemName].buffer = buffer;
      onStemDecoded(takeId, buffer !== null);
    };

    // Allow error-state takes to be re-decoded on demand (e.g. user clicks error pill)
    retryTakeRef.current = (takeId: string) => {
      if (cancelled) return;
      const take = takes.find((t) => t.id === takeId);
      if (!take) return;
      // Reset per-take counts so onStemDecoded re-gates the status correctly
      takeDecodeCounts.set(takeId, {
        done: 0,
        success: 0,
        total: Object.keys(take.stemUrls).length,
      });
      // Clear stale buffers and stop any playing sources for this take
      const tn = newTakeNodes[takeId];
      if (tn) {
        for (const sn of Object.values(tn.stems)) {
          sn.buffer = null;
          if (sn.source) {
            try { sn.source.stop(); } catch { /* already stopped */ }
            sn.source.disconnect();
            sn.source = null;
          }
        }
      }
      for (const [name, url] of Object.entries(take.stemUrls)) {
        decodeStem(takeId, name, url).catch(() => {});
      }
    };

    // Decode ALL takes' stems in parallel — eliminates early-take-switch window.
    // Active take is included and races with others; it typically finishes first
    // since it has the same priority as the rest but the UI waits for it.
    const allPromises: Promise<void>[] = [];
    for (const take of takes) {
      for (const [name, url] of Object.entries(take.stemUrls)) {
        allPromises.push(decodeStem(take.id, name, url));
      }
    }
    Promise.all(allPromises).catch(() => {});

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      stopAllSources(newTakeNodes);
      for (const tn of Object.values(newTakeNodes)) {
        tn.takeMixGain.disconnect();
        tn.loudnessGain.disconnect();
        for (const sn of Object.values(tn.stems)) {
          sn.gainNode.disconnect();
          sn.panNode.disconnect();
          sn.stemAnalyser.disconnect();
        }
      }
      masterGain.disconnect();
      analyser.disconnect();
      splitter.disconnect();
      aL.disconnect();
      aR.disconnect();
      silentGain.disconnect();
      ctx.close().catch(() => {});
      ctxRef.current = null;
      setAnalyserNode(null);
      setAnalyserL(null);
      setAnalyserR(null);
      takeNodesRef.current = {};
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // takes are stable in completed state

  // RAF loop — uses AudioContext clock for drift-free currentTime
  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    const tick = () => {
      const ctx = ctxRef.current;
      if (!ctx) return;

      const t = ctx.currentTime - startedAtRef.current;

      if (duration > 0 && t >= duration - 0.05) {
        stopAllSources(takeNodesRef.current);
        pausedAtRef.current = 0;
        startedAtRef.current = 0;
        isPlayingRef.current = false;
        setCurrentTime(0);
        setIsPlaying(false);
        return;
      }

      setCurrentTime(Math.max(0, t));
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, duration]);

  // Sync stem gain nodes when mute/solo state changes
  const computeStemGain = useCallback(
    (takeId: string, stemName: string, states: typeof stemStates): number => {
      const takeStates = states[takeId] ?? {};
      const anySoloed = Object.values(takeStates).some((s) => s.solo);
      if (anySoloed) return takeStates[stemName]?.solo ? 1 : 0;
      return takeStates[stemName]?.muted ? 0 : 1;
    },
    [],
  );

  useEffect(() => {
    for (const [takeId, takeNodes] of Object.entries(takeNodesRef.current)) {
      for (const [stemName, stemNodes] of Object.entries(takeNodes.stems)) {
        stemNodes.gainNode.gain.value = computeStemGain(takeId, stemName, stemStates);
      }
    }
  }, [stemStates, computeStemGain]);

  const play = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    void (async () => {
      if (ctx.state === 'suspended') await ctx.resume();
      const startedAt = startAllSources(ctx, takeNodesRef.current, pausedAtRef.current);
      startedAtRef.current = startedAt;
      isPlayingRef.current = true;
      setIsPlaying(true);
    })();
  }, []);

  const pause = useCallback(() => {
    const ctx = ctxRef.current;
    if (ctx) pausedAtRef.current = ctx.currentTime - startedAtRef.current;
    stopAllSources(takeNodesRef.current);
    isPlayingRef.current = false;
    setIsPlaying(false);
  }, []);

  const seek = useCallback(
    (time: number) => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      const clamped = Math.max(0, Math.min(time, duration));
      const wasPlaying = isPlayingRef.current;

      if (wasPlaying) stopAllSources(takeNodesRef.current);
      pausedAtRef.current = clamped;
      setCurrentTime(clamped);

      if (wasPlaying) {
        const startedAt = startAllSources(ctx, takeNodesRef.current, clamped);
        startedAtRef.current = startedAt;
      }
    },
    [duration],
  );

  const setActiveTake = useCallback((id: string) => {
    const status = takeDecodeStatusRef.current[id];

    // Still decoding — queue for auto-activation when ready
    if (status === 'decoding') {
      pendingActivateRef.current = id;
      return;
    }

    // Decode failed — reset to decoding, trigger retry, queue for auto-activation
    if (status === 'error') {
      pendingActivateRef.current = id;
      const upd = { ...takeDecodeStatusRef.current, [id]: 'decoding' as TakeDecodeStatus };
      takeDecodeStatusRef.current = upd;
      setTakeDecodeStatus({ ...upd });
      retryTakeRef.current?.(id);
      return;
    }

    const ctx = ctxRef.current;
    if (!ctx) return;

    const wasPlaying = isPlayingRef.current;
    const currentPos = wasPlaying
      ? ctx.currentTime - startedAtRef.current
      : pausedAtRef.current;

    if (wasPlaying) stopAllSources(takeNodesRef.current);

    // Flip take gains instantly
    for (const [takeId, takeNodes] of Object.entries(takeNodesRef.current)) {
      takeNodes.takeMixGain.gain.setValueAtTime(takeId === id ? 1 : 0, ctx.currentTime);
    }

    // Update duration from newly active take's decoded buffers
    const newTakeNodes = takeNodesRef.current[id];
    if (newTakeNodes) {
      const durations = Object.values(newTakeNodes.stems)
        .map((s) => s.buffer?.duration ?? 0)
        .filter((d) => isFinite(d) && d > 0);
      if (durations.length > 0) setDuration(Math.max(...durations));
    }

    // Restart all sources from current position (sample-accurate take switch)
    if (wasPlaying) {
      pausedAtRef.current = currentPos;
      const startedAt = startAllSources(ctx, takeNodesRef.current, currentPos);
      startedAtRef.current = startedAt;
    }

    activeTakeIdRef.current = id;
    _setActiveTakeId(id);
  }, []);

  // Auto-activate pending take once its decode completes
  useEffect(() => {
    const pending = pendingActivateRef.current;
    if (pending && takeDecodeStatus[pending] === 'ready') {
      pendingActivateRef.current = null;
      setActiveTake(pending);
    }
  }, [takeDecodeStatus, setActiveTake]);

  const toggleStemMute = useCallback((takeId: string, stemName: string) => {
    setStemStates((prev) => ({
      ...prev,
      [takeId]: {
        ...prev[takeId],
        [stemName]: { ...prev[takeId]?.[stemName], muted: !prev[takeId]?.[stemName]?.muted },
      },
    }));
  }, []);

  const toggleStemSolo = useCallback((takeId: string, stemName: string) => {
    setStemStates((prev) => ({
      ...prev,
      [takeId]: {
        ...prev[takeId],
        [stemName]: { ...prev[takeId]?.[stemName], solo: !prev[takeId]?.[stemName]?.solo },
      },
    }));
  }, []);

  const setStemGain = useCallback((takeId: string, stemName: string, db: number) => {
    const stemNodes = takeNodesRef.current[takeId]?.stems[stemName];
    if (stemNodes) stemNodes.gainNode.gain.value = Math.pow(10, db / 20);
  }, []);

  const setStemPan = useCallback((takeId: string, stemName: string, pan: number) => {
    const stemNodes = takeNodesRef.current[takeId]?.stems[stemName];
    if (stemNodes) stemNodes.panNode.pan.value = Math.max(-1, Math.min(1, pan));
  }, []);

  const destroy = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    stopAllSources(takeNodesRef.current);
    takeNodesRef.current = {};
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    setAnalyserNode(null);
    setAnalyserL(null);
    setAnalyserR(null);
  }, []);

  const getStemAnalysers = useCallback(
    (takeId: string): Record<string, AnalyserNode> | null => {
      const nodes = takeNodesRef.current[takeId];
      if (!nodes) return null;
      return Object.fromEntries(
        Object.entries(nodes.stems).map(([name, sn]) => [name, sn.stemAnalyser]),
      );
    },
    [],
  );

  return {
    isReady, isPlaying, isDecoding, decodeProgress, takeDecodeStatus,
    currentTime, duration, activeTakeId,
    setActiveTake, play, pause, seek,
    stemStates, toggleStemMute, toggleStemSolo, setStemGain, setStemPan,
    analyserNode, analyserL, analyserR, sampleRate,
    getStemAnalysers,
    destroy,
  };
}
