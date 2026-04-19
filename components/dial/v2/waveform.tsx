'use client';

import { useRef } from 'react';

// ─── Seeded RNG ───────────────────────────────────────────────────────────────

export function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = ((s * 1664525 + 1013904223) >>> 0);
    return s / 0xffffffff;
  };
}

// ─── Peak generation ─────────────────────────────────────────────────────────

export type WaveShape = 'mid' | 'kick' | 'hat';

export interface PeakPoint {
  min: number;
  max: number;
}

export function genPeaks(seed: number, n = 220, shape: WaveShape = 'mid'): PeakPoint[] {
  const r = seededRand(seed);
  const peaks: PeakPoint[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const env = 0.35 + 0.4 * Math.sin(t * Math.PI) + (shape === 'kick' ? 0.2 : shape === 'hat' ? -0.15 : 0);
    const transient = (i % (shape === 'kick' ? 12 : shape === 'hat' ? 4 : 9) === 0) ? 0.35 : 0;
    const a = (r() * 2 - 1) * (env + transient);
    const b = (r() * 2 - 1) * (env + transient);
    peaks.push({ min: Math.min(a, b), max: Math.max(a, b) });
  }
  return peaks;
}

// ─── StemWave ─────────────────────────────────────────────────────────────────

interface StemWaveProps {
  peaks: PeakPoint[];
  color?: string;
  height?: number;
  playhead?: number;
}

export function StemWave({ peaks, color = '#6a6a70', height = 28, playhead = 0 }: StemWaveProps) {
  const W = 100;
  const H = height;
  const mid = H / 2;
  const step = W / Math.max(peaks.length, 1);
  let d = '';
  peaks.forEach((p, i) => {
    const x = i * step;
    const y1 = mid - p.max * (H * 0.45);
    const y2 = mid - p.min * (H * 0.45);
    d += `M${x.toFixed(2)} ${y1.toFixed(2)} L${x.toFixed(2)} ${y2.toFixed(2)} `;
  });
  return (
    <svg className="stem-wave w-full" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <line x1="0" y1={mid} x2={W} y2={mid} stroke="#1a1a1d" strokeWidth="0.5" />
      <path d={d} stroke={color} strokeWidth="0.6" opacity="0.75" />
      {playhead > 0 && (
        <line x1={playhead * W} y1="0" x2={playhead * W} y2={H} stroke="var(--amber)" strokeWidth="0.6" opacity=".9" />
      )}
      {playhead > 0 && (
        <rect x="0" y="0" width={playhead * W} height={H} fill="var(--amber)" opacity="0.06" />
      )}
    </svg>
  );
}

// ─── OverviewWave ─────────────────────────────────────────────────────────────

interface OverviewWaveProps {
  peaks: PeakPoint[];
  playhead?: number;
  onSeek?: (position: number) => void;
}

export function OverviewWave({ peaks, playhead = 0, onSeek }: OverviewWaveProps) {
  const W = 1000;
  const H = 56;
  const mid = H / 2;
  const step = W / Math.max(peaks.length, 1);
  let d = '';
  peaks.forEach((p, i) => {
    const x = i * step;
    const y1 = mid - p.max * (H * 0.47);
    const y2 = mid - p.min * (H * 0.47);
    d += `M${x.toFixed(2)} ${y1.toFixed(2)} L${x.toFixed(2)} ${y2.toFixed(2)} `;
  });

  const ref = useRef<HTMLDivElement>(null);
  const handleClick = (e: React.MouseEvent) => {
    if (!ref.current || !onSeek) return;
    const rect = ref.current.getBoundingClientRect();
    onSeek((e.clientX - rect.left) / rect.width);
  };

  return (
    <div ref={ref} className="relative cursor-pointer select-none" onClick={handleClick}>
      <svg className="w-full block" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {Array.from({ length: 11 }).map((_, i) => (
          <line key={i} x1={i * 100} y1="0" x2={i * 100} y2={H} stroke="#141417" strokeWidth="0.5" />
        ))}
        <path d={d} stroke="#3a3a40" strokeWidth="0.6" opacity="0.9" />
        <clipPath id="dial-played-clip">
          <rect x="0" y="0" width={playhead * W} height={H} />
        </clipPath>
        <g clipPath="url(#dial-played-clip)">
          <path d={d} stroke="var(--amber)" strokeWidth="0.7" opacity="0.95" />
        </g>
        <rect x="0" y="0" width={playhead * W} height={H} fill="var(--amber)" opacity="0.05" />
        <line x1={playhead * W} y1="0" x2={playhead * W} y2={H} stroke="var(--amber)" strokeWidth="1" />
        <polygon
          points={`${playhead * W - 3},0 ${playhead * W + 3},0 ${playhead * W},4`}
          fill="var(--amber)"
        />
      </svg>
    </div>
  );
}
