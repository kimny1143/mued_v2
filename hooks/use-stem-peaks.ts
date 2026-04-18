'use client';

import { useEffect, useRef, useState } from 'react';

const BUCKETS = 120;

async function fetchPeaks(url: string): Promise<number[]> {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ab = await res.arrayBuffer();
  // OfflineAudioContext used only for decoding; length=1 is arbitrary
  const ctx = new OfflineAudioContext(1, 1, 44100);
  const buffer = await ctx.decodeAudioData(ab);
  const data = buffer.getChannelData(0);
  const step = Math.max(1, Math.floor(data.length / BUCKETS));
  const peaks: number[] = [];
  for (let i = 0; i < BUCKETS; i++) {
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

/**
 * Fetches waveform peaks for the active take's stem URLs in the background.
 * Peaks are cached by URL so switching back to a previously loaded take is instant.
 * WaveformBar handles empty peaks gracefully (renders nothing until ready).
 */
export function useStemPeaks(
  activeTakeId: string,
  stemUrls: Record<string, string> | null,
): Record<string, number[]> {
  // URL → peaks cache persists across take switches for the component lifetime
  const cacheRef = useRef<Record<string, number[]>>({});
  const stemUrlsRef = useRef(stemUrls);
  stemUrlsRef.current = stemUrls;

  const [peaksByTake, setPeaksByTake] = useState<Record<string, Record<string, number[]>>>({});

  useEffect(() => {
    const urls = stemUrlsRef.current;
    if (!urls || Object.keys(urls).length === 0) return;

    const takeId = activeTakeId;
    let cancelled = false;

    // Apply any already-cached peaks immediately (avoids flash on back-navigation)
    const cached: Record<string, number[]> = {};
    for (const [name, url] of Object.entries(urls)) {
      if (cacheRef.current[url]) cached[name] = cacheRef.current[url];
    }
    if (Object.keys(cached).length > 0) {
      setPeaksByTake((prev) => ({ ...prev, [takeId]: { ...(prev[takeId] ?? {}), ...cached } }));
    }

    // Fetch peaks for stems not yet in cache
    for (const [stemName, url] of Object.entries(urls)) {
      if (cacheRef.current[url]) continue;
      fetchPeaks(url).then((p) => {
        if (cancelled) return;
        cacheRef.current[url] = p;
        setPeaksByTake((prev) => ({
          ...prev,
          [takeId]: { ...(prev[takeId] ?? {}), [stemName]: p },
        }));
      }).catch(() => {
        // Silent failure — WaveformBar renders nothing for missing peaks
      });
    }

    return () => { cancelled = true; };
  }, [activeTakeId]); // stemUrls is stable per take; activeTakeId is the change signal

  return peaksByTake[activeTakeId] ?? {};
}
