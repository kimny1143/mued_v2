'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import type { AnalyzerData } from '@/hooks/use-audio-analyzer';
import { Micro, Readout } from './atoms';

// ─── Constants ────────────────────────────────────────────────────────────────

const DISPLAY_BINS = 96;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Map linear FFT bins to DISPLAY_BINS using log-frequency spacing */
function toDisplayBins(fftData: number[]): number[] {
  const n = fftData.length;
  const bins: number[] = new Array(DISPLAY_BINS).fill(0);
  for (let i = 0; i < DISPLAY_BINS; i++) {
    const t = i / (DISPLAY_BINS - 1);
    // Logarithmic mapping: exp(t * ln(n)) gives 1..n, subtract 1 for 0-based
    const idx = Math.min(n - 1, Math.round(Math.exp(t * Math.log(n)) - 1));
    bins[i] = (fftData[idx] ?? 0) / 255;
  }
  return bins;
}

function lufsLabel(v: number): string {
  if (!isFinite(v) || v < -70) return '—';
  return (v >= 0 ? '+' : '') + v.toFixed(1);
}

// ─── Spectrum ─────────────────────────────────────────────────────────────────

interface SpectrumProps {
  data: AnalyzerData | null;
  frozen: boolean;
  peakHoldEnabled: boolean;
}

