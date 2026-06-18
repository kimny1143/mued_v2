'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { Btn, Micro } from './atoms';
import { IconPlay, IconPause, IconSkipBack, IconSpinner } from './icons';

// ─── Shared transport snapshot ────────────────────────────────────────────────
// Written by the player (UnifiedSessionPlayerV2) into a ref each render, read by
// MobileTransport via rAF. Going through a ref (not state/props) keeps the per-frame
// currentTime updates from re-rendering the 1900-line session page — only this small
// bar re-renders. (FF-1 sticky transport, Tier3 Phase 1b mobile.)

export interface TransportSnapshot {
  isReady: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  /** RAW / MIXED / MASTERED · sub-label — display context for the user. */
  takeLabel: string;
  play: () => void;
  pause: () => void;
  /** Seek to an absolute time (seconds). */
  seek: (t: number) => void;
}

function fmt(secs: number): string {
  if (!isFinite(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface MobileTransportProps {
  /** Ref the player writes its live transport into (null until a take is ready). */
  transportRef: RefObject<TransportSnapshot | null>;
}

/**
 * Sticky play/scrub bar shown below the mobile tab bar (lg:hidden) so the transport never
 * scrolls out of reach (kimny iPhone feedback). Lean height (FF-1 note 1 — matters for the
 * FF-2 landscape ~390px height). Renders nothing until a take is ready (FF-1 note 2 — graceful
 * empty state). Reads the live transport from `transportRef` via rAF; only this bar re-renders.
 */
export function MobileTransport({ transportRef }: MobileTransportProps) {
  // Local mirror of the fields we display. Updated from the ref via rAF, and only when a value
  // actually changed (so a paused/idle player doesn't re-render this bar at 60fps).
  const [view, setView] = useState<{
    isReady: boolean; isPlaying: boolean; currentTime: number; duration: number; takeLabel: string;
  } | null>(null);
  const lastRef = useRef<string>('');

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const t = transportRef.current;
      if (!t) {
        if (lastRef.current !== 'null') { lastRef.current = 'null'; setView(null); }
      } else {
        // Quantize currentTime to 0.25s so we re-render at most ~4x/sec for the scrub, not 60x.
        const ct = Math.round(t.currentTime * 4) / 4;
        const key = `${t.isReady}|${t.isPlaying}|${ct}|${Math.round(t.duration)}|${t.takeLabel}`;
        if (key !== lastRef.current) {
          lastRef.current = key;
          setView({ isReady: t.isReady, isPlaying: t.isPlaying, currentTime: t.currentTime, duration: t.duration, takeLabel: t.takeLabel });
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [transportRef]);

  // Empty state: no take loaded yet → render nothing (graceful, no dead bar).
  if (!view) return null;

  const { isReady, isPlaying, currentTime, duration, takeLabel } = view;
  const controls = transportRef.current;

  return (
    <div
      className="lg:hidden shrink-0 flex items-center gap-2 px-3 py-1.5 border-b"
      style={{ borderColor: 'var(--line-soft)', background: 'var(--ink-1)' }}
      role="group"
      aria-label="Playback"
    >
      <Btn
        onClick={() => (isPlaying ? controls?.pause() : controls?.play())}
        disabled={!isReady}
        active={isPlaying}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        className="w-11 min-h-[44px] justify-center shrink-0"
      >
        {!isReady ? <IconSpinner size={13} /> : isPlaying ? <IconPause size={14} /> : <IconPlay size={14} />}
      </Btn>
      <Btn
        onClick={() => controls?.seek(0)}
        disabled={!isReady}
        aria-label="Return to start"
        className="min-h-[44px] justify-center shrink-0"
      >
        <IconSkipBack size={13} />
      </Btn>
      {takeLabel && <Micro tone="var(--fg-2)" className="shrink-0 max-w-[72px] truncate">{takeLabel}</Micro>}
      <input
        type="range"
        min={0}
        max={Math.max(0.01, duration)}
        step={0.05}
        value={Math.min(currentTime, duration)}
        disabled={!isReady}
        aria-label="Seek"
        onChange={(e) => controls?.seek(+e.target.value)}
        className="mue flex-1 min-w-0"
      />
      <span className="mono text-[11px] text-[color:var(--fg-1)] tabular-nums shrink-0">
        {fmt(currentTime)}<span className="text-[color:var(--fg-3)]"> / {fmt(duration)}</span>
      </span>
    </div>
  );
}
