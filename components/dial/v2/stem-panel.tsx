'use client';

import { useState, useEffect } from 'react';
import { useLocale } from '@/lib/i18n/locale-context';
import { Readout, Micro, ToggleSquare } from './atoms';
import { StemWave, type PeakPoint } from './waveform';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StemData {
  id: string;
  name: string;
  color: string;
  peaks: PeakPoint[];
  /** Fader dB — initial value from initialParams, user-adjustable */
  gainDb: number;
  /** Stereo pan -1..1 */
  pan: number;
  muted: boolean;
  soloed: boolean;
  /** Measured peak dBFS from AnalyserNode (-60..0) */
  peakDb: number;
}

export interface StemUpdate {
  gainDb?: number;
  pan?: number;
  mute?: boolean;
  solo?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dbFormat(db: number): string {
  if (db <= -60) return '-∞';
  return (db >= 0 ? '+' : '') + db.toFixed(1);
}

function panFormat(p: number): string {
  if (Math.abs(p) < 0.02) return 'C';
  return (p > 0 ? 'R' : 'L') + Math.round(Math.abs(p) * 100).toString().padStart(2, '0');
}

// ─── StemMeter ────────────────────────────────────────────────────────────────

interface StemMeterProps {
  /** 0..1 normalized level */
  level: number;
  /** 0..1 normalized peak */
  peak: number;
}

function StemMeter({ level, peak }: StemMeterProps) {
  const segs = 24;
  const lit = Math.round(level * segs);
  const peakSeg = Math.round(peak * segs);
  return (
    <div className="flex items-center gap-[2px] h-2">
      {Array.from({ length: segs }).map((_, i) => {
        const on = i < lit;
        const isPeak = i === peakSeg;
        let color = 'rgba(78,166,116,0.8)';
        if (i > segs * 0.75) color = 'rgba(245,165,36,0.85)';
        if (i > segs * 0.92) color = 'rgba(224,90,74,0.9)';
        return (
          <span
            key={i}
            className="w-[3px] h-2 rounded-[0.5px]"
            style={{
              background: on ? color : '#1a1a1d',
              boxShadow: isPeak ? `0 0 0 0.5px ${color}` : 'none',
            }}
          />
        );
      })}
    </div>
  );
}

// ─── StemRow ─────────────────────────────────────────────────────────────────

interface StemRowProps {
  stem: StemData;
  playhead: number;
  initialGainDb: number;
  initialPan: number;
  localPlaybackTooltip: string;
  onUpdate: (patch: StemUpdate) => void;
}

function StemRow({ stem, playhead, initialGainDb, initialPan, localPlaybackTooltip, onUpdate }: StemRowProps) {
  const [gainDb, setGainDb] = useState(initialGainDb);
  const [pan, setPan] = useState(initialPan);

  // Apply initial params on mount
  useEffect(() => {
    onUpdate({ gainDb: initialGainDb, pan: initialPan });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { name, color, peaks, muted, soloed, peakDb } = stem;

  // Normalize peakDb (-60..0) → level 0..1 for meter
  const level = muted ? 0 : Math.pow(10, Math.max(-60, peakDb) / 20);
  const peakNorm = muted ? 0 : Math.min(1, level + 0.05);

  // Color-code peak readout
  let peakTone = 'var(--fg-1)';
  if (!muted && peakDb > -0.5) peakTone = 'var(--red)';
  else if (!muted && peakDb > -6) peakTone = 'var(--amber)';

  return (
    <div
      className="stem-row grid items-center gap-2 border-b border-[color:var(--line-soft)] last:border-b-0"
      style={{
        gridTemplateColumns: '140px 56px 110px 28px 28px 90px 1fr 130px',
        padding: '10px 12px',
        minHeight: '56px',
      }}
    >
      {/* Name + color bar */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-[3px] h-6 rounded-[1px]" style={{ background: color }} />
        <span
          className="text-[13px] text-[color:var(--fg-0)] truncate font-medium"
          style={{ fontFamily: 'var(--font-inter, Inter, sans-serif)' }}
        >
          {name}
        </span>
      </div>

      {/* Peak dBFS readout */}
      <div className="text-right">
        <Readout value={muted ? '—' : dbFormat(peakDb)} unit={muted ? undefined : 'dB'} size="xs" tone={peakTone} />
      </div>

      {/* Inline waveform */}
      <div className="h-7 bg-[color:var(--ink-2)] border border-[color:var(--line-soft)] rounded-[2px] px-[2px]">
        <StemWave peaks={peaks} color={color} height={26} playhead={playhead} />
      </div>

      {/* Mute */}
      <ToggleSquare
        on={muted}
        label="M"
        tone="red"
        onClick={() => onUpdate({ mute: !muted })}
        title="Mute"
      />

      {/* Solo */}
      <ToggleSquare
        on={soloed}
        label="S"
        tone="amber"
        onClick={() => onUpdate({ solo: !soloed })}
        title="Solo"
      />

      {/* Pan */}
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-0.5">
          <Micro>PAN</Micro>
          <span className="cursor-help opacity-30 hover:opacity-70 transition-opacity leading-none" title={localPlaybackTooltip}>
            <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth={1.4} className="w-2.5 h-2.5 inline-block" style={{ color: 'var(--fg-3)' }}>
              <circle cx="5" cy="5" r="4" />
              <path d="M5 4.5v3M5 3h.01" strokeLinecap="round" />
            </svg>
          </span>
        </span>
        <input
          type="range"
          min="-100"
          max="100"
          value={Math.round(pan * 100)}
          step="1"
          className="mue mue-pan flex-1"
          onChange={(e) => {
            const v = +e.target.value / 100;
            setPan(v);
            onUpdate({ pan: v });
          }}
          onDoubleClick={() => {
            setPan(0);
            onUpdate({ pan: 0 });
          }}
        />
        <span className="mono text-[10px] text-[color:var(--fg-1)] w-7 text-right tnum">
          {panFormat(pan)}
        </span>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-0.5">
          <Micro>VOL</Micro>
          <span className="cursor-help opacity-30 hover:opacity-70 transition-opacity leading-none" title={localPlaybackTooltip}>
            <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth={1.4} className="w-2.5 h-2.5 inline-block" style={{ color: 'var(--fg-3)' }}>
              <circle cx="5" cy="5" r="4" />
              <path d="M5 4.5v3M5 3h.01" strokeLinecap="round" />
            </svg>
          </span>
        </span>
        <input
          type="range"
          min="-30"
          max="6"
          step="0.1"
          value={gainDb}
          className="mue flex-1"
          onChange={(e) => {
            const v = +e.target.value;
            setGainDb(v);
            onUpdate({ gainDb: v });
          }}
          onDoubleClick={() => {
            setGainDb(0);
            onUpdate({ gainDb: 0 });
          }}
        />
      </div>

      {/* Level meter + fader dB */}
      <div className="flex flex-col items-end gap-[4px]">
        <StemMeter level={level} peak={peakNorm} />
        <Readout value={dbFormat(gainDb)} unit="dB" size="xs" tone="var(--fg-1)" />
      </div>
    </div>
  );
}

// ─── StemPanel ────────────────────────────────────────────────────────────────

interface StemPanelProps {
  stems: StemData[];
  playhead: number;
  initialGainDbMap: Record<string, number>;
  initialPanMap: Record<string, number>;
  onUpdateStem: (stemId: string, patch: StemUpdate) => void;
}

export function StemPanel({ stems, playhead, initialGainDbMap, initialPanMap, onUpdateStem }: StemPanelProps) {
  const { t } = useLocale();
  const tooltip = t.dial.stemPanel.localPlaybackTooltip;
  return (
    <div className="bg-[color:var(--ink-1)] border border-[color:var(--line)] rounded-[3px]">
      {/* Column headers */}
      <div
        className="grid items-center gap-2 h-7 px-3 border-b border-[color:var(--line)] bg-[#0d0d0f] flex-shrink-0"
        style={{ gridTemplateColumns: '140px 56px 110px 28px 28px 90px 1fr 130px' }}
      >
        <Micro>Stem</Micro>
        <Micro className="text-right">Peak</Micro>
        <Micro>Waveform</Micro>
        <span />
        <span />
        <Micro>Pan</Micro>
        <Micro>Volume</Micro>
        <Micro className="text-right">Fader</Micro>
      </div>
      {/* Fixed-height scrollable stem list — frame stays constant, content scrolls for 7+ stems */}
      <div className="overflow-y-auto" style={{ maxHeight: '336px' }}>
        {stems.map((s) => (
          <StemRow
            key={s.id}
            stem={s}
            playhead={playhead}
            initialGainDb={initialGainDbMap[s.id] ?? 0}
            initialPan={initialPanMap[s.id] ?? 0}
            localPlaybackTooltip={tooltip}
            onUpdate={(patch) => onUpdateStem(s.id, patch)}
          />
        ))}
      </div>
    </div>
  );
}
