'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

export interface StemState {
  muted: boolean;
  solo: boolean;
}

export interface UseMultiStemPlayerOptions {
  stemUrls: Record<string, string>;
  onReady?: () => void;
  onError?: (err: Error) => void;
  onBuffersLoaded?: (buffers: Record<string, AudioBuffer>) => void;
}

export interface UseMultiStemPlayerReturn {
  isReady: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  stems: Record<string, StemState>;
  play(): void;
  pause(): void;
  seek(time: number): void;
  toggleMute(stemName: string): void;
  toggleSolo(stemName: string): void;
  setStemGain(stemName: string, db: number): void;
  destroy(): void;
}

export function useMultiStemPlayer({
  stemUrls,
  onReady,
  onError,
  onBuffersLoaded,
}: UseMultiStemPlayerOptions): UseMultiStemPlayerReturn {
  const ctxRef = useRef<AudioContext | null>(null);
  const buffersRef = useRef<Record<string, AudioBuffer>>({});
  const sourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const gainNodesRef = useRef<Record<string, GainNode>>({});
  const startTimeRef = useRef(0);
  const pausedAtRef = useRef(0);
  const rafRef = useRef<number>(0);

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [stems, setStems] = useState<Record<string, StemState>>(() =>
    Object.fromEntries(Object.keys(stemUrls).map((k) => [k, { muted: false, solo: false }]))
  );

  const getContext = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext();
    }
    return ctxRef.current;
  }, []);

  const stopSources = useCallback(() => {
    for (const src of sourcesRef.current) {
      try { src.stop(); } catch { /* already stopped */ }
    }
    sourcesRef.current = [];
    gainNodesRef.current = {};
  }, []);

  // Preload all stem buffers
  useEffect(() => {
    let cancelled = false;
    const stemNames = Object.keys(stemUrls);
    if (stemNames.length === 0) return;

    setIsReady(false);

    const load = async () => {
      const ctx = getContext();

      // Fetch all stems in parallel; individual failures don't abort the rest
      const settled = await Promise.allSettled(
        stemNames.map(async (name) => {
          const res = await fetch(stemUrls[name], { credentials: 'same-origin' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const ab = await res.arrayBuffer();
          const buf = await ctx.decodeAudioData(ab);
          return { name, buf };
        }),
      );

      if (cancelled) return;

      const results: Record<string, AudioBuffer> = {};
      const failures: string[] = [];
      for (const r of settled) {
        if (r.status === 'fulfilled') results[r.value.name] = r.value.buf;
        else failures.push(r.reason instanceof Error ? r.reason.message : String(r.reason));
      }

      if (failures.length === stemNames.length) {
        onError?.(new Error(`All stems failed: ${failures[0]}`));
        return;
      }
      if (failures.length > 0) {
        onError?.(new Error(`${failures.length} stem(s) failed (${failures.length}/${stemNames.length}): ${failures[0]}`));
      }

      buffersRef.current = results;
      const dur = Math.max(...Object.values(results).map((b) => b.duration));
      setDuration(dur);
      setIsReady(true);
      onReady?.();
      onBuffersLoaded?.(results);
    };

    load().catch(() => {});
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(stemUrls)]);

  const computeGain = useCallback((stemName: string, stemsState: Record<string, StemState>): number => {
    const anySoloed = Object.values(stemsState).some((s) => s.solo);
    if (anySoloed) return stemsState[stemName]?.solo ? 1 : 0;
    return stemsState[stemName]?.muted ? 0 : 1;
  }, []);

  // Sync gain nodes when stems state changes during playback
  useEffect(() => {
    for (const [name, gainNode] of Object.entries(gainNodesRef.current)) {
      gainNode.gain.value = computeGain(name, stems);
    }
  }, [stems, computeGain]);

  const startPlayback = useCallback((offset: number, currentStems: Record<string, StemState>) => {
    const ctx = getContext();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    stopSources();

    const newSources: AudioBufferSourceNode[] = [];
    const newGains: Record<string, GainNode> = {};

    for (const [name, buf] of Object.entries(buffersRef.current)) {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const gainNode = ctx.createGain();
      gainNode.gain.value = computeGain(name, currentStems);
      src.connect(gainNode);
      gainNode.connect(ctx.destination);
      src.start(0, Math.min(offset, buf.duration - 0.001));
      newSources.push(src);
      newGains[name] = gainNode;
    }

    sourcesRef.current = newSources;
    gainNodesRef.current = newGains;
    startTimeRef.current = ctx.currentTime - offset;
  }, [getContext, stopSources, computeGain]);

  const play = useCallback(() => {
    if (!isReady) return;
    startPlayback(pausedAtRef.current, stems);
    setIsPlaying(true);
  }, [isReady, stems, startPlayback]);

  const pause = useCallback(() => {
    if (!isPlaying) return;
    const ctx = ctxRef.current;
    if (ctx) pausedAtRef.current = ctx.currentTime - startTimeRef.current;
    stopSources();
    setIsPlaying(false);
  }, [isPlaying, stopSources]);

  const seek = useCallback((time: number) => {
    const clamped = Math.max(0, Math.min(time, duration));
    pausedAtRef.current = clamped;
    setCurrentTime(clamped);
    if (isPlaying) {
      startPlayback(clamped, stems);
      const ctx = ctxRef.current;
      if (ctx) startTimeRef.current = ctx.currentTime - clamped;
    }
  }, [isPlaying, duration, stems, startPlayback]);

  const toggleMute = useCallback((stemName: string) => {
    setStems((prev) => ({
      ...prev,
      [stemName]: { ...prev[stemName], muted: !prev[stemName]?.muted },
    }));
  }, []);

  const toggleSolo = useCallback((stemName: string) => {
    setStems((prev) => ({
      ...prev,
      [stemName]: { ...prev[stemName], solo: !prev[stemName]?.solo },
    }));
  }, []);

  const setStemGain = useCallback((stemName: string, db: number) => {
    const gainNode = gainNodesRef.current[stemName];
    if (gainNode) {
      gainNode.gain.value = Math.pow(10, db / 20);
    }
  }, []);

  // RAF loop for playback position tracking
  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    const tick = () => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      const pos = ctx.currentTime - startTimeRef.current;
      if (pos >= duration && duration > 0) {
        stopSources();
        pausedAtRef.current = 0;
        setIsPlaying(false);
        setCurrentTime(0);
        return;
      }
      setCurrentTime(Math.min(pos, duration));
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, duration, stopSources]);

  const destroy = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    stopSources();
    if (ctxRef.current?.state !== 'closed') {
      ctxRef.current?.close().catch(() => {});
    }
    ctxRef.current = null;
  }, [stopSources]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      stopSources();
      if (ctxRef.current?.state !== 'closed') {
        ctxRef.current?.close().catch(() => {});
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isReady, isPlaying, currentTime, duration, stems, play, pause, seek, toggleMute, toggleSolo, setStemGain, destroy };
}