export function Spectrum({ data, frozen, peakHoldEnabled }: SpectrumProps) {
  const frozenRef = useRef<number[] | null>(null);
  const holdRef = useRef<number[]>(new Array(DISPLAY_BINS).fill(0));

  const spec = useMemo(() => {
    if (!data) return new Array(DISPLAY_BINS).fill(0);
    if (frozen) {
      if (!frozenRef.current) frozenRef.current = toDisplayBins(data.frequencyData);
      return frozenRef.current;
    }
    frozenRef.current = null;
    return toDisplayBins(data.frequencyData);
  }, [data, frozen]);

  // Peak hold decay
  const peakHold = holdRef.current;
  for (let i = 0; i < DISPLAY_BINS; i++) {
    if (peakHoldEnabled) {
      peakHold[i] = Math.max(spec[i], peakHold[i] * 0.985);
    } else {
      peakHold[i] = 0;
    }
  }

  const W = 1000, H = 160;
  const stepX = W / DISPLAY_BINS;

  let line = '', area = `M0 ${H} `;
  for (let i = 0; i < DISPLAY_BINS; i++) {
    const x = i * stepX + stepX / 2;
    const y = H - spec[i] * (H - 12);
    line += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
    area += 'L' + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
  }
  area += `L${W} ${H} Z`;

  let holdPath = '';
  for (let i = 0; i < DISPLAY_BINS; i++) {
    const x = i * stepX + stepX / 2;
    const y = H - peakHold[i] * (H - 12);
    holdPath += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
  }

  const freqTicks = [
    { f: '20', x: 0.00 }, { f: '50', x: 0.11 }, { f: '100', x: 0.22 },
    { f: '200', x: 0.33 }, { f: '500', x: 0.46 }, { f: '1k', x: 0.58 },
    { f: '2k', x: 0.7 }, { f: '5k', x: 0.82 }, { f: '10k', x: 0.9 }, { f: '20k', x: 1.0 },
  ];
  const dbTicks = [-6, -12, -24, -36, -48];

  return (
    <div className="relative">
      <svg className="w-full block" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" height={H}>
        {dbTicks.map((db) => {
          const y = H - ((db + 60) / 60) * (H - 12);
          return <line key={db} x1="0" y1={y} x2={W} y2={y} stroke="#18181b" strokeWidth="0.5" strokeDasharray="2 3" />;
        })}
        {freqTicks.map((t, i) => (
          <line key={i} x1={t.x * W} y1="0" x2={t.x * W} y2={H - 2} stroke="#131316" strokeWidth="0.5" />
        ))}
        <defs>
          <linearGradient id="dial-spec-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--amber)" stopOpacity="0.28" />
            <stop offset="70%" stopColor="var(--amber)" stopOpacity="0.04" />
            <stop offset="100%" stopColor="var(--amber)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#dial-spec-grad)" />
        {peakHoldEnabled && (
          <path d={holdPath} fill="none" stroke="#3a3a40" strokeWidth="0.6" opacity=".9" />
        )}
        <path d={line} fill="none" stroke="var(--amber)" strokeWidth="1" opacity="0.95" />
      </svg>
      <div className="absolute inset-0 pointer-events-none">
        {dbTicks.map((db) => {
          const y = 100 - ((db + 60) / 60) * 100;
          return (
            <span key={db} className="mono text-[9px] text-[color:var(--fg-3)] absolute left-1"
              style={{ top: `calc(${y}% - 5px)` }}>
              {db}
            </span>
          );
        })}
        {freqTicks.map((t, i) => (
          <span key={i} className="mono text-[9px] text-[color:var(--fg-3)] absolute bottom-0.5"
            style={{ left: `calc(${t.x * 100}% - 6px)` }}>
            {t.f}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── StereoMeter ─────────────────────────────────────────────────────────────

interface StereoMeterProps {
  data: AnalyzerData | null;
}

export function StereoMeter({ data }: StereoMeterProps) {
  const l = data?.peakL ?? 0;
  const r = data?.peakR ?? 0;
  const segs = 28;

  const renderCol = (v: number) => {
    const lit = Math.round(v * segs);
    const peakSeg = Math.round(Math.min(1, v + 0.08) * segs);
    return (
      <div className="flex flex-col-reverse gap-[1px] h-full">
        {Array.from({ length: segs }).map((_, i) => {
          let c = '#1a1a1d';
          if (i < lit) {
            c = 'rgba(78,166,116,0.9)';
            if (i > segs * 0.78) c = 'rgba(245,165,36,0.9)';
            if (i > segs * 0.92) c = 'rgba(224,90,74,0.95)';
          }
          const isPeak = i === peakSeg && v > 0.01;
          return (
            <span key={i} className="w-[7px] h-[4px] rounded-[0.5px]" style={{
              background: c,
              outline: isPeak ? '0.5px solid rgba(245,165,36,0.8)' : 'none',
            }} />
          );
        })}
      </div>
    );
  };

  const dbTicks = [0, -3, -6, -12, -18, -24, -36, -48];
  return (
    <div className="flex items-stretch gap-2 h-full">
      <div className="relative w-6 flex flex-col justify-between text-right">
        {dbTicks.map((db) => {
          const pct = 100 - ((db + 60) / 60) * 100;
          return (
            <span key={db} className="mono text-[8px] text-[color:var(--fg-3)] absolute right-0"
              style={{ top: `calc(${pct}% - 4px)` }}>
              {db}
            </span>
          );
        })}
      </div>
      {renderCol(l)}
      {renderCol(r)}
      <div className="flex flex-col justify-between mono text-[8px] text-[color:var(--fg-3)] pl-0.5">
        <span>L</span><span>R</span>
      </div>
    </div>
  );
}

// ─── LufsReadout ─────────────────────────────────────────────────────────────

interface LufsReadoutProps {
  data: AnalyzerData | null;
}

export function LufsReadout({ data }: LufsReadoutProps) {
  const M = data?.momentaryLufs ?? -99;
  const S = data?.shortTermLufs ?? -99;
  const I = data?.integratedLufs ?? -99;
  // Derive true peak dBFS from peakL/peakR (best approximation without separate TP measurement)
  const peakAmp = Math.max(data?.peakL ?? 0, data?.peakR ?? 0);
  const TP = peakAmp > 0 ? 20 * Math.log10(peakAmp) : -99;

  const rows = [
    { label: 'MOMENTARY', unit: 'LUFS', v: M, sub: 'M', big: false },
    { label: 'SHORT-TERM', unit: 'LUFS', v: S, sub: 'S', big: false },
    { label: 'INTEGRATED', unit: 'LUFS', v: I, sub: 'I', big: true },
    { label: 'PEAK', unit: 'dBFS', v: TP, sub: 'PK', big: false },
  ];

  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-2.5">
      {rows.map((row) => (
        <div key={row.sub} className="flex flex-col">
          <div className="flex items-baseline justify-between">
            <Micro>{row.label}</Micro>
            <Micro tone="var(--fg-3)">{row.sub}</Micro>
          </div>
          <div
            className={`mono ${row.big ? 'text-[26px]' : 'text-[20px]'} leading-none mt-1 tracking-tight`}
            style={{ color: row.big ? 'var(--amber)' : 'var(--fg-0)' }}
          >
            {lufsLabel(row.v)}
            <span className="mono text-[9px] text-[color:var(--fg-2)] ml-1 font-normal">
              {row.unit}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Goniometer ──────────────────────────────────────────────────────────────

interface GoniometerProps {
  data: AnalyzerData | null;
}

export function Goniometer({ data }: GoniometerProps) {
  const corr = data?.correlation ?? 0;
  const size = 130;
  const c = size / 2;

  // Compute M/S scatter points from L/R samples
  const points = useMemo(() => {
    const gL = data?.goniometerL ?? [];
    const gR = data?.goniometerR ?? [];
    const len = Math.min(gL.length, gR.length);
    if (len === 0) return [];
    return Array.from({ length: len }, (_, i) => {
      const L = gL[i];
      const R = gR[i];
      const M = (L + R) / Math.SQRT2;
      const S = (L - R) / Math.SQRT2;
      return { x: S, y: -M };
    });
  }, [data]);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <rect x="0.5" y="0.5" width={size - 1} height={size - 1} fill="#0a0a0c" stroke="#1a1a1d" />
          <line x1="0" y1="0" x2={size} y2={size} stroke="#17171a" strokeWidth="0.5" strokeDasharray="2 3" />
          <line x1={size} y1="0" x2="0" y2={size} stroke="#17171a" strokeWidth="0.5" strokeDasharray="2 3" />
          <line x1={c} y1="0" x2={c} y2={size} stroke="#17171a" strokeWidth="0.5" />
          <line x1="0" y1={c} x2={size} y2={c} stroke="#17171a" strokeWidth="0.5" />
          <text x="4" y={size - 3} fontFamily="monospace" fontSize="7" fill="#4a4842">L</text>
          <text x={size - 10} y={size - 3} fontFamily="monospace" fontSize="7" fill="#4a4842">R</text>
          <text x={c - 2} y="8" fontFamily="monospace" fontSize="7" fill="#4a4842">M</text>
          {points.map((p, i) => (
            <circle key={i} cx={c + p.x * c * 0.7} cy={c + p.y * c * 0.7} r="0.8"
              fill="var(--amber)" opacity="0.36" />
          ))}
        </svg>
      </div>

      {/* Correlation bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <Micro>Correlation</Micro>
          <Readout
            value={(corr >= 0 ? '+' : '') + corr.toFixed(2)}
            size="xs"
            tone={corr < 0 ? 'var(--red)' : 'var(--fg-1)'}
          />
        </div>
        <div className="relative h-[6px] bg-[color:var(--ink-3)] rounded-[1px] bevel-in">
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[color:var(--line)]" />
          <div
            className="absolute top-0 bottom-0"
            style={{
              left: corr >= 0 ? '50%' : `${50 + corr * 50}%`,
              width: `${Math.abs(corr) * 50}%`,
              background: corr < -0.3 ? 'var(--red)' : corr < 0.3 ? 'var(--amber)' : 'var(--emerald)',
            }}
          />
        </div>
        <div className="flex justify-between mt-1 mono text-[8px] text-[color:var(--fg-3)]">
          <span>−1</span><span>0</span><span>+1</span>
        </div>
      </div>
    </div>
  );
}

// ─── AnalyzerCluster ─────────────────────────────────────────────────────────

interface AnalyzerClusterProps {
  data: AnalyzerData | null;
  activeTakeLabel?: string;
  activeSubLabel?: string;
}

export function AnalyzerCluster({ data, activeTakeLabel, activeSubLabel }: AnalyzerClusterProps) {
  const [frozen, setFrozen] = useState(false);
  const [peakHoldEnabled, setPeakHoldEnabled] = useState(false);

  // Reset freeze when take changes
  useEffect(() => {
    setFrozen(false);
  }, [activeTakeLabel]);

  return (
    <section className="bg-[color:var(--ink-1)] border border-[color:var(--line)] rounded-[3px]">
      <header className="h-8 px-3 border-b border-[color:var(--line-soft)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Micro>Analyzer</Micro>
          {activeTakeLabel && (
            <span className="mono text-[10px] text-[color:var(--fg-2)]">
              Source <span className="text-[color:var(--amber)]">{activeTakeLabel}</span>
              {activeSubLabel && (
                <span className="text-[color:var(--fg-3)]"> · {activeSubLabel}</span>
              )}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFrozen((f) => !f)}
            className={
              'h-5 px-1.5 mono text-[9px] uppercase tracking-wider rounded-[2px] ' +
              (frozen
                ? 'border border-[color:var(--amber-dim)] bg-[#221809] text-[color:var(--amber)]'
                : 'border border-[color:var(--line)] text-[color:var(--fg-1)] hover:text-[color:var(--fg-0)]')
            }
          >
            Freeze
          </button>
          <button
            onClick={() => setPeakHoldEnabled((p) => !p)}
            className={
              'h-5 px-1.5 mono text-[9px] uppercase tracking-wider rounded-[2px] ' +
              (peakHoldEnabled
                ? 'border border-[color:var(--amber-dim)] bg-[#221809] text-[color:var(--amber)]'
                : 'border border-[color:var(--line)] text-[color:var(--fg-1)] hover:text-[color:var(--fg-0)]')
            }
          >
            Peak hold
          </button>
        </div>
      </header>

      {/* Mobile (lg-): stack the 4 panels vertically (the fixed ~552px row overflowed 390px).
          Desktop (lg+): the original 4-column meter row. */}
      <div className="grid grid-cols-1 lg:[grid-template-columns:1fr_92px_280px_180px]">
        {/* Spectrum */}
        <div className="border-r border-[color:var(--line-soft)] p-3">
          <div className="flex items-center justify-between mb-1.5">
            <Micro>Spectrum · 1024 FFT · log</Micro>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="w-2 h-[2px] bg-[color:var(--amber)]" />
                <Micro tone="var(--fg-2)">Live</Micro>
              </div>
              {peakHoldEnabled && (
                <div className="flex items-center gap-1">
                  <span className="w-2 h-[2px] bg-[#3a3a40]" />
                  <Micro tone="var(--fg-2)">Hold</Micro>
                </div>
              )}
            </div>
          </div>
          <Spectrum data={data} frozen={frozen} peakHoldEnabled={peakHoldEnabled} />
        </div>

        {/* Stereo */}
        <div className="border-r border-[color:var(--line-soft)] p-3 flex flex-col">
          <Micro className="mb-2">Stereo dBFS</Micro>
          <div className="flex-1 min-h-[140px]">
            <StereoMeter data={data} />
          </div>
        </div>

        {/* LUFS */}
        <div className="border-r border-[color:var(--line-soft)] p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Micro>Loudness · BS.1770-4</Micro>
            <Micro tone="var(--fg-3)">LUFS</Micro>
          </div>
          <LufsReadout data={data} />
        </div>

        {/* Goniometer */}
        <div className="p-3 flex flex-col gap-2 items-center">
          <div className="flex items-center justify-between w-full">
            <Micro>Goniometer</Micro>
            <Micro tone="var(--fg-3)">M/S</Micro>
          </div>
          <Goniometer data={data} />
        </div>
      </div>
    </section>
  );
}
