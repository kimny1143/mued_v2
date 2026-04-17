'use client';

import { useState, useCallback, useMemo } from 'react';

const BUCKETS = 120;

/** Extract normalized peak amplitudes from an AudioBuffer (synchronous, < 1ms for typical files). */
export function extractPeaks(buffer: AudioBuffer, buckets = BUCKETS): number[] {
  const data = buffer.getChannelData(0);
  const step = Math.floor(data.length / buckets);
  const peaks: number[] = [];
  for (let i = 0; i < buckets; i++) {
    let max = 0;
    const start = i * step;
    const end = Math.min(start + step, data.length);
    for (let j = start; j < end; j++) {
      const abs = Math.abs(data[j]);
      if (abs > max) max = abs;
    }
    peaks.push(max);
  }
  return peaks;
}

/** Fetch a URL, decode to AudioBuffer, return peaks. */
async function fetchAndExtractPeaks(url: string, buckets = BUCKETS): Promise<number[]> {
  const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ab = await res.arrayBuffer();
  const ctx = new OfflineAudioContext(1, 1, 44100);
  const buffer = await ctx.decodeAudioData(ab);
  return extractPeaks(buffer, buckets);
}

export type Stage = 'raw' | 'mixed' | 'master';

export interface WaveformState {
  peaks: number[];
  loading: boolean;
  error: boolean;
}

export interface UseWaveformDataOptions {
  stemBuffers: Record<string, AudioBuffer> | null; // from useMultiStemPlayer onBuffersLoaded
  rawUrl: string | null;
  masterUrl: string | null;
  stage: Stage;
}

export interface UseWaveformDataReturn {
  stemPeaks: Record<string, number[]>;           // computed once from buffers
  singlePeaks: number[];                         // raw or master peaks (loaded on demand)
  singleState: Pick<WaveformState, 'loading' | 'error'>;
  loadSinglePeaks(url: string): Promise<void>;
}

export function useWaveformData({
  stemBuffers,
  rawUrl,
  masterUrl,
  stage,
}: UseWaveformDataOptions): UseWaveformDataReturn {
  const stemPeaks = useMemo(() => {
    if (!stemBuffers) return {};
    return Object.fromEntries(
      Object.entries(stemBuffers).map(([name, buf]) => [name, extractPeaks(buf)])
    );
  }, [stemBuffers]);

  const [peaksCache, setPeaksCache] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const loadSinglePeaks = useCallback(async (url: string) => {
    if (peaksCache[url]) return;
    setLoading(true);
    setError(false);
    try {
      const peaks = await fetchAndExtractPeaks(url);
      setPeaksCache((prev) => ({ ...prev, [url]: peaks }));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [peaksCache]);

  const activeUrl = stage === 'raw' ? rawUrl : stage === 'master' ? masterUrl : null;
  const singlePeaks = activeUrl ? (peaksCache[activeUrl] ?? []) : [];

  return {
    stemPeaks,
    singlePeaks,
    singleState: { loading, error },
    loadSinglePeaks,
  };
}
