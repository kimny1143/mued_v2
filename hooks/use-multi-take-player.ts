'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { trackDialPlaybackIssue } from '@/lib/analytics/gtag';

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

/** Per-take decode status for pill UI. Absent from the map = not yet decoded (lazy), clickable. */
export type TakeDecodeStatus = 'decoding' | 'ready' | 'error';

export interface UseMultiTakePlayerReturn {
  isReady: boolean;
  isPlaying: boolean;
  /** True while the ACTIVE take is being decoded (gates isReady). */
  isDecoding: boolean;
  decodeProgress: DecodeProgress;
  /** Per-take decode status keyed by take ID — use for pill spinner/disabled state. */
  takeDecodeStatus: Record<string, TakeDecodeStatus>;
  /** Decode status of the currently active take — drives transport spinner vs error/retry UI. */
  activeTakeStatus: TakeDecodeStatus;
  currentTime: number;
  duration: number;
  activeTakeId: string;
  setActiveTake(id: string): void;
  /** Re-decode the active take after a failure (transport "retry" affordance). */
  retryActiveTake(): void;
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
  /** Dynamically updates loudnessGain for a take (e.g. after user-triggered Gain Match). */
  updateTakeGainOffset(takeId: string, gainOffsetDb: number): void;
  /** BS.1770-4 compliant LUFS from AudioWorklet tapped at masterGain. */
  momentaryLufs: number;
  shortTermLufs: number;
  integratedLufs: number;
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

/**
 * Per-stem fetch+decode timeout. A hung fetch (unresponsive / expired / broken stem URL — e.g. an
 * old session whose signed URLs have lapsed) or a stuck decodeAudioData() would otherwise never
 * settle, so the decode counter stalls and the spinner spins forever. Aborting a hang turns it into
 * a normal decode failure, which the per-take error-pill path handles (counter advances, spinner
 * clears, pill/transport becomes a retry). Generous (45s) so a slow-but-valid stem on mobile isn't
 * false-aborted — a false abort here costs no money, just an error pill.
 */
const FETCH_DECODE_TIMEOUT_MS = 45_000;

/**
 * Max simultaneous fetch+decode operations. The RAW take's stems are full uncompressed WAVs
 * (~80MB each); decoding many in parallel starves bandwidth past the timeout and balloons PCM
 * memory. Capping concurrency keeps the active take responsive and bounds memory growth.
 * (Yuu incident 2026-06-11 — see project-dial-v2-player-decode-hang.)
 */
const DECODE_CONCURRENCY = 3;

/** Emit a player_stall telemetry event if the active take isn't ready within this window. */
const PLAYER_STALL_MS = 20_000;

/** Thrown when the per-stem fetch/decode is aborted by the timeout (distinct from a transient error). */
class DecodeTimeoutError extends Error {
  constructor() { super('stem fetch/decode timed out'); this.name = 'DecodeTimeoutError'; }
}

/** A small async semaphore — bounds concurrent fetch+decode to DECODE_CONCURRENCY. */
function createSemaphore(max: number) {
  let active = 0;
  const waiters: Array<() => void> = [];
  const acquire = (): Promise<void> =>
    new Promise<void>((resolve) => {
      const attempt = () => {
        if (active < max) { active++; resolve(); }
        else waiters.push(attempt);
      };
      attempt();
    });
  const release = () => {
    active = Math.max(0, active - 1);
    waiters.shift()?.();
  };
  return { acquire, release };
}

async function fetchAndDecode(url: string, ctx: AudioContext): Promise<AudioBuffer> {
  const controller = new AbortController();
  // Outer guard also covers a hung decodeAudioData() (which is not abortable) via Promise.race.
  let timedOut = false;
  let guardTimer: ReturnType<typeof setTimeout> | undefined;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, FETCH_DECODE_TIMEOUT_MS);
  try {
    const work = (async () => {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
      const arrayBuffer = await response.arrayBuffer();
      return await ctx.decodeAudioData(arrayBuffer);
    })();
    const guard = new Promise<never>((_, reject) => {
      // Fires if decodeAudioData() hangs after a completed fetch (abort can't interrupt it).
      guardTimer = setTimeout(() => reject(new DecodeTimeoutError()), FETCH_DECODE_TIMEOUT_MS);
    });
    return await Promise.race([work, guard]);
  } catch (e) {
    if (timedOut || (e instanceof DOMException && e.name === 'AbortError')) throw new DecodeTimeoutError();
    throw e;
  } finally {
    // Clear BOTH timers on settle so a successful decode leaves no dangling 45s timer.
    clearTimeout(timer);
    if (guardTimer) clearTimeout(guardTimer);
  }
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

/** Initial active take: prefer the newest processed take (MIXED→MASTERED) so first paint decodes a
 *  light preview rather than the heavy RAW WAVs; fall back to the first take (RAW) when none exist. */
function pickInitialActiveId(takes: TakeDef[]): string {
  return (
    takes.find((t) => t.label === 'MIXED') ??
    takes.find((t) => t.label === 'MASTERED') ??
    takes[0]
  )?.id ?? '';
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMultiTakePlayer(takes: TakeDef[]): UseMultiTakePlayerReturn {
  const ctxRef = useRef<AudioContext | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [analyserL, setAnalyserL] = useState<AnalyserNode | null>(null);
  const [analyserR, setAnalyserR] = useState<AnalyserNode | null>(null);
  const [sampleRate, setSampleRate] = useState(44100);
  const lufsWorkletRef = useRef<AudioWorkletNode | null>(null);
  const [momentaryLufs, setMomentaryLufs] = useState(-70);
  const [shortTermLufs, setShortTermLufs] = useState(-70);
  const [integratedLufs, setIntegratedLufs] = useState(-70);
  const takeNodesRef = useRef<Record<string, TakeNodes>>({});
  const rafRef = useRef<number>(0);
  const pausedAtRef = useRef(0);
  /** AudioContext time at which position 0 would be. currentTime = ctx.now - startedAt */
  const startedAtRef = useRef(0);
  const initialActiveId = pickInitialActiveId(takes);
  const activeTakeIdRef = useRef(initialActiveId);
  const isPlayingRef = useRef(false);
  /** Take ID queued for activation once its decode completes. */
  const pendingActivateRef = useRef<string | null>(null);
  /** Ensure a take's stems are decoded (lazy, idempotent). Set inside the mount effect. */
  const ensureTakeDecodeRef = useRef<((id: string) => void) | null>(null);
  /** Re-decode an errored take from scratch. Set inside the mount effect. */
  const retryTakeRef = useRef<((id: string) => void) | null>(null);
  /** Reconcile the take set in place (add/remove nodes) without remount. Set inside the mount effect. */
  const reconcileTakesRef = useRef<((next: TakeDef[]) => void) | null>(null);
  /** Latest takes prop — lets the mount-once decode machinery + reconcile see the current set. */
  const takesRef = useRef(takes);
  takesRef.current = takes;
  /** Stable ref for takeDecodeStatus — accessible in setActiveTake without closure stale. */
  const takeDecodeStatusRef = useRef<Record<string, TakeDecodeStatus>>(
    initialActiveId ? { [initialActiveId]: 'decoding' } : {},
  );

  const [isPlaying, setIsPlaying] = useState(false);
  // Only "decoding" if there's an initial active take to decode — empty takes must not strand
  // the UI on a perpetual spinner.
  const [isDecoding, setIsDecoding] = useState(initialActiveId !== '');
  const [decodeProgress, setDecodeProgress] = useState<DecodeProgress>({ done: 0, total: 0 });
  const [takeDecodeStatus, setTakeDecodeStatus] = useState<Record<string, TakeDecodeStatus>>(
    takeDecodeStatusRef.current,
  );
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeTakeId, _setActiveTakeId] = useState(initialActiveId);
  const [stemStates, setStemStates] = useState<Record<string, Record<string, StemState>>>(() =>
    Object.fromEntries(
      takes.map((t) => [
        t.id,
        Object.fromEntries(Object.keys(t.stemUrls).map((k) => [k, { muted: false, solo: false }])),
      ]),
    ),
  );

  // isReady is DERIVED from the active take's decode status — never a single fixed gating take.
  // A failed/slow non-active take can never freeze the transport (Yuu incident root cause).
  const activeTakeStatus: TakeDecodeStatus = takeDecodeStatus[activeTakeId] ?? 'decoding';
  const isReady = activeTakeStatus === 'ready';

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

    // Build the Web Audio subgraph for ONE take (no buffers yet) and wire it to masterGain.
    // Reused by the initial build below AND by reconcileTakes when a take is added without remount.
    // Gain follows the live active take (0 for non-active), so reconcile-added takes start muted.
    const buildTakeNodes = (take: TakeDef): TakeNodes => {
      const takeMixGain = ctx.createGain();
      takeMixGain.gain.value = take.id === activeTakeIdRef.current ? 1 : 0;

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

      return { stems, takeMixGain, loudnessGain };
    };

    // Phase 0: build permanent nodes for all initial takes into takeNodesRef (no buffers yet).
    const builtNodes: Record<string, TakeNodes> = {};
    for (const take of takes) builtNodes[take.id] = buildTakeNodes(take);
    takeNodesRef.current = builtNodes;

    let cancelled = false;
    const sem = createSemaphore(DECODE_CONCURRENCY);
    /** Takes whose decode has been kicked off (lazy — only the active take + user-selected takes). */
    const startedTakes = new Set<string>();
    /** Per-take decode counting. */
    const takeDecodeCounts = new Map<string, { done: number; success: number; total: number }>();
    /** Active-take stall timers, cleared when the take settles. */
    const stallTimers = new Map<string, ReturnType<typeof setTimeout>>();

    const setStatus = (takeId: string, status: TakeDecodeStatus) => {
      const upd = { ...takeDecodeStatusRef.current, [takeId]: status };
      takeDecodeStatusRef.current = upd;
      setTakeDecodeStatus({ ...upd });
    };

    // BS.1770-4 LUFS worklet — tap masterGain, silent output keeps graph active
    ctx.audioWorklet.addModule('/worklets/ebur128-processor.js').then(() => {
      if (cancelled) return;
      const lufsWorklet = new AudioWorkletNode(ctx, 'ebur128-processor');
      lufsWorklet.port.onmessage = (e) => {
        const { momentary, shortTerm, integrated } = e.data as { momentary: number; shortTerm: number; integrated: number };
        setMomentaryLufs(isFinite(momentary) ? Math.max(-70, momentary) : -70);
        setShortTermLufs(isFinite(shortTerm) ? Math.max(-70, shortTerm) : -70);
        setIntegratedLufs(isFinite(integrated) ? Math.max(-70, integrated) : -70);
      };
      masterGain.connect(lufsWorklet);
      const lufsGain = ctx.createGain();
      lufsGain.gain.value = 0;
      lufsWorklet.connect(lufsGain);
      lufsGain.connect(ctx.destination);
      lufsWorkletRef.current = lufsWorklet;
    }).catch((e) => { console.warn('[useMultiTakePlayer] ebur128 worklet load failed:', e); });

    const onStemDecoded = (takeId: string, success: boolean) => {
      if (cancelled) return;
      const counts = takeDecodeCounts.get(takeId);
      if (!counts) return;
      counts.done++;
      if (success) counts.success++;

      // Drive the "Decoding audio…" progress bar for the active take only.
      if (takeId === activeTakeIdRef.current) {
        setDecodeProgress({ done: counts.done, total: counts.total });
      }

      // When all stems for a take are done, finalize per-take status
      if (counts.done === counts.total) {
        const status: TakeDecodeStatus = counts.success > 0 ? 'ready' : 'error';
        setStatus(takeId, status);

        const timer = stallTimers.get(takeId);
        if (timer) { clearTimeout(timer); stallTimers.delete(takeId); }

        if (status === 'ready') {
          // Update duration if this is the active take.
          if (takeId === activeTakeIdRef.current) {
            const durations = Object.values(takeNodesRef.current[takeId]?.stems ?? {})
              .map((s) => s.buffer?.duration ?? 0)
              .filter((d) => isFinite(d) && d > 0);
            if (durations.length > 0) setDuration(Math.max(...durations));
          }
        }
        if (takeId === activeTakeIdRef.current) setIsDecoding(false);
      }
    };

    const decodeStem = async (takeId: string, stemName: string, url: string) => {
      if (cancelled) return;
      if (!url) {
        console.error(`[dial:decode] empty URL for stem "${stemName}" in take ${takeId}`);
        onStemDecoded(takeId, false);
        return;
      }
      await sem.acquire();
      let buffer: AudioBuffer | null = null;
      let timedOut = false;
      try {
        if (cancelled) return;
        try {
          buffer = await fetchAndDecode(url, ctx);
        } catch (e1) {
          timedOut = e1 instanceof DecodeTimeoutError;
          console.error(`[dial:decode] attempt 1 failed${timedOut ? ' (timeout)' : ''}: "${stemName}" take=${takeId.slice(-8)}`, e1);
          // Retry a transient error once — but NOT a timeout (a hung URL would just time out again).
          if (!timedOut) {
            try {
              if (!cancelled) buffer = await fetchAndDecode(url, ctx);
            } catch (e2) {
              timedOut = e2 instanceof DecodeTimeoutError;
              console.error(`[dial:decode] retry failed: "${stemName}" take=${takeId.slice(-8)}`, e2);
            }
          }
        }
      } finally {
        sem.release();
      }
      if (cancelled) return;
      // The take may have been removed by reconcileTakes while this decode was in flight.
      const tn = takeNodesRef.current[takeId];
      if (!tn || !tn.stems[stemName]) return;
      if (buffer) {
        tn.stems[stemName].buffer = buffer;
      } else {
        trackDialPlaybackIssue({
          issue: timedOut ? 'decode_timeout' : 'decode_error',
          takeLabel: takesRef.current.find((t) => t.id === takeId)?.label,
          stemKey: stemName,
          takeCount: takesRef.current.length,
        });
      }
      onStemDecoded(takeId, buffer !== null);
    };

    /** Lazily decode a take's stems exactly once. The heart of the stop-bleed fix — only the active
     *  take (and any the user later selects) is fetched, so the heavy RAW WAVs never load up front. */
    const ensureTakeDecode = (takeId: string) => {
      if (cancelled || startedTakes.has(takeId)) return;
      const take = takesRef.current.find((t) => t.id === takeId);
      if (!take) return;
      startedTakes.add(takeId);
      takeDecodeCounts.set(takeId, { done: 0, success: 0, total: Object.keys(take.stemUrls).length });
      setStatus(takeId, 'decoding');
      if (takeId === activeTakeIdRef.current) {
        setIsDecoding(true);
        setDecodeProgress({ done: 0, total: Object.keys(take.stemUrls).length });
        // Stall telemetry: surface a player that never reaches ready (detection layer).
        const stall = setTimeout(() => {
          if (cancelled) return;
          if (takeDecodeStatusRef.current[takeId] === 'decoding') {
            trackDialPlaybackIssue({
              issue: 'player_stall',
              takeLabel: take.label,
              takeCount: takesRef.current.length,
              elapsedMs: PLAYER_STALL_MS,
            });
          }
        }, PLAYER_STALL_MS);
        stallTimers.set(takeId, stall);
      }
      for (const [name, url] of Object.entries(take.stemUrls)) {
        decodeStem(takeId, name, url).catch(() => {});
      }
    };
    ensureTakeDecodeRef.current = ensureTakeDecode;

    // Re-decode an errored take from scratch (e.g. user clicks an error pill / retry).
    retryTakeRef.current = (takeId: string) => {
      if (cancelled) return;
      const take = takesRef.current.find((t) => t.id === takeId);
      if (!take) return;
      // Clear stale buffers and stop any playing sources for this take
      const tn = takeNodesRef.current[takeId];
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
      startedTakes.delete(takeId);
      takeDecodeCounts.delete(takeId);
      ensureTakeDecode(takeId);
    };

    // Reconcile the take set in place when `takes` changes — add new takes' nodes, remove gone
    // takes — WITHOUT tearing down the AudioContext or touching currently-playing sources. Replaces
    // the old full-remount (playerKey) so playback isn't interrupted when a take completes.
    reconcileTakesRef.current = (next: TakeDef[]) => {
      if (cancelled) return;
      const nextIds = new Set(next.map((t) => t.id));
      const currentIds = Object.keys(takeNodesRef.current);

      // Add new takes (lazy: build nodes + register stemStates; decode only when activated).
      for (const take of next) {
        if (takeNodesRef.current[take.id]) continue;
        takeNodesRef.current[take.id] = buildTakeNodes(take);
        setStemStates((prev) =>
          prev[take.id]
            ? prev
            : {
                ...prev,
                [take.id]: Object.fromEntries(
                  Object.keys(take.stemUrls).map((k) => [k, { muted: false, solo: false }]),
                ),
              },
        );
      }

      // Remove gone takes (stop sources, disconnect nodes, drop decode state).
      for (const id of currentIds) {
        if (nextIds.has(id)) continue;
        const tn = takeNodesRef.current[id];
        if (tn) {
          for (const sn of Object.values(tn.stems)) {
            if (sn.source) {
              try { sn.source.stop(); } catch { /* already stopped */ }
              sn.source.disconnect();
              sn.source = null;
            }
            sn.gainNode.disconnect();
            sn.panNode.disconnect();
            sn.stemAnalyser.disconnect();
          }
          tn.takeMixGain.disconnect();
          tn.loudnessGain.disconnect();
        }
        delete takeNodesRef.current[id];
        startedTakes.delete(id);
        takeDecodeCounts.delete(id);
        const st = stallTimers.get(id);
        if (st) { clearTimeout(st); stallTimers.delete(id); }
        if (takeDecodeStatusRef.current[id] !== undefined) {
          const upd = { ...takeDecodeStatusRef.current };
          delete upd[id];
          takeDecodeStatusRef.current = upd;
          setTakeDecodeStatus({ ...upd });
        }
      }
    };

    // Kick off ONLY the initial active take — everything else decodes on demand.
    if (defaultId) ensureTakeDecode(defaultId);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      for (const t of stallTimers.values()) clearTimeout(t);
      stallTimers.clear();
      stopAllSources(takeNodesRef.current);
      for (const tn of Object.values(takeNodesRef.current)) {
        tn.takeMixGain.disconnect();
        tn.loudnessGain.disconnect();
        for (const sn of Object.values(tn.stems)) {
          sn.gainNode.disconnect();
          sn.panNode.disconnect();
          sn.stemAnalyser.disconnect();
        }
      }
      lufsWorkletRef.current?.disconnect();
      lufsWorkletRef.current = null;
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

    // Not yet decoded (lazy) — kick off its decode and queue activation when ready.
    if (status === undefined) {
      pendingActivateRef.current = id;
      ensureTakeDecodeRef.current?.(id);
      return;
    }

    // Still decoding — queue for auto-activation when ready.
    if (status === 'decoding') {
      pendingActivateRef.current = id;
      return;
    }

    // Decode failed — re-decode from scratch, queue for auto-activation.
    if (status === 'error') {
      pendingActivateRef.current = id;
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
    setIsDecoding(false);
    lufsWorkletRef.current?.port.postMessage({ reset: true });
    setMomentaryLufs(-70);
    setShortTermLufs(-70);
    setIntegratedLufs(-70);
  }, []);

