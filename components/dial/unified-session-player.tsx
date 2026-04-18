'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useAudioAnalyzerContext } from '@/hooks/use-audio-analyzer-context';
import { useMultiStemPlayer } from '@/hooks/use-multi-stem-player';
import { useWaveformData } from '@/hooks/use-waveform-data';

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
function WaveformBar({ peaks, active, height = 24 }: { peaks: number[]; active: boolean; height?: number }) {
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

// Individual stem control row
function StemRow({
  _name, index, muted, soloed, anySoloed, peaks,
  onMute, onSolo, onGain, onPan,
}: {
  _name: string; index: number; muted: boolean; soloed: boolean; anySoloed: boolean; peaks: number[];
  onMute(): void; onSolo(): void; onGain(db: number): void; onPan(v: number): void;
}) {
  const [gainDb, setGainDb] = useState(0);
  const [pan, setPan] = useState(0);
  const isActive = !anySoloed ? !muted : soloed;
  const displayName = `Stem ${index + 1}`;

  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${isActive ? 'bg-zinc-800/50' : 'bg-zinc-900/50 opacity-50'}`}>
      <span className="w-14 text-xs font-medium truncate shrink-0">{displayName}</span>

      {/* Waveform */}
      <div className="flex-1 min-w-0">
        {peaks.length > 0 && <WaveformBar peaks={peaks} active={isActive} height={20} />}
      </div>

      {/* M/S buttons */}
      <button
        onClick={onMute}
        aria-label={`${muted ? 'Unmute' : 'Mute'} ${displayName}`}
        aria-pressed={muted}
        className={`px-2 py-1 rounded text-xs font-medium shrink-0 transition-colors ${muted ? 'bg-red-600/80 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}
      >M</button>
      <button
        onClick={onSolo}
        aria-label={`${soloed ? 'Unsolo' : 'Solo'} ${displayName}`}
        aria-pressed={soloed}
        className={`px-2 py-1 rounded text-xs font-medium shrink-0 transition-colors ${soloed ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}
      >S</button>

      {/* Pan slider */}
      <div className="flex flex-col items-center gap-0.5 shrink-0">
        <span className="text-[9px] text-zinc-500 leading-none">Pan</span>
        <input
          type="range" min={-1} max={1} step={0.05} value={pan}
          aria-label={`Pan ${displayName}`}
          className="w-16 accent-amber-400"
          onChange={(e) => { const v = parseFloat(e.target.value); setPan(v); onPan(v); }}
        />
        <span className="text-[9px] text-zinc-500 leading-none tabular-nums">
          {pan === 0 ? 'C' : pan > 0 ? `R${Math.round(pan * 100)}` : `L${Math.round(-pan * 100)}`}
        </span>
      </div>

      {/* Vol slider */}
      <div className="flex flex-col items-center gap-0.5 shrink-0">
        <span className="text-[9px] text-zinc-500 leading-none">Vol</span>
        <input
          type="range" min={-30} max={6} step={1} value={gainDb}
          aria-label={`Volume ${displayName}`}
          className="w-16 accent-amber-400"
          onChange={(e) => { const db = parseInt(e.target.value, 10); setGainDb(db); onGain(db); }}
        />
        <span className="text-[9px] text-zinc-500 leading-none tabular-nums">{gainDb > 0 ? `+${gainDb}` : gainDb}dB</span>
      </div>
    </div>
  );
}

export function UnifiedSessionPlayer({ takes, sessionId: _sessionId, guestToken: _guestToken, compact }: Props) {
  const { audioRef, connect: analyzerConnect, data: analyzerData } = useAudioAnalyzerContext();

  // Active take state
  const defaultTake = takes.find((t) => t.label === 'MIXED') ?? takes[0];
  const [activeTakeId, setActiveTakeId] = useState<string>(defaultTake?.id ?? '');
  const [showTakeDrawer, setShowTakeDrawer] = useState(false);

  // Single-file audio transport state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const activeTake = takes.find((t) => t.id === activeTakeId) ?? takes[0];
  // RAW and MIXED both support multi-stem playback
  const hasStems = (activeTake?.label === 'RAW' || activeTake?.label === 'MIXED') &&
    !!activeTake?.stemsUrls && Object.keys(activeTake.stemsUrls).length > 0;

  // Set initial audio src on mount (uncontrolled pattern to avoid el.load() race)
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !activeTake?.url) return;
    el.src = activeTake.url;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // TAKE switching — canplay pattern (PR-D root fix: no el.load())
  const switchTake = useCallback((take: TakeEntry) => {
    if (take.id === activeTakeId) return;
    const el = audioRef.current;
    if (!el) {
      setActiveTakeId(take.id);
      return;
    }
    const wasPlaying = !el.paused;
    const pos = el.currentTime;
    el.src = take.url;
    el.addEventListener('canplay', () => {
      el.currentTime = Math.min(pos, isFinite(el.duration) ? el.duration : 0);
      if (wasPlaying) el.play().catch(() => {});
    }, { once: true });
    setActiveTakeId(take.id);
  }, [activeTakeId, audioRef]);

  // Single-file transport controls (MASTERED only)
  const handlePlay = useCallback(() => {
    if (hasStems) return; // stems mode: handled by stem player
    const el = audioRef.current;
    if (!el) return;
    el.play().catch(() => {});
  }, [hasStems, audioRef]);

  const handlePause = useCallback(() => {
    if (hasStems) return;
    audioRef.current?.pause();
  }, [hasStems, audioRef]);

  // Stem player (RAW and MIXED stages)
  const stemUrls = hasStems ? (activeTake.stemsUrls as Record<string, string>) : {};

  // Waveform data for stem buffers
  const [stemBuffers, setStemBuffers] = useState<Record<string, AudioBuffer> | null>(null);
  const { stemPeaks } = useWaveformData({ stemBuffers, rawUrl: null, masterUrl: null, stage: 'mixed' });

  const {
    isReady: stemsReady, isPlaying: stemsPlaying, currentTime: stemTime, duration: stemDuration,
    stems, play: playStems, pause: pauseStems,
    toggleMute, toggleSolo, setStemGain, setStemPan,
  } = useMultiStemPlayer({ stemUrls, onError: () => {}, onBuffersLoaded: setStemBuffers });

  // Derived display values
  const displayPlaying = hasStems ? stemsReady && stemsPlaying : isPlaying;
  const displayTime = hasStems ? stemTime : currentTime;
  const displayDuration = hasStems ? stemDuration : duration;
  const displayReady = hasStems ? stemsReady : true;

  const handlePlayPause = useCallback(() => {
    if (hasStems) {
      if (stemsPlaying) { pauseStems(); } else { playStems(); }
    } else {
      if (displayPlaying) { handlePause(); } else { handlePlay(); }
    }
  }, [hasStems, stemsPlaying, pauseStems, playStems, displayPlaying, handlePause, handlePlay]);

  // LUFS display
  const momentaryLufs = analyzerData?.momentaryLufs;
  const integratedLufs = analyzerData?.integratedLufs;

  const stemNames = Object.keys(stemUrls);

  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden ${compact ? 'p-3' : 'p-4'} space-y-3`}>

      {/* TAKE pill tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest shrink-0">TAKE</span>
        <div className="flex rounded-lg overflow-hidden border border-zinc-700">
          {takes.map((take) => (
            <button
              key={take.id}
              onClick={() => switchTake(take)}
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
          disabled={!displayReady}
          aria-label={displayPlaying ? 'Pause' : 'Play'}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          {displayPlaying ? (
            <span className="w-3 h-3 flex gap-0.5">
              <span className="w-1 h-full bg-white rounded-sm" />
              <span className="w-1 h-full bg-white rounded-sm" />
            </span>
          ) : (
            <span className="w-0 h-0 border-t-[5px] border-b-[5px] border-l-[8px] border-transparent border-l-white ml-0.5" />
          )}
        </button>

        <span className="font-mono text-xs text-zinc-400 tabular-nums shrink-0">
          {formatTime(displayTime)} / {formatTime(displayDuration)}
        </span>

        {/* LUFS inline display */}
        {(momentaryLufs !== undefined && momentaryLufs !== null) && (
          <div className="flex gap-3 ml-auto text-xs text-zinc-500 tabular-nums">
            <span>M: <span className="text-zinc-300">{momentaryLufs.toFixed(1)}</span> LUFS</span>
            {integratedLufs !== undefined && integratedLufs !== null && (
              <span>I: <span className="text-zinc-300">{integratedLufs.toFixed(1)}</span> LUFS</span>
            )}
          </div>
        )}
      </div>

      {/* Hidden audio element — drives analyzer + single-file playback */}
      <audio
        ref={audioRef}
        onPlay={() => { analyzerConnect(); setIsPlaying(true); }}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration || 0)}
        onEnded={() => { setIsPlaying(false); setCurrentTime(0); }}
        style={{ display: 'none' }}
      />

      {/* Stem Panel — RAW and MIXED */}
      {(activeTake?.label === 'RAW' || activeTake?.label === 'MIXED') && (
        <div className="space-y-1.5 pt-1 border-t border-zinc-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Stems</span>
            {!stemsReady && (
              <span className="text-xs text-zinc-500 animate-pulse">Loading…</span>
            )}
          </div>
          {hasStems ? (
            <div className="space-y-1">
              {stemNames.map((name, idx) => {
                const stemState = stems[name] ?? { muted: false, solo: false };
                const anySoloed = Object.values(stems).some((s) => s.solo);
                return (
                  <StemRow
                    key={name}
                    _name={name}
                    index={idx}
                    muted={stemState.muted}
                    soloed={stemState.solo}
                    anySoloed={anySoloed}
                    peaks={stemPeaks[name] ?? []}
                    onMute={() => toggleMute(name)}
                    onSolo={() => toggleSolo(name)}
                    onGain={(db) => setStemGain(name, db)}
                    onPan={(v) => setStemPan(name, v)}
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-zinc-600 py-2">
              {activeTake?.label === 'RAW' ? 'Original stems not available for this session.' : 'Stem tracks available after dialogue mix.'}
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
                onClick={() => switchTake(take)}
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
