'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useMultiTakePlayer, TakeDef } from '@/hooks/use-multi-take-player';
import { useWaveformData } from '@/hooks/use-waveform-data';
import { useMultiTakeAnalyzerData } from '@/hooks/use-multi-take-analyzer-data';
import { AudioAnalyzer } from '@/components/dial/audio-analyzer';

export type TakeStage = 'RAW' | 'MIXED' | 'MASTERED';

export interface TakeEntry {
  id: string;
  label: TakeStage;
  url: string;
  stemsUrls?: Record<string, string> | null;
  createdAt: string;
}

interface Props {
  takes: TakeEntry[];
  sessionId: string;
  guestToken?: string | null;
  compact?: boolean;
}

function formatTime(secs: number): string {
  if (!isFinite(secs) || isNaN(secs)) return '00:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

// Mini waveform canvas for stem rows
function WaveformBar({ peaks, active, height = 20 }: { peaks: number[]; active: boolean; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || peaks.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = active ? '#f59e0b' : '#52525b';
    const barW = Math.max(1, W / peaks.length - 0.5);
    const halfH = H / 2;
    peaks.forEach((peak, i) => {
      const barH = Math.max(1, peak * H);
      ctx.fillRect(i * (W / peaks.length), halfH - barH / 2, barW, barH);
    });
  }, [peaks, active]);
  return <canvas ref={canvasRef} width={160} height={height} className="w-full rounded" style={{ height }} />;
}