  // Re-decode the active take after a failure (transport "retry").
  const retryActiveTake = useCallback(() => {
    const id = activeTakeIdRef.current;
    if (takeDecodeStatusRef.current[id] === 'error') {
      retryTakeRef.current?.(id);
    }
  }, []);

  // Auto-activate pending take once its decode completes
  useEffect(() => {
    const pending = pendingActivateRef.current;
    if (pending && takeDecodeStatus[pending] === 'ready') {
      pendingActivateRef.current = null;
      setActiveTake(pending);
    }
  }, [takeDecodeStatus, setActiveTake]);

  // Reconcile the take set WITHOUT remounting the player. When `takes` changes (a new take completes
  // or an old one drops), add/remove its nodes in place — preserving the AudioContext and any
  // currently-playing sources, so playback isn't interrupted (replaces the old playerKey remount).
  const takesSig = takes.map((t) => `${t.id}/${Object.keys(t.stemUrls).length}`).join(',');
  useEffect(() => {
    if (!ctxRef.current) return; // mount effect hasn't built the graph yet (or takes empty)
    const before = new Set(Object.keys(takeNodesRef.current));
    reconcileTakesRef.current?.(takesRef.current);
    // Auto-show the newest processed take when it was just added (replicates the remount UX).
    const newest = pickInitialActiveId(takesRef.current);
    if (newest && !before.has(newest) && newest !== activeTakeIdRef.current) {
      setActiveTake(newest);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [takesSig]);

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

  const updateTakeGainOffset = useCallback(
    (takeId: string, gainOffsetDb: number) => {
      const nodes = takeNodesRef.current[takeId];
      if (!nodes) return;
      const linearGain = Math.pow(10, gainOffsetDb / 20);
      const t = ctxRef.current?.currentTime ?? 0;
      nodes.loudnessGain.gain.setValueAtTime(linearGain, t);
    },
    [],
  );

  return {
    isReady, isPlaying, isDecoding, decodeProgress, takeDecodeStatus, activeTakeStatus,
    currentTime, duration, activeTakeId,
    setActiveTake, retryActiveTake, play, pause, seek,
    stemStates, toggleStemMute, toggleStemSolo, setStemGain, setStemPan,
    analyserNode, analyserL, analyserR, sampleRate,
    getStemAnalysers,
    updateTakeGainOffset,
    momentaryLufs, shortTermLufs, integratedLufs,
    destroy,
  };
}
