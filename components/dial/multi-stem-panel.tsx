'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useMultiStemPlayer } from '@/hooks/use-multi-stem-player';
import { useWaveformData, type Stage } from '@/hooks/use-waveform-data';

interface ParameterChange {
  track: string;
  reason: string;
}

interface Props {
  stemsUrls: Record<string, string>;
  sessionId: string;
  headers: Record<string, string>;
  rawUrl?: string | null;
  masterUrl?: string | null;
  compact?: boolean;
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function matchReason(stemFileName: string, changes: ParameterChange[]): string | null {
  const base = stemFileName.toLowerCase().replace(/\.[^.]+$/, '');
  for (const pc of changes) {
    const t = pc.track.toLowerCase();
    if (t === base || base.includes(t) || t.includes(base)) {
      return pc.reason;
    }
  }
  return null;
}

const STAGE_LABELS: { id: Stage; label: string }[] = [
  { id: 'raw', label: 'Raw' },
  { id: 'mixed', label: 'Mixed' },
  { id: 'master', label: 'Master' },
];

// Canvas waveform renderer
function WaveformCanvas({
  peaks,
  active,
  height = 32,
}: {
  peaks: number[];
  active: boolean;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || peaks.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const color = active ? '#f59e0b' : '#52525b'; // amber-400 : zinc-600
    ctx.fillStyle = color;

    const barW = Math.max(1, W / peaks.length - 0.5);
    const halfH = H / 2;
    peaks.forEach((peak, i) => {
      const barH = Math.max(1, peak * H);
      const x = i * (W / peaks.length);
      ctx.fillRect(x, halfH - barH / 2, barW, barH);
    });
  }, [peaks, active]);

  return (
    <canvas
      ref={canvasRef}
      width={240}
      height={height}
      className="w-full rounded"
      style={{ height }}
    />
  );
}