// Individual stem row with M/S/Pan/Vol controls
function StemRow({
  index, muted, soloed, anySoloed, peaks,
  onMute, onSolo, onGain, onPan,
}: {
  index: number; muted: boolean; soloed: boolean; anySoloed: boolean; peaks: number[];
  onMute(): void; onSolo(): void; onGain(db: number): void; onPan(v: number): void;
}) {
  const [gainDb, setGainDb] = useState(0);
  const [pan, setPan] = useState(0);
  const isActive = !anySoloed ? !muted : soloed;

  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${isActive ? 'bg-zinc-800/50' : 'bg-zinc-900/50 opacity-50'}`}>
      <span className="w-12 text-xs font-medium text-zinc-500 tabular-nums shrink-0">S{index + 1}</span>

      <div className="flex-1 min-w-0">
        {peaks.length > 0 && <WaveformBar peaks={peaks} active={isActive} height={20} />}
      </div>

      <button
        onClick={onMute}
        aria-label={`${muted ? 'Unmute' : 'Mute'} stem ${index + 1}`}
        aria-pressed={muted}
        className={`px-2 py-1 rounded text-xs font-medium shrink-0 transition-colors ${muted ? 'bg-red-600/80 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}
      >M</button>
      <button
        onClick={onSolo}
        aria-label={`${soloed ? 'Unsolo' : 'Solo'} stem ${index + 1}`}
        aria-pressed={soloed}
        className={`px-2 py-1 rounded text-xs font-medium shrink-0 transition-colors ${soloed ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}
      >S</button>

      <div className="flex flex-col items-center gap-0.5 shrink-0">
        <span className="text-[9px] text-zinc-500 leading-none">Pan</span>
        <input
          type="range" min={-1} max={1} step={0.05} value={pan}
          aria-label={`Pan stem ${index + 1}`}
          className="w-14 accent-amber-400"
          onChange={(e) => { const v = parseFloat(e.target.value); setPan(v); onPan(v); }}
        />
        <span className="text-[9px] text-zinc-500 leading-none tabular-nums">
          {pan === 0 ? 'C' : pan > 0 ? `R${Math.round(pan * 100)}` : `L${Math.round(-pan * 100)}`}
        </span>
      </div>

      <div className="flex flex-col items-center gap-0.5 shrink-0">
        <span className="text-[9px] text-zinc-500 leading-none">Vol</span>
        <input
          type="range" min={-30} max={6} step={1} value={gainDb}
          aria-label={`Volume stem ${index + 1}`}
          className="w-14 accent-amber-400"
          onChange={(e) => { const db = parseInt(e.target.value, 10); setGainDb(db); onGain(db); }}
        />
        <span className="text-[9px] text-zinc-500 leading-none tabular-nums">{gainDb > 0 ? `+${gainDb}` : gainDb}dB</span>
      </div>
    </div>
  );
}

export function UnifiedSessionPlayer({ takes, sessionId: _sessionId, guestToken: _guestToken, compact }: Props) {
  const [showTakeDrawer, setShowTakeDrawer] = useState(false);

  // Convert TakeEntry[] → TakeDef[] for the multi-take player
  const takeDefs: TakeDef[] = takes.map((take) => ({
    id: take.id,
    label: take.label,
    stemUrls: take.stemsUrls ?? { main: take.url },
  }));

  const {
    isReady, isPlaying, currentTime, duration, activeTakeId,
    setActiveTake, play, pause, seek,
    stemStates, toggleStemMute, toggleStemSolo, setStemGain, setStemPan,
    analyserNode, analyserL, analyserR, sampleRate,
  } = useMultiTakePlayer(takeDefs);

  const analyzerData = useMultiTakeAnalyzerData({ analyser: analyserNode, analyserL, analyserR, sampleRate });

  const activeTake = takes.find((t) => t.id === activeTakeId) ?? takes[0];
  const showStemPanel = activeTake?.label === 'RAW' || activeTake?.label === 'MIXED';
  const activeStemUrls = activeTake?.stemsUrls ?? null;
  const stemNames = activeStemUrls ? Object.keys(activeStemUrls) : [];

  // Waveform peaks from cached AudioBuffer (used for MIXED waveform bars; RAW uses URL)
  const [stemBuffers] = useState<Record<string, AudioBuffer> | null>(null);
  const { stemPeaks } = useWaveformData({ stemBuffers, rawUrl: null, masterUrl: null, stage: 'mixed' });

  const handlePlayPause = useCallback(() => {
    if (isPlaying) { pause(); } else { play(); }
  }, [isPlaying, play, pause]);

  // Seek bar interaction
  const seekBarRef = useRef<HTMLInputElement>(null);
  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    seek(parseFloat(e.target.value));
  }, [seek]);

  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden ${compact ? 'p-3' : 'p-4'} space-y-3`}>

      {/* TAKE pill tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest shrink-0">TAKE</span>
        <div className="flex rounded-lg overflow-hidden border border-zinc-700">
          {takes.map((take) => (
            <button
              key={take.id}
              onClick={() => setActiveTake(take.id)}
              aria-pressed={take.id === activeTakeId}
              data-testid={`take-tab-${take.label.toLowerCase()}`}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                take.id === activeTakeId
                  ? 'bg-amber-500 text-zinc-950'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {take.label}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-zinc-600 ml-auto">
          {activeTake ? formatDate(activeTake.createdAt) : ''}
        </span>
      </div>

      {/* Transport */}
      <div className="flex items-center gap-3">
        <button
          onClick={handlePlayPause}
          disabled={!isReady}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          {isPlaying ? (
            <span className="w-3 h-3 flex gap-0.5">
              <span className="w-1 h-full bg-white rounded-sm" />
              <span className="w-1 h-full bg-white rounded-sm" />
            </span>
          ) : (
            <span className="w-0 h-0 border-t-[5px] border-b-[5px] border-l-[8px] border-transparent border-l-white ml-0.5" />
          )}
        </button>

        <span className="font-mono text-xs text-zinc-400 tabular-nums shrink-0">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* Seek bar */}
        <input
          ref={seekBarRef}
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentTime}
          aria-label="Seek"
          className="flex-1 accent-amber-400"
          onChange={handleSeek}
        />

        {!isReady && (
          <span className="text-xs text-zinc-500 animate-pulse shrink-0">Loading…</span>
        )}
      </div>

      {/* Full-featured analyzer — reads from fixed final-stage analysers, unaffected by take switching */}
      {analyzerData && (
        <div className="pt-2 border-t border-zinc-800">
          <AudioAnalyzer data={analyzerData} isActive={true} compact />
        </div>
      )}

      {/* Stem Panel — RAW and MIXED */}
      {showStemPanel && (
        <div className="space-y-1.5 pt-1 border-t border-zinc-800">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Stems</span>
          {stemNames.length > 0 ? (
            <div className="space-y-1 mt-1">
              {stemNames.map((name, idx) => {
                const stemState = stemStates[activeTakeId]?.[name] ?? { muted: false, solo: false };
                const anySoloed = Object.values(stemStates[activeTakeId] ?? {}).some((s) => s.solo);
                return (
                  <StemRow
                    key={name}
                    index={idx}
                    muted={stemState.muted}
                    soloed={stemState.solo}
                    anySoloed={anySoloed}
                    peaks={stemPeaks[name] ?? []}
                    onMute={() => toggleStemMute(activeTakeId, name)}
                    onSolo={() => toggleStemSolo(activeTakeId, name)}
                    onGain={(db) => setStemGain(activeTakeId, name, db)}
                    onPan={(v) => setStemPan(activeTakeId, name, v)}
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-zinc-600 py-2">
              {activeTake?.label === 'RAW' ? 'Original stems not available.' : 'Stem tracks available after dialogue mix.'}
            </p>
          )}
        </div>
      )}

      {/* TAKE history drawer */}
      <div className="border-t border-zinc-800 pt-2">
        <button
          onClick={() => setShowTakeDrawer((v) => !v)}
          className="flex items-center gap-2 w-full text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          aria-expanded={showTakeDrawer}
        >
          <span className={`transition-transform ${showTakeDrawer ? 'rotate-90' : ''}`}>▶</span>
          <span>TAKE History</span>
          <span className="ml-auto text-zinc-700">{takes.length} take{takes.length !== 1 ? 's' : ''}</span>
        </button>
        {showTakeDrawer && (
          <div className="mt-2 space-y-1">
            {takes.map((take) => (
              <button
                key={take.id}
                onClick={() => setActiveTake(take.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors ${
                  take.id === activeTakeId
                    ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                    : 'hover:bg-zinc-800 text-zinc-400'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${take.id === activeTakeId ? 'bg-amber-500' : 'bg-zinc-700'}`} />
                <span className="font-medium">{take.label}</span>
                <span className="text-zinc-600 ml-auto">{formatDate(take.createdAt)}</span>
                {take.id === activeTakeId && <span className="text-[10px] text-amber-500 shrink-0">▶ Playing</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
