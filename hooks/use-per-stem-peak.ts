'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Reads peak dBFS from per-stem AnalyserNodes exposed by useMultiTakePlayer.
 * Returns a map of stemName → peak dBFS (negative number, e.g. -6.2).
 * Updates at ~30fps via rAF loop while analysers are present.
 */
export function usePerStemPeak(
  stemAnalysers: Record<string, AnalyserNode> | null,
): Record<string, number> {
  const rafRef = useRef<number>(0);
  const [peakDb, setPeakDb] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!stemAnalysers || Object.keys(stemAnalysers).length === 0) {
      setPeakDb({});
      return;
    }

    const buffers: Record<string, Uint8Array<ArrayBuffer>> = {};
    for (const [name, analyser] of Object.entries(stemAnalysers)) {
      buffers[name] = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
    }

    let lastUpdate = 0;
    const INTERVAL_MS = 33; // ~30fps

    const tick = (now: number) => {
      rafRef.current = requestAnimationFrame(tick);
      if (now - lastUpdate < INTERVAL_MS) return;
      lastUpdate = now;

      const result: Record<string, number> = {};
      for (const [name, analyser] of Object.entries(stemAnalysers)) {
        const buf = buffers[name];
        analyser.getByteTimeDomainData(buf);
        // Find peak: byte value 128 = 0, deviation = |v - 128| / 128 → linear amplitude
        let maxAmp = 0;
        for (let i = 0; i < buf.length; i++) {
          const amp = Math.abs(buf[i] - 128) / 128;
          if (amp > maxAmp) maxAmp = amp;
        }
        // Convert linear amplitude → dBFS (floor at -60)
        result[name] = maxAmp > 0 ? Math.max(-60, 20 * Math.log10(maxAmp)) : -60;
      }
      setPeakDb(result);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [stemAnalysers]);

  return peakDb;
}
