'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

export interface TakeDef {
  id: string;
  label: 'RAW' | 'MIXED' | 'MASTERED';
  /** Proxy URLs keyed by stem name. MASTERED uses { main: url }. */
  stemUrls: Record<string, string>;
}

export interface StemState {
  muted: boolean;
  solo: boolean;
}

export interface UseMultiTakePlayerReturn {
  isReady: boolean;
  isPlaying: boolean;
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
  audio: HTMLAudioElement;
  gainNode: GainNode;
  panNode: StereoPannerNode;
  stemAnalyser: AnalyserNode;
}

interface TakeNodes {
  stems: Record<string, StemNodes>;
  /** Gain 0=muted / 1=active — switched on take change */
  takeMixGain: GainNode;
}

/**
 * Wait for audio elements to complete seeking to a new position.
 * `seeked` fires when the browser has buffered enough data to play from the new position.
 *
 * Only pass ACTIVE take stems — inactive takes are deprioritized by the browser and can
 * take much longer to seek, causing the 3s fallback to govern instead of seeked events.
 * Inactive takes will be resynced on the next setActiveTake() call.
 *
 * 3s fallback (was 500ms): CDN range-request round-trips for mid-track seeks can exceed
 * 500ms on typical connections, causing the old fallback to fire before active stems were
 * ready → audio.play() called on not-yet-buffered elements → playback from t=0.
 */
function waitSeeked(audios: HTMLAudioElement[]): Promise<void> {
  if (audios.length === 0) return Promise.resolve();
  return Promise.all(
    audios.map(
      (a) =>
        new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, 3000);
          a.addEventListener('seeked', () => { clearTimeout(timer); resolve(); }, { once: true });
        }),
    ),
  ).then(() => {});
}

