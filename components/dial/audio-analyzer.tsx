'use client';

import { useRef, useEffect, useCallback, useContext } from 'react';
import type { AnalyzerData } from '@/hooks/use-audio-analyzer';
import { useAudioAnalyzerContext } from '@/hooks/use-audio-analyzer-context';

// ─── Types ──────────────────────────────────────────────────────────────────

interface AudioAnalyzerProps {
  /** Pass data directly, or omit to use AudioAnalyzerContext */
  data?: AnalyzerData | null;
  isActive?: boolean;
  onConnect?: () => void;
  compact?: boolean;
}

// ─── Color helpers ──────────────────────────────────────────────────────────

function spectrogramColor(value: number): [number, number, number] {
  const t = value / 255;
  if (t < 0.25) {
    const s = t / 0.25;
    return [Math.round(10 + s * 30), Math.round(10 + s * 20), Math.round(40 + s * 80)];
  }
  if (t < 0.5) {
    const s = (t - 0.25) / 0.25;
    return [Math.round(40 - s * 20), Math.round(30 + s * 140), Math.round(120 + s * 30)];
  }
  if (t < 0.75) {
    const s = (t - 0.5) / 0.25;
    return [Math.round(20 + s * 220), Math.round(170 + s * 50), Math.round(150 - s * 120)];
  }
  const s = (t - 0.75) / 0.25;
  return [Math.round(240 + s * 15), Math.round(220 - s * 140), Math.round(30 - s * 30)];
}