export function MultiStemPanel({ stemsUrls, sessionId, headers, rawUrl, masterUrl, compact }: Props) {
  const [paramChanges, setParamChanges] = useState<ParameterChange[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>('mixed');
  const [stemBuffers, setStemBuffers] = useState<Record<string, AudioBuffer> | null>(null);

  const { isReady, isPlaying, currentTime, duration, stems, play, pause, toggleMute, toggleSolo } =
    useMultiStemPlayer({
      stemUrls: stemsUrls,
      onError: (err) => setLoadError(err.message),
      onBuffersLoaded: setStemBuffers,
    });

  const { stemPeaks, singlePeaks, singleState, loadSinglePeaks } = useWaveformData({
    stemBuffers,
    rawUrl: rawUrl ?? null,
    masterUrl: masterUrl ?? null,
    stage,
  });

  // Load single-file peaks when switching to raw or master
  useEffect(() => {
    if (stage === 'raw' && rawUrl) loadSinglePeaks(rawUrl);
    if (stage === 'master' && masterUrl) loadSinglePeaks(masterUrl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, rawUrl, masterUrl]);

  useEffect(() => {
    fetch(`/api/dial/chat?sessionId=${sessionId}`, { headers })
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) return;
        const msgs: Array<{ role: string; parameterChanges?: ParameterChange[] | null }> = data.data.messages;
        for (let i = msgs.length - 1; i >= 0; i--) {
          const msg = msgs[i];
          if (msg.role === 'assistant' && msg.parameterChanges?.length) {
            setParamChanges(msg.parameterChanges);
            break;
          }
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const handleStageChange = useCallback((newStage: Stage) => {
    setStage(newStage);
  }, []);

  const stemNames = Object.keys(stemsUrls);
  const isMixedStage = stage === 'mixed';

  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-xl ${compact ? 'p-3' : 'p-4'} space-y-3`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-widest">Stem Tracks</span>
        {!isReady && !loadError && (
          <span className="text-xs text-zinc-500 animate-pulse">Loading stems…</span>
        )}
        {loadError && (
          <span className="text-xs text-red-400">Load failed</span>
        )}
      </div>

      {/* 3-stage toggle */}
      <div className="flex rounded-lg overflow-hidden border border-zinc-700 w-fit">
        {STAGE_LABELS.map(({ id, label }) => {
          const disabled = (id === 'raw' && !rawUrl) || (id === 'master' && !masterUrl);
          return (
            <button
              key={id}
              data-testid={`stage-toggle-${id}`}
              onClick={() => !disabled && handleStageChange(id)}
              disabled={disabled}
              aria-pressed={stage === id}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                stage === id
                  ? 'bg-amber-500 text-zinc-950'
                  : disabled
                    ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Single-file waveform for Raw / Master stage */}
      {!isMixedStage && (
        <div className="px-1">
          {singleState.loading && (
            <div className="h-8 bg-zinc-800 rounded animate-pulse" />
          )}
          {!singleState.loading && singlePeaks.length > 0 && (
            <WaveformCanvas peaks={singlePeaks} active={true} height={32} />
          )}
          {singleState.error && (
            <span className="text-xs text-red-400">Waveform unavailable</span>
          )}
        </div>
      )}

      {/* Transport (Mixed stage only — Raw/Master are reference playback only via <audio>) */}
      {isMixedStage && (
        <div className="flex items-center gap-3">
          <button
            onClick={isPlaying ? pause : play}
            disabled={!isReady}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isPlaying ? (
              <span className="w-3 h-3 flex gap-0.5">
                <span className="w-1 h-full bg-white rounded-sm" />
                <span className="w-1 h-full bg-white rounded-sm" />
              </span>
            ) : (
              <span className="w-0 h-0 border-t-4 border-b-4 border-l-8 border-transparent border-l-white ml-0.5" />
            )}
          </button>
          <span className="font-mono text-xs text-zinc-400">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      )}

      {/* Raw/Master: native audio element for reference listening */}
      {!isMixedStage && (rawUrl || masterUrl) && (
        <audio
          key={stage === 'raw' ? rawUrl ?? '' : masterUrl ?? ''}
          controls
          src={stage === 'raw' ? (rawUrl ?? undefined) : (masterUrl ?? undefined)}
          className="w-full h-8"
        />
      )}

      {/* Stem rows — shown in all stages */}
      <div className="space-y-2">
        {stemNames.map((stemName) => {
          const stemState = stems[stemName] ?? { muted: false, solo: false };
          const reason = matchReason(stemName, paramChanges);
          const displayName = stemName.replace(/\.[^.]+$/, '');
          const anySoloed = Object.values(stems).some((s) => s.solo);
          const isActive = !anySoloed ? !stemState.muted : stemState.solo;
          const peaks = stemPeaks[stemName] ?? [];

          return (
            <div
              key={stemName}
              className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${isActive ? 'bg-zinc-800/50' : 'bg-zinc-900/50 opacity-50'}`}
            >
              <div className="flex-1 min-w-0 space-y-1">
                <span className="text-sm font-medium capitalize block truncate">{displayName}</span>
                {isMixedStage && peaks.length > 0 && (
                  <WaveformCanvas peaks={peaks} active={isActive} height={24} />
                )}
                {reason && (
                  <span className="text-xs text-zinc-500 block leading-snug line-clamp-2">{reason}</span>
                )}
              </div>
              {isMixedStage && (
                <div className="flex gap-1.5 shrink-0 mt-0.5">
                  <button
                    onClick={() => toggleMute(stemName)}
                    aria-label={`${stemState.muted ? 'Unmute' : 'Mute'} ${displayName}`}
                    aria-pressed={stemState.muted}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      stemState.muted
                        ? 'bg-red-600/80 text-white'
                        : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                    }`}
                  >
                    M
                  </button>
                  <button
                    onClick={() => toggleSolo(stemName)}
                    aria-label={`${stemState.solo ? 'Unsolo' : 'Solo'} ${displayName}`}
                    aria-pressed={stemState.solo}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      stemState.solo
                        ? 'bg-amber-500 text-zinc-950'
                        : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                    }`}
                  >
                    S
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