export function useMultiTakePlayer(takes: TakeDef[]): UseMultiTakePlayerReturn {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [analyserL, setAnalyserL] = useState<AnalyserNode | null>(null);
  const [analyserR, setAnalyserR] = useState<AnalyserNode | null>(null);
  const [sampleRate, setSampleRate] = useState(44100);
  const takeNodesRef = useRef<Record<string, TakeNodes>>({});
  const rafRef = useRef<number>(0);
  const pausedAtRef = useRef(0);
  const activeTakeIdRef = useRef(takes[0]?.id ?? '');
  const isPlayingRef = useRef(false); // stable ref for use inside async callbacks

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
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

  // Build Web Audio graph on mount. Signal chain:
  // audioEl → MediaElementSource → stemGain → panNode → takeMixGain
  //                                                         ↓
  //                                                    masterGain → analyserNode → destination
  useEffect(() => {
    if (takes.length === 0) return;

    const ctx = new AudioContext();
    ctxRef.current = ctx;

    // Final-stage nodes — analyser is always connected regardless of take switching
    const masterGain = ctx.createGain();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
    masterGain.connect(analyser);
    analyser.connect(ctx.destination);

    // Stereo split for L/R metrics (correlation, goniometer, stereo width)
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
    // Route through silent gain to keep L/R nodes alive without adding to output
    const silentGain = ctx.createGain();
    silentGain.gain.value = 0;
    aL.connect(silentGain);
    aR.connect(silentGain);
    silentGain.connect(ctx.destination);

    masterGainRef.current = masterGain;
    setAnalyserNode(analyser);
    setAnalyserL(aL);
    setAnalyserR(aR);
    setSampleRate(ctx.sampleRate);

    const defaultId = activeTakeIdRef.current;
    let loadedCount = 0;
    const totalCount = takes.reduce((sum, t) => sum + Object.keys(t.stemUrls).length, 0);

    const newTakeNodes: Record<string, TakeNodes> = {};

    const onLoaded = (activeId: string, nodes: typeof newTakeNodes) => {
      loadedCount++;
      if (loadedCount < totalCount) return;
      const activeTakeNodes = nodes[activeId];
      if (activeTakeNodes) {
        const durations = Object.values(activeTakeNodes.stems)
          .map((s) => s.audio.duration)
          .filter((d) => isFinite(d) && d > 0);
        setDuration(durations.length > 0 ? Math.max(...durations) : 0);
      }
      setIsReady(true);
    };

    for (const take of takes) {
      const takeMixGain = ctx.createGain();
      takeMixGain.gain.value = take.id === defaultId ? 1 : 0;
      takeMixGain.connect(masterGain);

      const stems: Record<string, StemNodes> = {};

      for (const [stemName, url] of Object.entries(take.stemUrls)) {
        const audio = new Audio();
        audio.crossOrigin = 'anonymous';
        audio.preload = 'auto';
        audio.src = url;

        const source = ctx.createMediaElementSource(audio);
        const gainNode = ctx.createGain();
        const panNode = ctx.createStereoPanner();
        const stemAnalyser = ctx.createAnalyser();
        stemAnalyser.fftSize = 256;
        stemAnalyser.smoothingTimeConstant = 0.8;

        source.connect(gainNode);
        gainNode.connect(panNode);
        gainNode.connect(stemAnalyser); // tap for per-stem peak — does not affect audio chain
        panNode.connect(takeMixGain);

        const handleReady = () => onLoaded(defaultId, newTakeNodes);
        audio.addEventListener('loadedmetadata', handleReady, { once: true });
        // Count errors as "loaded" to avoid hanging isReady forever
        audio.addEventListener('error', handleReady, { once: true });

        stems[stemName] = { audio, gainNode, panNode, stemAnalyser };
      }

      newTakeNodes[take.id] = { stems, takeMixGain };
    }

    takeNodesRef.current = newTakeNodes;

    return () => {
      cancelAnimationFrame(rafRef.current);
      for (const tn of Object.values(newTakeNodes)) {
        for (const sn of Object.values(tn.stems)) {
          sn.audio.pause();
          sn.audio.src = '';
          sn.stemAnalyser.disconnect();
        }
        tn.takeMixGain.disconnect();
      }
      masterGain.disconnect();
      analyser.disconnect();
      splitter.disconnect();
      aL.disconnect();
      aR.disconnect();
      silentGain.disconnect();
      ctx.close().catch(() => {});
      ctxRef.current = null;
      masterGainRef.current = null;
      setAnalyserNode(null);
      setAnalyserL(null);
      setAnalyserR(null);
      takeNodesRef.current = {};
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // takes are stable in completed state

  // RAF loop for currentTime tracking
  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    const tick = () => {
      const takeNodes = takeNodesRef.current[activeTakeIdRef.current];
      if (!takeNodes) return;
      const stems = Object.values(takeNodes.stems);
      if (stems.length === 0) return;

      const t = stems[0].audio.currentTime;
      const durations = stems.map((s) => s.audio.duration).filter((d) => isFinite(d) && d > 0);
      const dur = durations.length > 0 ? Math.max(...durations) : 0;

      if (dur > 0 && t >= dur - 0.05) {
        for (const tn of Object.values(takeNodesRef.current)) {
          for (const sn of Object.values(tn.stems)) {
            sn.audio.pause();
            sn.audio.currentTime = 0;
          }
        }
        pausedAtRef.current = 0;
        isPlayingRef.current = false;
        setCurrentTime(0);
        setIsPlaying(false);
        return;
      }

      setCurrentTime(t);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying]);

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

      const pos = pausedAtRef.current;
      const activeId = activeTakeIdRef.current;
      const activeAudios: HTMLAudioElement[] = [];
      const allAudios: HTMLAudioElement[] = [];

      for (const [takeId, takeNodes] of Object.entries(takeNodesRef.current)) {
        for (const stemNodes of Object.values(takeNodes.stems)) {
          stemNodes.audio.currentTime = pos;
          allAudios.push(stemNodes.audio);
          if (takeId === activeId) activeAudios.push(stemNodes.audio);
        }
      }

      // Wait only for active take — inactive takes are deprioritized by the browser
      // and should not gate playback start (they're muted at gain=0 anyway)
      await waitSeeked(activeAudios);
      await Promise.all(allAudios.map((a) => a.play().catch(() => {})));
      isPlayingRef.current = true;
      setIsPlaying(true);
    })();
  }, []);

  const pause = useCallback(() => {
    const takeNodes = takeNodesRef.current[activeTakeIdRef.current];
    if (takeNodes) {
      const stems = Object.values(takeNodes.stems);
      if (stems.length > 0) pausedAtRef.current = stems[0].audio.currentTime;
    }
    for (const tn of Object.values(takeNodesRef.current)) {
      for (const sn of Object.values(tn.stems)) sn.audio.pause();
    }
    isPlayingRef.current = false;
    setIsPlaying(false);
  }, []);

  const seek = useCallback(
    (time: number) => {
      const clamped = Math.max(0, Math.min(time, duration));
      pausedAtRef.current = clamped;
      setCurrentTime(clamped);

      const wasPlaying = isPlayingRef.current;
      const activeId = activeTakeIdRef.current;
      const activeAudios: HTMLAudioElement[] = [];
      const allAudios: HTMLAudioElement[] = [];

      for (const [takeId, tn] of Object.entries(takeNodesRef.current)) {
        for (const sn of Object.values(tn.stems)) {
          // Pause before seek — stops each stem from re-buffering independently while playing
          if (wasPlaying) sn.audio.pause();
          sn.audio.currentTime = clamped;
          allAudios.push(sn.audio);
          if (takeId === activeId) activeAudios.push(sn.audio);
        }
      }

      if (wasPlaying) {
        const seekTarget = clamped;
        // Wait only for active take stems to be ready — they're what the user hears
        void waitSeeked(activeAudios.length > 0 ? activeAudios : allAudios).then(() => {
          // Stale-seek guard: user seeked again or duration clamped us differently
          if (pausedAtRef.current !== seekTarget) return;
          void Promise.all(allAudios.map((a) => a.play().catch(() => {})));
        });
      }
    },
    [duration],
  );

  const setActiveTake = useCallback((id: string) => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    // B5: capture ref position from the currently active take before switching,
    // then resync all takes to eliminate any accumulated drift
    const curStem = Object.values(takeNodesRef.current[activeTakeIdRef.current]?.stems ?? {})[0];
    const refTime = curStem?.audio.currentTime ?? pausedAtRef.current;

    for (const [takeId, takeNodes] of Object.entries(takeNodesRef.current)) {
      const isActive = takeId === id;
      takeNodes.takeMixGain.gain.setValueAtTime(isActive ? 1 : 0, ctx.currentTime);
      for (const sn of Object.values(takeNodes.stems)) {
        if (!isActive) {
          // B5: resync inactive takes to keep them aligned for future switches
          sn.audio.currentTime = refTime;
        } else if (Math.abs(sn.audio.currentTime - refTime) > 0.5) {
          // B10: resync newly active take only when significantly drifted — handles the
          // case where a previous failed seek (while inactive) left it at t=0. The 0.5s
          // threshold prevents re-seeking takes that are naturally in sync (those started
          // with play() simultaneously), avoiding the buffering-failure snap from B9.
          sn.audio.currentTime = refTime;
        }
      }
    }

    const newTakeNodes = takeNodesRef.current[id];
    if (newTakeNodes) {
      const durations = Object.values(newTakeNodes.stems)
        .map((s) => s.audio.duration)
        .filter((d) => isFinite(d) && d > 0);
      // Guard: only update duration when new take has valid durations.
      // Skipping setDuration(0) prevents a transient duration=0 state that causes
      // handleOverviewSeek(pos) → seek(pos * 0) → seek(0) → reset to beginning.
      if (durations.length > 0) setDuration(Math.max(...durations));
    }

    activeTakeIdRef.current = id;
    _setActiveTakeId(id);
  }, []);

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
    for (const tn of Object.values(takeNodesRef.current)) {
      for (const sn of Object.values(tn.stems)) {
        sn.audio.pause();
        sn.audio.src = '';
      }
    }
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
    isReady, isPlaying, currentTime, duration, activeTakeId,
    setActiveTake, play, pause, seek,
    stemStates, toggleStemMute, toggleStemSolo, setStemGain, setStemPan,
    analyserNode, analyserL, analyserR, sampleRate,
    getStemAnalysers,
    destroy,
  };
}