function lufsColor(lufs: number): string {
  if (lufs > -8) return 'rgba(200, 90, 90, 0.85)';
  if (lufs > -14) return 'rgba(200, 170, 80, 0.8)';
  if (lufs > -24) return 'rgba(100, 190, 140, 0.8)';
  return 'rgba(90, 150, 210, 0.7)';
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AudioAnalyzer({ data: dataProp, isActive: isActiveProp, onConnect: onConnectProp, compact = true }: AudioAnalyzerProps) {
  // Use context as fallback when props aren't provided
  let ctxData: AnalyzerData | null = null;
  let ctxActive = false;
  let ctxConnect = () => {};
  try {
    const ctx = useAudioAnalyzerContext();
    ctxData = ctx.data;
    ctxActive = ctx.isActive;
    ctxConnect = ctx.connect;
  } catch {
    // No provider — props are required
  }
  const data = dataProp !== undefined ? dataProp : ctxData;
  const isActive = isActiveProp !== undefined ? isActiveProp : ctxActive;
  const onConnect = onConnectProp ?? ctxConnect;

  const spectrumRef = useRef<HTMLCanvasElement>(null);
  const spectrogramRef = useRef<HTMLCanvasElement>(null);
  const meterRef = useRef<HTMLCanvasElement>(null);
  const gonioRef = useRef<HTMLCanvasElement>(null);
  const spectrogramInitRef = useRef(false);
  const gonioInitRef = useRef(false);

  // ── Spectrum (fine-grained, log-scaled) ──
  useEffect(() => {
    const canvas = spectrumRef.current;
    if (!canvas || !data) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const bins = data.frequencyData;
    const sr = data.sampleRate || 44100;
    const nyquist = sr / 2;
    const binWidth = nyquist / bins.length;
    const minFreq = 20;
    const maxFreq = Math.min(20000, nyquist);

    // Interpolated line spectrum with smooth curve
    const points = Math.floor(w);
    const values: number[] = [];

    for (let i = 0; i < points; i++) {
      const freq = minFreq * Math.pow(maxFreq / minFreq, i / points);
      // Fractional bin index for interpolation
      const binF = freq / binWidth;
      const b0 = Math.max(1, Math.floor(binF)); // skip bin 0 (DC)
      const b1 = Math.min(bins.length - 1, b0 + 1);
      const frac = binF - b0;
      // Linear interpolation between adjacent bins
      values.push(bins[b0] * (1 - frac) + bins[b1] * frac);
    }

    // Helper: draw smooth curve through points using quadratic bezier
    const drawSmooth = (c: CanvasRenderingContext2D, vals: number[]) => {
      const ys = vals.map(v => h - (v / 255) * h);
      c.moveTo(0, ys[0]);
      for (let i = 1; i < vals.length - 1; i++) {
        const xc = (i + i + 1) / 2;
        const yc = (ys[i] + ys[i + 1]) / 2;
        c.quadraticCurveTo(i, ys[i], xc, yc);
      }
      c.lineTo(vals.length - 1, ys[vals.length - 1]);
    };

    // Gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(80, 140, 200, 0.25)');
    grad.addColorStop(0.4, 'rgba(100, 180, 140, 0.12)');
    grad.addColorStop(1, 'rgba(100, 180, 140, 0)');

    ctx.beginPath();
    ctx.moveTo(0, h);
    drawSmooth(ctx, values);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Sharp line on top
    ctx.beginPath();
    drawSmooth(ctx, values);
    ctx.strokeStyle = 'rgba(120, 200, 160, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Glow line
    ctx.beginPath();
    drawSmooth(ctx, values);
    ctx.strokeStyle = 'rgba(120, 200, 160, 0.12)';
    ctx.lineWidth = 4;
    ctx.stroke();
  }, [data]);

  // ── Spectrogram ──
  useEffect(() => {
    const canvas = spectrogramRef.current;
    if (!canvas || !data) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const pw = Math.round(w * dpr);
    const ph = Math.round(h * dpr);

    if (!spectrogramInitRef.current || canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
      spectrogramInitRef.current = true;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const imageData = ctx.getImageData(dpr, 0, pw - dpr, ph);
    ctx.putImageData(imageData, 0, 0);

    const bins = data.frequencyData;
    const sr = data.sampleRate || 44100;
    const nyquist = sr / 2;
    const binWidthHz = nyquist / bins.length;
    const minF = 20;
    const maxF = Math.min(20000, nyquist);
    const logMin = Math.log(minF);
    const logMax = Math.log(maxF);

    const colW = Math.ceil(dpr);
    for (let y = 0; y < ph; y++) {
      // Log scale: top = high freq, bottom = low freq
      const t = (ph - 1 - y) / ph; // 0 (bottom/low) to 1 (top/high)
      const freq = Math.exp(logMin + t * (logMax - logMin));
      const binIdx = Math.min(bins.length - 1, Math.max(0, Math.round(freq / binWidthHz)));
      const [r, g, b] = spectrogramColor(bins[binIdx]);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(pw - colW, y, colW, 1);
    }
  }, [data]);

  // ── Level meter (vertical Pro Tools-style segmented LED) ──
  const peakHoldLRef = useRef(0);
  const peakHoldRRef = useRef(0);
  const peakDecayLRef = useRef(0);
  const peakDecayRRef = useRef(0);

  useEffect(() => {
    const canvas = meterRef.current;
    if (!canvas || !data) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    // ── Constants ──
    const DB_MIN = -60;
    const DB_MAX = 0;
    const DB_RANGE = DB_MAX - DB_MIN;
    const SEGMENTS = compact ? 30 : 48;
    const GAP = 1;
    const LABEL_W = compact ? 20 : 24;
    const BAR_AREA_W = (w - LABEL_W) / 2;
    const BAR_W = Math.max(6, BAR_AREA_W - 4);

    // dB scale marks
    const dbMarks = [0, -6, -12, -18, -24, -36, -48, -60];

    // Convert linear amplitude to dB position (0=bottom, 1=top)
    const ampToPos = (amp: number) => {
      const db = amp > 1e-6 ? 20 * Math.log10(amp) : DB_MIN;
      return Math.max(0, Math.min(1, (db - DB_MIN) / DB_RANGE));
    };

    // Peak hold with slow decay
    const PEAK_HOLD_DECAY = 0.003;
    if (data.peakL >= peakHoldLRef.current) {
      peakHoldLRef.current = data.peakL;
      peakDecayLRef.current = 0;
    } else {
      peakDecayLRef.current += PEAK_HOLD_DECAY;
      peakHoldLRef.current = Math.max(0, peakHoldLRef.current - peakDecayLRef.current);
    }
    if (data.peakR >= peakHoldRRef.current) {
      peakHoldRRef.current = data.peakR;
      peakDecayRRef.current = 0;
    } else {
      peakDecayRRef.current += PEAK_HOLD_DECAY;
      peakHoldRRef.current = Math.max(0, peakHoldRRef.current - peakDecayRRef.current);
    }

    // Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w, h);

    // Segment height
    const totalGap = GAP * (SEGMENTS - 1);
    const segH = (h - 4 - totalGap) / SEGMENTS;

    // Draw one channel meter
    const drawMeter = (cx: number, rmsAmp: number, peakAmp: number, peakHold: number) => {
      const rmsPos = ampToPos(rmsAmp);
      const peakPos = ampToPos(peakAmp);
      const holdPos = ampToPos(peakHold);
      const rmsSegs = Math.floor(rmsPos * SEGMENTS);
      const peakSegs = Math.floor(peakPos * SEGMENTS);
      const holdSeg = Math.floor(holdPos * SEGMENTS);

      for (let i = 0; i < SEGMENTS; i++) {
        const y = h - 2 - (i + 1) * (segH + GAP) + GAP;
        const ratio = i / SEGMENTS; // 0=bottom, 1=top

        // Segment color based on position
        let segColor: string;
        if (ratio > 0.92) segColor = 'rgba(230, 80, 80, 0.92)';
        else if (ratio > 0.83) segColor = 'rgba(210, 70, 70, 0.88)';
        else if (ratio > 0.7) segColor = 'rgba(220, 170, 50, 0.82)';
        else if (ratio > 0.6) segColor = 'rgba(200, 180, 50, 0.78)';
        else segColor = 'rgba(60, 190, 110, 0.82)';

        if (i < rmsSegs) {
          ctx.fillStyle = segColor;
          ctx.fillRect(cx, y, BAR_W, segH);
        } else if (i < peakSegs) {
          ctx.globalAlpha = 0.18;
          ctx.fillStyle = segColor;
          ctx.fillRect(cx, y, BAR_W, segH);
          ctx.globalAlpha = 1;
        } else if (i === holdSeg && holdSeg > 0) {
          ctx.fillStyle = holdPos > 0.92 ? 'rgba(230, 80, 80, 0.95)' : 'rgba(255, 255, 255, 0.85)';
          ctx.fillRect(cx, y, BAR_W, segH);
        } else {
          // Off segment: very dim
          ctx.fillStyle = '#1a1a1a';
          ctx.fillRect(cx, y, BAR_W, segH);
        }
      }
    };

    // L channel (left side)
    const lx = LABEL_W;
    drawMeter(lx, data.rmsL, data.peakL, peakHoldLRef.current);

    // R channel (right side)
    const rx = LABEL_W + BAR_AREA_W;
    drawMeter(rx, data.rmsR, data.peakR, peakHoldRRef.current);

    // dB scale labels (between the meters)
    ctx.fillStyle = '#52525b';
    ctx.font = `${compact ? 7 : 9}px monospace`;
    ctx.textAlign = 'right';
    for (const db of dbMarks) {
      const pos = (db - DB_MIN) / DB_RANGE;
      const y = h - 2 - pos * (h - 4);
      if (y > 6 && y < h - 2) {
        ctx.fillText(`${db}`, LABEL_W - 3, y + 3);
        // Tick mark
        ctx.fillStyle = '#27272a';
        ctx.fillRect(lx, y, BAR_W, 0.5);
        ctx.fillRect(rx, y, BAR_W, 0.5);
        ctx.fillStyle = '#52525b';
      }
    }

    // Channel labels at bottom
    ctx.fillStyle = '#71717a';
    ctx.font = `${compact ? 8 : 10}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('L', lx + BAR_W / 2, h);
    ctx.fillText('R', rx + BAR_W / 2, h);

    // dB readout at top
    const lDb = data.rmsL > 1e-6 ? 20 * Math.log10(data.rmsL) : -60;
    const rDb = data.rmsR > 1e-6 ? 20 * Math.log10(data.rmsR) : -60;
    ctx.fillStyle = '#a1a1aa';
    ctx.font = `bold ${compact ? 8 : 10}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(lDb > -60 ? lDb.toFixed(1) : '-∞', lx + BAR_W / 2, 8);
    ctx.fillText(rDb > -60 ? rDb.toFixed(1) : '-∞', rx + BAR_W / 2, 8);
  }, [data, compact]);

  // ── Goniometer (Lissajous / phase scope) ──
  useEffect(() => {
    const canvas = gonioRef.current;
    if (!canvas || !data || !data.goniometerL.length) return;

    const dpr = window.devicePixelRatio || 1;
    const size = canvas.clientWidth; // square
    const ps = Math.round(size * dpr);

    if (!gonioInitRef.current || canvas.width !== ps || canvas.height !== ps) {
      canvas.width = ps;
      canvas.height = ps;
      gonioInitRef.current = true;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cx = ps / 2;
    const cy = ps / 2;
    const scale = ps * 0.4;

    // Phosphor trail: fade previous frame
    ctx.fillStyle = 'rgba(9, 9, 11, 0.25)';
    ctx.fillRect(0, 0, ps, ps);

    // Grid lines (L, R, M, S axes) — draw faintly
    ctx.strokeStyle = 'rgba(63, 63, 70, 0.4)';
    ctx.lineWidth = dpr;
    // M axis (vertical: mono/in-phase)
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, ps);
    ctx.stroke();
    // S axis (horizontal: side/stereo)
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(ps, cy);
    ctx.stroke();
    // Diagonal L/R
    ctx.strokeStyle = 'rgba(63, 63, 70, 0.25)';
    ctx.beginPath();
    ctx.moveTo(0, ps);
    ctx.lineTo(ps, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(ps, ps);
    ctx.stroke();

    // Labels
    ctx.fillStyle = 'rgba(113, 113, 122, 0.6)';
    ctx.font = `${Math.round(9 * dpr)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('M', cx, 10 * dpr);
    ctx.fillText('L', 6 * dpr, cy - 4 * dpr);
    ctx.textAlign = 'right';
    ctx.fillText('R', ps - 4 * dpr, cy - 4 * dpr);

    // Plot L/R as mid-side rotated: x = (R-L)/√2, y = (L+R)/√2
    const sqrt2 = Math.SQRT2;
    const L = data.goniometerL;
    const R = data.goniometerR;

    // Determine color from correlation (muted)
    const corr = data.correlation;
    let dotColor: string;
    if (corr > 0.5) dotColor = 'rgba(100, 190, 140, 0.55)';
    else if (corr > 0) dotColor = 'rgba(90, 150, 210, 0.55)';
    else if (corr > -0.3) dotColor = 'rgba(200, 170, 80, 0.55)';
    else dotColor = 'rgba(200, 90, 90, 0.55)';

    ctx.fillStyle = dotColor;
    const dotSize = compact ? dpr : dpr * 1.5;

    for (let i = 0; i < L.length; i++) {
      const l = L[i];
      const r = R[i];
      const x = cx + ((r - l) / sqrt2) * scale;
      const y = cy - ((l + r) / sqrt2) * scale;
      ctx.fillRect(x - dotSize / 2, y - dotSize / 2, dotSize, dotSize);
    }

    // Correlation value overlay
    ctx.fillStyle = 'rgba(161, 161, 170, 0.8)';
    ctx.font = `${Math.round(10 * dpr)}px monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(`r=${corr.toFixed(2)}`, ps - 4 * dpr, ps - 4 * dpr);
  }, [data, compact]);

  const handlePopOut = useCallback(() => {
    window.open(
      '/dial/analyzer',
      'mued-analyzer',
      'width=520,height=640,menubar=no,toolbar=no,location=no,status=no',
    );
  }, []);

  if (!isActive) {
    return (
      <button
        onClick={onConnect}
        className="w-full text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-2 text-center"
      >
        Enable Analyzer
      </button>
    );
  }

  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
      {/* ── Top: Spectrum (large) ── */}
      <div>
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Spectrum</span>
          {compact && (
            <button
              onClick={handlePopOut}
              className="text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors"
            >
              ↗ Pop Out
            </button>
          )}
        </div>
        <canvas
          ref={spectrumRef}
          className={`w-full rounded bg-zinc-950 ${compact ? 'h-40' : 'h-64'}`}
        />
      </div>

      {/* ── Spectrogram (thinner, below spectrum) ── */}
      <div>
        <canvas
          ref={spectrogramRef}
          className={`w-full rounded ${compact ? 'h-10' : 'h-16'}`}
        />
      </div>

      {/* ── Bottom: Level (left) | Loudness + Phase (right) ── */}
      <div className={`flex gap-2 ${compact ? 'min-h-[112px]' : 'min-h-[152px]'}`}>
        {/* Left column: Level meter (narrow) */}
        <div className="flex flex-col" style={{ width: compact ? 144 : 168 }}>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Level</span>
          <canvas
            ref={meterRef}
            className="w-full flex-1 rounded"
          />
        </div>

        {/* Right column: Loudness + Phase */}
        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
          {/* Loudness — 3 rows vertical */}
          <div>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Loudness</span>
            <div className="mt-0.5 space-y-0.5">
              {([
                ['M', 'Momentary', data?.momentaryLufs],
                ['S', 'Short', data?.shortTermLufs],
                ['I', 'Integrated', data?.integratedLufs],
              ] as const).map(([label, sublabel, value]) => (
                <div key={label} className="bg-zinc-900/60 rounded px-2 py-1 text-center">
                  <div className="text-[7px] text-zinc-600 tracking-widest">{label}</div>
                  <div
                    className={`font-mono font-black tabular-nums leading-none ${compact ? 'text-xl' : 'text-3xl'}`}
                    style={{ color: value != null ? lufsColor(value) : '#71717a' }}
                  >
                    {value != null && value > -70 ? value.toFixed(1) : '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Phase / Stereo Field */}
          <div className="flex-1 flex flex-col min-h-0">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Stereo Field</span>

            {/* Goniometer — fills available space */}
            <div className="flex-1 flex items-center justify-center mt-0.5 min-h-0">
              <canvas
                ref={gonioRef}
                className="rounded bg-zinc-950 aspect-square"
                style={{ maxWidth: compact ? 160 : 240, maxHeight: '100%', width: '100%' }}
              />
            </div>

            {/* Correlation bar */}
            <div className="mt-1.5">
              <div className="flex items-center justify-between text-[8px] text-zinc-600 mb-0.5">
                <span>-1</span>
                <span className="text-zinc-500">Correlation</span>
                <span>+1</span>
              </div>
              <div className="relative h-1.5 bg-zinc-900 rounded overflow-hidden">
                <div className="absolute left-1/2 top-0 w-px h-full bg-zinc-700" />
                {data && (
                  <div
                    className="absolute top-0 h-full w-1 rounded transition-all duration-75"
                    style={{
                      left: `${((data.correlation + 1) / 2) * 100}%`,
                      backgroundColor: data.correlation > 0.5 ? 'rgba(100, 190, 140, 0.8)'
                        : data.correlation > 0 ? 'rgba(90, 150, 210, 0.8)'
                        : data.correlation > -0.3 ? 'rgba(200, 170, 80, 0.8)'
                        : 'rgba(200, 90, 90, 0.8)',
                      transform: 'translateX(-50%)',
                    }}
                  />
                )}
              </div>
            </div>

            {/* Width bar */}
            <div className="mt-1">
              <div className="flex items-center justify-between text-[8px] text-zinc-600 mb-0.5">
                <span>M</span>
                <span className="text-zinc-500">Width</span>
                <span>S</span>
              </div>
              <div className="relative h-1.5 bg-zinc-900 rounded overflow-hidden">
                {data && (
                  <div
                    className="absolute top-0 left-0 h-full rounded transition-all duration-75"
                    style={{
                      width: `${data.stereoWidth * 100}%`,
                      background: `linear-gradient(90deg, rgba(90,150,210,0.6), ${data.stereoWidth > 0.7 ? 'rgba(200,170,80,0.6)' : 'rgba(100,190,140,0.6)'})`,
                    }}
                  />
                )}
              </div>
            </div>

            {/* Balance bar */}
            <div className="mt-1">
              <div className="flex items-center justify-between text-[8px] text-zinc-600 mb-0.5">
                <span>L</span>
                <span className="text-zinc-500">Balance</span>
                <span>R</span>
              </div>
              <div className="relative h-1.5 bg-zinc-900 rounded overflow-hidden">
                <div className="absolute left-1/2 top-0 w-px h-full bg-zinc-700" />
                {data && (
                  <div
                    className="absolute top-0 h-full transition-all duration-75"
                    style={{
                      left: data.balance >= 0 ? '50%' : `${(0.5 + data.balance / 2) * 100}%`,
                      width: `${Math.abs(data.balance) / 2 * 100}%`,
                      backgroundColor: Math.abs(data.balance) > 0.3 ? 'rgba(200,170,80,0.6)' : 'rgba(90,150,210,0.6)',
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
